const THREAT_SYSTEM_INSTRUCTION = `You are a friendly cybersecurity assistant embedded in the Slark live threat monitoring dashboard.
Operators see incidents from Slark-style ingest (iwconfig-like readouts plus structured fields).
Use a warm, professional tone. When explaining incidents, help the team understand:
(1) What happened in plain language
(2) What it implies about current system and security posture
(3) Likely attacker intent or technique — state uncertainty when evidence is thin
(4) Practical next checks and mitigations
Use short paragraphs or bullets; be detailed but readable. Do not invent IPs, payloads, or tool usage not suggested by the data.`;

const LANDING_SYSTEM_INSTRUCTION = `You are Slark customer support on the public marketing website. Your only job is customer service for visitors and customers.
Help with: what Slark is, signing up, logging in, API keys, subscription and billing (general), integration overview, documentation, and getting started.
When users ask about integration, connecting their site, ingest, middleware, or API keys for sending incidents, give a brief helpful overview and mention they can open the full Integration Guide for step-by-step instructions, code samples, and field mapping.
Do NOT act as a threat analyst, SOC assistant, or incident investigator. If asked to analyze attacks, incidents, logs, malware, or live security operations, politely say that live threat analysis is only available after sign-in inside the Monitoring workspace.
Keep answers concise, friendly, and practical. If you cannot access account-specific data, say so and suggest signing in or contacting the team.
Do not invent exact prices, contract terms, or account status.`;

const COMMENTARY_SYSTEM_INSTRUCTION = `You are a SOC analyst writing brief daily threat summaries for a monitoring dashboard.
Use only the incident counts and categories provided. Do not invent IPs, attack names, or tools.
Each comment must be 1–2 short sentences, practical and calm.`;

const DEFAULT_MODEL = 'accounts/fireworks/models/deepseek-v4-pro';
const DEFAULT_BASE_URL = 'https://api.fireworks.ai/inference/v1';

export function aiConfigured() {
  const k = process.env.FIREWORKS_API_KEY;
  return typeof k === 'string' && k.trim().length > 0;
}

export function getFireworksModelName() {
  const m = process.env.FIREWORKS_MODEL;
  return typeof m === 'string' && m.trim() ? m.trim() : DEFAULT_MODEL;
}

function getFireworksBaseUrl() {
  const base = process.env.FIREWORKS_BASE_URL;
  return typeof base === 'string' && base.trim()
    ? base.trim().replace(/\/$/, '')
    : DEFAULT_BASE_URL;
}

function requireApiKey() {
  const apiKey = process.env.FIREWORKS_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error('ai_not_configured');
    err.code = 'ai_not_configured';
    throw err;
  }
  return apiKey;
}

/** @param {unknown} err */
export function mapFireworksError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/429|Too Many Requests|quota|rate limit|insufficient balance/i.test(msg)) {
    const mapped = new Error('ai_rate_limited');
    mapped.code = 'ai_rate_limited';
    return mapped;
  }
  if (/401|403|invalid api key|authentication|invalid_api_key/i.test(msg)) {
    const mapped = new Error('ai_invalid_key');
    mapped.code = 'ai_invalid_key';
    return mapped;
  }
  if (/404|model.*not found|does not exist/i.test(msg)) {
    const mapped = new Error('ai_model_not_found');
    mapped.code = 'ai_model_not_found';
    return mapped;
  }
  const mapped = new Error('ai_chat_failed');
  mapped.code = 'ai_chat_failed';
  return mapped;
}

async function withFireworksError(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Error && err.code) throw err;
    throw mapFireworksError(err);
  }
}

function normalizeLocale(locale) {
  return locale === 'id' ? 'id' : 'en';
}

function localeLanguageName(locale) {
  return normalizeLocale(locale) === 'id' ? 'Indonesian (Bahasa Indonesia)' : 'English';
}

function systemForVariant(variant, locale = 'en') {
  const base = variant === 'landing' ? LANDING_SYSTEM_INSTRUCTION : THREAT_SYSTEM_INSTRUCTION;
  const lang = localeLanguageName(locale);
  return `${base}\n\nAlways write every reply in ${lang}, including headings and bullet points. If the user switches language, follow their latest message.`;
}

/**
 * @param {{ role: string; content: string }[]} messages
 */
function toOpenAiMessages(messages) {
  return messages
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content.trim(),
    }));
}

/**
 * @param {string} text
 */
function parseJsonPayload(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw);
}

/**
 * @param {{ systemInstruction: string; messages: { role: string; content: string }[] }} input
 * @returns {Promise<string>}
 */
async function fireworksCompletion({ systemInstruction, messages }) {
  const apiKey = requireApiKey();
  // FIREWORKS_BASE_URL already includes /v1 (OpenAI-compatible).
  const res = await fetch(`${getFireworksBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getFireworksModelName(),
      messages: [{ role: 'system', content: systemInstruction }, ...toOpenAiMessages(messages)],
      temperature: 0.7,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof data?.error?.message === 'string'
        ? data.error.message
        : typeof data?.message === 'string'
          ? data.message
          : `Fireworks API error ${res.status}`;
    throw new Error(`${res.status} ${detail}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('empty_ai_response');
  }
  return content.trim();
}

/**
 * @param {{ label: string, dateKey: string, volume: number, categories?: Record<string, number>, peakHour?: number }[]} dailyPoints
 * @param {string} locale
 */
function buildCommentaryPrompt(dailyPoints, locale) {
  const lang = locale === 'id' ? 'Indonesian' : 'English';
  const lines = dailyPoints.map((d) => {
    const cats = Object.entries(d.categories || {})
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${k}=${n}`)
      .join(', ');
    return `- ${d.label} (${d.dateKey}): ${d.volume} incidents${cats ? `; categories: ${cats}` : ''}; peak hour count: ${d.peakHour ?? 0}`;
  });

  return `Write analyst comments in ${lang} for each day below.
Return ONLY a JSON array (no markdown), one object per day in the same order:
[{"date":"${dailyPoints[0]?.label}","comment":"..."}, ...]

Rules:
- Mention incident count and trend vs quiet/busy if obvious
- If 0 incidents, note calm period briefly
- Max 140 characters per comment
- Do not use bullet symbols inside comments

Daily data:
${lines.join('\n')}`;
}

/**
 * @param {{ variant?: 'threat' | 'landing'; messages: { role: string; content: string }[]; locale?: string }} input
 * @returns {Promise<{ reply: string }>}
 */
export async function runAiChat({ variant = 'threat', messages, locale = 'en' }) {
  if (!Array.isArray(messages) || !messages.length) {
    const err = new Error('messages_required');
    err.code = 'bad_request';
    throw err;
  }

  const last = messages[messages.length - 1];
  if (!last || last.role !== 'user' || typeof last.content !== 'string' || !last.content.trim()) {
    const err = new Error('last_message_must_be_user');
    err.code = 'bad_request';
    throw err;
  }

  const reply = await withFireworksError(() =>
    fireworksCompletion({
      systemInstruction: systemForVariant(variant, locale),
      messages,
    }),
  );
  return { reply };
}

/**
 * @param {{ dailyPoints: object[]; locale?: string }} input
 * @returns {Promise<{ comments: { date: string; comment: string }[] }>}
 */
export async function runDailyCommentary({ dailyPoints, locale = 'en' }) {
  if (!Array.isArray(dailyPoints) || !dailyPoints.length) {
    return { comments: [] };
  }

  const text = await withFireworksError(() =>
    fireworksCompletion({
      systemInstruction: COMMENTARY_SYSTEM_INSTRUCTION,
      messages: [{ role: 'user', content: buildCommentaryPrompt(dailyPoints, locale) }],
    }),
  );

  const parsed = parseJsonPayload(text);
  if (!Array.isArray(parsed)) {
    const err = new Error('invalid_commentary_format');
    err.code = 'invalid_commentary_format';
    throw err;
  }

  return {
    comments: parsed.map((row, i) => ({
      date: typeof row.date === 'string' ? row.date : dailyPoints[i]?.label ?? '',
      comment: typeof row.comment === 'string' ? row.comment.trim() : '',
    })),
  };
}
