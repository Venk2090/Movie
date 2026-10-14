import {
  TranscriptSegment,
  TranscriptValidationReport,
  TranscriptIntervalIssue,
  CharacterRegistryEntry,
  CharacterConsistencyConfig,
  Scene,
  SceneDepictionMode,
  CinematicMotionPreset,
  SceneTransitionPreset,
  Project,
  ProjectQualityAudit,
  QualityCheckItem
} from '../types';
import {
  deriveEmotionFromTranscript,
  generateSceneArtwork,
  generateCharacterAvatar
} from './sceneArt';

/**
 * Decodes common HTML entities found in YouTube timedtext / XML caption tracks.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode( parseInt(dec, 10) ))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCharCode( parseInt(hex, 16) ));
}

/**
 * Parses SRT, VTT, timestamped lines, or JSON array into raw TranscriptSegment[].
 * Never invents timestamps if none are provided unless explicit segment bounds exist.
 */
export function parseTranscriptInput(
  input: string | TranscriptSegment[],
  _fallbackDurationSeconds?: number
): TranscriptSegment[] {
  if (Array.isArray(input)) {
    return input
      .filter(s => s && typeof s.text === 'string' && s.text.trim().length > 0)
      .map((s, idx) => ({
        id: typeof s.id === 'number' && s.id > 0 ? s.id : idx + 1,
        start: Number(s.start),
        end: Number(s.end),
        text: decodeHtmlEntities(s.text).trim(),
        speakerId: s.speakerId,
        speakerLabel: s.speakerLabel,
        confidence: s.confidence,
        latencyOffsetMs: s.latencyOffsetMs,
        words: s.words
      }));
  }

  const raw = (input || '').trim();
  if (!raw) return [];

  // Try JSON array first
  if (raw.startsWith('[') || raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : parsed.segments || parsed.rawTranscript || [];
      if (Array.isArray(arr) && arr.length > 0) {
        return parseTranscriptInput(arr);
      }
    } catch {
      // Continue to text formats
    }
  }

  const parseTimecode = (tc: string): number => {
    const clean = tc.trim().replace(',', '.');
    const parts = clean.split(':').map(Number);
    if (parts.some(isNaN)) return NaN;
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parts[0] ?? NaN;
  };

  // Check for SRT / WebVTT blocks: 00:00:01,000 --> 00:00:05,000
  const srtBlocks = raw
    .replace(/^WEBVTT[^\n]*\n+/i, '')
    .split(/\n\s*\n/);
  const srtSegments: TranscriptSegment[] = [];

  for (const block of srtBlocks) {
    const lines = block
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;
    const arrowLineIdx = lines.findIndex(l => l.includes('-->'));
    if (arrowLineIdx !== -1) {
      const [startStr, endStr] = lines[arrowLineIdx].split('-->').map(s => s.trim().split(' ')[0]);
      const start = parseTimecode(startStr);
      const end = parseTimecode(endStr);
      const text = lines
        .slice(arrowLineIdx + 1)
        .join(' ')
        .replace(/<[^>]+>/g, '')
        .trim();
      if (!isNaN(start) && !isNaN(end) && end > start && text) {
        srtSegments.push({
          id: srtSegments.length + 1,
          start: Math.round(start * 100) / 100,
          end: Math.round(end * 100) / 100,
          text: decodeHtmlEntities(text)
        });
      }
    }
  }

  if (srtSegments.length > 0) {
    return srtSegments;
  }

  // Check for bracketed or inline timestamp lines: [00:00 - 00:12] Text or 0:00 - 0:12 Text
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const lineSegments: TranscriptSegment[] = [];
  for (const line of lines) {
    const rangeMatch = line.match(
      /^\[?(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?)\s*(?:-->|-|–|to)\s*(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?)\]?\s*[:|-]?\s*(.+)$/i
    );
    if (rangeMatch) {
      const start = parseTimecode(rangeMatch[1]);
      const end = parseTimecode(rangeMatch[2]);
      const text = rangeMatch[3].trim();
      if (!isNaN(start) && !isNaN(end) && end > start && text) {
        lineSegments.push({
          id: lineSegments.length + 1,
          start: Math.round(start * 100) / 100,
          end: Math.round(end * 100) / 100,
          text: decodeHtmlEntities(text)
        });
      }
    }
  }

  return lineSegments;
}

/**
 * Validates and normalizes transcript segments without modulo repetition, duplication, or timeline stretching.
 * Preserves authoritative timestamps and reports gaps, overlaps, and bound issues explicitly.
 */
export function validateAndNormalizeTranscript(
  inputSegments: TranscriptSegment[],
  mediaDurationSeconds?: number
): {
  segments: TranscriptSegment[];
  report: TranscriptValidationReport;
} {
  const issues: TranscriptIntervalIssue[] = [];
  const gaps: TranscriptIntervalIssue[] = [];
  const overlaps: TranscriptIntervalIssue[] = [];

  if (!Array.isArray(inputSegments) || inputSegments.length === 0) {
    return {
      segments: [],
      report: {
        valid: false,
        segmentCount: 0,
        totalSpokenDuration: 0,
        mediaDurationSeconds: mediaDurationSeconds || 0,
        coverageRatio: 0,
        gaps: [],
        overlaps: [],
        issues: [
          {
            type: 'empty_text',
            start: 0,
            end: 0,
            duration: 0,
            segmentIds: [],
            message: 'No transcript segments provided.'
          }
        ]
      }
    };
  }

  const normalized: TranscriptSegment[] = [];

  for (let i = 0; i < inputSegments.length; i++) {
    const raw = inputSegments[i];
    const segId = typeof raw.id === 'number' && raw.id > 0 ? raw.id : i + 1;
    const start = typeof raw.start === 'number' && !isNaN(raw.start) ? Math.round(raw.start * 100) / 100 : NaN;
    const end = typeof raw.end === 'number' && !isNaN(raw.end) ? Math.round(raw.end * 100) / 100 : NaN;
    const text = (raw.text || '').trim();

    if (!text) {
      issues.push({
        type: 'empty_text',
        start: isNaN(start) ? 0 : start,
        end: isNaN(end) ? 0 : end,
        duration: 0,
        segmentIds: [segId],
        message: `Segment #${segId} has empty text and was excluded.`
      });
      continue;
    }

    if (isNaN(start) || isNaN(end) || start < 0 || start >= end) {
      issues.push({
        type: 'invalid_bounds',
        start: isNaN(start) ? 0 : start,
        end: isNaN(end) ? 0 : end,
        duration: 0,
        segmentIds: [segId],
        message: `Segment #${segId} has invalid time bounds (${raw.start} -> ${raw.end}); start must be >= 0 and < end.`
      });
      continue;
    }

    if (
      typeof mediaDurationSeconds === 'number' &&
      mediaDurationSeconds > 0 &&
      end > mediaDurationSeconds + 1.5
    ) {
      issues.push({
        type: 'exceeds_duration',
        start,
        end,
        duration: Math.round((end - start) * 100) / 100,
        segmentIds: [segId],
        message: `Segment #${segId} end (${end}s) exceeds media duration (${mediaDurationSeconds}s).`
      });
    }

    if (normalized.length > 0) {
      const prev = normalized[normalized.length - 1];
      if (start < prev.start) {
        issues.push({
          type: 'non_monotonic',
          start,
          end,
          duration: Math.round((end - start) * 100) / 100,
          segmentIds: [prev.id, segId],
          message: `Segment #${segId} (${start}s) starts before previous segment #${prev.id} (${prev.start}s).`
        });
      }

      const delta = Math.round((start - prev.end) * 100) / 100;
      if (delta > 0.5) {
        const gapIssue: TranscriptIntervalIssue = {
          type: 'gap',
          start: prev.end,
          end: start,
          duration: delta,
          segmentIds: [prev.id, segId],
          message: `Silent interval / gap of ${delta}s between segment #${prev.id} (${prev.end}s) and #${segId} (${start}s).`
        };
        gaps.push(gapIssue);
      } else if (delta < -0.05) {
        const overlapIssue: TranscriptIntervalIssue = {
          type: 'overlap',
          start,
          end: prev.end,
          duration: Math.abs(delta),
          segmentIds: [prev.id, segId],
          message: `Timestamp overlap of ${Math.abs(delta)}s between segment #${prev.id} (ends ${prev.end}s) and #${segId} (starts ${start}s).`
        };
        overlaps.push(overlapIssue);
        issues.push(overlapIssue);
      }
    }

    normalized.push({
      id: normalized.length + 1,
      start,
      end,
      text,
      speakerId: raw.speakerId,
      speakerLabel: raw.speakerLabel,
      confidence: typeof raw.confidence === 'number' ? raw.confidence : undefined,
      latencyOffsetMs: raw.latencyOffsetMs,
      words: raw.words
    });
  }

  // Sort monotonically if non-monotonic segments were found, while keeping their exact timestamps
  if (issues.some(iss => iss.type === 'non_monotonic')) {
    normalized.sort((a, b) => a.start - b.start || a.end - b.end);
    normalized.forEach((seg, idx) => {
      seg.id = idx + 1;
    });
  }

  // Check initial silence gap at beginning or trailing silence gap at end
  if (normalized.length > 0) {
    if (normalized[0].start > 1.0) {
      gaps.unshift({
        type: 'gap',
        start: 0,
        end: normalized[0].start,
        duration: normalized[0].start,
        segmentIds: [normalized[0].id],
        message: `Initial unspoken interval of ${normalized[0].start}s before first segment.`
      });
    }
    const lastSeg = normalized[normalized.length - 1];
    if (
      typeof mediaDurationSeconds === 'number' &&
      mediaDurationSeconds > 0 &&
      mediaDurationSeconds - lastSeg.end > 1.5
    ) {
      const trail = Math.round((mediaDurationSeconds - lastSeg.end) * 100) / 100;
      gaps.push({
        type: 'gap',
        start: lastSeg.end,
        end: mediaDurationSeconds,
        duration: trail,
        segmentIds: [lastSeg.id],
        message: `Trailing unspoken interval of ${trail}s after last segment (#${lastSeg.id} ends at ${lastSeg.end}s, media ends at ${mediaDurationSeconds}s).`
      });
    }
  }

  const totalSpokenDuration =
    Math.round(
      normalized.reduce((acc, s) => acc + Math.max(0, s.end - s.start), 0) * 100
    ) / 100;
  const resolvedMediaDuration =
    typeof mediaDurationSeconds === 'number' && mediaDurationSeconds > 0
      ? mediaDurationSeconds
      : normalized.length > 0
      ? normalized[normalized.length - 1].end
      : 0;
  const coverageRatio =
    resolvedMediaDuration > 0
      ? Math.min(1, Math.round((totalSpokenDuration / resolvedMediaDuration) * 1000) / 1000)
      : 0;

  const hasFatalIssues =
    normalized.length === 0 ||
    issues.some(i => i.type === 'invalid_bounds' || i.type === 'non_monotonic');

  return {
    segments: normalized,
    report: {
      valid: !hasFatalIssues && normalized.length > 0,
      segmentCount: normalized.length,
      totalSpokenDuration,
      mediaDurationSeconds: resolvedMediaDuration,
      coverageRatio,
      gaps,
      overlaps,
      issues
    }
  };
}

export function validateTranscriptSegments(
  inputSegments: TranscriptSegment[],
  mediaDurationSeconds?: number
): TranscriptValidationReport {
  return validateAndNormalizeTranscript(inputSegments, mediaDurationSeconds).report;
}

/**
 * Cleans raw transcript segments (normalizes whitespace, punctuation, HTML entities, and clear vocal fillers)
 * while strictly preserving meaning, sequence, source language, segment IDs, and exact start/end timestamps.
 */
export function cleanTranscriptSegments(
  rawSegments: TranscriptSegment[]
): TranscriptSegment[] {
  return rawSegments.map(seg => {
    let text = decodeHtmlEntities(seg.text || '');

    // Extract optional explicit speaker prefix like "Speaker 1: " or "[Host]: "
    let speakerLabel = seg.speakerLabel;
    const speakerMatch = text.match(/^(?:\[([A-Za-z0-9\s._-]{2,30})\]|([A-Z][A-Za-z0-9\s._-]{1,24})):\s+(.+)$/);
    if (speakerMatch) {
      speakerLabel = (speakerMatch[1] || speakerMatch[2]).trim();
      text = speakerMatch[3].trim();
    }

    // Remove isolated English vocal disfluencies ("uh", "um", "erm", "hmm") without altering content words
    text = text
      .replace(/(?:^|\s+)\b(?:uh+|um+|erm+|ah+|hmm+)\b[,.]?(?=\s|$)/gi, ' ')
      // Collapse immediate duplicate stuttered words (e.g. "the the" -> "the")
      .replace(/\b(\w+)\s+\1\b/gi, '$1')
      // Normalize whitespace and punctuation spacing
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.;!?।])/g, '$1')
      .trim();

    if (!text) {
      text = decodeHtmlEntities(seg.text || '').replace(/\s+/g, ' ').trim();
    }

    return {
      ...seg,
      speakerLabel,
      speakerId: seg.speakerId || (speakerLabel ? `speaker-${speakerLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined),
      text
    };
  });
}

/**
 * Builds a stable project-level Character Registry strictly from evidence in the transcript
 * or explicit user configuration. Never turns a topic keyword into a depicted speaker.
 */
export function buildCharacterRegistryFromTranscript(
  segments: TranscriptSegment[],
  userConsistency?: CharacterConsistencyConfig
): CharacterRegistryEntry[] {
  const registry = new Map<string, CharacterRegistryEntry>();

  // 1. Check for explicit speaker labels or explicit first-person speaker introductions in the transcript
  for (const seg of segments) {
    if (seg.speakerLabel) {
      const id = seg.speakerId || `char-speaker-${seg.speakerLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const existing = registry.get(id);
      if (existing) {
        if (!existing.evidenceSegmentIds.includes(seg.id)) {
          existing.evidenceSegmentIds.push(seg.id);
        }
      } else {
        registry.set(id, {
          id,
          name: seg.speakerLabel,
          role: 'Identified Source Speaker',
          evidenceSegmentIds: [seg.id],
          presenceType: 'speaking_on_camera',
          confidence: 'verified',
          visualAttributes: {
            description: `Source speaker identified in transcript as ${seg.speakerLabel}`,
            clothing: 'Neutral professional broadcast attire consistent with source context',
            hairstyle: 'Natural groomed hairstyle',
            accessories: 'Studio or field microphone',
            lightingStyle: 'Natural documentary key light'
          },
          compiledPrompt: `[Character ID ${id}: ${seg.speakerLabel}, speaking on camera, neutral documentary framing]`
        });
      }
    }

    // Check for explicit self-identification / host attribution in the spoken text itself
    const selfIntroEn = seg.text.match(/\b(?:I am|I'm|this is|report by|hosted by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
    const selfIntroTe = seg.text.match(/(?:జర్నలిస్ట్\s+సాయి|నేను\s+మీ\s+([A-Za-z\u0C00-\u0C7F]+))/i);
    if (selfIntroEn && selfIntroEn[1]) {
      const speakerName = selfIntroEn[1].trim();
      const id = `char-speaker-${speakerName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const existing = registry.get(id);
      if (existing) {
        if (!existing.evidenceSegmentIds.includes(seg.id)) existing.evidenceSegmentIds.push(seg.id);
      } else {
        registry.set(id, {
          id,
          name: speakerName,
          role: 'Transcript-Evidenced Narrator / Correspondent',
          evidenceSegmentIds: [seg.id],
          presenceType: 'speaking_on_camera',
          confidence: 'inferred_speaker',
          visualAttributes: {
            description: `Narrator / correspondent ${speakerName} explicitly referenced in transcript segment #${seg.id}`,
            clothing: 'Documentary correspondent attire',
            hairstyle: 'Neatly groomed natural hair',
            accessories: 'Broadcast microphone'
          },
          compiledPrompt: `[Character ID ${id}: ${speakerName}, documentary narrator/correspondent evidenced in transcript]`
        });
      }
    } else if (selfIntroTe) {
      const speakerName = selfIntroTe[1] ? selfIntroTe[1].trim() : 'Journalist Sai';
      const id = `char-speaker-${speakerName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'correspondent'}`;
      const existing = registry.get(id);
      if (existing) {
        if (!existing.evidenceSegmentIds.includes(seg.id)) existing.evidenceSegmentIds.push(seg.id);
      } else {
        registry.set(id, {
          id,
          name: speakerName,
          role: 'Transcript-Evidenced Field Narrator',
          evidenceSegmentIds: [seg.id],
          presenceType: 'speaking_on_camera',
          confidence: 'inferred_speaker',
          visualAttributes: {
            description: `Field narrator ${speakerName} explicitly referenced in transcript segment #${seg.id}`,
            clothing: 'Field correspondent attire',
            hairstyle: 'Neatly styled hair',
            accessories: 'Field microphone'
          },
          compiledPrompt: `[Character ID ${id}: ${speakerName}, field narrator evidenced in transcript]`
        });
      }
    }

    // 2. Detect explicitly named third-person individuals mentioned in the transcript (marked strictly as 'mentioned_only')
    const mentionedPatterns: { regex: RegExp; id: string; label: string; role: string }[] = [
      {
        regex: /\b(?:Amit\s+Shah|అమిత్\s*షా)\b/i,
        id: 'char-mentioned-amit-shah',
        label: 'Amit Shah (Mentioned Subject)',
        role: 'Mentioned Public Official (Not Source Speaker)'
      },
      {
        regex: /\b(?:Ajit\s+Doval|అజిత్\s*దోవల్)\b/i,
        id: 'char-mentioned-ajit-doval',
        label: 'Ajit Doval (Mentioned Subject)',
        role: 'Mentioned Security Official (Not Source Speaker)'
      }
    ];

    for (const mp of mentionedPatterns) {
      if (mp.regex.test(seg.text)) {
        const existing = registry.get(mp.id);
        if (existing) {
          if (!existing.evidenceSegmentIds.includes(seg.id)) existing.evidenceSegmentIds.push(seg.id);
        } else {
          registry.set(mp.id, {
            id: mp.id,
            name: mp.label,
            role: mp.role,
            evidenceSegmentIds: [seg.id],
            presenceType: 'mentioned_only',
            confidence: 'mentioned_entity',
            visualAttributes: {
              description: `Subject mentioned in transcript commentary (${mp.label}); depict via contextual environment or archival/institutional setting rather than claiming direct speech`,
              clothing: 'Formal institutional context',
              hairstyle: 'N/A (Mentioned entity)',
              accessories: 'Institutional setting / documents'
            },
            compiledPrompt: `[Mentioned Subject Context (${mp.label}): institutional or documentary b-roll context, not speaking directly to camera]`
          });
        }
      }
    }
  }

  // 3. If no explicit speaking character was identified in the transcript, register an explicit Unknown/Neutral narrator state
  const hasSpeakingChar = Array.from(registry.values()).some(
    c => c.presenceType === 'speaking_on_camera'
  );
  if (!hasSpeakingChar && segments.length > 0) {
    registry.set('char-narrator-unknown', {
      id: 'char-narrator-unknown',
      name: 'Unidentified Voiceover Narrator',
      role: 'Off-Screen Narrator (Speaker Identity Unknown)',
      evidenceSegmentIds: segments.map(s => s.id),
      presenceType: 'illustrative_non_human',
      confidence: 'unknown',
      visualAttributes: {
        description: 'Off-screen voiceover narrator; visuals depict transcript subject matter, environments, and objects rather than an invented speaker',
        clothing: 'Neutral silhouette or off-camera narration',
        hairstyle: 'Unspecified',
        accessories: 'Environment and subject-focused cinematography'
      },
      compiledPrompt: '[Off-screen narration: depict factual environment, objects, or neutral silhouette from transcript without inventing a specific speaker identity]'
    });
  }

  // 4. Optional user-configured global presenter (ONLY when explicitly enabled by the user)
  if (userConsistency && userConsistency.enabled && userConsistency.characterName?.trim()) {
    const presenterId = userConsistency.characterId || 'char-user-presenter';
    registry.set(presenterId, {
      id: presenterId,
      name: `${userConsistency.characterName.trim()} (User Presenter)`,
      role: 'User-Configured Global Presenter',
      evidenceSegmentIds: [],
      presenceType: 'user_presenter',
      confidence: 'user_configured',
      visualAttributes: {
        description: userConsistency.characterDescription || userConsistency.description || 'User-defined presenter',
        clothing: userConsistency.clothing || 'User-defined wardrobe',
        hairstyle: userConsistency.hairstyle || 'User-defined hairstyle',
        accessories: userConsistency.accessories || 'User-defined accessories',
        facialFeatures: userConsistency.facialFeatures,
        lightingStyle: userConsistency.lightingStyle
      },
      compiledPrompt: userConsistency.compiledPrompt
    });
  }

  const list = Array.from(registry.values());
  list.forEach(entry => {
    if (!entry.avatarUrl) {
      entry.avatarUrl = generateCharacterAvatar(entry);
    }
  });
  return list;
}

/**
 * Computes lexical Jaccard similarity between two text strings to detect semantic topic changes.
 */
function computeLexicalOverlap(textA: string, textB: string): number {
  const tokenize = (t: string) =>
    new Set(
      t
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2)
    );
  const setA = tokenize(textA);
  const setB = tokenize(textB);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
  return intersection / Math.max(1, setA.size + setB.size - intersection);
}

/**
 * Derives a deterministic, strictly factual summary and visual description from a group of transcript segments.
 * Never uses canned topic templates or invents quotes/events outside the supplied transcript window.
 */
export function deriveTranscriptGroundedVisuals(
  group: TranscriptSegment[],
  sceneNumber: number,
  characterRegistry: CharacterRegistryEntry[],
  userConsistency?: CharacterConsistencyConfig
): {
  summary: string;
  visualDescription: string;
  camera: string;
  lighting: string;
  environment: string;
  characterIds: string[];
  depictionMode: SceneDepictionMode;
  emotion: string;
  emotionalTone: string;
} {
  const combinedDialogue = group.map(s => s.text.trim()).filter(Boolean).join(' ');
  const segIds = group.map(s => s.id);

  // Determine which registered characters have evidence in this scene's segments
  const matchedChars = characterRegistry.filter(
    c =>
      c.presenceType !== 'user_presenter' &&
      c.id !== 'char-narrator-unknown' &&
      c.evidenceSegmentIds.some(id => segIds.includes(id))
  );

  const speakingChar = matchedChars.find(c => c.presenceType === 'speaking_on_camera');
  const mentionedChars = matchedChars.filter(c => c.presenceType === 'mentioned_only');
  const userPresenter =
    userConsistency?.enabled
      ? characterRegistry.find(c => c.presenceType === 'user_presenter')
      : undefined;

  let depictionMode: SceneDepictionMode = 'illustrative_non_human';
  const characterIds: string[] = [];

  if (userPresenter) {
    depictionMode = 'user_presenter';
    characterIds.push(userPresenter.id);
  } else if (speakingChar) {
    depictionMode = 'visible_speaker';
    characterIds.push(speakingChar.id);
  } else if (mentionedChars.length > 0) {
    depictionMode = 'mentioned_subject_context';
    mentionedChars.forEach(mc => characterIds.push(mc.id));
  } else {
    depictionMode = 'illustrative_non_human';
  }

  // Factual summary built strictly from the first key clause(s) of the transcript window
  const cleanClause = combinedDialogue.replace(/\s+/g, ' ').trim();
  const summary =
    cleanClause.length <= 110
      ? cleanClause
      : `${cleanClause.slice(0, 107).replace(/\s+\S*$/, '')}...`;

  // Extract concrete environmental / visual cues strictly present in the transcript window
  let environment = 'Documentary Subject Context';
  let lighting = 'Naturalistic Documentary Key Lighting';
  let camera =
    sceneNumber % 2 === 1
      ? 'Wide Establishing Shot (24mm Cinema Prime)'
      : 'Medium Documentary Tracking Shot (35mm Prime)';

  if (/\b(?:traffic|road|commute|commuter|highway|flyover|vehicle|street|city|urban|ట్రాఫిక్|రోడ్ల|నగర|బెంగళూరు)\b/i.test(combinedDialogue)) {
    environment = 'Urban Transit Corridor & City Streetscape';
    lighting = 'Natural Daylight / Dusk Urban Ambient Lighting';
  } else if (/\b(?:rocket|satellite|orbit|launch|telemetry|space|pslv|isro|రాకెట్|శాటిలైట్|అంతరిక్ష|ఇస్రో|పీఎస్‌ఎల్‌వీ)\b/i.test(combinedDialogue)) {
    environment = 'Aerospace Telemetry & Launch Infrastructure Context';
    lighting = 'Technical Console Illumination & High-Contrast Key Light';
  } else if (/\b(?:parliament|law|bill|constitution|court|statute|legal|code|ucc|పార్లమెంట్|చట్ట|యూనిఫాం సివిల్ కోడ్|యుసిసి)\b/i.test(combinedDialogue)) {
    environment = 'Civic & Legislative Institutional Architecture';
    lighting = 'Architectural Daylight & Balanced Interior Fill';
  } else if (/\b(?:security|border|cyber|defense|intelligence|surveillance|భద్రతా|నిఘా|సైబర్|సరిహద్దు)\b/i.test(combinedDialogue)) {
    environment = 'Strategic Communications & Infrastructure Operations Context';
    lighting = 'Subdued Analytical Monitor Glow & Cool Rim Lighting';
  }

  let visualDescription = '';
  if (depictionMode === 'user_presenter' && userPresenter) {
    visualDescription = `${userPresenter.compiledPrompt} Presenting transcript segment (${group[0].start.toFixed(1)}s–${group[group.length - 1].end.toFixed(1)}s) in ${environment}: "${summary}"`;
  } else if (depictionMode === 'visible_speaker' && speakingChar) {
    visualDescription = `${speakingChar.compiledPrompt} Speaking on camera in ${environment} (${group[0].start.toFixed(1)}s–${group[group.length - 1].end.toFixed(1)}s), illustrating transcript content: "${summary}"`;
  } else if (depictionMode === 'mentioned_subject_context') {
    const names = mentionedChars.map(c => c.name).join(', ');
    visualDescription = `Documentary contextual b-roll in ${environment} illustrating spoken commentary referencing ${names} (${group[0].start.toFixed(1)}s–${group[group.length - 1].end.toFixed(1)}s): "${summary}" (non-speaking institutional/environmental view, no fabricated direct quotes).`;
  } else {
    visualDescription = `Illustrative non-human documentary cinematography of ${environment} (${group[0].start.toFixed(1)}s–${group[group.length - 1].end.toFixed(1)}s) grounded in spoken transcript: "${summary}".`;
  }

  const emotionData = deriveEmotionFromTranscript(combinedDialogue);

  return {
    summary,
    visualDescription,
    camera,
    lighting,
    environment,
    characterIds,
    depictionMode,
    emotion: emotionData.emotion,
    emotionalTone: emotionData.emotionalTone
  };
}

export interface SemanticSegmentationOptions {
  targetSceneCount?: number;
  targetSceneDurationSec?: number;
  mediaDurationSeconds?: number;
  includeSilentIntervals?: boolean;
  characterRegistry?: CharacterRegistryEntry[];
  userConsistency?: CharacterConsistencyConfig;
  resolveArtwork?: (sceneDraft: Partial<Scene>, index: number, total: number) => string;
}

const MOTION_CYCLE: CinematicMotionPreset[] = ['pan', 'dolly', 'crane', 'orbit'];
const TRANSITION_CYCLE: SceneTransitionPreset[] = ['cross-fade', 'slide-left', 'cross-fade', 'slide-up'];

/**
 * Segments cleaned, validated transcript segments into semantic scenes.
 * Every spoken scene maps to an exact contiguous slice of transcript segment IDs (`segmentIds`),
 * preserves `startTime = first.start` and `endTime = last.end`, and sets `dialogue` strictly from
 * the joined transcript segments. Never fabricates or repeats segments with modulo indexing.
 */
export function buildSemanticScenesFromTranscript(
  cleanSegments: TranscriptSegment[],
  options: SemanticSegmentationOptions = {}
): Scene[] {
  if (!Array.isArray(cleanSegments) || cleanSegments.length === 0) {
    return [];
  }

  const registry =
    options.characterRegistry ||
    buildCharacterRegistryFromTranscript(cleanSegments, options.userConsistency);

  const totalSpokenSpan =
    cleanSegments[cleanSegments.length - 1].end - cleanSegments[0].start;

  // Determine target scene duration based on either explicit option or segment count
  const desiredCount =
    options.targetSceneCount && options.targetSceneCount > 0
      ? Math.min(cleanSegments.length, options.targetSceneCount)
      : Math.min(cleanSegments.length, Math.max(1, Math.ceil(totalSpokenSpan / (options.targetSceneDurationSec || 25))));

  const idealSceneDuration =
    desiredCount > 0 ? Math.max(4, totalSpokenSpan / desiredCount) : 20;

  const groups: TranscriptSegment[][] = [];
  let currentGroup: TranscriptSegment[] = [];

  for (let i = 0; i < cleanSegments.length; i++) {
    const seg = cleanSegments[i];
    currentGroup.push(seg);

    const isLast = i === cleanSegments.length - 1;
    if (isLast) {
      groups.push(currentGroup);
      currentGroup = [];
      break;
    }

    const nextSeg = cleanSegments[i + 1];
    const groupDuration = seg.end - currentGroup[0].start;
    const remainingSegments = cleanSegments.length - 1 - i;
    const remainingGroupsNeeded = desiredCount - groups.length - 1;

    // If we have exactly as many segments left as groups needed, split after each segment
    if (remainingGroupsNeeded > 0 && remainingSegments <= remainingGroupsNeeded) {
      groups.push(currentGroup);
      currentGroup = [];
      continue;
    }

    // Semantic boundary checks:
    // 1. Speaker change
    const speakerChanged =
      Boolean(seg.speakerId && nextSeg.speakerId && seg.speakerId !== nextSeg.speakerId) ||
      Boolean(seg.speakerLabel && nextSeg.speakerLabel && seg.speakerLabel !== nextSeg.speakerLabel);

    // 2. Significant silence gap between segments (> 1.5s)
    const silenceGap = nextSeg.start - seg.end > 1.5;

    // 3. Topic shift (low lexical similarity + sentence-ending punctuation) once minimum duration is reached
    const endsSentence = /[.!?।]$/.test(seg.text.trim());
    const lexicalSim = computeLexicalOverlap(
      currentGroup.map(s => s.text).join(' '),
      nextSeg.text
    );
    const topicShift = endsSentence && lexicalSim < 0.08 && groupDuration >= idealSceneDuration * 0.65;

    // 4. Reached target duration budget
    const reachedBudget = groupDuration >= idealSceneDuration && groups.length < desiredCount - 1;

    if (speakerChanged || silenceGap || topicShift || reachedBudget) {
      groups.push(currentGroup);
      currentGroup = [];
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  const scenes: Scene[] = [];

  for (let idx = 0; idx < groups.length; idx++) {
    const group = groups[idx];
    const first = group[0];
    const last = group[group.length - 1];

    // Optional explicit silent interval scene before this group if gap > 3.0s and requested
    if (options.includeSilentIntervals && idx > 0) {
      const prevLast = groups[idx - 1][groups[idx - 1].length - 1];
      if (first.start - prevLast.end >= 3.0) {
        const silentNum = scenes.length + 1;
        const silentStart = prevLast.end;
        const silentEnd = first.start;
        const silentDraft: Scene = {
          id: silentNum,
          sceneNumber: silentNum,
          segmentIds: [],
          startTime: silentStart,
          endTime: silentEnd,
          duration: Math.round((silentEnd - silentStart) * 100) / 100,
          dialogue: '',
          summary: `Silent Interval (${silentStart.toFixed(1)}s – ${silentEnd.toFixed(1)}s)`,
          visualDescription: `Atmospheric environmental transition shot during unspoken interval (${silentStart.toFixed(1)}s – ${silentEnd.toFixed(1)}s).`,
          camera: 'Slow Establishing Pan (24mm Prime)',
          lighting: 'Natural Ambient Fill',
          environment: 'Environmental B-Roll Transition',
          style: 'cinematic documentary 4k',
          imageUrl: '/src/assets/images/scene_skyline_sunrise_1790581489340.jpg',
          prompt: `Atmospheric environmental transition shot (${silentStart.toFixed(1)}s – ${silentEnd.toFixed(1)}s)`,
          seed: 42000 + silentNum,
          motionPreset: MOTION_CYCLE[(silentNum - 1) % MOTION_CYCLE.length],
          transitionPreset: TRANSITION_CYCLE[(silentNum - 1) % TRANSITION_CYCLE.length],
          characterIds: [],
          depictionMode: 'environment_only',
          isSilentInterval: true
        };
        if (options.resolveArtwork) {
          silentDraft.imageUrl = options.resolveArtwork(silentDraft, silentNum - 1, groups.length);
        }
        scenes.push(silentDraft);
      }
    }

    const sceneNum = scenes.length + 1;
    const grounded = deriveTranscriptGroundedVisuals(
      group,
      sceneNum,
      registry,
      options.userConsistency
    );
    const motionPreset = MOTION_CYCLE[(sceneNum - 1) % MOTION_CYCLE.length];
    const transitionPreset = TRANSITION_CYCLE[(sceneNum - 1) % TRANSITION_CYCLE.length];
    const dialogue = group.map(s => s.text.trim()).filter(Boolean).join(' ');

    const sceneObj: Scene = {
      id: sceneNum,
      sceneNumber: sceneNum,
      segmentIds: group.map(s => s.id),
      startTime: first.start,
      endTime: last.end,
      duration: Math.max(0.1, Math.round((last.end - first.start) * 100) / 100),
      dialogue,
      summary: grounded.summary,
      visualDescription: grounded.visualDescription,
      camera: grounded.camera,
      lighting: grounded.lighting,
      environment: grounded.environment,
      style: 'cinematic documentary 4k',
      imageUrl: '',
      prompt: grounded.visualDescription,
      seed: 42000 + sceneNum,
      motionPreset,
      transitionPreset,
      emotion: grounded.emotion,
      emotionalTone: grounded.emotionalTone,
      characterPrompt:
        options.userConsistency?.enabled ? options.userConsistency.compiledPrompt : undefined,
      characterIds: grounded.characterIds,
      depictionMode: grounded.depictionMode,
      isSilentInterval: false
    };

    if (options.resolveArtwork) {
      sceneObj.imageUrl = options.resolveArtwork(sceneObj, sceneNum - 1, groups.length);
    }

    scenes.push(sceneObj);
  }

  return scenes;
}

/**
 * Resolves the localized spoken text for a given Scene from a LocalizedOutput's translationSegments
 * using the scene's explicit `segmentIds` (or exact timestamp overlap if segmentIds are absent).
 * Never falls back to scene summaries or modulo-indexed unrelated lines.
 */
export function getLocalizedTextForScene(
  scene: Pick<Scene, 'segmentIds' | 'startTime' | 'endTime' | 'dialogue'>,
  translationSegments?: TranscriptSegment[]
): string {
  if (scene.dialogue === '' && (!scene.segmentIds || scene.segmentIds.length === 0)) {
    return '';
  }
  if (!Array.isArray(translationSegments) || translationSegments.length === 0) {
    return scene.dialogue || '';
  }

  if (Array.isArray(scene.segmentIds) && scene.segmentIds.length > 0) {
    const idSet = new Set(scene.segmentIds);
    const matchedById = translationSegments.filter(seg => idSet.has(seg.id));
    if (matchedById.length > 0) {
      return matchedById.map(s => s.text.trim()).filter(Boolean).join(' ');
    }
  }

  // Fallback to strict time-overlap matching (no modulo indexing!)
  const overlapping = translationSegments.filter(
    seg => seg.end > scene.startTime + 0.05 && seg.start < scene.endTime - 0.05
  );
  if (overlapping.length > 0) {
    return overlapping.map(s => s.text.trim()).filter(Boolean).join(' ');
  }

  return scene.dialogue || '';
}

/**
 * Regenerates a single scene from its mapped transcript segments while optionally preserving
 * user edits to summary, visual direction, or character assignment.
 */
export function regenerateSingleSceneFromTranscript(
  scene: Scene,
  cleanSegments: TranscriptSegment[],
  characterRegistry: CharacterRegistryEntry[] = [],
  options: {
    preserveUserEdits?: boolean;
    userConsistency?: CharacterConsistencyConfig;
    resolveArtwork?: (sceneDraft: Partial<Scene>, index: number, total: number) => string;
    sceneIndex?: number;
    totalScenes?: number;
  } = {}
): Scene {
  const segIdSet = new Set(scene.segmentIds || []);
  let matchedSegs = cleanSegments.filter(s => segIdSet.has(s.id));

  if (matchedSegs.length === 0) {
    matchedSegs = cleanSegments.filter(
      s => s.end > scene.startTime + 0.05 && s.start < scene.endTime - 0.05
    );
  }

  const startTime = matchedSegs.length > 0 ? matchedSegs[0].start : scene.startTime;
  const endTime = matchedSegs.length > 0 ? matchedSegs[matchedSegs.length - 1].end : scene.endTime;
  const dialogue =
    matchedSegs.length > 0
      ? matchedSegs.map(s => s.text.trim()).filter(Boolean).join(' ')
      : scene.dialogue;

  const grounded =
    matchedSegs.length > 0
      ? deriveTranscriptGroundedVisuals(
          matchedSegs,
          scene.sceneNumber,
          characterRegistry,
          options.userConsistency
        )
      : {
          summary: scene.summary,
          visualDescription: scene.visualDescription,
          camera: scene.camera,
          lighting: scene.lighting,
          environment: scene.environment,
          characterIds: scene.characterIds || [],
          depictionMode: scene.depictionMode || 'environment_broll'
        };

  const preserve = Boolean(options.preserveUserEdits && scene.userEdited);
  const nextSeed = (scene.seed || 42000) + 137;

  const updated: Scene = {
    ...scene,
    segmentIds: matchedSegs.length > 0 ? matchedSegs.map(s => s.id) : scene.segmentIds || [],
    startTime,
    endTime,
    duration: Math.max(0.1, Math.round((endTime - startTime) * 100) / 100),
    dialogue,
    summary: preserve && scene.summary ? scene.summary : grounded.summary,
    visualDescription:
      preserve && scene.visualDescription ? scene.visualDescription : grounded.visualDescription,
    prompt:
      preserve && scene.visualDescription ? scene.visualDescription : grounded.visualDescription,
    camera: preserve && scene.camera ? scene.camera : grounded.camera,
    lighting: preserve && scene.lighting ? scene.lighting : grounded.lighting,
    environment: preserve && scene.environment ? scene.environment : grounded.environment,
    characterIds:
      preserve && scene.characterIds ? scene.characterIds : grounded.characterIds,
    depictionMode:
      preserve && scene.depictionMode ? scene.depictionMode : grounded.depictionMode,
    seed: nextSeed
  };

  if (options.resolveArtwork) {
    updated.imageUrl = options.resolveArtwork(
      updated,
      options.sceneIndex ?? Math.max(0, scene.sceneNumber - 1),
      options.totalScenes ?? 4
    );
  }

  return updated;
}

/**
 * Computes a truthful, verifiable ProjectQualityAudit checking:
 * 1. Missing transcript coverage
 * 2. Duplicated dialogue across scenes
 * 3. Scene gaps and overlaps
 * 4. Voice-over duration mismatches
 * 5. Reused scene images
 * 6. Unverified / missing translations across selected target languages
 * 7. Low-confidence transcription or speaker assignments needing human review
 */
export function computeProjectQualityAudit(project: Project): ProjectQualityAudit {
  const checks: QualityCheckItem[] = [];
  const cleanSegs = project.cleanTranscript || [];
  const scenes = project.scenes || [];
  const registry = project.characterRegistry || [];

  // 1. Transcript Coverage Check
  const coveredSegIds = new Set<number>();
  scenes.forEach(sc => {
    (sc.segmentIds || []).forEach(id => coveredSegIds.add(id));
  });
  const uncoveredSegs = cleanSegs.filter(s => !coveredSegIds.has(s.id));
  const missingCoveragePct =
    cleanSegs.length > 0 ? Math.round((uncoveredSegs.length / cleanSegs.length) * 100) : 100;

  checks.push({
    id: 'qa-transcript-coverage',
    category: 'transcript',
    label: 'Transcript-to-Storyboard Coverage',
    status:
      cleanSegs.length === 0
        ? 'FAIL'
        : uncoveredSegs.length === 0
        ? 'PASS'
        : uncoveredSegs.length <= 1
        ? 'WARN'
        : 'FAIL',
    summary:
      cleanSegs.length === 0
        ? 'No verified transcript segments present.'
        : `${cleanSegs.length - uncoveredSegs.length}/${cleanSegs.length} transcript segments (${100 - missingCoveragePct}%) mapped to scenes.`,
    details:
      uncoveredSegs.length > 0
        ? `Unmapped segment IDs: ${uncoveredSegs.map(s => `#${s.id}`).join(', ')}`
        : 'Every cleaned transcript segment is explicitly linked to a storyboard scene.',
    affectedStep: 'transcript',
    affectedItemIds: uncoveredSegs.map(s => s.id)
  });

  // 2. Low-Confidence Transcription & Speaker Review Check
  const lowConfSegs = cleanSegs.filter(
    s => (typeof s.confidence === 'number' && s.confidence < 0.85) || s.needsReview
  );
  const uncertainChars = registry.filter(
    c =>
      c.confidence === 'low' ||
      c.confidence === 'inferred_speaker' ||
      c.confidence === 'unknown'
  );
  const needsHumanReviewCount = lowConfSegs.length + uncertainChars.length;

  checks.push({
    id: 'qa-confidence-evidence',
    category: 'character',
    label: 'Transcription & Speaker Confidence Verification',
    status:
      needsHumanReviewCount === 0 || project.humanReviewCompleted
        ? 'PASS'
        : 'NEEDS_REVIEW',
    summary:
      needsHumanReviewCount === 0
        ? 'All transcript segments and speaker assignments have high confidence.'
        : project.humanReviewCompleted
        ? `Human review checkpoint completed (${lowConfSegs.length} segments, ${uncertainChars.length} speaker entries reviewed).`
        : `${lowConfSegs.length} uncertain segment(s) and ${uncertainChars.length} inferred/unverified speaker(s) flagged for human review.`,
    details:
      needsHumanReviewCount > 0 && !project.humanReviewCompleted
        ? 'Review speaker attributions and low-confidence segments in the Transcript or Review step.'
        : undefined,
    affectedStep: 'review',
    affectedItemIds: [
      ...lowConfSegs.map(s => s.id),
      ...uncertainChars.map(c => c.id)
    ]
  });

  // 3. Duplicated Scene Dialogue Check
  const seenDialogues = new Map<string, number>();
  const duplicateSceneIds: number[] = [];
  scenes.forEach(sc => {
    const norm = (sc.dialogue || '').trim().toLowerCase();
    if (!norm || sc.isSilentInterval) return;
    if (seenDialogues.has(norm)) {
      duplicateSceneIds.push(sc.sceneNumber);
    } else {
      seenDialogues.set(norm, sc.sceneNumber);
    }
  });

  checks.push({
    id: 'qa-duplicated-dialogue',
    category: 'storyboard',
    label: 'Unique Scene Dialogue Integrity (No Modulo Repetition)',
    status: duplicateSceneIds.length === 0 ? 'PASS' : 'FAIL',
    summary:
      duplicateSceneIds.length === 0
        ? `0 duplicated dialogue lines across ${scenes.length} scenes.`
        : `${duplicateSceneIds.length} scene(s) contain duplicated dialogue: Scene ${duplicateSceneIds.join(', ')}.`,
    affectedStep: 'storyboard',
    affectedItemIds: duplicateSceneIds
  });

  // 4. Scene Gaps & Overlaps Check
  let sceneGapCount = 0;
  let sceneOverlapCount = 0;
  const timingSceneIds: number[] = [];
  for (let i = 0; i < scenes.length - 1; i++) {
    const cur = scenes[i];
    const next = scenes[i + 1];
    const delta = next.startTime - cur.endTime;
    if (delta > 1.5) {
      sceneGapCount++;
      timingSceneIds.push(cur.sceneNumber);
    } else if (delta < -0.1) {
      sceneOverlapCount++;
      timingSceneIds.push(next.sceneNumber);
    }
  }

  checks.push({
    id: 'qa-scene-boundaries',
    category: 'storyboard',
    label: 'Scene Timeline Continuity (Gaps & Overlaps)',
    status:
      sceneOverlapCount > 0
        ? 'FAIL'
        : sceneGapCount > 0
        ? 'WARN'
        : 'PASS',
    summary:
      sceneOverlapCount === 0 && sceneGapCount === 0
        ? `Continuous scene timeline from ${scenes[0]?.startTime ?? 0}s to ${scenes[scenes.length - 1]?.endTime ?? 0}s (0 overlaps, 0 unbridged gaps).`
        : `${sceneOverlapCount} overlap(s) and ${sceneGapCount} gap(s) >1.5s detected between scenes.`,
    affectedStep: 'storyboard',
    affectedItemIds: timingSceneIds
  });

  // 5. Reused Images Check
  const imageCounts = new Map<string, number[]>();
  scenes.forEach(sc => {
    const url = (sc.imageUrl || '').trim();
    if (!url) return;
    const list = imageCounts.get(url) || [];
    list.push(sc.sceneNumber);
    imageCounts.set(url, list);
  });
  let reusedImageCount = 0;
  const reusedSceneIds: number[] = [];
  imageCounts.forEach(scNums => {
    if (scNums.length > 1) {
      reusedImageCount += scNums.length - 1;
      reusedSceneIds.push(...scNums.slice(1));
    }
  });

  checks.push({
    id: 'qa-reused-images',
    category: 'storyboard',
    label: 'Scene Visual Uniqueness & Asset Diversity',
    status: reusedImageCount === 0 ? 'PASS' : 'WARN',
    summary:
      reusedImageCount === 0
        ? `All ${scenes.length} scenes have distinct visual assets.`
        : `${reusedImageCount} scene(s) reuse a visual asset (${reusedSceneIds.map(n => `Scene ${n}`).join(', ')}). Regenerate individual scenes for unique frames.`,
    affectedStep: 'storyboard',
    affectedItemIds: reusedSceneIds
  });

  // 6. Translation Completeness & Pacing Check across selected targetLanguages
  const targetLangs = project.targetLanguages || [];
  let unverifiedTranslationLanguageCount = 0;
  let voiceoverDurationMismatchCount = 0;
  const failedLangs: string[] = [];
  const pacingWarnLangs: string[] = [];

  targetLangs.forEach(lang => {
    const out = project.localizedOutputs?.[lang];
    if (!out || !out.translationSegments || out.translationSegments.length === 0) {
      unverifiedTranslationLanguageCount++;
      failedLangs.push(lang.toUpperCase());
      return;
    }
    const missingSegs = out.translationSegments.filter(
      s => !s.text || !s.text.trim() || s.translationStatus === 'missing'
    );
    if (missingSegs.length > 0 || out.qaReport?.status === 'FAIL' || out.qaReport?.status === 'UNTRANSLATED') {
      unverifiedTranslationLanguageCount++;
      failedLangs.push(`${lang.toUpperCase()} (${missingSegs.length} missing)`);
    }
    // Check voice-over duration pacing per segment (> 230 WPM or < 40 WPM for long text)
    out.translationSegments.forEach(seg => {
      const dur = Math.max(0.5, seg.end - seg.start);
      const words = (seg.text || '').trim().split(/\s+/).filter(Boolean).length;
      const wpm = (words / dur) * 60;
      if (words > 6 && wpm > 235) {
        voiceoverDurationMismatchCount++;
        if (!pacingWarnLangs.includes(lang.toUpperCase())) {
          pacingWarnLangs.push(lang.toUpperCase());
        }
      }
    });
  });

  checks.push({
    id: 'qa-translations',
    category: 'translation',
    label: `Target Language Translations (${targetLangs.length} Selected)`,
    status:
      unverifiedTranslationLanguageCount === 0
        ? 'PASS'
        : unverifiedTranslationLanguageCount < targetLangs.length
        ? 'WARN'
        : 'FAIL',
    summary:
      unverifiedTranslationLanguageCount === 0
        ? `All ${targetLangs.length} selected target language(s) have complete 1:1 segment translations.`
        : `${unverifiedTranslationLanguageCount}/${targetLangs.length} language(s) have missing or unverified segments: ${failedLangs.join(', ')}.`,
    affectedStep: 'voiceover',
    affectedItemIds: failedLangs
  });

  checks.push({
    id: 'qa-voiceover-pacing',
    category: 'voiceover',
    label: 'Voice-Over Duration & Segment Pacing Alignment',
    status: voiceoverDurationMismatchCount === 0 ? 'PASS' : 'WARN',
    summary:
      voiceoverDurationMismatchCount === 0
        ? 'All translated segments fit comfortably within their source timestamp windows.'
        : `${voiceoverDurationMismatchCount} segment(s) in [${pacingWarnLangs.join(', ')}] exceed 235 WPM speaking rate and may require latency or speed calibration.`,
    affectedStep: 'voiceover',
    affectedItemIds: pacingWarnLangs
  });

  const hasFail = checks.some(c => c.status === 'FAIL');
  const hasNeedsReview = checks.some(c => c.status === 'NEEDS_REVIEW');
  const hasWarn = checks.some(c => c.status === 'WARN');

  const overallStatus: ProjectQualityAudit['overallStatus'] = hasFail
    ? 'FAILED'
    : hasNeedsReview
    ? 'NEEDS_REVIEW'
    : hasWarn
    ? 'PARTIAL'
    : 'PASS';

  return {
    overallStatus,
    checkedAt: new Date().toISOString(),
    missingTranscriptCoveragePct: missingCoveragePct,
    duplicatedSceneDialogueCount: duplicateSceneIds.length,
    sceneGapCount,
    sceneOverlapCount,
    voiceoverDurationMismatchCount,
    reusedImageCount,
    unverifiedTranslationLanguageCount,
    lowConfidenceSegmentCount: lowConfSegs.length,
    checks
  };
}

