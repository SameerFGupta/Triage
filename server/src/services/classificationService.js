const { generateText } = require('./aiProvider');

class AIResponseParseError extends Error {
  constructor(message, rawResponse) {
    super(message);
    this.name = 'AIResponseParseError';
    this.code = 'AI_INVALID_JSON';
    this.rawResponse = rawResponse;
  }
}

function stripCodeFences(text) {
  const trimmed = text.trim();

  if (trimmed.startsWith('```json')) {
    return trimmed.slice(7, trimmed.endsWith('```') ? -3 : undefined).trim();
  }

  if (trimmed.startsWith('```')) {
    return trimmed.slice(3, trimmed.endsWith('```') ? -3 : undefined).trim();
  }

  return trimmed;
}

function extractFirstJsonObject(text) {
  const start = text.indexOf('{');

  if (start === -1) {
    return text;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return text.slice(start);
}

function parseClassificationResponse(responseText) {
  const normalized = extractFirstJsonObject(stripCodeFences(responseText));

  try {
    return JSON.parse(normalized);
  } catch (error) {
    console.error('Failed to parse AI classification response:', normalized);
    throw new AIResponseParseError(
      'The AI provider returned an invalid classification payload.',
      normalized
    );
  }
}

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
- plain_english_reason: One sentence explaining why the ticket was classified and routed the way it was. This field should be written for a non-technical end user, not a developer.
Important JSON rules:
- Escape any double quotes inside string values with a backslash.
- Do not include markdown, commentary, or trailing text before or after the JSON object.
- Keep all string values on a single line.
  Examples:
    "Your request mentions a forgotten password, so I've sent you step-by-step reset instructions automatically."
    "This looks like a network outage affecting multiple users, so I've escalated it to the infrastructure team for urgent review."
    "I wasn't confident enough in my classification to auto-resolve this, so a human agent will review it shortly."

Ticket Subject: ${subject}
Ticket Body: ${body}`;

  try {
    const responseText = await generateText({
      systemPrompt: "You are a helpful IT helpdesk assistant. Respond only with JSON.",
      userPrompt: prompt,
      maxTokens: 1024
    });

    const classification = parseClassificationResponse(responseText);

    // Validate structure
    const requiredFields = ['category', 'assigned_team', 'priority', 'confidence', 'sentiment', 'plain_english_reason'];
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
  AIResponseParseError,
  classifyTicket
};
