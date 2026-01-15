'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { createClientSocialProfile, ClientBuildingOption } from 'src/app/actions/customer/customer-actions';
import { tokens } from 'src/locales/tokens';
import { Client, ClientMember } from 'src/types/client';

interface ProfileNotFoundNoticeProps {
  client: Client | null;
  clientMember: ClientMember | null;
  buildings?: ClientBuildingOption[];
}

export const ProfileNotFoundNotice = ({ client, clientMember, buildings = [] }: ProfileNotFoundNoticeProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [selectedBuildingId, setSelectedBuildingId] = useState(buildings[0]?.id ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasClientContext = Boolean(client || clientMember);
  const hasBuildings = buildings.length > 0;
  const displayName = client?.contact_person || client?.name || clientMember?.name || '';
  const displayEmail = client?.email || clientMember?.email || '';

  const handleCreateProfile = async () => {
    if (!selectedBuildingId) {
      toast.error(t('tenants.socialProfileSelectBuilding', 'Please select a building'));
      return;
    }

    setIsSubmitting(true);
    const { success, error } = await createClientSocialProfile(selectedBuildingId);
    if (success) {
      toast.success(t('tenants.socialProfileCreated', 'Social profile created'));
      router.refresh();
    } else {
      toast.error(error || t('tenants.socialProfileCreateFailed', 'Failed to create profile'));
    }
    setIsSubmitting(false);
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h4" gutterBottom>
        {t(tokens.tenants.socialProfileNotFoundTitle)}
      </Typography>
      <Typography variant="body1">
        {t(tokens.tenants.socialProfileNotFoundDescription)}
      </Typography>
      {hasClientContext && (displayName || displayEmail) && (
        <Typography variant="body2" color="text.secondary">
          {t(
            'tenants.socialProfilePrefill',
            'We will prefill your social profile with your contact name and email.'
          )}
          {displayName && ` (${displayName}${displayEmail ? ` • ${displayEmail}` : ''})`}
        </Typography>
      )}

      {hasClientContext && (
        hasBuildings ? (
          <Stack spacing={2} maxWidth={420}>
            <Typography variant="subtitle1" color="text.secondary">
              {t('tenants.socialProfileCreatePrompt', 'Create a social profile to engage with your building.')}
            </Typography>
            <FormControl fullWidth>
              <InputLabel id="client-building-select-label">
                {t('tenants.selectBuilding', 'Select building')}
              </InputLabel>
              <Select
                labelId="client-building-select-label"
                label={t('tenants.selectBuilding', 'Select building')}
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value as string)}
              >
                {buildings.map((building) => (
                  <MenuItem key={building.id} value={building.id}>
                    {building.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              onClick={handleCreateProfile}
              disabled={!selectedBuildingId || isSubmitting}
            >
              {isSubmitting
                ? t('common.loading', 'Saving...')
                : t('tenants.socialProfileCreateAction', 'Create social profile')}
            </Button>
          </Stack>
        ) : (
          <Alert severity="info">
            {t('tenants.socialProfileNoBuildings', 'Add a building first to enable a social profile.')}
            <Button
              component={Link}
              href="/dashboard/buildings"
              variant="text"
              size="small"
              sx={{ ml: 1 }}
            >
              {t('buildings.addBuilding', 'Add building')}
            </Button>
          </Alert>
        )
      )}
    </Stack>
  );
};
