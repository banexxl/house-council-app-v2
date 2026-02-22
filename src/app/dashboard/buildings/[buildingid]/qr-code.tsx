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
  Divider,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { tokens } from 'src/locales/tokens';

const BUILDING_REQUEST_URL =
  `${process.env.NEXT_PUBLIC_BASE_URL}/auth/access-request`

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.banexxl.nestlinkapp";

const POSTER_ID = 'building-qr-poster';

const posterStyle: CSSProperties = {
  width: '100%',
  maxWidth: 420,
  margin: '0 auto',
  padding: '16px 20px 24px',
  border: '1px solid #e0e0e0',
  borderRadius: 12,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 12,
  textAlign: 'center',
  backgroundColor: '#fff',
};

const logoStyle: CSSProperties = {
  width: 60,
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
  marginBottom: 24
};

const smallQrSectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
};

const smallQrLabelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#444',
  marginTop: 6,
};

const smallQrBoxStyle: CSSProperties = {
  width: 92,
  height: 92,
  padding: 6,
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
type PrintOptions = {
  title?: string;
};

function printElementById(elementId: string, options?: PrintOptions) {
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

  const docTitle = options?.title ?? 'NestLink QR Poster';

  doc.open();
  doc.write(`
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <base href="${origin}/" />
    <title>${docTitle}</title>

          <style>
                @page { 
  size: A4 portrait; 
  margin: 0; 
}

html, body {
  margin: 0;
  padding: 0;
  width: 210mm;
  height: 297mm;
  background: #fff;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

* {
  box-sizing: border-box;
}

/* A4 wrapper */
.poster {
  width: 210mm;
  height: 297mm;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 25mm;
}

/* Center injected React content */
.sheet {
  width: 100%;
  display: flex;
  justify-content: center;
}

/* RESET the injected poster container */
.sheet > * {
  all: unset !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  text-align: center !important;
  width: 160mm !important;
}

/* Logo */
.qr-poster-logo {
  height: 25mm !important;
  width: auto !important;
  margin-bottom: 10mm !important;
}

/* Subtitle */
.qr-poster-subtitle {
  margin-bottom: 5mm !important;
  font-size: 14pt !important;
}

/* Title */
.qr-poster-title {
  margin-bottom: 8mm !important;
  font-size: 16pt !important;
  font-weight: 700 !important;
}

/* Main QR container */
.qr-poster-main-qr-box {
  all: unset !important;
  display: flex !important;
  justify-content: center !important;
  margin-bottom: 30mm !important;
}

/* Main QR */
.qr-poster-qr {
  width: 90mm !important;
  height: 90mm !important;
  display: block;
}

/* Bottom section */
.qr-poster-small-section {
  all: unset !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}

/* Bottom label */
.qr-poster-small-section > *:first-child {
  margin-bottom: 8mm !important;
  font-size: 14pt !important;
  font-weight: 600 !important;
}

/* Bottom QR */
.qr-poster-qr-small {
  width: 55mm !important;
  height: 55mm !important;
  display: block;
}

.qr-poster-small-label {
  margin: 8mm !important;
  font-size: 14pt !important;
  font-weight: 600 !important;
  color: #000 !important;
}

.qr-poster-small-section {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}

.qr-poster-qr-small {
  width: 55mm !important;
  height: 55mm !important;
  margin-bottom: 6mm !important;
}

.qr-poster-small-label {
  font-size: 14pt !important;
  font-weight: 600 !important;
  color: #000 !important;
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
  const { t } = useTranslation();
  const requestUrl = BUILDING_REQUEST_URL + (buildingId ? `?buildingId=${buildingId}` : '');
  const qrPng = useQrPng(requestUrl);
  const playStoreQrPng = useQrPng(PLAY_STORE_URL);
  const titleText = buildingLabel ? `${buildingLabel}` : 'NestLink';
  const descriptionText = t(tokens.buildings.qrCodeDescription);
  const dialogTitle = t(tokens.buildings.qrCodeDialogTitle);
  const posterTitle = t(tokens.buildings.qrCodePosterTitle);
  const qrAlt = t(tokens.buildings.qrCodeImageAlt);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{dialogTitle}</DialogTitle>
      <DialogContent dividers>
        <Box id={POSTER_ID} style={posterStyle}>
          <img src="/assets/logo-icons/1-01.png" alt="NestLink" style={logoStyle} className="qr-poster-logo" />
          <Box style={subtitleStyle} className="qr-poster-subtitle">{descriptionText}</Box>
          <Box style={titleStyle} className="qr-poster-title">{titleText}</Box>
          <Box style={qrBoxStyle} className="qr-poster-main-qr-box">
            {qrPng ? (
              <img
                src={qrPng}
                alt={qrAlt}
                style={qrImageStyle}
                className="qr-poster-qr"
              />
            ) : (
              <CircularProgress size={32} />
            )}
          </Box>

          <Divider sx={{ width: '80%', margin: '40px 0 20px 0' }} />

          <Box style={smallQrSectionStyle} className="qr-poster-small-section">
            <Box style={smallQrBoxStyle}>
              {playStoreQrPng ? (
                <img
                  src={playStoreQrPng}
                  alt="Google Play QR code"
                  style={qrImageStyle}
                  className="qr-poster-qr-small"
                />
              ) : (
                <CircularProgress size={20} />
              )}
            </Box>

            <Box style={smallQrLabelStyle} className="qr-poster-small-label">
              Google Play Download
            </Box>
          </Box>

        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => printElementById(POSTER_ID, { title: posterTitle })}
          variant="outlined"
          disabled={!qrPng || !playStoreQrPng}
        >
          {t(tokens.common.btnPrint)}
        </Button>
        <Button onClick={onClose} variant="contained">
          {t(tokens.common.btnClose)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
