export type AppPage = "explorer" | "weather" | "methodology";

interface HeaderProps {
  page: AppPage;
  onNavigate: (page: AppPage) => void;
  apiOnline: boolean | null;
  zoneCount: number;
}

export default function Header({
  page,
  onNavigate,
  apiOnline,
  zoneCount,
}: HeaderProps) {
  return (
    <header className="flex-shrink-0 bg-surface-primary border-b border-border-subtle select-none">
      <div className="flex items-center justify-between px-4 h-12 max-w-[1920px] mx-auto">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate("explorer")}
            className="flex items-center gap-2.5 group text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded px-1"
          >
            {/* Topographic Contour Mark */}
            <div className="w-6 h-6 rounded bg-floral-white-950 border border-accent/40 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-accent">
                <path
                  d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 3c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6 2.69-6 6-6zm0 3c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                  fill="currentColor"
                  fillOpacity="0.85"
                />
              </svg>
            </div>
            <span className="font-display font-semibold text-sm text-text-primary tracking-tight group-hover:text-accent-emphasis transition-colors">
              FloodLens
            </span>
            <span className="hidden md:inline-block text-xs text-text-muted border-l border-border-subtle pl-3 ml-1 font-normal">
              Regional Flood Susceptibility Screening
            </span>
          </button>

          {/* Navigation tabs */}
          <nav className="hidden sm:flex items-center gap-1 ml-2" aria-label="Main Navigation">
            <NavTab
              label="Risk Explorer"
              active={page === "explorer"}
              onClick={() => onNavigate("explorer")}
            />
            <NavTab
              label="Weather Intelligence"
              active={page === "weather"}
              onClick={() => onNavigate("weather")}
            />
            <NavTab
              label="Methodology & Model"
              active={page === "methodology"}
              onClick={() => onNavigate("methodology")}
            />
          </nav>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-3">
          {/* Zone count */}
          {zoneCount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-2xs font-mono text-text-muted">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              {zoneCount} zones
            </span>
          )}

          {/* API status (strictly static dot - no blinking or pulsing) */}
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                apiOnline === true
                  ? "bg-accent"
                  : apiOnline === false
                    ? "bg-warning-primary"
                    : "bg-text-disabled"
              }`}
            />
            <span className="text-2xs font-mono text-text-muted">
              {apiOnline === true
                ? "API Online"
                : apiOnline === false
                  ? "Offline"
                  : "Connecting"}
            </span>
          </div>

          {/* Mobile nav */}
          <div className="sm:hidden flex items-center gap-1">
            <MobileNavButton
              label="Map"
              active={page === "explorer"}
              onClick={() => onNavigate("explorer")}
            />
            <MobileNavButton
              label="Weather"
              active={page === "weather"}
              onClick={() => onNavigate("weather")}
            />
            <MobileNavButton
              label="Model"
              active={page === "methodology"}
              onClick={() => onNavigate("methodology")}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function NavTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
        active
          ? "text-accent-text bg-floral-white-950 border border-floral-white-800"
          : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated border border-transparent"
      }`}
    >
      {label}
    </button>
  );
}

function MobileNavButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-2xs font-medium rounded ${
        active
          ? "text-accent-text bg-floral-white-950 border border-floral-white-800"
          : "text-text-muted"
      }`}
    >
      {label}
    </button>
  );
}
