export interface ParticipantManifest {
  samples: Array<{
    sample_id?: string;
    files: Record<string, { filename: string; sha256?: string; size?: number; url?: string }>;
    metadata?: Record<string, unknown>;
  }>;
  sample_sheet?: { filename?: string; sha256?: string; size?: number; url?: string };
}

export interface ParticipantDownloadFile {
  filename: string;
  sha256?: string;
  size?: number;
  url?: string;
}

export interface ParticipantFileView {
  filename: string;
  size: number | null;
  url: string;
}

export interface ParticipantSampleView {
  public_name: string;
  participant_files: Record<string, ParticipantFileView | null>;
  [key: string]: unknown;
}

const PARTICIPANT_FILE_COLUMNS = {
  assembly: 'FASTA_URL',
  read_1: 'R1_URL',
  read_2: 'R2_URL',
  long_reads: 'LONG_READ_URL',
} as const;

export const DEFAULT_SAMPLE_SHEET_FILENAME = 'sample_sheet.csv';

export function buildParticipantSampleView(
  sample: {
    sample_id: string;
    files: Record<string, { filename: string; size?: number; url?: string }>;
    metadata?: Record<string, unknown>;
  },
  fileUrl: (file: { filename: string; size?: number; url?: string }) => string,
): ParticipantSampleView {
  const row: ParticipantSampleView = {
    public_name: sample.sample_id,
    ...sample.metadata,
    participant_files: {},
  };

  for (const [manifestKey, columnKey] of Object.entries(PARTICIPANT_FILE_COLUMNS)) {
    const file = sample.files[manifestKey];
    if (!file) {
      row[columnKey] = '';
      row.participant_files[columnKey] = null;
      continue;
    }
    const url = fileUrl(file);
    row[columnKey] = url;
    row.participant_files[columnKey] = {
      filename: file.filename,
      size: typeof file.size === 'number' ? file.size : null,
      url,
    };
  }

  return row;
}

export function participantObjectKey(
  manifest: ParticipantManifest,
  prefix: string,
  filename: string,
): string | null {
  if (!filename || filename !== filename.split(/[\\/]/).pop()) {
    return null;
  }
  const sampleSheet = manifest.sample_sheet?.filename ?? DEFAULT_SAMPLE_SHEET_FILENAME;
  if (sampleSheet === filename) {
    return `${prefix}/${filename}`;
  }
  const participantFiles = new Set(
    manifest.samples.flatMap((sample) =>
      Object.values(sample.files).map((details) => details.filename),
    ),
  );
  return participantFiles.has(filename) ? `${prefix}/files/${filename}` : null;
}

export function participantDownloadFiles(
  manifest: ParticipantManifest,
): ParticipantDownloadFile[] {
  const files = new Map<string, ParticipantDownloadFile>();
  const sampleSheet = manifest.sample_sheet;
  const sampleSheetFilename = sampleSheet?.filename ?? DEFAULT_SAMPLE_SHEET_FILENAME;
  files.set(sampleSheetFilename, {
    filename: sampleSheetFilename,
    sha256: sampleSheet?.sha256,
    size: sampleSheet?.size,
    url: sampleSheet?.url,
  });
  for (const sample of manifest.samples) {
    for (const file of Object.values(sample.files)) {
      files.set(file.filename, {
        filename: file.filename,
        sha256: file.sha256,
        size: file.size,
        url: file.url,
      });
    }
  }
  return [...files.values()];
}
