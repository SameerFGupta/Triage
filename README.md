# Triage

**Know what needs immediate attention vs. what can wait.**

Triage classifies, routes, and resolves support tickets before a human ever has to.

---

## What It Does

* **Accepts** mock IT support tickets via a simple web form or email simulation.
* **Classifies** tickets using the Claude or OpenAI API (e.g., password reset, VPN issue, hardware request).
* **Auto-responds** to simple and common issues with an AI-generated resolution.
* **Routes** complex issues to the correct department (e.g., Infrastructure, Cybersecurity), mirroring real-world sub-teams.
* **Logs** all activity to a dashboard displaying ticket volume, resolution rates, and total time saved.

---

## Key Features

* **Confidence Scoring:** The AI rates its own classification confidence. Low-confidence tickets are flagged for human review rather than auto-routed, accounting for AI limitations.
* **SLA Tracking:** Maps ticket categories to target resolution times, displaying real-time compliance percentages directly on the main dashboard.
* **Escalation Chains:** Implements automated triggers to escalate tickets if an auto-response is not acknowledged within a specified timeframe.
* **Sentiment Analysis:** Detects frustrated or urgent tones to dynamically bump priority, ensuring emotional intelligence in the triage process.
* **Resolution Feedback Loop:** Captures user feedback (thumbs up/down) to generate a live "AI Accuracy Rate" metric.
* **Audit Trail:** Logs every AI decision alongside the exact prompt and response pair, ensuring the system remains explainable, auditable, and trustworthy.

---

## Quick Start

1. Install dependencies:
   * `npm install`
   * `cd client && npm install`
   * `cd ../server && npm install`
2. Add an AI provider to `server/.env`:
   * Anthropic:
     * `AI_PROVIDER=anthropic`
     * `ANTHROPIC_API_KEY=your_key_here`
   * Gemini:
     * `AI_PROVIDER=gemini`
     * `GEMINI_API_KEY=your_key_here`
     * Optional: `GEMINI_MODEL=gemini-2.5-flash`
3. Start the app from the project root with `npm run dev`.
4. Open the app, submit a new ticket, and then open it in the Ticket Queue to view the AI reasoning and any auto-response.

## How To Use It

* **Submit Ticket:** Create a new support request. This is the main path that runs live AI classification.
* **Ticket Queue:** Open any ticket to see status, audit trail, auto-responses, and the **AI Classification Reasoning** panel.
* **Dashboard:** Review analytics like auto-resolution rate, SLA compliance, and AI accuracy.

## AI Reasoning Notes

* The **AI Classification Reasoning** box appears in the Ticket Queue ticket details panel.
* Demo tickets now include seeded reasoning so the panel is visible right away.
* Live reasoning for new tickets only works when the selected AI provider has a valid API key configured.
* If no API key is configured, the submit page will show a warning and ticket submission will return a clear configuration error.

## Current Provider Support

* The app currently supports `anthropic` and `gemini`.
* If you switch providers in the UI, make sure the matching API key is present in `server/.env`.
