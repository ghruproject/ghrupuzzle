import { ImageResponse } from 'next/og';

export const SOCIAL_IMAGE_SIZE = {
  width: 1200,
  height: 630,
};

export const SOCIAL_IMAGE_ALT =
  'GHRUPUZZLES — benchmark microbial genomics workflows with simulated datasets';

export function createSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background:
            'linear-gradient(135deg, #0f172a 0%, #111c2f 58%, #0f2b31 100%)',
          color: '#f8fafc',
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 54,
              height: 54,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              background: '#42d6c5',
              color: '#0f172a',
              fontSize: 34,
              fontWeight: 900,
            }}
          >
            <svg width="42" height="42" viewBox="0 0 32 32" aria-hidden="true">
              <path
                fill="#0f172a"
                d="M5 5h6c0-2.7 2.2-4 5-4s5 1.3 5 4h6v6c2.7 0 4 2.2 4 5s-1.3 5-4 5v6h-6c0 2.7-2.2 4-5 4s-5-1.3-5-4H5v-6c2.7 0 4-2.2 4-5s-1.3-5-4-5V5Z"
              />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 1.5 }}>
              GHRUPUZZLES
            </div>
            <div style={{ color: '#9fb0c5', fontSize: 19 }}>
              Microbial genome benchmarking exercises
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 980 }}>
          <div
            style={{
              color: '#42d6c5',
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: 3,
              textTransform: 'uppercase',
              marginBottom: 18,
            }}
          >
            Practice · assess · improve
          </div>
          <div
            style={{
              fontSize: 64,
              lineHeight: 1.06,
              fontWeight: 850,
              letterSpacing: -2,
            }}
          >
            Benchmark microbial genomics workflows.
          </div>
          <div
            style={{
              marginTop: 22,
              color: '#b9c6d6',
              fontSize: 27,
              lineHeight: 1.35,
            }}
          >
            Complex simulated datasets for pipeline testing, practice exercises and timed
            challenges.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#9fb0c5',
            fontSize: 19,
          }}
        >
          <div style={{ display: 'flex', gap: 24 }}>
            <span>Assembly</span>
            <span>Hybrid assembly</span>
            <span>Genotyping</span>
            <span>Outbreak analysis</span>
          </div>
          <span style={{ color: '#42d6c5', fontWeight: 700 }}>ghrupuzzle.vercel.app</span>
        </div>
      </div>
    ),
    SOCIAL_IMAGE_SIZE,
  );
}
