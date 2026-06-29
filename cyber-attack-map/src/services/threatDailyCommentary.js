import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiModelName, isGeminiConfigured } from './geminiChat.js';

const SYSTEM_INSTRUCTION = `You are a SOC analyst writing brief daily threat summaries for a monitoring dashboard.
Use only the incident counts and categories provided. Do not invent IPs, attack names, or tools.
Each comment must be 1–2 short sentences, practical and calm.`;

/**
 * @param {string} text
 * @returns {unknown}
 */
function parseJsonPayload(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw);
}

/**
 * @param {{ label: string, dateKey: string, volume: number, categories?: Record<string, number>, peakHour?: number }[]} dailyPoints
 * @param {string} locale
 */
function buildPrompt(dailyPoints, locale) {
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
 * @param {{ label: string, dateKey: string, volume: number, categories?: Record<string, number> }[]} dailyPoints
 * @param {string} locale
 * @returns {Promise<{ date: string, comment: string }[]>}
 */
export async function generateDailyThreatCommentary(dailyPoints, locale) {
  if (!isGeminiConfigured()) {
    throw new Error('GEMINI_KEY_MISSING');
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: getGeminiModelName(),
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  const result = await model.generateContent(buildPrompt(dailyPoints, locale));
  const text = result.response.text();
  const parsed = parseJsonPayload(text);

  if (!Array.isArray(parsed)) {
    throw new Error('INVALID_COMMENTARY_FORMAT');
  }

  return parsed.map((row, i) => ({
    date: typeof row.date === 'string' ? row.date : dailyPoints[i]?.label ?? '',
    comment: typeof row.comment === 'string' ? row.comment.trim() : '',
  }));
}

/**
 * @param {{ label: string, volume: number }[]} dailyPoints
 * @param {(key: string, vars?: object) => string} t
 */
export function buildFallbackDailyComments(dailyPoints, t) {
  return dailyPoints.map((d, i) => {
    const prev = i > 0 ? dailyPoints[i - 1].volume : d.volume;
    let comment;
    if (d.volume === 0) {
      comment = t('monitoring.intelCommentQuiet');
    } else if (d.volume > prev) {
      comment = t('monitoring.intelCommentRising', { n: d.volume });
    } else if (d.volume < prev) {
      comment = t('monitoring.intelCommentFalling', { n: d.volume });
    } else {
      comment = t('monitoring.intelCommentStable', { n: d.volume });
    }
    return { date: d.label, comment };
  });
}
