const { loadEnv } = require('../config/loadEnv');

loadEnv();

class AIConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AIConfigurationError';
    this.code = 'AI_NOT_CONFIGURED';
  }
}

function getCurrentProvider() {
  return process.env.AI_PROVIDER || 'anthropic';
}

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  const { Anthropic } = require('@anthropic-ai/sdk');
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  return genAI.getGenerativeModel({ model });
}

function getProviderStatus() {
  const provider = getCurrentProvider();
  return {
    provider,
    configured:
      (provider === 'anthropic' && Boolean(process.env.ANTHROPIC_API_KEY)) ||
      (provider === 'gemini' && Boolean(process.env.GEMINI_API_KEY)),
  };
}

function assertProviderConfigured() {
  const status = getProviderStatus();

  if (!status.configured) {
    throw new AIConfigurationError(
      status.provider === 'anthropic'
        ? 'Anthropic is selected, but ANTHROPIC_API_KEY is missing.'
        : 'Gemini is selected, but GEMINI_API_KEY is missing.'
    );
  }
}

/**
 * Generates text using the configured AI provider.
 * @param {Object} params
 * @param {string} params.systemPrompt
 * @param {string} params.userPrompt
 * @param {number} [params.maxTokens=1024]
 * @returns {Promise<string>}
 */
async function generateText({ systemPrompt, userPrompt, maxTokens = 1024 }) {
  assertProviderConfigured();
  const provider = getCurrentProvider();

  if (provider === 'anthropic') {
    const anthropicClient = getAnthropicClient();
    const message = await anthropicClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    });
    return message.content[0].text;
  } else if (provider === 'gemini') {
    const geminiClient = getGeminiClient();
    // Gemini handles max output tokens via generationConfig
    const result = await geminiClient.generateContent({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: systemPrompt,
        generationConfig: {
            maxOutputTokens: maxTokens,
        }
    });
    return result.response.text();
  } else {
    throw new Error(`Unrecognized AI_PROVIDER: ${provider}`);
  }
}

module.exports = {
  AIConfigurationError,
  generateText,
  getProviderStatus
};
