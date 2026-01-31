'use client';

import QRCode from 'qrcode';
import { useEffect, useState, type CSSProperties } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';

const BUILDING_REQUEST_URL =
  `${process.env.NEXT_PUBLIC_BASE_URL}/auth/access-request`

const POSTER_ID = 'building-qr-poster';

const posterStyle: CSSProperties = {
  width: '100%',
  maxWidth: 420,
  margin: '0 auto',
  padding: '24px 20px',
  border: '1px solid #e0e0e0',
  borderRadius: 12,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
  textAlign: 'center',
  backgroundColor: '#fff',
};

const logoStyle: CSSProperties = {
  width: 120,
  height: 'auto',
};

const titleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: '#111',
};

const subtitleStyle: CSSProperties = {
  fontSize: 14,
  color: '#555',
};

const qrBoxStyle: CSSProperties = {
  width: 180,
  height: 180,
  padding: 8,
  border: '1px solid #e0e0e0',
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#fff',
};

const qrImageStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
};

const urlStyle: CSSProperties = {
  fontSize: 12,
  color: '#777',
  wordBreak: 'break-all',
};

// -----------------------------
// Print helper (iframe)
// -----------------------------
function printElementById(elementId: string) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  const origin = window.location.origin;

  doc.open();
  doc.write(`
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <base href="${origin}/" />
    <title>NestLink QR Poster</title>

    <style>
      @page { size: A4 portrait; margin: 0; }

      html, body {
        margin: 0;
        padding: 0;
        width: 210mm;
        height: 297mm;
        background: #fff;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        overflow: hidden;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      * { box-sizing: border-box; }

      .poster {
        width: 210mm;
        height: 297mm;
        padding: 10mm;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .frame {
        width: 100%;
        height: 100%;
        border: 1px solid #e6e6e6;
        border-radius: 10mm;
        padding: 12mm;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
      }

      /* wrapper around injected markup */
      .sheet {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* Kill MUI default spacing */
      .sheet, .sheet * {
        margin: 0 !important;
        padding: 0 !important;
      }

      /* VERY IMPORTANT: prevent absolute/transform overlap inside injected markup */
      .sheet * {
        position: static !important;
        transform: none !important;
      }

      /* Make the injected "card" a clean vertical stack */
      .sheet > * {
        width: 100% !important;
        max-width: 170mm !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        text-align: center !important;

        border: 1px solid #efefef !important;
        border-radius: 6mm !important;
        padding: 12mm !important;

        /* Spacing controlled here (no overlap) */
        gap: 8mm !important;
      }

      /* Make the title area always have room (prevents QR covering it) */
      .sheet > * > :nth-child(2) {
        min-height: 18mm !important; /* reserve space for "Scan..." + building name */
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        gap: 3mm !important;
      }

      /* QR block gets its own lane */
      .sheet > * > :nth-child(3) {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 4mm !important;
      }

      /* Logo */
      img[alt="NestLink"] {
        height: 85mm !important;
        width: auto !important;
        max-width: 100% !important;
        display: block;
      }

      /* QR */
      img[alt*="QR"] {
        width: 65mm !important;
        height: 65mm !important;
        display: block;
      }

      /* URL wrap */
      .sheet a, .sheet p, .sheet span, .sheet div {
        max-width: 160mm;
        word-break: break-word;
        overflow-wrap: anywhere;
        font-size: 12pt !important;
        line-height: 1.25 !important;
      }
    </style>
  </head>

  <body>
    <div class="poster">
      <div class="frame">
        <div class="sheet">
          ${el.outerHTML}
        </div>
      </div>
    </div>
  </body>
</html>
`);
  doc.close();


  const win = iframe.contentWindow!;
  const imgs = Array.from(doc.images);

  const cleanup = () => setTimeout(() => document.body.removeChild(iframe), 300);
  const doPrint = () => {
    win.focus();
    win.print();
    cleanup();
  };

  // Wait for logo + QR PNG to load
  if (imgs.length === 0) {
    setTimeout(doPrint, 200);
    return;
  }

  let loaded = 0;
  const done = () => {
    loaded += 1;
    if (loaded >= imgs.length) setTimeout(doPrint, 150);
  };

  imgs.forEach((img) => {
    if (img.complete) done();
    else {
      img.onload = done;
      img.onerror = done;
    }
  });
}

// -----------------------------
// QR PNG hook (high-res for print)
// -----------------------------
function useQrPng(value: string) {
  const [pngDataUrl, setPngDataUrl] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const url = await QRCode.toDataURL(value, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 1200, // bigger = better print/scanning
      });
      if (!cancelled) setPngDataUrl(url);
    })();

    return () => {
      cancelled = true;
    };
  }, [value]);

  return pngDataUrl;
}

type QrCodeModalProps = {
  open: boolean;
  onClose: () => void;
  buildingLabel?: string;
  buildingId?: string;
};

export function QrCodeModal({
  open,
  onClose,
  buildingLabel,
  buildingId,
}: QrCodeModalProps) {
  const qrPng = useQrPng(BUILDING_REQUEST_URL + (buildingId ? `?buildingId=${buildingId}` : ''));
  const titleText = buildingLabel ? `NestLink - ${buildingLabel}` : 'NestLink';
  const descriptionText = `Scan to request access for your building:`
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>QR code</DialogTitle>
      <DialogContent dividers>
        <Box id={POSTER_ID} style={posterStyle}>
          <img src="/assets/logo-icons/1-01.png" alt="NestLink" style={logoStyle} />
          <Box style={subtitleStyle}>{descriptionText}</Box>
          <Box style={titleStyle}>{titleText}</Box>
          <Box style={qrBoxStyle}>
            {qrPng ? (
              <img src={qrPng} alt="QR code" style={qrImageStyle} />
            ) : (
              <CircularProgress size={32} />
            )}
          </Box>
          <Box style={urlStyle}>{BUILDING_REQUEST_URL + (buildingId ? `?buildingId=${buildingId}` : '')}</Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => printElementById(POSTER_ID)}
          variant="outlined"
          disabled={!qrPng}
        >
          Print
        </Button>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
