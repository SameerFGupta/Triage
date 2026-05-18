import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

const COLORS = ['#4f6ef7', '#0f9f8f', '#f59e0b', '#ef7d31', '#8b9ff9', '#6abf85'];

function formatDisplayLabel(value) {
  if (!value) return 'Unassigned';

  return value
    .toString()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function buildIntegerTicks(maxValue) {
  const upperBound = Math.max(1, Math.ceil(maxValue || 0));
  return Array.from({ length: upperBound + 1 }, (_, index) => index);
}

function CategoryAxisTick({ x, y, payload }) {
  const label = payload?.value || '';

  return (
    <g transform={`translate(${x},${y})`}>
      <title>{label}</title>
      <text
        x={0}
        y={0}
        dy={12}
        textAnchor="end"
        fill="#64748b"
        fontSize={11}
        transform="rotate(-45)"
      >
        {label}
      </text>
    </g>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/analytics/summary')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Network response was not ok');
        }
        return res.json();
      })
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="page-frame">
        <div className="dashboard-state">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-frame">
        <div className="dashboard-state error">Error loading dashboard: {error}</div>
      </div>
    );
  }

  if (!data) return null;

  const autoResolvedCount = Math.round(data.resolvedTickets * (data.autoResolutionRate / 100)) || 0;
  const timeSavedMinutes = autoResolvedCount * 8;
  const categoryChartData = data.ticketsByCategory.map((entry) => ({
    ...entry,
    category: formatDisplayLabel(entry.category)
  }));
  const teamChartData = data.ticketsByTeam.map((entry) => ({
    ...entry,
    team: formatDisplayLabel(entry.team)
  }));
  const categoryTicks = buildIntegerTicks(Math.max(...categoryChartData.map((entry) => entry.count), 0));
  const totalTeamTickets = teamChartData.reduce((sum, entry) => sum + entry.count, 0) || 1;
  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/analytics/export');
      if (!response.ok) throw new Error('Failed to export CSV');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tickets.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export CSV.');
    }
  };

  return (
    <div className="page-frame">
      <section className="dashboard">
        <header className="dashboard-header">
          <div className="dashboard-header-copy">
            <h2>Dashboard</h2>
            <p className="dashboard-summary">
              Incoming volume, resolution quality, and automation impact at a glance.
            </p>
          </div>
        </header>

        <section className="dashboard-overview">
          <article className="metric-card metric-card-featured" style={{ '--i': 0 }}>
            <span className="metric-label">Time saved</span>
            <p className="metric-value metric-value-featured">{timeSavedMinutes}m</p>
          </article>

          <article className="metric-card" style={{ '--i': 1 }}>
            <span className="metric-label">Total tickets</span>
            <p className="metric-value">{data.totalTickets}</p>
          </article>
          <article className="metric-card" style={{ '--i': 2 }}>
            <span className="metric-label">Auto-resolution</span>
            <p className="metric-value">{data.autoResolutionRate.toFixed(1)}%</p>
          </article>
          <article className="metric-card" style={{ '--i': 3 }}>
            <span className="metric-label">AI accuracy</span>
            <p className="metric-value">{data.aiAccuracyRate.toFixed(1)}%</p>
          </article>
          <article className="metric-card" style={{ '--i': 4 }}>
            <span className="metric-label">SLA compliance</span>
            <p className="metric-value">{data.slaComplianceRate.toFixed(1)}%</p>
          </article>
          <div className="dashboard-overview-action">
            <button onClick={handleExportCSV} className="button-secondary">
              Export CSV
            </button>
          </div>
        </section>

        <section className="dashboard-grid">
          <article className="chart-card">
            <div className="chart-card-header">
              <div>
                <h3>Tickets by category</h3>
                <p>Where the incoming workload is clustering right now.</p>
              </div>
              <span className="muted-chip">{data.ticketsByCategory.length} categories</span>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ top: 8, right: 8, left: -18, bottom: 44 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(111, 124, 135, 0.18)" vertical={false} />
                  <XAxis dataKey="category" axisLine={false} tickLine={false} interval={0} height={96} tick={<CategoryAxisTick />} />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    domain={[0, categoryTicks[categoryTicks.length - 1]]}
                    ticks={categoryTicks}
                  />
                  <Tooltip formatter={(value) => [value, 'Tickets']} labelFormatter={(label) => label} />
                  <Bar dataKey="count" fill="#4f6ef7" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="chart-card team-chart-card">
            <div className="chart-card-header">
              <div>
                <h3>Tickets by team</h3>
                <p>Distribution of ownership across operational groups.</p>
              </div>
              <span className="muted-chip">{data.ticketsByTeam.length} teams</span>
            </div>
            <div className="chart-wrap chart-wrap-team">
              <div className="team-chart-panel">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={teamChartData}
                      innerRadius={42}
                      outerRadius={62}
                      cx="50%"
                      cy="50%"
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="team"
                      isAnimationActive={false}
                    >
                      {teamChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Tickets']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="chart-legend" aria-label="Tickets by team legend">
                {teamChartData.map((entry, index) => {
                  const percent = Math.round((entry.count / totalTeamTickets) * 100);

                  return (
                    <li key={entry.team} className="chart-legend-item">
                      <span className="chart-legend-label">
                        <span
                          className="chart-legend-swatch"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          aria-hidden="true"
                        />
                        {entry.team}
                      </span>
                      <span className="chart-legend-value">{percent}%</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </article>

          <article className="chart-card wide">
            <div className="chart-card-header">
              <div>
                <h3>Ticket volume over time</h3>
                <p>A seven-day view of support demand and intake rhythm.</p>
              </div>
              <span className="muted-chip">Last 7 days</span>
            </div>
            <div className="chart-wrap tall">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.last7Days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(111, 124, 135, 0.18)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#4f6ef7" strokeWidth={3} dot={{ r: 4, fill: '#4f6ef7' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>
      </section>
    </div>
  );
}
