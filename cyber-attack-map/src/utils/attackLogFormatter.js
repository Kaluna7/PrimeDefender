function dash(value) {
  return value && String(value).trim() ? String(value).trim() : '—';
}

export function formatAttackConfidence(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '—';
}

export function buildAttackLogLines(attack) {
  return [
    `timestamp: ${new Date(attack.createdAt).toISOString()}`,
    `request_id: ${dash(attack.requestId || attack.incidentId || attack.id)}`,
    '',
    'attacker:',
    `  ip: ${dash(attack.attackerIp)}`,
    `  geo: ${dash(attack.sourceLabel)}`,
    '',
    'request:',
    `  method: ${dash(attack.method)}`,
    `  path: ${dash(attack.path)}`,
    '  headers:',
    `    user-agent: ${dash(attack.userAgent)}`,
    `    x-forwarded-for: ${dash(attack.forwardedFor)}`,
    '',
    'target:',
    `  service: ${dash(attack.targetService || attack.siteId || attack.tenantId || attack.targetLabel)}`,
    '',
    'auth:',
    `  status: ${dash(attack.authStatus)}`,
    '',
    'detect:',
    `  type: ${dash(attack.detectType || attack.detection)}`,
    `  confidence: ${formatAttackConfidence(attack.detectConfidence)}`,
    '',
    'response:',
    `  status: ${dash(attack.responseStatus)}`,
    `  response_time_ms: ${dash(attack.responseTimeMs)}`,
    '',
    'action:',
    `  blocked: ${String(Boolean(attack.blocked))}`,
    `  mitigation: ${dash(attack.mitigation || attack.action)}`,
    '',
    'ip_intel:',
    `  isp: ${dash(attack.ipIntelIsp)}`,
    '',
    'behavior:',
    `  requests_last_1m: ${dash(attack.requestsLast1m)}`,
  ];
}

export function formatAttackLog(attack) {
  return buildAttackLogLines(attack).join('\n');
}

export function summarizeAttackLog(attack) {
  return {
    requestId: dash(attack.requestId || attack.incidentId || attack.id),
    request: `${dash(attack.method)} ${dash(attack.path)}`,
    detectType: dash(attack.detectType || attack.detection),
    responseStatus: dash(attack.responseStatus),
    mitigation: dash(attack.mitigation || attack.action),
  };
}
