const USER_TOPIC_PATTERNS = [
  /\bintegration\b/i,
  /\bintegrat(e|ing)\b/i,
  /\bingest\b/i,
  /\bapi\s*key/i,
  /\bmiddleware\b/i,
  /\bbridge\b/i,
  /\bwebhook/i,
  /\bpost\s*\/\s*ingest/i,
  /\bpayload/i,
  /\bsend(ing)?\s+incident/i,
  /\bconnect(ing)?\b/i,
  /\bhow\s+do\s+i\s+connect\b/i,
  /\bintegrasi\b/i,
  /\bmenghubungkan\b/i,
  /\bmenyambungkan\b/i,
  /\bmengirim\s+insiden/i,
  /\bkunci\s*api\b/i,
  /\bpanduan\s+integrasi\b/i,
  /\bendpoint\s+ingest\b/i,
  /\bhubungkan\b/i,
];

const REPLY_TOPIC_PATTERNS = [
  /\bintegration guide\b/i,
  /\bpanduan integrasi\b/i,
  /\bintegration docs\b/i,
  /\bdokumentasi integrasi\b/i,
  /\b\/docs\b/,
  /\bfull guide\b/i,
  /\bpanduan lengkap\b/i,
  /\bsee the guide\b/i,
  /\bbuka panduan\b/i,
];

/**
 * @param {string} [userText]
 * @param {string} [replyText]
 * @param {{ force?: boolean }} [options]
 */
export function shouldShowIntegrationGuideCta(userText = '', replyText = '', options = {}) {
  if (options.force) return true;
  const user = String(userText);
  const reply = String(replyText);
  if (USER_TOPIC_PATTERNS.some((re) => re.test(user))) return true;
  if (reply && REPLY_TOPIC_PATTERNS.some((re) => re.test(reply))) return true;
  return false;
}
