const { Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Classifies an IT support ticket using the Anthropic API.
 * @param {string} subject - The subject of the ticket.
 * @param {string} body - The main content/body of the ticket.
 * @returns {Promise<Object>} - A promise that resolves to the classification result as a JSON object.
 */
async function classifyTicket(subject, body) {
  const prompt = `You are an AI IT helpdesk assistant. Please classify the following support ticket.
Return ONLY a valid JSON object with the following fields:
- category: must be one of [password_reset, vpn_issue, hardware_request, software_install, network_outage, security_incident, account_access, data_recovery, onboarding, other]
- assigned_team: must be one of [helpdesk, infrastructure, cybersecurity, sysadmin, procurement, hr_it]
- priority: must be one of [low, medium, high, critical]
- confidence: a float between 0.0 and 1.0 representing your confidence in the classification
- sentiment: must be one of [frustrated, neutral, urgent, unclear]
- reasoning: one sentence explaining the classification

Ticket Subject: ${subject}
Ticket Body: ${body}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: "You are a helpful IT helpdesk assistant. Respond only with JSON.",
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const responseText = message.content[0].text;

    // Parse the JSON. Attempt to strip markdown formatting if present.
    let jsonString = responseText.trim();
    if (jsonString.startsWith('\`\`\`json')) {
      jsonString = jsonString.slice(7, -3).trim();
    } else if (jsonString.startsWith('\`\`\`')) {
      jsonString = jsonString.slice(3, -3).trim();
    }

    const classification = JSON.parse(jsonString);

    // Validate structure
    const requiredFields = ['category', 'assigned_team', 'priority', 'confidence', 'sentiment', 'reasoning'];
    for (const field of requiredFields) {
      if (!(field in classification)) {
         throw new Error(`Missing required field in JSON response: ${field}`);
      }
    }

    if (classification.confidence < 0.6) {
      classification.status = "needs_human_review";
    }

    return classification;
  } catch (error) {
    console.error("Error classifying ticket:", error);
    throw error;
  }
}

module.exports = {
  classifyTicket
};
