import Image from 'next/image';

export default function AboutPage() {
  return (
    <div className="gx-page">
      <section className="gx-hero">
        <div className="gx-kicker">About</div>
        <h1>Controlled exercises for pathogen genomics training.</h1>
        <p className="gx-hero-copy">
          GHRUPuzzles is a skills assessment and training surface for the Global Health Research Unit on Genomic Surveillance of
          Antimicrobial Resistance. The aim is simple: give participants realistic files, clear deliverables, and enough structure
          to compare pipelines without making the exercise trivial.
        </p>
      </section>

      <div className="gx-grid">
        <section className="card gx-panel">
          <h2>What the exercises test</h2>
          <ul className="gx-list">
            <li>Deploying and running the right bioinformatics tools in a reproducible environment.</li>
            <li>Interpreting QC, taxonomy, typing, and phylogenetic outputs rather than just generating them.</li>
            <li>Returning a clean sample sheet or analysis artifact that another team can immediately consume.</li>
          </ul>
        </section>

        <section className="card gx-panel">
          <h2>Programme context</h2>
          <p>
            GHRU supports genomic surveillance of antimicrobial resistance across international public health and research settings.
            These drills are intended for GHRU members first, but anyone working in pathogen genomics can use them as a benchmark.
          </p>
          <p>
            Learn more at{' '}
            <a href="https://ghru.pathogensurveillance.net/" target="_blank" rel="noopener noreferrer">
              ghru.pathogensurveillance.net
            </a>
            .
          </p>
        </section>

        <section className="card gx-panel gx-panel-wide">
          <h2>Licensing</h2>
          <p>
            GHRUPuzzles was created by{' '}
            <a href="https://www.pathogensurveillance.net/" target="_blank" rel="noopener noreferrer">
              Nabil-Fareed Alikhan
            </a>
            . Content is released under{' '}
            <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener noreferrer">
              CC BY-NC 4.0
            </a>
            : reuse is encouraged with attribution for non-commercial use.
          </p>
          <Image src="/cc4bync.png" alt="Creative Commons BY NC 4.0 License" width={120} height={100} />
        </section>
      </div>
    </div>
  );
}
