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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

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

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error loading dashboard: {error}</div>;
  if (!data) return null;

  const autoResolvedCount = Math.round(data.resolvedTickets * (data.autoResolutionRate / 100)) || 0;
  const timeSavedMinutes = autoResolvedCount * 8;

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
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Analytics Dashboard</h2>
        <button
          onClick={handleExportCSV}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Export CSV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ border: '1px solid var(--border)', padding: '20px', borderRadius: '8px', background: 'var(--bg)' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: 'var(--text)' }}>Total Tickets</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-h)' }}>{data.totalTickets}</div>
        </div>
        <div style={{ border: '1px solid var(--border)', padding: '20px', borderRadius: '8px', background: 'var(--bg)' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: 'var(--text)' }}>Auto-Resolution Rate</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-h)' }}>{data.autoResolutionRate.toFixed(1)}%</div>
        </div>
        <div style={{ border: '1px solid var(--border)', padding: '20px', borderRadius: '8px', background: 'var(--bg)' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: 'var(--text)' }}>AI Accuracy</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-h)' }}>{data.aiAccuracyRate.toFixed(1)}%</div>
        </div>
        <div style={{ border: '1px solid var(--border)', padding: '20px', borderRadius: '8px', background: 'var(--bg)' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: 'var(--text)' }}>SLA Compliance</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-h)' }}>{data.slaComplianceRate.toFixed(1)}%</div>
        </div>
      </div>

      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: 'var(--text-h)' }}>Time Saved Estimate</h3>
        <div style={{ fontSize: '24px', color: 'var(--accent)', fontWeight: 'bold' }}>
          {timeSavedMinutes} minutes
          <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 'normal', marginLeft: '10px' }}>
            ({autoResolvedCount} auto-resolved tickets × 8 mins)
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <div style={{ border: '1px solid var(--border)', padding: '20px', borderRadius: '8px', background: 'var(--bg)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text-h)' }}>Tickets by Category</h3>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.ticketsByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="var(--accent)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ border: '1px solid var(--border)', padding: '20px', borderRadius: '8px', background: 'var(--bg)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text-h)' }}>Tickets by Team</h3>
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.ticketsByTeam}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="team"
                  label={({ team, percent }) => `${team} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.ticketsByTeam.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ border: '1px solid var(--border)', padding: '20px', borderRadius: '8px', background: 'var(--bg)', gridColumn: '1 / -1' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text-h)' }}>Ticket Volume (Last 7 Days)</h3>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.last7Days}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
