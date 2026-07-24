export interface ParticipantManifest {
  samples: Array<{
    sample_id?: string;
    files: Record<string, { filename: string }>;
    metadata?: Record<string, unknown>;
  }>;
  sample_sheet?: { filename?: string };
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

export function buildParticipantSampleView(
  sample: {
    sample_id: string;
    files: Record<string, { filename: string; size?: number }>;
    metadata?: Record<string, unknown>;
  },
  fileUrl: (filename: string) => string,
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
    const url = fileUrl(file.filename);
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
  const sampleSheet = manifest.sample_sheet?.filename;
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
