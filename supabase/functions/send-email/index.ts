import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const GMAIL_USER = Deno.env.get('GMAIL_USER');
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD');

type EmailType = 'test' | 'welcome' | 'lead' | 'custom';

interface EmailPayload {
  type: EmailType;
  to: string;
  // welcome
  name?: string;
  role?: string;
  // lead
  sellerName?: string;
  buyerName?: string;
  buyerPhone?: string;
  buyerCity?: string;
  productName?: string;
  message?: string;
  // custom
  subject?: string;
  html?: string;
}

const brandColor = '#0d9488';

function shell(title: string, bodyHtml: string) {
  return `<!DOCTYPE html><html><body style="margin:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:${brandColor};border-radius:12px 12px 0 0;padding:24px 28px;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;">${title}</h1>
    </div>
    <div style="background:#ffffff;border-radius:0 0 12px 12px;padding:28px;color:#1f2937;font-size:15px;line-height:1.6;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      ${bodyHtml}
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">This is an automated message. Please do not reply.</p>
  </div></body></html>`;
}

function buildEmail(p: EmailPayload): { subject: string; html: string } {
  switch (p.type) {
    case 'welcome':
      return {
        subject: 'Welcome aboard! 🎉',
        html: shell('Welcome!', `
          <p>Hi <strong>${p.name || 'there'}</strong>,</p>
          <p>Your ${p.role === 'seller' ? 'seller' : 'buyer'} account has been created successfully.</p>
          ${p.role === 'seller'
            ? '<p>Your business profile is now pending admin approval. Once approved you can start listing products and receiving qualified leads.</p>'
            : '<p>You can now browse suppliers, send enquiries, and post requirements to get the best quotes.</p>'}
          <p style="margin-top:24px;">Thanks for joining us!</p>`),
      };
    case 'lead':
      return {
        subject: `New Lead: ${p.productName || 'Product enquiry'}`,
        html: shell('You have a new lead! 🔥', `
          <p>Hi <strong>${p.sellerName || 'Seller'}</strong>,</p>
          <p>A buyer just enquired about your product. Respond quickly to win the deal.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px 0;color:#6b7280;">Product</td><td style="padding:8px 0;font-weight:600;">${p.productName || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;">Buyer</td><td style="padding:8px 0;font-weight:600;">${p.buyerName || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;">Phone</td><td style="padding:8px 0;font-weight:600;">${p.buyerPhone || '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;">City</td><td style="padding:8px 0;font-weight:600;">${p.buyerCity || '—'}</td></tr>
          </table>
          ${p.message ? `<div style="background:#f4f5f7;border-radius:8px;padding:12px;color:#374151;">${p.message}</div>` : ''}`),
      };
    case 'custom':
      return { subject: p.subject || 'Notification', html: p.html || shell('Notification', '<p>Hello.</p>') };
    case 'test':
    default:
      return {
        subject: '✅ SMTP Test Email',
        html: shell('SMTP is working!', `
          <p>Great news — your Gmail SMTP connection is configured correctly.</p>
          <p>Sent at ${new Date().toLocaleString()}.</p>`),
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      return new Response(
        JSON.stringify({ error: 'GMAIL_USER and GMAIL_APP_PASSWORD are not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const payload = (await req.json()) as EmailPayload;
    if (!payload.to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.to)) {
      return new Response(JSON.stringify({ error: 'Valid "to" email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { subject, html } = buildEmail(payload);

    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
      },
    });

    await client.send({ from: GMAIL_USER, to: payload.to, subject, html });
    await client.close();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-email error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
