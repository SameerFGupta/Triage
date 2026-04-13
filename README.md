# Triage
Know what needs immediate attention vs. what can wait.
 
AI-powered IT helpdesk automation that classifies, routes, and resolves support tickets before a human ever has to.

What it Does:
Accepts mock IT support tickets (via a simple web form or email simulation)
Uses the Claude or OpenAI API to classify them (password reset, VPN issue, hardware request, etc.)
Auto-responds to simple/common ones with a generated resolution
Routes complex ones to the right "team" (infrastructure, cybersecurity, etc.) — mirroring the exact sub-teams mentioned in the job description
Logs everything to a dashboard showing ticket volume, resolution rate, and time saved

### Key Features

* **Confidence Scoring**: Claude rates its own classification confidence; low-confidence tickets are flagged for human review rather than auto-routed to account for AI limitations.
* **SLA Tracking**: Maps ticket categories to target resolution times, with real-time compliance percentages displayed on the main dashboard.
* **Escalation Chains**: Implements automated triggers to escalate tickets if an auto-response is not acknowledged within a specified timeframe.
* **Sentiment Analysis**: Detects frustrated or urgent tones to dynamically bump priority, ensuring emotional intelligence in the triage process.
* **Resolution Feedback Loop**: Captures user feedback (thumbs up/down) to generate a live "AI Accuracy Rate" for the dashboard.
* **Audit Trail**: Logs every AI decision with the exact prompt and response pair to ensure the system remains explainable and trustworthy.
