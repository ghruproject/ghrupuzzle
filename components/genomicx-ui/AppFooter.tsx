interface AppFooterProps {
  appName: string;
}

export function AppFooter({ appName }: AppFooterProps) {
  return (
    <footer className="gx-footer">
      <div className="gx-footer-inner">
        <div className="gx-footer-content">
          <div className="gx-footer-text">
            <p className="gx-footer-text-title">{appName} for microbial genomics skills drills</p>
            <p className="gx-footer-text-sub">
              Exercise assets are distributed for local command-line analysis and reproducible benchmarking.
            </p>
          </div>
          <div className="gx-footer-links">
            <a href="https://www.pathogensurveillance.net/" target="_blank" rel="noopener noreferrer" className="gx-footer-link">
              CGPS
            </a>
            <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener noreferrer" className="gx-footer-link">
              CC BY-NC 4.0
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
