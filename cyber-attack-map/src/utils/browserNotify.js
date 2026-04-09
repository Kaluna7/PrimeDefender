/**
 * Browser Notification API — only fires for events already delivered via Socket.io (real ingest).
 */

export function notificationsSupported() {
  return typeof Notification !== 'undefined';
}

export function getNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/**
 * @param {object} entry
 * @param {{ title?: string; body?: string }} [copy]
 */
export function notifySecurityIncident(entry, copy) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const parts = [entry.sourceLabel, entry.targetLabel].filter((s) => s && String(s).trim());
  const body =
    copy?.body ??
    (parts.length > 0 ? parts.join(' → ') : 'New incident reported');
  const title = copy?.title ?? 'Security incident';
  try {
    new Notification(title, { body, tag: entry.id, requireInteraction: false });
  } catch {
    /* ignore */
  }
}
