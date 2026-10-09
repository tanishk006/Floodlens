import { useState } from "react";
import FloodMap from "./FloodMap";

const scenarios = ["Lower", "Middle", "Higher"] as const;
type Scenario = (typeof scenarios)[number];

export default function App() {
  const [scenario, setScenario] = useState<Scenario>("Middle");

  return (
    <div className="min-h-screen bg-paper font-ui text-ink">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-4 sm:px-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <a
              className="font-display text-2xl font-semibold text-ink no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              href="#main"
            >
              FloodLens
            </a>
            <p className="text-sm text-muted">Street-level flood exposure</p>
          </div>
          <p className="border-t border-rule pt-3 text-sm font-medium text-accent">
            Experimental estimate. Not an official warning.
          </p>
        </div>
      </header>

      <main
        className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 sm:py-8"
        id="main"
      >
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-medium">Exposure overview</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              Explore an illustrative map and compare placeholder route estimates.
              No data source or risk model is connected.
            </p>
          </div>
          <p className="text-xs font-medium text-muted">Placeholder data</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section aria-labelledby="map-heading">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl" id="map-heading">
                Illustrative map area
              </h2>
              <p className="font-data tabular-nums text-xs text-muted">
                No real location shown
              </p>
            </div>
            <div className="overflow-hidden">
              <div className="h-[min(68vh,680px)] min-h-[360px]">
                <FloodMap />
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-rule px-4 py-3">
                <span className="text-xs font-medium text-ink">Placeholder key</span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  <span className="h-1 w-4 bg-risk-low" aria-hidden="true" />
                  Lower
                </span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  <span className="h-1 w-4 bg-risk-moderate" aria-hidden="true" />
                  Moderate
                </span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  <span className="h-1 w-4 bg-risk-high" aria-hidden="true" />
                  Higher
                </span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  <span className="h-1 w-4 bg-risk-severe" aria-hidden="true" />
                  Highest
                </span>
              </div>
            </div>
          </section>

          <aside className="space-y-6" aria-label="Map details and controls">
            <section
              className="border border-rule p-4"
              aria-labelledby="scenario-heading"
            >
              <p className="text-xs font-medium text-muted">Placeholder data</p>
              <h2 className="mt-1 font-display text-xl" id="scenario-heading">
                Rainfall scenario
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                These controls are illustrative only. Changing the scenario does
                not update a real risk estimate.
              </p>
              <div
                className="mt-4 grid grid-cols-3 border-b border-rule"
                role="group"
                aria-label="Illustrative rainfall scenario"
              >
                {scenarios.map((item) => (
                  <button
                    className={`min-h-11 border-b-2 px-2 text-sm hover:text-accent focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
                      scenario === item
                        ? "border-accent font-medium text-accent"
                        : "border-transparent text-ink"
                    }`}
                    key={item}
                    onClick={() => setScenario(item)}
                    type="button"
                    aria-pressed={scenario === item}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <p className="sr-only" aria-live="polite">
                Illustrative scenario set to {scenario.toLowerCase()} rainfall.
                Placeholder data only.
              </p>
            </section>

            <section aria-labelledby="routes-heading">
              <h2 className="mb-3 font-display text-xl" id="routes-heading">
                Route comparison
              </h2>
              <div className="overflow-x-auto border border-rule">
                <table className="w-full border-collapse text-left text-sm">
                  <caption className="border-b border-rule p-3 text-left text-xs text-muted">
                    Placeholder data. Not real routes.
                  </caption>
                  <thead>
                    <tr className="border-b border-rule">
                      <th className="px-3 py-2 font-medium" scope="col">
                        Route
                      </th>
                      <th className="px-3 py-2 font-medium" scope="col">
                        Estimated exposure
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-rule">
                      <th className="px-3 py-3 font-normal" scope="row">
                        Placeholder A
                      </th>
                      <td className="px-3 py-3 text-muted">
                        Higher estimated exposure
                      </td>
                    </tr>
                    <tr>
                      <th className="px-3 py-3 font-normal" scope="row">
                        Placeholder B
                      </th>
                      <td className="px-3 py-3 text-muted">
                        Lower estimated exposure
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section aria-labelledby="estimate-heading">
              <h2 className="font-display text-xl" id="estimate-heading">
                About these estimates
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Map lines and route labels are sample content for the interface.
                They are not measured, real-time, or official information.
              </p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
