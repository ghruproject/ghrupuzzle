export interface ParticipantManifest {
  samples: Array<{
    files: Record<string, { filename: string }>;
  }>;
  sample_sheet?: { filename?: string };
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
