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
    <header className="flex-shrink-0 bg-surface-raised border-b border-surface-border">
      <div className="flex items-center justify-between px-4 h-12 max-w-[1920px] mx-auto">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate("explorer")}
            className="flex items-center gap-2 group text-left"
          >
            {/* Logo mark */}
            <div className="w-7 h-7 rounded bg-accent/15 border border-accent/30 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-accent">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <span className="font-display font-semibold text-sm text-text-primary tracking-tight group-hover:text-accent transition-colors">
              FloodLens
            </span>
            <span className="hidden md:inline-block text-xs text-text-muted border-l border-surface-border pl-3 ml-1">
              Street-Level Flood Risk Intelligence
            </span>
          </button>

          {/* Nav tabs */}
          <nav className="hidden sm:flex items-center gap-1 ml-2">
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
            <span className="hidden sm:inline-flex items-center gap-1.5 text-2xs font-data text-text-muted">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              {zoneCount} zones
            </span>
          )}

          {/* API status */}
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                apiOnline === true
                  ? "bg-risk-low"
                  : apiOnline === false
                    ? "bg-risk-severe animate-pulse-subtle"
                    : "bg-text-disabled"
              }`}
            />
            <span className="text-2xs font-data text-text-muted">
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
      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
        active
          ? "text-accent bg-accent/10"
          : "text-text-secondary hover:text-text-primary hover:bg-surface-overlay"
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
          ? "text-accent bg-accent/10"
          : "text-text-muted"
      }`}
    >
      {label}
    </button>
  );
}
