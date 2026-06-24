import { GoogleGenerativeAI } from '@google/generative-ai';

const THREAT_SYSTEM_INSTRUCTION = `You are a cybersecurity assistant embedded in a live threat monitoring dashboard.
Operators see incidents from a Slark-style ingest (iwconfig-like readouts plus structured fields).
Respond in clear, concise language. Structure answers with: (1) what happened, (2) likely attacker intent or technique, (3) recommended next checks or mitigations.
If evidence is insufficient, say what is missing. Do not invent IPs, payloads, or tool usage not suggested by the data.`;

const LANDING_SYSTEM_INSTRUCTION = `You are a friendly assistant on the Slark website. Slark is a cyber threat monitoring platform: customers connect their backend, report blocked attacks via API, and view a live threat map.
Answer in clear, simple language. Help with: what Slark does, how to sign up, API subscription, integration basics, and monitoring features.
If you do not know something specific to the user's account, suggest they sign in or read the integration docs. Do not invent pricing or features not described in general Slark marketing.`;

export function isGeminiConfigured() {
  const k = import.meta.env.VITE_GEMINI_API_KEY;
  return typeof k === 'string' && k.trim().length > 0;
}

export function getGeminiModelName() {
  const m = import.meta.env.VITE_GEMINI_MODEL;
  return typeof m === 'string' && m.trim() ? m.trim() : 'gemini-2.0-flash';
}

/**
 * @returns {import('@google/generative-ai').ChatSession}
 */
export function createThreatChatSession() {
  return createGeminiChatSession(THREAT_SYSTEM_INSTRUCTION);
}

/**
 * @returns {import('@google/generative-ai').ChatSession}
 */
export function createLandingChatSession() {
  return createGeminiChatSession(LANDING_SYSTEM_INSTRUCTION);
}

/**
 * @param {string} systemInstruction
 * @returns {import('@google/generative-ai').ChatSession}
 */
function createGeminiChatSession(systemInstruction) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_KEY_MISSING');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: getGeminiModelName(),
    systemInstruction,
  });
  return model.startChat({ history: [] });
}
