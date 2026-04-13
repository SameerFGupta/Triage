const { generateText } = require('./aiProvider');

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
    const responseText = await generateText({
      systemPrompt: 'You are a friendly IT helpdesk assistant named Triage Bot. Generate a friendly, step-by-step resolution email for the user. The response should be plain text, max 200 words, and signed "Triage Bot".',
      userPrompt: `Category: ${ticket.category}\n\nTicket Body:\n${ticket.body}`,
      maxTokens: 300
    });

    return {
      shouldAutoResolve: true,
      responseBody: responseText.trim()
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
