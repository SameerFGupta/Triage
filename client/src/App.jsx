import { useState } from 'react'
import Dashboard from './components/Dashboard'
import './App.css'
import TicketQueue from './components/TicketQueue'

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard')

  return (
    <>
      <nav style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '20px', justifyContent: 'center' }}>
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
        {activeTab === 'Submit Ticket' && <div>Submit Ticket Placeholder</div>}
        {activeTab === 'Ticket Queue' && <div>Ticket Queue Placeholder</div>}
        {activeTab === 'Dashboard' && <Dashboard />}
      </main>
    </>
  )
}

export default App
