import { fetchAiConfigured, isAiConfigured, sendAiChat } from './aiBridge.js';

/** @deprecated use fetchAiConfigured / isAiConfigured */
export async function refreshGeminiConfigured() {
  return fetchAiConfigured();
}

export function isGeminiConfigured() {
  return isAiConfigured();
}

export { fetchAiConfigured, sendAiChat };
