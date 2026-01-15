"use client";

import type { FC, ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import { Grid } from '@mui/material';;
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { Client } from 'src/types/client';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { createOrUpdateClientAction } from 'src/app/actions/customer/customer-actions';

interface AccountNotificationsSettingsProps {
  client: Client;
}

export const AccountNotificationsSettings: FC<AccountNotificationsSettingsProps> = ({ client }) => {
  const { t } = useTranslation();
  const [savingField, setSavingField] = useState<string | null>(null);
  const [values, setValues] = useState({
    has_accepted_marketing: Boolean(client.has_accepted_marketing),
    has_accepted_terms_and_conditions: Boolean(client.has_accepted_terms_and_conditions),
    has_accepted_privacy_policy: Boolean(client.has_accepted_privacy_policy),
    is_verified: Boolean(client.is_verified),
    sms_opt_in: Boolean(client.sms_opt_in),
    email_opt_in: Boolean(client.email_opt_in),
    viber_opt_in: Boolean(client.viber_opt_in),
    whatsapp_opt_in: Boolean(client.whatsapp_opt_in),
  });

  useEffect(() => {
    setValues({
      has_accepted_marketing: Boolean(client.has_accepted_marketing),
      has_accepted_terms_and_conditions: Boolean(client.has_accepted_terms_and_conditions),
      has_accepted_privacy_policy: Boolean(client.has_accepted_privacy_policy),
      is_verified: Boolean(client.is_verified),
      sms_opt_in: Boolean(client.sms_opt_in),
      email_opt_in: Boolean(client.email_opt_in),
      viber_opt_in: Boolean(client.viber_opt_in),
      whatsapp_opt_in: Boolean(client.whatsapp_opt_in),
    });
  }, [client]);

  const handleToggle = async (event: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    if (!client?.id) {
      toast.error(t('account.notifications.missingClientId'));
      return;
    }

    setValues((prev) => ({ ...prev, [name]: checked } as any));
    setSavingField(name);

    try {
      const payload = { id: client.id, [name]: checked } as unknown as Client;
      const res = await createOrUpdateClientAction(payload);
      if (!res.saveClientActionSuccess) {
        setValues((prev) => ({ ...prev, [name]: !checked } as any));
        toast.error(t('common.actionSaveError'));
      }
      toast.success(t('common.actionSaveSuccess'));
    } catch (error: any) {
      setValues((prev) => ({ ...prev, [name]: !checked } as any));
      toast.error(t('common.actionSaveError'));
    } finally {
      setSavingField(null);
    }
  };

  return (

    <Card>
      <CardContent>
        <Grid
          container
          spacing={3}
        >
          <Grid
            size={{ xs: 12, md: 4 }}
          >
            <Typography variant="h6">{t('account.notifications.sectionConsentTitle')}</Typography>
          </Grid>
          <Grid
            size={{ xs: 12, md: 8 }}
          >
            <Stack
              divider={<Divider />}
              spacing={3}
            >
              <Stack
                alignItems="flex-start"
                direction="row"
                justifyContent="space-between"
                spacing={3}
              >
                <Stack spacing={1}>
                  <Typography variant="subtitle1">{t('account.notifications.acceptedTerms')}</Typography>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                  >
                    {t('account.notifications.acceptedTermsDesc')}
                  </Typography>
                </Stack>
                <Switch
                  name="has_accepted_terms_and_conditions"
                  checked={values.has_accepted_terms_and_conditions}
                  onChange={handleToggle}
                  disabled={client?.has_accepted_terms_and_conditions === true}
                />
              </Stack>

              <Stack
                alignItems="flex-start"
                direction="row"
                justifyContent="space-between"
                spacing={3}
              >
                <Stack spacing={1}>
                  <Typography variant="subtitle1">{t('account.notifications.acceptedPrivacy')}</Typography>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                  >
                    {t('account.notifications.acceptedPrivacyDesc')}
                  </Typography>
                </Stack>
                <Switch
                  name="has_accepted_privacy_policy"
                  checked={values.has_accepted_privacy_policy}
                  onChange={handleToggle}
                  disabled={client?.has_accepted_privacy_policy === true}
                />
              </Stack>

              <Stack
                alignItems="flex-start"
                direction="row"
                justifyContent="space-between"
                spacing={3}
              >
                <Stack spacing={1}>
                  <Typography variant="subtitle1">{t('account.notifications.acceptedMarketing')}</Typography>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                  >
                    {t('account.notifications.acceptedMarketingDesc')}
                  </Typography>
                </Stack>
                <Switch
                  name="has_accepted_marketing"
                  checked={values.has_accepted_marketing}
                  onChange={handleToggle}
                  disabled={savingField === 'has_accepted_marketing'}
                />
              </Stack>

              <Stack
                alignItems="flex-start"
                direction="row"
                justifyContent="space-between"
                spacing={3}
              >
                <Stack spacing={1}>
                  <Typography variant="subtitle1">{t('account.notifications.verified')}</Typography>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                  >
                    {t('account.notifications.verifiedDesc')}
                  </Typography>
                </Stack>
                <Switch
                  name="is_verified"
                  checked={values.is_verified}
                  onChange={handleToggle}
                  disabled={client?.is_verified === true}
                />
              </Stack>
            </Stack>
          </Grid>
        </Grid>
        <Divider sx={{ my: 3 }} />
        <Grid
          container
          spacing={3}
        >
          <Grid
            size={{ xs: 12, md: 4 }}
          >
            <Typography variant="h6">{t('account.notifications.sectionOptinsTitle')}</Typography>
          </Grid>
          <Grid
            size={{ xs: 12, md: 8 }}
          >
            <Stack
              divider={<Divider />}
              spacing={3}
            >
              <Stack
                alignItems="flex-start"
                direction="row"
                justifyContent="space-between"
                spacing={3}
              >
                <Stack spacing={1}>
                  <Typography variant="subtitle1">{t('account.notifications.optinEmail')}</Typography>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                  >
                    {t('account.notifications.optinEmailDesc')}
                  </Typography>
                </Stack>
                <Switch
                  name="email_opt_in"
                  checked={values.email_opt_in}
                  onChange={handleToggle}
                  disabled//={savingField === 'email_opt_in'}
                />
              </Stack>

              <Stack
                alignItems="flex-start"
                direction="row"
                justifyContent="space-between"
                spacing={3}
              >
                <Stack spacing={1}>
                  <Typography variant="subtitle1">{t('account.notifications.optinSms')}</Typography>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                  >
                    {t('account.notifications.optinSmsDesc')}
                  </Typography>
                </Stack>
                <Switch
                  name="sms_opt_in"
                  checked={values.sms_opt_in}
                  onChange={handleToggle}
                  disabled//={savingField === 'sms_opt_in'}
                />
              </Stack>

              <Stack
                alignItems="flex-start"
                direction="row"
                justifyContent="space-between"
                spacing={3}
              >
                <Stack spacing={1}>
                  <Typography variant="subtitle1">{t('account.notifications.optinViber')}</Typography>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                  >
                    {t('account.notifications.optinViberDesc')}
                  </Typography>
                </Stack>
                <Switch
                  name="viber_opt_in"
                  checked={values.viber_opt_in}
                  onChange={handleToggle}
                  disabled//={savingField === 'viber_opt_in'}
                />
              </Stack>

              <Stack
                alignItems="flex-start"
                direction="row"
                justifyContent="space-between"
                spacing={3}
              >
                <Stack spacing={1}>
                  <Typography variant="subtitle1">{t('account.notifications.optinWhatsApp')}</Typography>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                  >
                    {t('account.notifications.optinWhatsAppDesc')}
                  </Typography>
                </Stack>
                <Switch
                  name="whatsapp_opt_in"
                  checked={values.whatsapp_opt_in}
                  onChange={handleToggle}
                  disabled//={savingField === 'whatsapp_opt_in'}
                />
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
