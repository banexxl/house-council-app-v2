'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import Script from 'next/script';
import { Autocomplete, Button, Card, CardContent, Stack, TextField, Typography, Alert } from '@mui/material';
import { getAccessRequestApartments, submitAccessRequest } from 'src/app/actions/access-request/access-request-actions';

type ApartmentOption = { id: string; label: string };
type BuildingPrefill = { id: string; label: string; country?: string; city?: string };

const AccessRequestForm = ({
  formSecret,
  prefillBuilding,
}: {
  formSecret: string;
  prefillBuilding?: BuildingPrefill;
}) => {
  console.log(prefillBuilding);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<{ success?: boolean; error?: string }>({});
  const [isPending, startTransition] = useTransition();
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const [recaptchaWidgetId, setRecaptchaWidgetId] = useState<number | null>(null);
  const [apartments, setApartments] = useState<ApartmentOption[]>([]);
  const [apartmentsLoading, setApartmentsLoading] = useState(false);
  const [apartmentsError, setApartmentsError] = useState<string | null>(null);
  const [selectedApartment, setSelectedApartment] = useState<ApartmentOption | null>(null);

  const buildingId = prefillBuilding?.id;
  const hasLocationPrefill = Boolean(
    prefillBuilding?.id &&
    prefillBuilding?.country &&
    prefillBuilding?.city &&
    prefillBuilding?.label
  );
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

  useEffect(() => {
    if (!buildingId) {
      setApartments([]);
      setSelectedApartment(null);
      setApartmentsError(null);
      return;
    }

    let cancelled = false;
    setApartments([]);
    setSelectedApartment(null);
    setApartmentsLoading(true);
    setApartmentsError(null);

    getAccessRequestApartments(buildingId)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setApartments(res.data || []);
          if (!(res.data || []).length) {
            setApartmentsError('No apartments found for this building');
          }
        } else {
          setApartmentsError('Failed to load apartments');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setApartmentsError(err?.message || 'Failed to load apartments');
      })
      .finally(() => {
        if (cancelled) return;
        setApartmentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  const executeRecaptcha = useCallback(async () => {
    const gre = (window as any)?.grecaptcha?.enterprise;
    if (!recaptchaSiteKey || !gre) {
      throw new Error('Captcha not ready');
    }
    const token = recaptchaWidgetId !== null
      ? await gre.execute(recaptchaWidgetId, { action: 'access_request' })
      : await gre.execute(recaptchaSiteKey, { action: 'access_request' });
    return token;
  }, [recaptchaSiteKey, recaptchaWidgetId]);

  useEffect(() => {
    if (!recaptchaSiteKey) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const checkReady = () => {
      const gre = (window as any)?.grecaptcha?.enterprise;
      if (gre) {
        setRecaptchaReady(true);
        if (recaptchaWidgetId === null) {
          try {
            const widget = gre.render('recaptcha-badge', {
              sitekey: recaptchaSiteKey,
              size: 'invisible',
              badge: 'bottomright',
            });
            setRecaptchaWidgetId(widget);
          } catch (e) {
            // ignore render errors; execute() fallback will still work
            console.warn('Failed to render reCAPTCHA badge', e);
          }
        }
        return;
      }
      timer = setTimeout(checkReady, 300);
    };
    checkReady();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [recaptchaSiteKey, recaptchaWidgetId]);

  const handleSubmit = () => {
    setStatus({});
    startTransition(async () => {
      if (!recaptchaSiteKey) {
        setStatus({ error: 'Captcha not configured' });
        return;
      }
      if (!buildingId) {
        setStatus({ error: 'Building is required' });
        return;
      }
      let token = '';
      try {
        token = await executeRecaptcha();
      } catch (e: any) {
        setStatus({ error: e?.message || 'Failed to validate captcha' });
        return;
      }

      const result = await submitAccessRequest({
        name: `${firstName} ${lastName}`.trim(),
        email,
        message,
        buildingId,
        buildingLabel: prefillBuilding?.label,
        apartmentId: selectedApartment?.id,
        apartmentLabel: selectedApartment?.label,
        recaptchaToken: token,
        formSecret,
      });
      if (result.success) {
        setStatus({ success: true });
        setFirstName('');
        setLastName('');
        setEmail('');
        setMessage('');
        setSelectedApartment(null);
      } else {
        setStatus({ error: result.error || 'Failed to submit' });
      }
    });
  };

  const disabled =
    !firstName.trim() ||
    !lastName.trim() ||
    !email.trim() ||
    !hasLocationPrefill ||
    !buildingId ||
    !selectedApartment ||
    isPending ||
    !recaptchaSiteKey ||
    !recaptchaReady;

  return (
    <Card
      sx={{
        maxWidth: 520,
        width: '100%',
        maxHeight: { xs: '90vh', md: '80vh' },
        overflow: 'auto',
        boxShadow: 6,
        borderRadius: 2,
      }}
    >
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="h5">Access Request</Typography>
          <Typography variant="body2" color="text.secondary">
            Please confirm your building details and provide your info to request access.
          </Typography>
          {recaptchaSiteKey && (
            <Script
              src={`https://www.google.com/recaptcha/enterprise.js?render=${recaptchaSiteKey}`}
              strategy="lazyOnload"
              onReady={() => setRecaptchaReady(true)}
              onError={() => setStatus({ error: 'Failed to load captcha' })}
            />
          )}
          <div id="recaptcha-badge" style={{ minHeight: 1 }} />
          {status.error && <Alert severity="error">{status.error}</Alert>}
          {status.success && <Alert severity="success">{'Request sent. We will contact you soon.'}</Alert>}
          <TextField
            label="Country"
            value={prefillBuilding?.country || ''}
            disabled
            fullWidth
          />
          <TextField
            label="City"
            value={prefillBuilding?.city || ''}
            disabled
            fullWidth
          />
          <TextField
            label="Building"
            value={prefillBuilding?.label || ''}
            disabled
            fullWidth
          />
          {buildingId && (
            <>
              <Autocomplete
                options={apartments}
                value={selectedApartment}
                loading={apartmentsLoading}
                onChange={(_, val) => setSelectedApartment(val)}
                getOptionLabel={(opt) => opt?.label || ''}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Apartment"
                    required
                    disabled={!hasLocationPrefill || apartmentsLoading || isPending || !apartments.length}
                    helperText={apartmentsError || (apartmentsLoading ? 'Loading apartments...' : undefined)}
                    error={!!apartmentsError}
                    fullWidth
                  />
                )}
              />
              <TextField
                label="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isPending || !selectedApartment}
                fullWidth
              />
              <TextField
                label="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isPending || !selectedApartment}
                fullWidth
              />
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending || !selectedApartment}
                fullWidth
              />
              <TextField
                label="Message (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isPending || !selectedApartment}
                minRows={3}
                multiline
                fullWidth
              />
              <Button variant="contained" onClick={handleSubmit} disabled={disabled}>
                {isPending ? 'Sending...' : 'Submit'}
              </Button>
            </>
          )}
          <Button variant="text" href="/auth/login">
            {'Back to login'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default AccessRequestForm;
