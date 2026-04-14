import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_INSTRUCTION = `You are a cybersecurity assistant embedded in a live threat monitoring dashboard.
Operators see incidents from a PrimeDefender-style ingest (iwconfig-like readouts plus structured fields).
Respond in clear, concise language. Structure answers with: (1) what happened, (2) likely attacker intent or technique, (3) recommended next checks or mitigations.
If evidence is insufficient, say what is missing. Do not invent IPs, payloads, or tool usage not suggested by the data.`;

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
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_KEY_MISSING');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: getGeminiModelName(),
    systemInstruction: SYSTEM_INSTRUCTION,
  });
  return model.startChat({ history: [] });
}
