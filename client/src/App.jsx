import React from 'react'
import SubmitTicket from './SubmitTicket'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
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
    </div>
  )
}

export default App
