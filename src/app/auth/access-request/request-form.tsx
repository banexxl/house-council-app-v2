'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import Script from 'next/script';
import { Autocomplete, Button, Card, CardContent, Stack, TextField, Typography, Alert } from '@mui/material';
import { getAccessRequestApartments, submitAccessRequest } from 'src/app/actions/access-request/access-request-actions';

type BuildingOption = { id: string; label: string; country?: string; city?: string };
type ApartmentOption = { id: string; label: string };
const LOAD_MORE_OPTION_ID = '__load_more_buildings__';
const INITIAL_BUILDING_BATCH = 10;
const DEFAULT_CITY_LABEL = 'Other / Unspecified';
const getOptionCity = (option: Pick<BuildingOption, 'city'>) =>
  (option.city || '').trim() || DEFAULT_CITY_LABEL;

const AccessRequestForm = ({
  formSecret,
  buildingOptions,
  countries,
}: {
  formSecret: string;
  buildingOptions: BuildingOption[];
  countries: string[];
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<{ success?: boolean; error?: string }>({});
  const [isPending, startTransition] = useTransition();
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [recaptchaWidgetId, setRecaptchaWidgetId] = useState<number | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingOption | null>(null);
  const [apartments, setApartments] = useState<ApartmentOption[]>([]);
  const [apartmentsLoading, setApartmentsLoading] = useState(false);
  const [apartmentsError, setApartmentsError] = useState<string | null>(null);
  const [selectedApartment, setSelectedApartment] = useState<ApartmentOption | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_BUILDING_BATCH);
  const [visibleOptions, setVisibleOptions] = useState<BuildingOption[]>(() => {
    const filtered = buildingOptions.filter(
      (o) => (!selectedCountry || o.country === selectedCountry) && (!selectedCity || getOptionCity(o) === selectedCity)
    );
    return filtered.slice(0, INITIAL_BUILDING_BATCH);
  });
  const [hasLoadedAll, setHasLoadedAll] = useState(
    buildingOptions.filter(
      (o) => (!selectedCountry || o.country === selectedCountry) && (!selectedCity || getOptionCity(o) === selectedCity)
    ).length <= INITIAL_BUILDING_BATCH
  );
  const loadMoreOption = useMemo<BuildingOption>(
    () => ({ id: LOAD_MORE_OPTION_ID, label: 'Load more' }),
    []
  );
  const optionsWithLoadMore = useMemo(
    () => (hasLoadedAll ? visibleOptions : [...visibleOptions, loadMoreOption]),
    [hasLoadedAll, loadMoreOption, visibleOptions]
  );
  const cityOptions = useMemo(
    () => {
      const cities = new Set<string>();
      buildingOptions.forEach((option) => {
        if (selectedCountry && option.country !== selectedCountry) return;
        cities.add(getOptionCity(option));
      });
      return Array.from(cities).sort((a, b) => a.localeCompare(b));
    },
    [buildingOptions, selectedCountry]
  );
  const handleLoadMore = useCallback(() => {
    const filteredLen = buildingOptions.filter(
      (o) => (!selectedCountry || o.country === selectedCountry) && (!selectedCity || getOptionCity(o) === selectedCity)
    ).length;
    setVisibleCount((prev) => Math.min(filteredLen, prev + INITIAL_BUILDING_BATCH));
    // Keep dropdown open so the user can keep expanding.
    setTimeout(() => setOpen(true), 0);
  }, [buildingOptions, selectedCity, selectedCountry]);
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

  useEffect(() => {
    setVisibleCount(INITIAL_BUILDING_BATCH);
  }, [buildingOptions]);

  useEffect(() => {
    setInputValue(selectedBuilding?.label || '');
  }, [selectedBuilding]);

  useEffect(() => {
    const filtered = buildingOptions.filter(
      (o) => (!selectedCountry || o.country === selectedCountry) && (!selectedCity || getOptionCity(o) === selectedCity)
    );
    const nextCount = Math.min(visibleCount, filtered.length);
    setVisibleOptions(filtered.slice(0, nextCount));
    setHasLoadedAll(nextCount >= filtered.length);
  }, [buildingOptions, selectedCity, selectedCountry, visibleCount]);

  useEffect(() => {
    setSelectedBuilding(null);
    setInputValue('');
    setVisibleCount(INITIAL_BUILDING_BATCH);
    setSelectedApartment(null);
    setApartments([]);
  }, [selectedCity, selectedCountry]);

  useEffect(() => {
    if (!selectedBuilding) {
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

    getAccessRequestApartments(selectedBuilding.id)
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
  }, [selectedBuilding]);

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
        buildingId: selectedBuilding?.id,
        buildingLabel: selectedBuilding?.label,
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
        setSelectedCountry(null);
        setSelectedCity(null);
        setSelectedBuilding(null);
        setSelectedApartment(null);
        setInputValue('');
        setVisibleCount(INITIAL_BUILDING_BATCH);
        setOpen(false);
      } else {
        setStatus({ error: result.error || 'Failed to submit' });
      }
    });
  };

  const disabled =
    !firstName.trim() ||
    !lastName.trim() ||
    !email.trim() ||
    !selectedCountry ||
    !selectedCity ||
    !selectedBuilding ||
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
            Please search for your building location and provide your details to request access.
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
          <Autocomplete
            options={countries}
            value={selectedCountry}
            onChange={(_, val) => {
              setSelectedCountry(val || null);
              setSelectedCity(null);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Country"
                required
                disabled={isPending}
                fullWidth
              />
            )}
          />
          <Autocomplete
            options={cityOptions}
            value={selectedCity}
            onChange={(_, val) => setSelectedCity(val || null)}
            disabled={isPending || !selectedCountry}
            renderInput={(params) => (
              <TextField
                {...params}
                label="City"
                required
                disabled={isPending || !selectedCountry}
                fullWidth
              />
            )}
          />
          <Autocomplete
            open={open}
            disabled={isPending || !selectedCountry || !selectedCity}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            options={optionsWithLoadMore}
            value={selectedBuilding}
            inputValue={inputValue}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            onInputChange={(_, val) => setInputValue(val)}
            onChange={(_, val) => {
              if (val?.id === LOAD_MORE_OPTION_ID) {
                handleLoadMore();
                return;
              }
              setSelectedBuilding(val);
              setInputValue(val?.label || '');
            }}
            getOptionLabel={(opt) => opt?.label || ''}
            slotProps={{
              listbox: {
                style: {
                  maxHeight: 5 * 30, // show up to 5 items, scroll beyond
                  overflowY: 'auto',
                },
              },
            }}
            filterOptions={(opts, state) => {
              const query = state.inputValue.toLowerCase();
              const filtered = opts.filter(
                (o) => o.id === LOAD_MORE_OPTION_ID || o.label.toLowerCase().includes(query)
              );
              const withoutLoadMore = filtered.filter((o) => o.id !== LOAD_MORE_OPTION_ID);
              const shouldShowLoadMore = filtered.some((o) => o.id === LOAD_MORE_OPTION_ID);
              return shouldShowLoadMore ? [...withoutLoadMore, loadMoreOption] : withoutLoadMore;
            }}
            renderOption={(props, option) =>
              option.id === LOAD_MORE_OPTION_ID ? (
                <li
                  {...props}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleLoadMore();
                  }}
                  style={{ fontWeight: 600 }}
                >
                  Load more
                </li>
              ) : (
                <li {...props}>{option.label}</li>
              )
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Building"
                required
                disabled={isPending || !selectedCountry || !selectedCity}
                fullWidth
              />
            )}
          />
          {selectedBuilding && (
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
                    disabled={apartmentsLoading || isPending || !apartments.length}
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
                disabled={isPending}
                fullWidth
              />
              <TextField
                label="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isPending}
                fullWidth
              />
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
                fullWidth
              />
              <TextField
                label="Message (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isPending}
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
