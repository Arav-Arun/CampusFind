import React, { useState, useEffect } from "react";
import { Chart } from "react-google-charts";
import api from "../api";

// Chart colours mirror the CSS tokens in index.css.
const INK = "#E8EAED";
const MUTED = "#9AA0A6";
const LINE = "#3C4043";
const COLORS = { lost: "#F28B82", found: "#81C995", progress: "#FDD663", recovered: "#8AB4F8", open: "#5F6368" };

const barOptions = (color) => ({
  backgroundColor: "transparent",
  legend: { position: "none" },
  colors: [color],
  fontName: "Inter",
  bar: { groupWidth: "65%" },
  chartArea: { left: 120, right: 16, top: 8, bottom: 32 },
  hAxis: { textStyle: { color: MUTED }, gridlines: { color: LINE }, baselineColor: LINE, format: "0" },
  vAxis: { textStyle: { color: INK } },
});

const Figure = ({ value, label, tone }) => (
  <div>
    <p className={`display text-4xl tabular-nums ${tone}`}>{value}</p>
    <p className="mt-1 text-sm text-muted">{label}</p>
  </div>
);

const Panel = ({ title, note, children }) => (
  <section className="panel p-5">
    <h2 className="font-bold">{title}</h2>
    {note && <p className="mt-1 text-sm text-muted">{note}</p>}
    <div className="mt-4">{children}</div>
  </section>
);

const Stats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/items/stats")
      .then((res) => setStats(res.data))
      .catch((error) => console.error("Failed to fetch stats", error))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-20 text-center text-muted">Loading insights...</p>;
  if (!stats) return <p className="py-20 text-center text-muted">Insights couldn't be loaded. Refresh to try again.</p>;

  const rate = stats.total > 0 ? Math.round((stats.recovered / stats.total) * 100) : 0;
  const statusData = [
    ["Status", "Reports"],
    ["Returned", stats.recovered],
    ["Handoff pending", stats.in_progress],
    ["Still open", stats.open],
  ];

  return (
    <div>
      <h1 className="display text-4xl">Campus insights</h1>
      <p className="mt-6 max-w-2xl text-2xl leading-snug sm:text-3xl">
        <span className="font-bold">{rate}%</span> of the {stats.total} items reported on campus are back with their owners.
      </p>

      <div className="mt-10 grid grid-cols-2 gap-6 border-y border-line py-6 md:grid-cols-4">
        <Figure value={stats.open_lost} label="Still missing" tone="text-lost" />
        <Figure value={stats.open_found} label="Found, waiting for an owner" tone="text-found" />
        <Figure value={stats.in_progress} label="Handoffs arranged" tone="text-progress" />
        <Figure value={stats.recovered} label="Returned" tone="text-recovered" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Where things go missing" note="Most reported places, all time.">
          {stats.locations.length ? (
            <Chart
              chartType="BarChart"
              data={[["Place", "Reports"], ...stats.locations.map((l) => [l.name, l.count])]}
              options={barOptions(COLORS.lost)}
              width="100%"
              height="260px"
            />
          ) : (
            <p className="text-sm text-muted">No reports yet.</p>
          )}
        </Panel>

        <Panel title="Where reports stand">
          <Chart
            chartType="PieChart"
            data={statusData}
            options={{
              backgroundColor: "transparent",
              pieHole: 0.55,
              fontName: "Inter",
              colors: [COLORS.recovered, COLORS.progress, COLORS.open],
              pieSliceBorderColor: "#303134",
              pieSliceText: "none",
              legend: { position: "right", alignment: "center", textStyle: { color: INK, fontSize: 13 } },
              chartArea: { left: 8, right: 8, top: 8, bottom: 8 },
            }}
            width="100%"
            height="260px"
          />
        </Panel>

        <Panel title="What goes missing" note="Categories come from the photo tags and what reporters type.">
          {stats.categories.length ? (
            <Chart
              chartType="BarChart"
              data={[["Category", "Reports"], ...stats.categories.map((c) => [c.name, c.count])]}
              options={barOptions(COLORS.recovered)}
              width="100%"
              height={`${Math.max(stats.categories.length * 34, 160)}px`}
            />
          ) : (
            <p className="text-sm text-muted">No reports yet.</p>
          )}
        </Panel>

        <Panel title="Lost and found reports">
          <dl className="space-y-3">
            {[
              ["Lost", stats.lost, COLORS.lost],
              ["Found", stats.found, COLORS.found],
            ].map(([label, value, color]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-sm">
                  <dt>{label}</dt>
                  <dd className="tabular-nums text-muted">{value}</dd>
                </div>
                <div className="h-2 rounded-full bg-subtle">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${stats.total ? (value / stats.total) * 100 : 0}%`, background: color }}
                  />
                </div>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </div>
  );
};

export default Stats;
