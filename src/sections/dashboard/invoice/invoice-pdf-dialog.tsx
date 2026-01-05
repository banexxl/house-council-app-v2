import type { FC } from 'react';
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ArrowLeftIcon from '@untitled-ui/icons-react/build/esm/ArrowLeft';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';

import type { PolarOrder } from 'src/types/polar-order-types';

interface InvoicePdfDialogProps {
  invoice?: PolarOrder;
  onClose?: () => void;
  open?: boolean;
}

export const InvoicePdfDialog: FC<InvoicePdfDialogProps> = (props) => {
  const { invoice, onClose, open = false, ...other } = props;

  if (!invoice) {
    return null;
  }

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !invoice?.id) {
      return;
    }

    let cancelled = false;

    const loadInvoice = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/polar/invoices/${invoice.id}`);

        if (!response.ok) {
          let message = 'Failed to load invoice PDF';

          try {
            const data = await response.json();
            if (data?.error) {
              message = data.error;
            }
          } catch {
            // ignore JSON parse errors
          }

          throw new Error(message);
        }

        const data = await response.json();

        if (!cancelled) {
          setPdfUrl(data.url ?? null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load invoice PDF');
          setPdfUrl(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadInvoice();

    return () => {
      cancelled = true;
    };
  }, [open, invoice?.id]);

  return (
    <Dialog
      fullScreen
      open={open}
      {...other}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <Box
          sx={{
            backgroundColor: 'background.paper',
            p: 2,
          }}
        >
          <Button
            color="inherit"
            startIcon={
              <SvgIcon>
                <ArrowLeftIcon />
              </SvgIcon>
            }
            onClick={onClose}
          >
            Close
          </Button>
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          {loading && (
            <Box
              sx={{
                alignItems: 'center',
                display: 'flex',
                height: '100%',
                justifyContent: 'center',
              }}
            >
              <Typography variant="body2">Loading invoice PDF…</Typography>
            </Box>
          )}
          {!loading && error && (
            <Box
              sx={{
                alignItems: 'center',
                display: 'flex',
                height: '100%',
                justifyContent: 'center',
              }}
            >
              <Typography
                color="error"
                variant="body2"
              >
                {error}
              </Typography>
            </Box>
          )}
          {!loading && !error && pdfUrl && (
            <Box
              sx={{
                height: '100%',
              }}
            >
              <iframe
                src={pdfUrl}
                style={{ border: 'none', width: '100%', height: '100%' }}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Dialog>
  );
};

InvoicePdfDialog.propTypes = {
  // @ts-ignore
  invoice: PropTypes.object,
  onClose: PropTypes.func,
  open: PropTypes.bool,
};
