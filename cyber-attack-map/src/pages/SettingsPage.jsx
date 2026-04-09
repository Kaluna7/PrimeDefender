import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';
import { LOCALES } from '../i18n/translations.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

const CLIENT_SNIPPET = `// Di server pelanggan (Node 18+), set PRIMEDEFENDER_API_KEY
const BRIDGE = process.env.PRIMEDEFENDER_BRIDGE_URL; // ${SOCKET_URL}
const API_KEY = process.env.PRIMEDEFENDER_API_KEY;
// req = request Express; trust proxy untuk IP asli

await fetch(\`\${BRIDGE}/ingest\`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': API_KEY,
  },
  body: JSON.stringify({
    from: { lat: 1.35, lon: 103.82 },
    to: { lat: -6.2, lon: 106.85 },
    category: 'ddos',
    severity: 'high',
    sourceLabel: 'Attacker region',
    targetLabel: 'GET /login',
    siteId: 'customer-site-id',
    attackerIp: req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  }),
});`;

export function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const [adminSecret, setAdminSecret] = useState('');
  const [keyLabel, setKeyLabel] = useState('');
  const [keys, setKeys] = useState([]);
  const [newKey, setNewKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    document.title = `${t('brand.name')} – ${t('nav.settings')}`;
  }, [t, locale]);

  const headers = useCallback(() => {
    const h = { 'Content-Type': 'application/json' };
    if (adminSecret.trim()) h['X-Admin-Secret'] = adminSecret.trim();
    return h;
  }, [adminSecret]);

  const refreshList = useCallback(async () => {
    setMessage('');
    setLoading(true);
    try {
      const r = await fetch(`${SOCKET_URL}/admin/api-keys`, { headers: headers() });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMessage(data.hint || data.error || t('settings.errorGeneric'));
        setKeys([]);
        return;
      }
      setKeys(Array.isArray(data.keys) ? data.keys : []);
    } catch {
      setMessage(t('settings.errorGeneric'));
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, [headers, t]);

  const createKey = async () => {
    setNewKey('');
    setMessage('');
    setLoading(true);
    try {
      const r = await fetch(`${SOCKET_URL}/admin/api-keys`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ label: keyLabel.trim() || undefined }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMessage(data.hint || data.error || t('settings.errorGeneric'));
        return;
      }
      if (data.apiKey) setNewKey(data.apiKey);
      await refreshList();
    } catch {
      setMessage(t('settings.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const revoke = async (id) => {
    if (!window.confirm('Revoke this key?')) return;
    setMessage('');
    setLoading(true);
    try {
      const r = await fetch(`${SOCKET_URL}/admin/api-keys/${id}`, {
        method: 'DELETE',
        headers: headers(),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMessage(data.hint || data.error || t('settings.errorGeneric'));
        return;
      }
      await refreshList();
    } catch {
      setMessage(t('settings.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const copySnippet = () => {
    navigator.clipboard?.writeText(CLIENT_SNIPPET).catch(() => {});
  };

  return (
    <div className="thin-scrollbar h-full overflow-y-auto px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-cyber text-xl font-bold uppercase tracking-[0.25em] text-cyan-100">
          {t('settings.title')}
        </h1>

        <div className="mt-10 rounded-lg border border-cyan-900/50 bg-slate-950/50 p-6">
          <h2 className="text-sm font-semibold text-cyan-200">{t('settings.languageTitle')}</h2>
          <p className="mt-1 text-xs text-cyan-700">{t('settings.languageHint')}</p>

          <div className="mt-4 flex flex-col gap-2">
            {LOCALES.map((opt) => (
              <label
                key={opt.id}
                className={`flex cursor-pointer items-center gap-3 rounded border px-4 py-3 transition-colors ${
                  locale === opt.id
                    ? 'border-cyan-500/60 bg-cyan-950/40 text-cyan-50'
                    : 'border-cyan-900/40 bg-black/40 text-cyan-600 hover:border-cyan-800'
                }`}
              >
                <input
                  type="radio"
                  name="locale"
                  value={opt.id}
                  checked={locale === opt.id}
                  onChange={() => setLocale(opt.id)}
                  className="accent-cyan-500"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-cyan-900/50 bg-slate-950/50 p-6">
          <h2 className="font-cyber text-sm font-bold uppercase tracking-[0.2em] text-cyan-200">
            {t('settings.bridgeTitle')}
          </h2>
          <p className="mt-2 text-xs text-cyan-700">{t('settings.bridgeUrlLabel')}</p>
          <p className="mt-2 break-all font-mono text-sm text-cyan-300/95">{SOCKET_URL}</p>
        </div>

        <div className="mt-8 rounded-lg border border-cyan-900/50 bg-slate-950/50 p-6">
          <h2 className="font-cyber text-sm font-bold uppercase tracking-[0.2em] text-cyan-200">
            {t('settings.apiKeysTitle')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-cyan-600/95">{t('settings.apiKeysIntro')}</p>
          <p className="mt-3 text-xs text-amber-500/90">{t('settings.adminRequired')}</p>

          <label className="mt-6 block">
            <span className="text-xs font-semibold text-cyan-500">{t('settings.adminSecretLabel')}</span>
            <input
              type="password"
              autoComplete="off"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              className="mt-1 w-full rounded border border-cyan-900/60 bg-black/60 px-3 py-2 font-mono text-sm text-cyan-100 outline-none focus:border-cyan-600"
              placeholder=""
            />
            <span className="mt-1 block text-[10px] text-cyan-700">{t('settings.adminSecretHint')}</span>
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-semibold text-cyan-500">{t('settings.keyLabelOptional')}</span>
            <input
              type="text"
              value={keyLabel}
              onChange={(e) => setKeyLabel(e.target.value)}
              className="mt-1 w-full rounded border border-cyan-900/60 bg-black/60 px-3 py-2 text-sm text-cyan-100 outline-none focus:border-cyan-600"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading || !adminSecret.trim()}
              onClick={createKey}
              className="rounded border border-cyan-600/60 bg-cyan-950/50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-cyan-100 disabled:opacity-40"
            >
              {t('settings.createKey')}
            </button>
            <button
              type="button"
              disabled={loading || !adminSecret.trim()}
              onClick={refreshList}
              className="rounded border border-slate-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300 disabled:opacity-40"
            >
              {t('settings.listKeys')}
            </button>
          </div>

          {message && (
            <p className="mt-4 rounded border border-rose-800/50 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">
              {message}
            </p>
          )}

          {newKey && (
            <div className="mt-6 rounded border border-emerald-700/50 bg-emerald-950/30 px-3 py-3">
              <p className="text-xs font-semibold text-emerald-300">{t('settings.newKeyTitle')}</p>
              <p className="mt-1 break-all font-mono text-sm text-emerald-100">{newKey}</p>
              <p className="mt-2 text-[10px] text-emerald-600/90">{t('settings.newKeyWarn')}</p>
            </div>
          )}

          <ul className="mt-6 space-y-2">
            {keys.length === 0 && !loading && (
              <li className="text-xs text-cyan-700">{t('settings.noKeys')}</li>
            )}
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-cyan-900/40 bg-black/40 px-3 py-2 text-xs"
              >
                <span className="font-mono text-cyan-400">{k.prefix}</span>
                {k.label && <span className="text-cyan-600">{k.label}</span>}
                <button
                  type="button"
                  onClick={() => revoke(k.id)}
                  className="ml-auto text-rose-400 hover:text-rose-300"
                >
                  {t('settings.revoke')}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 rounded-lg border border-cyan-900/50 bg-slate-950/50 p-6">
          <h2 className="font-cyber text-sm font-bold uppercase tracking-[0.2em] text-cyan-200">
            {t('settings.clientSnippetTitle')}
          </h2>
          <pre className="thin-scrollbar mt-3 max-h-64 overflow-auto rounded border border-cyan-900/40 bg-black/60 p-3 font-mono text-[10px] leading-relaxed text-cyan-500/95">
            {CLIENT_SNIPPET}
          </pre>
          <button
            type="button"
            onClick={copySnippet}
            className="mt-3 rounded border border-cyan-800/50 px-3 py-1.5 text-[10px] font-semibold uppercase text-cyan-500 hover:bg-cyan-950/50"
          >
            {t('settings.copy')}
          </button>
        </div>
      </div>
    </div>
  );
}
