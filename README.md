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
