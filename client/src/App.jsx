import React, { useState, useEffect } from 'react'
import SubmitTicket from './SubmitTicket'
import Dashboard from './components/Dashboard'
import './App.css'
import TicketQueue from './components/TicketQueue'
import useWebSocket from './services/useWebSocket'

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [aiProvider, setAiProvider] = useState(localStorage.getItem('aiProvider') || 'anthropic')

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsHost = window.location.port === '5173' ? 'localhost:3000' : window.location.host
  const { status } = useWebSocket(`${wsProtocol}//${wsHost}`)

  useEffect(() => {
    fetch('/api/settings/provider')
      .then(res => res.json())
      .then(data => {
        if (data.provider) {
          setAiProvider(data.provider)
          localStorage.setItem('aiProvider', data.provider)
        }
      })
      .catch(err => console.error('Failed to fetch provider:', err))
  }, [])

  const handleProviderChange = (e) => {
    const newProvider = e.target.value
    setAiProvider(newProvider)
    localStorage.setItem('aiProvider', newProvider)

    fetch('/api/settings/provider', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ provider: newProvider }),
    }).catch(err => console.error('Failed to update provider:', err))
  }

  const statusClassName =
    status === 'connected'
      ? 'status-connected'
      : status === 'connecting'
        ? 'status-connecting'
        : 'status-disconnected'

  return (
    <div className="App">
      <div className="app-shell">
        <nav className="app-topbar">
          <div className="app-status">
            <div className="app-status-pill">
              <span className={`status-dot ${statusClassName}`} />
              <span className="status-label">{status}</span>
              <span className="status-caption">Realtime feed</span>
            </div>
          </div>

          <div className="app-nav" aria-label="Primary navigation">
            <button
              onClick={() => setActiveTab('Submit Ticket')}
              className={`nav-button ${activeTab === 'Submit Ticket' ? 'active' : ''}`}
            >
              Submit Ticket
            </button>
            <button
              onClick={() => setActiveTab('Ticket Queue')}
              className={`nav-button ${activeTab === 'Ticket Queue' ? 'active' : ''}`}
            >
              Ticket Queue
            </button>
            <button
              onClick={() => setActiveTab('Dashboard')}
              className={`nav-button ${activeTab === 'Dashboard' ? 'active' : ''}`}
            >
              Dashboard
            </button>
          </div>

          <div className="app-provider">
            <label htmlFor="provider-select" className="provider-label">AI Provider</label>
            <select
              id="provider-select"
              value={aiProvider}
              onChange={handleProviderChange}
              className="provider-select"
            >
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>
        </nav>

        <main className="app-main">
          {activeTab === 'Submit Ticket' && (
            <div className="page-frame">
              <SubmitTicket aiProvider={aiProvider} />
            </div>
          )}
          {activeTab === 'Ticket Queue' && <TicketQueue />}
          {activeTab === 'Dashboard' && <Dashboard />}
        </main>
      </div>
    </div>
  )
}

export default App
