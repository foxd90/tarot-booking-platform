// Serverless function (Vercel) — receives the sold-out contact form and emails it.
// Uses Resend's REST API directly, so there are no npm dependencies to install.
//
// Required environment variables (set in the Vercel dashboard → Settings → Environment Variables):
//   RESEND_API_KEY  — your Resend API key (starts with "re_")
//   CONTACT_TO      — where submissions are delivered (default: cawalis.spirit@gmail.com)
//   CONTACT_FROM    — verified sender, e.g. "Cawa Liss <notifications@cawaliss.com>".
//                     Until you verify a domain in Resend, use "Cawa Liss <onboarding@resend.dev>",
//                     which can only deliver to the email address that owns the Resend account.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { first = '', last = '', email = '', message = '' } =
    (typeof req.body === 'object' && req.body) || {};

  const f = String(first).trim();
  const l = String(last).trim();
  const e = String(email).trim();
  const m = String(message).trim();

  if (!f || !l || !e || !m) {
    return res.status(400).json({ error: 'Please fill in every field.' });
  }
  if (!EMAIL_RE.test(e)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return res.status(500).json({ error: 'Email service is not configured yet.' });
  }

  const to = process.env.CONTACT_TO || 'cawalis.spirit@gmail.com';
  const from = process.env.CONTACT_FROM || 'Cawa Liss <onboarding@resend.dev>';

  const text =
    `New request from the sold-out page:\n\n` +
    `Name:  ${f} ${l}\n` +
    `Email: ${e}\n\n` +
    `Message:\n${m}\n`;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: e,
        subject: `Sold-out notify request — ${f} ${l}`,
        text,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      console.error('Resend error', resp.status, detail);
      return res.status(502).json({ error: 'Could not send your message. Please email us directly.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact function crashed', err);
    return res.status(500).json({ error: 'Something went wrong. Please email us directly.' });
  }
}
