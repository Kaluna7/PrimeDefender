import { DDOS_VECTOR, THREAT_CATEGORY } from '../constants/threatCategories.js';

/**
 * Short human-readable description of what the attacker activity looks like (for UI / modal).
 * @param {Record<string, unknown>} attack normalized attack
 * @param {'en' | 'id'} locale
 */
export function describeAttackActivity(attack, locale) {
  const isId = locale === 'id';
  const cat = attack.category;
  const det = typeof attack.detection === 'string' ? attack.detection.toLowerCase() : '';

  if (cat === THREAT_CATEGORY.DDOS) {
    const v = attack.ddos?.vector;
    const gbps = attack.ddos?.peakGbps;
    const vec =
      v === DDOS_VECTOR.VOLUMETRIC
        ? isId
          ? 'volumetrik'
          : 'volumetric'
        : v === DDOS_VECTOR.APPLICATION
          ? isId
            ? 'aplikasi'
            : 'application-layer'
          : v === DDOS_VECTOR.PROTOCOL
            ? isId
              ? 'protokol'
              : 'protocol'
            : v || '';
    if (isId) {
      return `Flood / DDoS${vec ? ` (${vec})` : ''}${typeof gbps === 'number' ? ` · puncak ~${gbps} Gbps` : ''}`;
    }
    return `DDoS / flood attack${vec ? ` (${vec} vector)` : ''}${typeof gbps === 'number' ? ` · peak ~${gbps} Gbps` : ''}`;
  }

  if (cat === THREAT_CATEGORY.INTRUSION) {
    if (det.includes('sqli') || det.includes('sql') || det.includes('union'))
      return isId
        ? 'Percobaan SQL injection (manipulasi query / union)'
        : 'SQL injection attempt (query manipulation / union)';
    if (det.includes('xss') || det.includes('script'))
      return isId ? 'Percobaan XSS / injeksi script di browser' : 'XSS attempt / browser script injection';
    if (det.includes('brute') || det.includes('login'))
      return isId ? 'Brute force / percobaan login berulang' : 'Brute force / repeated login attempts';
    if (det.includes('path') || det.includes('traversal'))
      return isId ? 'Path traversal / akses file di luar izin' : 'Path traversal / unauthorized file access';
    if (det.includes('cmd') || det.includes('command'))
      return isId ? 'Percobaan command injection / eksekusi shell' : 'Command injection / shell execution attempt';
    if (det.includes('file_inclusion') || det.includes('lfi') || det.includes('rfi'))
      return isId ? 'Percobaan file inclusion lokal/jarak jauh' : 'Local or remote file inclusion attempt';
    if (det.includes('auth_bypass'))
      return isId ? 'Percobaan bypass autentikasi / probing hak akses' : 'Authentication bypass / privilege probing attempt';
    if (det.includes('suspicious_request'))
      return isId ? 'Request mencurigakan dengan pola anomali' : 'Suspicious request with anomalous probing patterns';
    return isId ? 'Aktivitas intrusi (akses / eksploitasi)' : 'Intrusion activity (access / exploitation attempt)';
  }

  if (cat === THREAT_CATEGORY.MALWARE) {
    return isId ? 'Distribusi atau eksekusi malware' : 'Malware delivery or execution';
  }

  if (cat === THREAT_CATEGORY.BOTNET) {
    if (det.includes('scanner'))
      return isId ? 'Scanner otomatis / enumerasi path sensitif' : 'Automated scanner / sensitive path enumeration';
    if (det.includes('bot_activity') || det.includes('bad_ua'))
      return isId ? 'Aktivitas bot otomatis / user-agent non-manusia' : 'Automated bot activity / non-human user agent';
    return isId ? 'Komunikasi botnet / C2' : 'Botnet / command-and-control traffic';
  }

  if (det && det.length > 0) {
    return isId ? `Aktivitas terdeteksi: ${attack.detection}` : `Detected activity: ${attack.detection}`;
  }

  return isId ? 'Jenis ancaman tidak terperinci dalam payload' : 'Threat type not specified in payload';
}
