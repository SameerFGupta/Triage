require('dotenv').config();

const provider = process.env.AI_PROVIDER || 'anthropic';

let anthropicClient;
let geminiClient;

if (provider === 'anthropic') {
  const { Anthropic } = require('@anthropic-ai/sdk');
  anthropicClient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
} else if (provider === 'gemini') {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  geminiClient = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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
  if (provider === 'anthropic') {
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
  generateText
};
