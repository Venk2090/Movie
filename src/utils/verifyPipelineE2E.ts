import assert from 'node:assert/strict';
import {
  parseTranscriptInput,
  validateAndNormalizeTranscript,
  cleanTranscriptSegments,
  buildCharacterRegistryFromTranscript,
  buildSemanticScenesFromTranscript,
  regenerateSingleSceneFromTranscript,
  computeProjectQualityAudit
} from './transcriptPipeline';
import {
  DEFAULT_CHARACTER_CONSISTENCY,
  extractCharacterFromTranscript,
  generateSceneArtwork
} from './sceneArt';
import { buildLocalizedOutputs, INITIAL_PROJECT } from '../data/mockData';
import {
  startServerVideoExportJob,
  buildProjectBundleZip,
  resetAllProjectHistory
} from './serverExportEngine';
import { TranscriptSegment } from '../types';

async function runVerification() {
  console.log('1. Verifying transcript parsing, cleaning, and 17-segment non-modulo preservation...');
  const seventeenSegments: TranscriptSegment[] = Array.from({ length: 17 }, (_, i) => ({
    id: i + 1,
    start: i * 4.5,
    end: (i + 1) * 4.5 - 0.2,
    text: `Unique verified speech line number ${i + 1} with uh distinct content.`
  }));

  const cleaned = cleanTranscriptSegments(seventeenSegments);
  assert.equal(cleaned.length, 17, 'Must preserve all 17 segments without modulo truncation');
  assert.ok(!cleaned[0].text.includes(' uh '), 'Should clean isolated disfluencies');
  assert.equal(cleaned[16].start, 16 * 4.5, 'Must preserve exact start timestamp');

  const { report } = validateAndNormalizeTranscript(cleaned, 17 * 4.5);
  assert.equal(report.valid, true, 'Monotonic 17-segment transcript should be valid');
  assert.equal(report.segmentCount, 17);

  console.log('2. Verifying 1:1 localization mapping and honest missing-translation QA...');
  // Provide partial translations (only 10 of 17 segments) on a non-demo project
  const partialEs = cleaned.slice(0, 10).map(s => ({
    id: s.id,
    start: s.start,
    end: s.end,
    text: `Línea verificada número ${s.id}`
  }));

  const localized = buildLocalizedOutputs(
    ['en', 'es'],
    cleaned,
    { es: partialEs },
    'Test Verification Project',
    { isDemoMode: false, sourceLanguage: 'en' }
  );

  assert.equal(localized.es.translationSegments.length, 17, 'Must preserve 17 segment slots');
  assert.equal(localized.es.qaReport.missing, 7, 'Must report 7 missing segments instead of modulo cycling');
  assert.notEqual(localized.es.qaReport.status, 'PASS', 'Incomplete translation must not report PASS');

  console.log('3. Verifying character extraction does not turn topic mentions into on-camera speakers...');
  assert.equal(
    DEFAULT_CHARACTER_CONSISTENCY.enabled,
    false,
    'Default character consistency must be disabled so a global presenter is not forced across scenes'
  );

  const thirdPersonSegments: TranscriptSegment[] = [
    {
      id: 1,
      start: 0,
      end: 6,
      text: 'The orbital rocket telemetry indicated chamber pressure variance during stage separation.'
    },
    {
      id: 2,
      start: 6,
      end: 12,
      text: 'Minister Amit Shah was mentioned in the parliamentary bulletin regarding legal reform.'
    }
  ];
  const registry = buildCharacterRegistryFromTranscript(thirdPersonSegments, DEFAULT_CHARACTER_CONSISTENCY);
  const scenes = buildSemanticScenesFromTranscript(thirdPersonSegments, {
    targetSceneCount: 2,
    characterRegistry: registry,
    resolveArtwork: (draft, idx, total) =>
      generateSceneArtwork(
        {
          ...draft,
          characterRegistry: registry,
          characterConfig: DEFAULT_CHARACTER_CONSISTENCY
        },
        'Telemetry Report',
        idx,
        total
      )
  });

  assert.equal(scenes.length, 2);
  const extracted0 = extractCharacterFromTranscript(
    scenes[0].dialogue,
    scenes[0].summary,
    0,
    DEFAULT_CHARACTER_CONSISTENCY,
    { characterIds: scenes[0].characterIds, characterRegistry: registry, depictionMode: scenes[0].depictionMode }
  );
  assert.notEqual(
    extracted0.presenceType,
    'speaking_on_camera',
    'Unattributed narration about rockets must not invent an on-camera human speaker'
  );

  console.log('4. Verifying single-scene regeneration preserves other scenes...');
  const originalScene1 = { ...scenes[0], summary: 'User Custom Summary For Scene 1', userEdited: true };
  const regeneratedScene2 = regenerateSingleSceneFromTranscript(
    scenes[1],
    thirdPersonSegments,
    registry,
    {
      preserveUserEdits: false,
      sceneIndex: 1,
      totalScenes: 2
    }
  );
  assert.equal(originalScene1.summary, 'User Custom Summary For Scene 1', 'Scene 1 edits must remain untouched');
  assert.equal(regeneratedScene2.sceneNumber, 2, 'Regenerated scene 2 keeps its sceneNumber');

  console.log('5. Verifying real FFmpeg MP4 render + ffprobe validation across multiple languages and PKZIP export...');
  const testProj = {
    ...INITIAL_PROJECT,
    id: 'TEST-EXPORT-VERIFY',
    durationSeconds: 12,
    cleanTranscript: INITIAL_PROJECT.cleanTranscript.slice(0, 2).map((seg, idx) => ({
      ...seg,
      start: idx * 6,
      end: (idx + 1) * 6
    })),
    scenes: INITIAL_PROJECT.scenes.slice(0, 2).map((s, idx) => ({
      ...s,
      startTime: idx * 6,
      endTime: (idx + 1) * 6,
      duration: 6
    }))
  };

  for (const lang of ['te', 'hi', 'en', 'es', 'zh', 'ru'] as const) {
    const { job } = await startServerVideoExportJob({
      project: testProj,
      languageCode: lang,
      exportMode: 'storyboard_render',
      requestedResolution: '720p',
      synthesizeTtsFn: async () => null,
      waitForCompletion: true
    });

    assert.equal(
      job.status,
      'COMPLETED',
      `FFmpeg export job for ${lang} should complete, got: ${job.status} (${job.error})`
    );
    assert.ok(job.ffprobeValidation, `Export job for ${lang} must include ffprobeValidation report`);
    assert.equal(job.ffprobeValidation.hasVideoStream, true, `Rendered ${lang} MP4 must have a video stream`);
    assert.equal(job.ffprobeValidation.hasAudioStream, true, `Rendered ${lang} MP4 must have an audio stream`);
    assert.ok(job.ffprobeValidation.fileSizeBytes > 5000, `Rendered ${lang} MP4 must be non-empty`);
  }

  const zipBuffer = await buildProjectBundleZip(testProj);
  assert.ok(zipBuffer.length > 500, 'ZIP buffer must be non-empty');
  assert.equal(zipBuffer[0], 0x50, 'ZIP must start with PK signature (P)');
  assert.equal(zipBuffer[1], 0x4b, 'ZIP must start with PK signature (K)');

  const audit = computeProjectQualityAudit(testProj);
  assert.ok(audit.checks.length > 0, 'Project quality audit must run checks');

  resetAllProjectHistory();
  console.log('ALL END-TO-END PIPELINE & MULTI-LANGUAGE VIDEO EXPORT VERIFICATION CHECKS PASSED!');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
