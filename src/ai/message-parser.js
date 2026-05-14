'use strict';

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { SYSTEM_PROMPT, buildUserPrompt } = require('./prompts');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function parseMessage(messageText, existingProjects = []) {
  const userPrompt = buildUserPrompt(messageText, existingProjects);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });

  const rawText = response.content[0].text.trim();

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // Claude occasionally wraps JSON in backticks — strip them
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1]);
    } else {
      throw new Error(`AI returned non-JSON response: ${rawText.slice(0, 200)}`);
    }
  }

  if (!parsed.category || !parsed.data) {
    throw new Error(`AI response missing required fields: ${JSON.stringify(parsed)}`);
  }

  return parsed;
}

module.exports = { parseMessage };
