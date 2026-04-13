const { Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

const RESOLVABLE_CATEGORIES = [
  'password_reset',
  'account_access',
  'vpn_issue',
  'software_install'
];

async function resolveTicket(ticket) {
  if (
    !ticket ||
    !RESOLVABLE_CATEGORIES.includes(ticket.category) ||
    ticket.confidence < 0.75
  ) {
    return { shouldAutoResolve: false, responseBody: null };
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      system: 'You are a friendly IT helpdesk assistant named Triage Bot. Generate a friendly, step-by-step resolution email for the user. The response should be plain text, max 200 words, and signed "Triage Bot".',
      messages: [
        {
          role: 'user',
          content: `Category: ${ticket.category}\n\nTicket Body:\n${ticket.body}`
        }
      ]
    });

    return {
      shouldAutoResolve: true,
      responseBody: response.content[0].text.trim()
    };
  } catch (error) {
    console.error('Error auto-resolving ticket:', error);
    return { shouldAutoResolve: false, responseBody: null };
  }
}

module.exports = {
  RESOLVABLE_CATEGORIES,
  resolveTicket
};
