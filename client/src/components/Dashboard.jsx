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

const COLORS = ['#155dfc', '#0f9f8f', '#f59e0b', '#ef7d31', '#7c6ee6', '#6abf85'];

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
  const timeSavedHours = timeSavedMinutes > 0 ? (timeSavedMinutes / 60).toFixed(1) : '0.0';
  const providerLabel = data.activeProvider === 'anthropic' ? 'Anthropic' : 'Gemini';

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
            <div className="eyebrow">Operations analytics</div>
            <h2>Support performance, without the noise.</h2>
            <p className="dashboard-summary">
              A clear read on incoming volume, resolution quality, and where automation is actually earning back time.
            </p>
          </div>

          <div className="dashboard-toolbar">
            {data.activeProvider && <span className="provider-chip">AI model: {providerLabel}</span>}
            <button onClick={handleExportCSV} className="button-secondary">
              Export CSV
            </button>
          </div>
        </header>

        <section className="dashboard-overview">
          <article className="hero-panel">
            <div className="hero-meta">
              <span className="stat-dot" />
              <span className="hero-label">Time saved estimate</span>
            </div>
            <p className="hero-value">{timeSavedMinutes}m</p>
            <p className="hero-footnote">
              Roughly {timeSavedHours} hours returned through {autoResolvedCount} AI-resolved tickets.
            </p>
            <p className="hero-supporting">
              Estimate uses 8 minutes recovered per auto-resolved request.
            </p>
          </article>

          <div className="metric-grid">
            <article className="metric-card">
              <span className="metric-label">Total tickets</span>
              <p className="metric-value">{data.totalTickets}</p>
              <p className="metric-caption">Current sample in the analytics window.</p>
            </article>
            <article className="metric-card">
              <span className="metric-label">Auto-resolution</span>
              <p className="metric-value">{data.autoResolutionRate.toFixed(1)}%</p>
              <p className="metric-caption">Tickets closed without a manual handoff.</p>
            </article>
            <article className="metric-card">
              <span className="metric-label">AI accuracy</span>
              <p className="metric-value">{data.aiAccuracyRate.toFixed(1)}%</p>
              <p className="metric-caption">Classification decisions matching final outcomes.</p>
            </article>
            <article className="metric-card">
              <span className="metric-label">SLA compliance</span>
              <p className="metric-value">{data.slaComplianceRate.toFixed(1)}%</p>
              <p className="metric-caption">Tickets still landing inside service expectations.</p>
            </article>
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
                <BarChart data={data.ticketsByCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(111, 124, 135, 0.18)" vertical={false} />
                  <XAxis dataKey="category" tick={{ fill: '#6f7c87', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6f7c87', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#155dfc" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="chart-card">
            <div className="chart-card-header">
              <div>
                <h3>Tickets by team</h3>
                <p>Distribution of ownership across operational groups.</p>
              </div>
              <span className="muted-chip">{data.ticketsByTeam.length} teams</span>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.ticketsByTeam}
                    innerRadius={66}
                    outerRadius={96}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="team"
                    label={({ team, percent }) => `${team} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {data.ticketsByTeam.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
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
                  <XAxis dataKey="date" tick={{ fill: '#6f7c87', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6f7c87', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#155dfc" strokeWidth={3} dot={{ r: 4, fill: '#155dfc' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>
      </section>
    </div>
  );
}
