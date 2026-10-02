import { StageName, ProjectLogEntry } from '../types';

export const PIPELINE_ERROR_CODES = {
  ERR_GEMINI_TIMEOUT: {
    code: 'ERR_GEMINI_TIMEOUT',
    label: 'Gemini AI Upstream Gateway Timeout',
    defaultDetail: 'LLM response exceeded 6000ms latency ceiling. Network or model generation pipeline delay.',
    defaultRecovery: 'Automatically engaged deterministic FOSS Content-Aware Scene Extractor and SDXL ComfyUI baseline.'
  },
  ERR_GEMINI_QUOTA: {
    code: 'ERR_GEMINI_QUOTA',
    label: 'Upstream Quota Rate Limit (HTTP 429)',
    defaultDetail: 'Upstream Gemini API token bucket reached rate-limit threshold.',
    defaultRecovery: 'Seamlessly switched to local heuristic translation & scene synthesis pipeline.'
  },
  ERR_FFMPEG_RENDER_CRASH: {
    code: 'ERR_FFMPEG_RENDER_CRASH',
    label: 'FFmpeg 7.0 Hardware Encoder Pipeline Crash',
    defaultDetail: 'NVENC hardware acceleration thread encountered VRAM allocation spike on 4K Ken Burns render.',
    defaultRecovery: 'Fallback to libx264 CPU software multiplexer with deterministic YUV420p color matrix.'
  },
  ERR_STT_ACOUSTIC_ANOMALY: {
    code: 'ERR_STT_ACOUSTIC_ANOMALY',
    label: 'Whisper STT Acoustic Alignment Anomaly',
    defaultDetail: 'Confidence dropped below 0.65 on high-speed speech segment.',
    defaultRecovery: 'Applied CTC forced-aligner with phonetic language boundary normalization.'
  },
  ERR_NLLB_TRANSLATION_DRIFT: {
    code: 'ERR_NLLB_TRANSLATION_DRIFT',
    label: 'NLLB-200 Syllable Length Drift',
    defaultDetail: 'Target translated token count exceeded 1.4x source duration window.',
    defaultRecovery: 'Dynamic sentence compression and subtitle line-break balancing applied.'
  },
  ERR_AUDIO_LOUDNORM_VARIANCE: {
    code: 'ERR_AUDIO_LOUDNORM_VARIANCE',
    label: 'EBU R128 Loudness Variance',
    defaultDetail: 'Input stream exceeded -14 LUFS peak loudness target.',
    defaultRecovery: 'Applied FFmpeg loudnorm two-pass filter with -16.0 LUFS target and 1.5 LRA limit.'
  },
  ERR_STREAM_MISMATCH: {
    code: 'ERR_STREAM_MISMATCH',
    label: 'YouTube Stream Duration Mismatch',
    defaultDetail: 'Actual remote stream length deviated significantly from user expected baseline.',
    defaultRecovery: 'Pre-flight check intercepted stream and requested user confirmation.'
  }
} as const;

export type PipelineErrorCode = keyof typeof PIPELINE_ERROR_CODES;

/**
 * Creates a structured diagnostic log entry with timestamp and optional error tracking
 */
export function createDiagnosticLog(
  stage: string,
  level: 'INFO' | 'WARNING' | 'ERROR',
  message: string,
  errorCode?: string,
  details?: string,
  recoveryAction?: string
): ProjectLogEntry {
  const now = new Date();
  const timestamp = now.toTimeString().split(' ')[0];

  return {
    timestamp,
    stage,
    level,
    message,
    errorCode,
    details,
    recoveryAction
  };
}

/**
 * Global Pipeline Error Tracking Middleware
 * Intercepts stage transitions, records performance metrics, captures specific failure points,
 * and maintains self-healing diagnostic traces.
 */
export class PipelineErrorTracker {
  private logs: ProjectLogEntry[] = [];
  private onLogChange?: (logs: ProjectLogEntry[]) => void;

  constructor(initialLogs: ProjectLogEntry[] = [], onLogChange?: (logs: ProjectLogEntry[]) => void) {
    this.logs = [...initialLogs];
    this.onLogChange = onLogChange;
  }

  public getLogs(): ProjectLogEntry[] {
    return [...this.logs];
  }

  public logInfo(stage: string, message: string): ProjectLogEntry {
    const entry = createDiagnosticLog(stage, 'INFO', message);
    this.appendLog(entry);
    return entry;
  }

  public logWarning(
    stage: string,
    message: string,
    errorCode?: PipelineErrorCode | string,
    details?: string,
    recoveryAction?: string
  ): ProjectLogEntry {
    const meta = errorCode && errorCode in PIPELINE_ERROR_CODES
      ? PIPELINE_ERROR_CODES[errorCode as PipelineErrorCode]
      : null;

    const entry = createDiagnosticLog(
      stage,
      'WARNING',
      message,
      errorCode,
      details || meta?.defaultDetail,
      recoveryAction || meta?.defaultRecovery
    );
    this.appendLog(entry);
    return entry;
  }

  public logError(
    stage: string,
    message: string,
    errorCode?: PipelineErrorCode | string,
    details?: string,
    recoveryAction?: string
  ): ProjectLogEntry {
    const meta = errorCode && errorCode in PIPELINE_ERROR_CODES
      ? PIPELINE_ERROR_CODES[errorCode as PipelineErrorCode]
      : null;

    const entry = createDiagnosticLog(
      stage,
      'ERROR',
      message,
      errorCode,
      details || meta?.defaultDetail,
      recoveryAction || meta?.defaultRecovery
    );
    this.appendLog(entry);
    return entry;
  }

  public simulateFailurePoint(errorCode: PipelineErrorCode): ProjectLogEntry {
    const meta = PIPELINE_ERROR_CODES[errorCode];
    let stage: StageName = 'STORYBOARD';
    if (errorCode === 'ERR_FFMPEG_RENDER_CRASH') stage = 'RENDER';
    if (errorCode === 'ERR_NLLB_TRANSLATION_DRIFT') stage = 'TRANSLATION';
    if (errorCode === 'ERR_STT_ACOUSTIC_ANOMALY') stage = 'TRANSCRIPTION';
    if (errorCode === 'ERR_AUDIO_LOUDNORM_VARIANCE') stage = 'AUDIO_NORM';
    if (errorCode === 'ERR_STREAM_MISMATCH') stage = 'INGESTION';

    return this.logError(
      stage,
      `[SIMULATED] Failure point detected: ${meta.label}`,
      errorCode,
      meta.defaultDetail,
      meta.defaultRecovery
    );
  }

  /**
   * Middleware hook: Intercepts server-side diagnostics and maps them into structured project logs
   */
  public interceptApiDiagnostics(diagnostics: any[]): ProjectLogEntry[] {
    if (!Array.isArray(diagnostics) || diagnostics.length === 0) return [];
    const created: ProjectLogEntry[] = [];
    for (const d of diagnostics) {
      const stage = d.stage || 'STORYBOARD';
      const level = d.level === 'ERROR' ? 'ERROR' : d.level === 'WARNING' ? 'WARNING' : 'INFO';
      const code = d.errorCode;
      const msg = d.message || 'Diagnostic notice recorded';
      const details = d.details;
      const recovery = d.recoveryAction;

      const entry = createDiagnosticLog(stage, level, msg, code, details, recovery);
      this.appendLog(entry);
      created.push(entry);
    }
    return created;
  }

  /**
   * Middleware hook: Handles unexpected pipeline exceptions, maps to known error codes and logs self-healing action
   */
  public handleStageFailure(
    stage: StageName,
    error: any,
    defaultCode: PipelineErrorCode = 'ERR_GEMINI_TIMEOUT'
  ): ProjectLogEntry {
    const errMsg = error?.message || String(error || 'Unknown pipeline exception');
    let code: PipelineErrorCode = defaultCode;

    if (/quota|429|resource_exhausted/i.test(errMsg)) {
      code = 'ERR_GEMINI_QUOTA';
    } else if (/timeout|abort|deadline/i.test(errMsg)) {
      code = 'ERR_GEMINI_TIMEOUT';
    } else if (/ffmpeg|encode|render|nvenc|cuda/i.test(errMsg)) {
      code = 'ERR_FFMPEG_RENDER_CRASH';
    } else if (/whisper|acoustic|audio|speech/i.test(errMsg)) {
      code = 'ERR_STT_ACOUSTIC_ANOMALY';
    } else if (/translate|nllb|drift/i.test(errMsg)) {
      code = 'ERR_NLLB_TRANSLATION_DRIFT';
    }

    const meta = PIPELINE_ERROR_CODES[code];
    return this.logError(
      stage,
      `Pipeline exception in ${stage}: ${meta.label}`,
      code,
      errMsg || meta.defaultDetail,
      meta.defaultRecovery
    );
  }

  private appendLog(entry: ProjectLogEntry) {
    this.logs.push(entry);
    if (this.onLogChange) {
      this.onLogChange(this.logs);
    }
  }
}
