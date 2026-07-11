import { smtpConfigured } from '../auth/auth.mjs';
import { sendSmtpEmail } from '../auth/smtp.mjs';
import { getPlan } from './plans.mjs';

function formatIdr(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * @param {{ toEmail: string, toName?: string, planId: string, orderId: string, amount: number, expiresAt: number }} input
 */
export async function sendPaymentSuccessEmail(input) {
  if (!smtpConfigured()) {
    return { ok: false, error: 'smtp_not_configured' };
  }

  const plan = getPlan(input.planId);
  const planLabel = plan?.nameEn || input.planId;
  const amountLabel = formatIdr(input.amount);
  const expiresLabel = formatDate(input.expiresAt);
  const toName = input.toName || input.toEmail;

  const html = `
    <div style="font-family:system-ui,sans-serif;background:#0F172A;color:#F8FAFC;padding:28px;max-width:520px">
      <h1 style="color:#C62828;font-size:20px;margin:0 0 16px">Slark</h1>
      <p style="margin:0 0 12px">Hi ${toName},</p>
      <p style="margin:0 0 12px">Thank you for your payment. Your subscription is now active.</p>
      <div style="background:#1E293B;border-radius:12px;padding:16px;margin:20px 0">
        <p style="margin:0 0 8px;font-size:13px;color:#94a3b8">Order</p>
        <p style="margin:0 0 4px;font-weight:600">${planLabel}</p>
        <p style="margin:0 0 4px">${amountLabel}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#94a3b8">Order ID: ${input.orderId}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#94a3b8">Active until: ${expiresLabel}</p>
      </div>
      <p style="margin:0 0 12px;font-size:14px">Terima kasih atas pembayaran Anda. Langganan Slark Anda sudah aktif.</p>
      <p style="margin:0;font-size:13px;color:#94a3b8">Manage your API keys anytime from account settings in the Slark dashboard.</p>
    </div>
  `.trim();

  return sendSmtpEmail({
    toEmail: input.toEmail,
    toName,
    subject: 'Slark — payment successful / pembayaran berhasil',
    html,
  });
}
