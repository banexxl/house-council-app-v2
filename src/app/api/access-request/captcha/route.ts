export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import crypto from 'crypto';
import { NextResponse } from 'next/server';

const CAPTCHA_SECRET = process.env.ACCESS_REQUEST_CAPTCHA_SECRET || process.env.ACCESS_REQUEST_FORM_SECRET || '';
const CAPTCHA_TTL_MS = 1000 * 60 * 10; // 10 minutes
const CAPTCHA_LENGTH = 5;

const randomText = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < CAPTCHA_LENGTH; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
};

const toToken = (text: string) => {
  const payload = { text, ts: Date.now() };
  const serialized = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', CAPTCHA_SECRET).update(serialized).digest('hex');
  return Buffer.from(`${serialized}::${signature}`).toString('base64');
};

const svgForText = (text: string) => {
  const width = 180;
  const height = 60;
  const chars = text.split('');
  const charWidth = width / (chars.length + 1);
  const lines = Array.from({ length: 6 }).map((_, idx) => {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(0,0,0,0.2)" stroke-width="1" />`;
  });
  const letters = chars
    .map((char, idx) => {
      const x = (idx + 0.7) * charWidth;
      const y = 35 + Math.random() * 10;
      const rotate = (Math.random() - 0.5) * 20;
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="28" font-family="monospace" fill="#1f2937" transform="rotate(${rotate.toFixed(
        1
      )} ${x.toFixed(1)} ${y.toFixed(1)})" font-weight="700">${char}</text>`;
    })
    .join('');
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#f8fafc"/>
      ${lines.join('')}
      ${letters}
    </svg>
  `;
};

export async function GET() {
  try {
    if (!CAPTCHA_SECRET) {
      return NextResponse.json({ error: 'Captcha not configured' }, { status: 500 });
    }
    const text = randomText();
    const token = toToken(text);
    const svg = svgForText(text);
    const image = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    return NextResponse.json({ image, token, ttlMs: CAPTCHA_TTL_MS });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Captcha generation failed' }, { status: 500 });
  }
}
