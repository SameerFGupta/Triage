import React, { useState, useEffect } from 'react'
import SubmitTicket from './SubmitTicket'
import Dashboard from './components/Dashboard'
import './App.css'
import TicketQueue from './components/TicketQueue'

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [aiProvider, setAiProvider] = useState(localStorage.getItem('aiProvider') || 'anthropic')

  useEffect(() => {
    fetch('/api/settings/provider')
      .then(res => res.json())
      .then(data => {
        if (data.provider) {
          setAiProvider(data.provider);
          localStorage.setItem('aiProvider', data.provider);
        }
      })
      .catch(err => console.error("Failed to fetch provider:", err));
  }, []);

  const handleProviderChange = (e) => {
    const newProvider = e.target.value;
    setAiProvider(newProvider);
    localStorage.setItem('aiProvider', newProvider);

    fetch('/api/settings/provider', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ provider: newProvider }),
    }).catch(err => console.error("Failed to update provider:", err));
  };

  return (
    <>
      <nav style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ position: 'absolute', right: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label htmlFor="provider-select" style={{ fontSize: '0.9rem', color: 'var(--text)' }}>AI Provider:</label>
          <select
            id="provider-select"
            value={aiProvider}
            onChange={handleProviderChange}
            style={{ padding: '5px', borderRadius: '4px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)' }}
          >
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>
        <button
          onClick={() => setActiveTab('Submit Ticket')}
          style={{ background: activeTab === 'Submit Ticket' ? 'var(--accent)' : 'transparent', color: activeTab === 'Submit Ticket' ? 'white' : 'var(--text)', border: '1px solid var(--border)', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}
        >
          Submit Ticket
        </button>
        <button
          onClick={() => setActiveTab('Ticket Queue')}
          style={{ background: activeTab === 'Ticket Queue' ? 'var(--accent)' : 'transparent', color: activeTab === 'Ticket Queue' ? 'white' : 'var(--text)', border: '1px solid var(--border)', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}
        >
          Ticket Queue
        </button>
        <button
          onClick={() => setActiveTab('Dashboard')}
          style={{ background: activeTab === 'Dashboard' ? 'var(--accent)' : 'transparent', color: activeTab === 'Dashboard' ? 'white' : 'var(--text)', border: '1px solid var(--border)', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}
        >
          Dashboard
        </button>
      </nav>

      <main style={{ padding: '20px' }}>
        {activeTab === 'Submit Ticket' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
                Triage Support
              </h1>
              <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
                How can we help you today?
              </p>
            </div>
            <SubmitTicket />
          </div>
        )}
        {activeTab === 'Ticket Queue' && <TicketQueue />}
        {activeTab === 'Dashboard' && <Dashboard />}
      </main>
    </>
  )
}

export default App
