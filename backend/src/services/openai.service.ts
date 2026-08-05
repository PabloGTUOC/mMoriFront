import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

/**
 * OpenAI Chat Completions integration (BACKEND_SPEC §4.15, "OpenAI call specification").
 *
 * The model, system prompt, user-prompt template, `max_tokens` and `temperature` are
 * reproduced exactly, because the wording shapes the output the frontend renders.
 *
 * Two deviations, both requested by §9.6: there is a request timeout, and network errors
 * are caught rather than propagating as a 500. Both failure modes return `null`, which the
 * controller renders as the spec's 422 "Failed to get recommendation".
 *
 * §9.5 also flagged that the Rails version logged the full response body (user-derived
 * content) at info level. Only the finish reason and token usage are logged here.
 */

const SYSTEM_PROMPT =
  'You are a coach with focus on mental health and training for healthy individuals.';

export interface RecommendationContext {
  mood: string;
  age: number;
  location: string;
  gender: string;
  weeksLeftToLive: number;
}

/** The §4.15 step 9 template, verbatim. */
export function buildPrompt(context: RecommendationContext): string {
  return (
    `The user is feeling ${context.mood} today. ` +
    `They are ${context.age} years old, living in ${context.location}, ` +
    `and identify as ${context.gender}. ` +
    `They have approximately ${context.weeksLeftToLive} weeks left to live. ` +
    'Provide a personalized recommendation to help the user make the most of their day ' +
    'based on their mood, and whenever possible, include concrete exercises, ' +
    'like breathing exercises for anxiety, on a maximum of 200 words altogether'
  );
}

/** Returns the assistant's message content, or `null` on any failure. */
export async function queryChatGpt(prompt: string): Promise<string | null> {
  if (!env.openai.apiKey) {
    logger.error('OPENAI_API_KEY (or CHATGPT_API_KEY) is not set; cannot request a recommendation');
    return null;
  }

  try {
    const response = await fetch(`${env.openai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openai.apiKey}`,
      },
      body: JSON.stringify({
        model: env.openai.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: env.openai.maxTokens,
        temperature: env.openai.temperature,
      }),
      signal: AbortSignal.timeout(env.openai.timeoutMs),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '<unreadable>');
      logger.error(`OpenAI returned ${response.status}: ${body.slice(0, 500)}`);
      return null;
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string }; finish_reason?: string }[];
      usage?: { total_tokens?: number };
    };

    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      logger.error('OpenAI response contained no message content');
      return null;
    }

    logger.info(
      `OpenAI recommendation generated (finish_reason=${json.choices?.[0]?.finish_reason ?? 'unknown'}, ` +
        `total_tokens=${json.usage?.total_tokens ?? 'unknown'})`
    );

    return content.trim();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error(`OpenAI request failed: ${reason}`);
    return null;
  }
}
