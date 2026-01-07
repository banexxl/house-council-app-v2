'use client'

import { useEffect, useMemo, useRef, useState, type FC } from 'react'
import { useFormik } from 'formik'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import { Box, FormControlLabel, Grid } from '@mui/material';
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import useMediaQuery from '@mui/material/useMediaQuery'
import MenuItem from '@mui/material/MenuItem'
import { RouterLink } from 'src/components/router-link'
import { paths } from 'src/paths'
import toast from 'react-hot-toast'
import { Client, clientInitialValues, clientStatusMapping, clientTypeMapping, clientValidationSchema } from 'src/types/client'
import { useTranslation } from 'react-i18next'
import LocationAutocomplete from '../locations/autocomplete'
import { createOrUpdateClientAction, sendPasswordRecoveryEmail, sendMagicLink, removeAllMfaFactors, banUser, unbanUser } from 'src/app/actions/client/client-actions'
import { ImageUpload, ImageUploadRef } from 'src/sections/dashboard/client/uplod-image'
import { transliterateCyrillicToLatin } from 'src/utils/transliterate'
import { useRouter, usePathname } from 'next/navigation'
import { PopupModal } from 'src/components/modal-dialog'
import { removeEntityFile } from 'src/libs/supabase/sb-storage'
import { CustomAutocomplete } from 'src/components/autocomplete-custom'
import { supabaseBrowserClient } from 'src/libs/supabase/sb-client'
import { BuildingLocation } from 'src/types/location'
import { ClientSubscription, SubscriptionPlan, clientSubscriptionStatusOptions } from 'src/types/subscription-plan'
import { TABLES } from 'src/libs/supabase/tables';
import { updateClientSubscriptionForClient, deleteClientSubscription } from 'src/app/actions/subscription-plan/subscription-plan-actions'
import type { Theme } from '@mui/material/styles'

interface ClientNewFormProps {
  clientData?: Client
  availableSubscriptions?: SubscriptionPlan[]
  showAdvancedSettings?: boolean;
  showClientActions?: boolean;
}

export const ClientForm: FC<ClientNewFormProps> = ({ clientData, availableSubscriptions, showAdvancedSettings, showClientActions }) => {

  // Modal state for admin actions
  const [modal, setModal] = useState<{ open: boolean; type?: string }>({ open: false, type: undefined });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalResult, setModalResult] = useState<string | null>(null);
  const [deleteSubscriptionDialog, setDeleteSubscriptionDialog] = useState<{ open: boolean }>({ open: false });
  const [deleteSubscriptionLoading, setDeleteSubscriptionLoading] = useState(false);
  const [unassignedLocations, setUnassignedLocations] = useState<any[]>([]);
  const [initialValues, setInitialValues] = useState<Client>(clientData || clientInitialValues)
  const { t } = useTranslation()
  const ImageUploadRef = useRef<ImageUploadRef>(null)
  const router = useRouter()
  const currentRoute = usePathname()
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'))

  useEffect(() => {
    const fetchBuildingLocations = async () => {
      // Make sure client_id is defined
      const client_id = clientData?.id;
      if (!client_id) return;
      const { data, error } = await supabaseBrowserClient.from(TABLES.BUILDING_LOCATIONS).select('*').eq('client_id', client_id).is('building_id', null);
      setUnassignedLocations(data || []);
    };
    fetchBuildingLocations();
  }, [clientData?.id]);

  const initialFormikValues = useMemo(() => {
    const base = {
      ...clientInitialValues,
      ...initialValues,
      client_type: initialValues?.client_type || clientInitialValues.client_type || '',
      client_status: initialValues?.client_status || clientInitialValues.client_status || '',
    };
    return base;
  }, [clientInitialValues, initialValues]);
  const formik = useFormik({
    initialValues: initialFormikValues,
    enableReinitialize: true,
    validationSchema: clientValidationSchema(t),
    validateOnMount: true,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setSubmitting(true);

      // Keep subscription fields for later, but don't send them to client save action
      const {
        subscription_plan_id,
        is_monthly,
        subscription_status,
        ...clientOnly
      } = values as any;

      try {
        const res = await createOrUpdateClientAction(clientOnly as Client);
        const {
          saveClientActionSuccess,
          saveClientActionError,
          saveClientActionData,
        } = res;

        // ❌ Save failed
        if (!saveClientActionSuccess || !saveClientActionData) {
          const code = saveClientActionError?.code;

          if (code === "23505") {
            toast.error(
              `${t("clients.clientNotSaved")}:\n${t("errors.client.uniqueEmailViolation")}`
            );
          } else if (code === "23503") {
            toast.error(
              `${t("clients.clientNotSaved")}:\n${t("errors.client.foreignKeyViolation")}`
            );
          } else if (code === "23502") {
            toast.error(
              `${t("clients.clientNotSaved")}:\n${t("errors.client.notNullViolation")}`
            );
          } else if (code === "22P02") {
            toast.error(
              `${t("clients.clientNotSaved")}:\n${t("errors.client.dataTypeMismatch")}`
            );
          } else if (code === "23514") {
            toast.error(
              `${t("clients.clientNotSaved")}:\n${t("errors.client.checkViolation")}`
            );
          } else {
            toast.error(
              `${t("clients.clientNotSaved")}:\n${saveClientActionError?.message || t("errors.client.unexpectedError")
              }`
            );
          }

          return;
        }

        // ✅ Save succeeded
        const clientId = saveClientActionData.id;

        // update local initial values state (if you keep it separately)
        setInitialValues((prev) => ({ ...prev, ...saveClientActionData }));

        // navigate if we're not already on that client's route
        if (clientId && !currentRoute.includes(clientId)) {
          if (showClientActions) {
            router.push(`${paths.dashboard.clients.details}/${clientId}`);
          } else {
            router.push(paths.dashboard.account);
          }
        }

        toast.success(t("clients.clientSaved"));

        // Reset form so it's not dirty, but keep subscription fields from original values
        const refreshedValues = {
          ...values,
          ...saveClientActionData,
          subscription_plan_id,
          subscription_status,
          is_monthly,
        };

        resetForm({ values: refreshedValues });
      } catch (error: any) {
        toast.error(
          `${t("clients.clientNotSaved")}${error?.message ? `: ${error.message}` : ""}`
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  const handleSendPasswordRecovery = async () => {
    setModalLoading(true);
    try {
      const { success, error } = await sendPasswordRecoveryEmail(formik.values.email);
      setModalResult(success ? t('clients.passwordRecoverySent') : error || t('clients.clientNotSaved'));
    } catch (error) {
      toast.error(t('clients.clientNotSaved'), error.message);
      setModalResult(t('clients.clientNotSaved'));
    }
    setModalLoading(false);
  };

  const handleSendMagicLink = async () => {
    setModalLoading(true);
    try {
      const { success, error } = await sendMagicLink(formik.values.email);
      setModalResult(success ? t('clients.magicLinkSent') : error || t('clients.clientNotSaved'));
    } catch (error) {
      toast.error(t('clients.clientNotSaved'), error.message);
      setModalResult(t('clients.clientNotSaved'));
    }
    setModalLoading(false);
  };

  const handleRemoveMfa = async () => {
    setModalLoading(true);
    try {
      const { success, error } = await removeAllMfaFactors(formik.values.user_id);
      setModalResult(success ? t('clients.mfaRemoved') : error || t('clients.clientNotSaved'));
    } catch (error) {
      toast.error(t('clients.clientNotSaved'), error.message);
      setModalResult(t('clients.clientNotSaved'));
    }
    setModalLoading(false);
  };

  const handleBanUser = async () => {
    setModalLoading(true);
    try {
      const { success, error } = await banUser(formik.values.user_id);
      setModalResult(success ? t('clients.userBanned') : error || t('clients.clientNotSaved'));
    } catch (error) {
      toast.error(t('clients.clientNotSaved'), error.message);
      setModalResult(t('clients.clientNotSaved'));
    }
    setModalLoading(false);
  };

  const handleUnbanUser = async () => {
    setModalLoading(true);
    try {
      const { success, error } = await unbanUser(formik.values.user_id);
      setModalResult(success ? t('clients.userUnbanned') : error || t('clients.clientNotSaved'));
    } catch (error) {
      toast.error(t('clients.clientNotSaved'), error.message);
      setModalResult(t('clients.clientNotSaved'));
    }
    setModalLoading(false);
  };

  const handleDeleteSubscription = async () => {
    if (!clientData?.id) {
      toast.error(t('common.actionDeleteError'));
      return;
    }
    setDeleteSubscriptionLoading(true);
    try {
      const { success, error } = await deleteClientSubscription(clientData.id);
      if (success) {
        formik.setValues({
          ...formik.values,
        });
        toast.success(t('common.actionDeleteSuccess'));
      } else {
        toast.error(error || t('common.actionDeleteError'));
      }
    } catch (error) {
      toast.error(t('common.actionDeleteError'));
    } finally {
      setDeleteSubscriptionLoading(false);
      setDeleteSubscriptionDialog({ open: false });
    }
  };

  const removeStoredImage = async (storedRef?: string | null) => {
    const userId = clientData?.user_id || formik.values.user_id;
    const storagePath = storedRef && storedRef.includes('::') ? storedRef.split('::')[1] : storedRef || '';
    if (userId && storagePath) {
      const removeResult = await removeEntityFile({
        entity: 'client-image',
        entityId: userId,
        storagePathOrUrl: storagePath,
      });
      if (!removeResult.success && removeResult.error) {
        toast.error(removeResult.error);
      }
    }
  };

  const validationMessages = useMemo(() => {
    const flat: string[] = []
    const walk = (val: any) => {
      if (!val) return
      if (typeof val === 'string') {
        flat.push(val)
        return
      }
      if (Array.isArray(val)) {
        val.forEach(walk)
        return
      }
      if (typeof val === 'object') {
        Object.values(val).forEach(walk)
      }
    }
    walk(formik.errors)
    return flat
  }, [formik.errors])

  return (
    <form onSubmit={formik.handleSubmit}>
      <Card sx={{ overflow: 'hidden' }}>
        <CardHeader title={t('common.formBasicInfo')} />
        <CardContent sx={{ pt: 0, px: { xs: 2, sm: 3 }, minWidth: 0 }}>
          <ImageUpload
            buttonDisabled={initialValues?.id == '' ? true : false}
            ref={ImageUploadRef}
            onUploadSuccess={async (url: string) => {
              formik.setFieldValue('avatar', url)
              formik.setFieldTouched('avatar', true, false)
              await createOrUpdateClientAction({
                id: formik.values.id,
                avatar: url,
              })
            }}
            onRemoveImage={async (storedRef) => {
              formik.setFieldValue('avatar', '');
              formik.setFieldTouched('avatar', true, false);
              await removeStoredImage(storedRef);
              if (!formik.values.id) return;
              await createOrUpdateClientAction({
                id: formik.values.id,
                avatar: '',
              });
            }}
            onDeletePreviousImage={removeStoredImage}
            // Use the client record id (preferred) - server action can also resolve user_id
            userId={clientData?.user_id || null}
            initialValue={clientData?.user_id == '' ? '' : clientData?.avatar}
          />
          {
            showAdvancedSettings && (
              <>
                <Divider sx={{ my: 3 }} >{t('clients.clientFormSettings')}</Divider>
                <Grid container spacing={3} sx={{ mb: 2, minWidth: 0 }}>
                  <Grid
                    size={{ xs: 12, md: 6 }}
                    sx={{ minWidth: 0 }}
                  >
                    <TextField
                      select
                      fullWidth
                      label={t('clients.clientType')}
                      name="client_type"
                      disabled={formik.isSubmitting}
                      value={formik.values.client_type || ''}
                      onChange={formik.handleChange} // Use onChange for handling selection
                      error={!!(formik.touched.client_type && formik.errors.client_type)}
                      helperText={formik.touched.client_type && formik.errors.client_type}
                    >
                      {Object.entries(clientTypeMapping).map(([key, label]) => (
                        <MenuItem key={key} value={key}>
                          {t(label)} {/* Translate the label */}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid
                    size={{ xs: 12, md: 6 }}
                    sx={{ minWidth: 0 }}
                  >
                    <TextField
                      select
                      fullWidth
                      label={t('clients.clientStatus')}
                      name="client_status"
                      disabled={formik.isSubmitting}
                      value={formik.values.client_status}
                      onChange={formik.handleChange} // Use onChange for handling selection
                      error={!!(formik.touched.client_status && formik.errors.client_status)}
                      helperText={formik.touched.client_status && formik.errors.client_status}
                    >
                      {Object.entries(clientStatusMapping).map(([key, label]) => (
                        <MenuItem
                          key={key} value={key}
                          sx={{ cursor: 'pointer' }}
                        >
                          {t(label)} {/* Translate the label */}
                        </MenuItem >
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
              </>
            )
          }
          <Divider sx={{ my: 3 }} >{t('common.formBasicInfo')}</Divider>
          <Grid container spacing={3} sx={{ minWidth: 0 }}>
            <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: 0 }}>
              <TextField
                fullWidth
                label={t('clients.clientName')}
                name="name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={!!(formik.touched.name && formik.errors.name)}
                helperText={formik.touched.name && formik.errors.name}
                disabled={formik.isSubmitting}
              />
            </Grid>
            <Grid
              size={{ xs: 12, md: 6 }}
              sx={{ minWidth: 0 }}
            >
              <TextField
                fullWidth
                label={t('clients.clientContactPerson')}
                name="contact_person"
                value={formik.values.contact_person}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={!!(formik.touched.contact_person && formik.errors.contact_person)}
                helperText={formik.touched.contact_person && formik.errors.contact_person}
                disabled={formik.isSubmitting}
              />
            </Grid>
            <Grid
              size={{ xs: 12, md: 6 }}
              sx={{ minWidth: 0 }}
            >
              <LocationAutocomplete
                label={t('clients.clientAddress1')}
                onAddressSelected={(e: any) => {
                  formik.setFieldValue('address_1', transliterateCyrillicToLatin(e.matching_place_name));
                  formik.setFieldTouched('address_1', true, false)
                }}
                onClear={() => {
                  formik.setFieldValue('address_1', '');
                  formik.setFieldTouched('address_1', true, false)
                }}
                initialValue={initialValues?.id == '' ? '' : initialValues?.address_1}
              />
            </Grid>
            <Grid
              size={{ xs: 12, md: 6 }}
              sx={{ minWidth: 0 }}
            >
              <LocationAutocomplete
                label={t('clients.clientAddress2')}
                onAddressSelected={(e: any) => {
                  formik.setFieldValue('address_2', transliterateCyrillicToLatin(e.matching_place_name));
                  formik.setFieldTouched('address_2', true, false)
                }}
                onClear={() => {
                  formik.setFieldValue('address_2', '');
                  formik.setFieldTouched('address_2', true, false)
                }}
                initialValue={initialValues?.id == '' ? '' : initialValues?.address_2}
              />
            </Grid>
            <Grid
              size={{ xs: 12, md: 6 }}
              sx={{ minWidth: 0 }}
            >
              <TextField
                fullWidth
                label={t('clients.clientEmail')}
                name="email"
                error={!!(formik.touched.email && formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.email}
                disabled={formik.isSubmitting || initialValues?.id !== ''}
              />
            </Grid>
            <Grid
              size={{ xs: 12, md: 6 }}
              sx={{ minWidth: 0 }}
            >
              <TextField
                fullWidth
                label={t('clients.clientPhone')}
                name="phone"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.phone}
                error={!!(formik.touched.phone && formik.errors.phone)}
                helperText={formik.touched.phone && formik.errors.phone}
                disabled={formik.isSubmitting}
              />
            </Grid>
            <Grid
              size={{ xs: 12, md: 6 }}
            >
              <TextField
                fullWidth
                label={t('clients.clientMobilePhone')}
                name="mobile_phone"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.mobile_phone}
                error={!!(formik.touched.mobile_phone && formik.errors.mobile_phone)}
                helperText={formik.touched.mobile_phone && formik.errors.mobile_phone}
                disabled={formik.isSubmitting}
              />
            </Grid>
            {
              clientData && showClientActions && (
                <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: 0 }}>
                  <CustomAutocomplete
                    data={unassignedLocations}
                    searchKey={'street_address'}
                    disabled={formik.isSubmitting}
                    label={t('clients.clientUnassignedLocations')}
                    getOptionLabel={(item: BuildingLocation) => item.street_address + ' ' + item.street_number + ', ' + item.city || ''}
                    renderOption={(item) => (
                      <Typography key={item.id}>
                        {item.street_address} {item.street_number}, {item.city}
                      </Typography>
                    )}
                    onValueChange={(value) => {
                      if (value) {
                        formik.setFieldValue('unassigned_location_id', value);
                      } else {
                        formik.setFieldValue('unassigned_location_id', null);
                      }
                    }}
                    selectedItem={formik.values.unassigned_location_id ? unassignedLocations.find(loc => loc.id === formik.values.unassigned_location_id) : undefined}
                  />
                </Grid>
              )
            }
          </Grid>
          {
            showAdvancedSettings && (
              <>
                <Divider sx={{ my: 3 }} >{t('common.formAdvancedInfo')}</Divider>
                <Stack divider={<Divider />} spacing={3} sx={{ mt: 3 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" spacing={2} sx={{ width: '100%', minWidth: 0 }}>
                    <Stack spacing={1}>
                      <Typography gutterBottom variant="subtitle1">
                        {t('clients.clientIsVerified')}
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        {t('clients.clientIsVerifiedDescription')}
                      </Typography>
                    </Stack>
                    <Switch
                      checked={formik.values.is_verified}
                      color="primary"
                      edge="start"
                      name="is_verified"
                      onChange={formik.handleChange}
                      value={formik.values.is_verified}
                      disabled={formik.isSubmitting}
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" spacing={2} sx={{ width: '100%', minWidth: 0 }}>
                    <Stack spacing={1}>
                      <Typography gutterBottom variant="subtitle1">
                        {t('clients.clientHasAcceptedTermsAndConditions')}
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        {t('clients.clientHasAcceptedTermsAndConditionsDescription')}
                      </Typography>
                    </Stack>
                    <Switch
                      checked={formik.values.has_accepted_terms_and_conditions}
                      color="primary"
                      edge="start"
                      name="has_accepted_terms_and_conditions"
                      onChange={formik.handleChange}
                      disabled={formik.isSubmitting}
                      value={formik.values.has_accepted_terms_and_conditions}
                    />
                    <Switch
                      checked={formik.values.has_accepted_privacy_policy}
                      color="primary"
                      edge="start"
                      name="has_accepted_privacy_policy"
                      onChange={formik.handleChange}
                      disabled={formik.isSubmitting}
                      value={formik.values.has_accepted_privacy_policy}
                    />
                  </Stack>
                </Stack>
              </>
            )

          }

          {
            clientData && showClientActions ? (
              <>
                <Divider sx={{ my: 3 }} >{t('common.lblClientAccountActions')}</Divider>
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" spacing={2} sx={{ width: '100%', minWidth: 0 }}>
                  <Stack direction="column" spacing={2} sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2, flexWrap: 'wrap' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ flex: 1, fontWeight: 'bold' }}>
                        {t('clients.sendPasswordRecoveryDescription')}
                      </Typography>
                      <Button
                        variant="outlined"
                        color="primary"
                        disabled={formik.isSubmitting || !formik.values.email}
                        onClick={() => setModal({ type: 'recovery', open: true })}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        {t('clients.sendPasswordRecovery')}
                      </Button>
                    </Box>
                    <Divider sx={{ my: 3 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2, flexWrap: 'wrap' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ flex: 1, fontWeight: 'bold' }}>
                        {t('clients.sendMagicLinkDescription')}
                      </Typography>
                      <Button
                        variant="outlined"
                        color="primary"
                        disabled={formik.isSubmitting || !formik.values.email}
                        onClick={() => setModal({ type: 'magic', open: true })}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        {t('clients.sendMagicLink')}
                      </Button>
                    </Box>
                    <Divider sx={{ my: 3 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2, flexWrap: 'wrap' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ flex: 1, fontWeight: 'bold' }}>
                        {t('clients.removeMfaDescription')}
                      </Typography>
                      <Button
                        variant="outlined"
                        color="warning"
                        disabled={formik.isSubmitting || !formik.values.id}
                        onClick={() => setModal({ type: 'mfa', open: true })}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        {t('clients.removeMfa')}
                      </Button>
                    </Box>
                    <Divider sx={{ my: 3 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2, flexWrap: 'wrap' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ flex: 1, fontWeight: 'bold' }}>
                        {t('clients.banUserDescription')}
                      </Typography>
                      <Button
                        variant="outlined"
                        color="error"
                        disabled={formik.isSubmitting || !formik.values.id}
                        onClick={() => setModal({ type: 'ban', open: true })}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        {t('clients.banUser')}
                      </Button>
                    </Box>
                    <Divider sx={{ my: 3 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2, flexWrap: 'wrap' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ flex: 1, fontWeight: 'bold' }}>
                        {t('clients.unbanUserDescription')}
                      </Typography>
                      <Button
                        variant="outlined"
                        color="success"
                        disabled={formik.isSubmitting || !formik.values.id}
                        onClick={() => setModal({ type: 'unban', open: true })}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        {t('clients.unbanUser')}
                      </Button>
                    </Box>
                  </Stack>
                  <PopupModal
                    isOpen={modal.open}
                    title={
                      modal.type === 'recovery' ? t('clients.sendPasswordRecovery') :
                        modal.type === 'magic' ? t('clients.sendMagicLink') :
                          modal.type === 'mfa' ? t('clients.removeMfa') :
                            modal.type === 'ban' ? t('clients.banUser') :
                              modal.type === 'unban' ? t('clients.unbanUser') : ''
                    }
                    type="confirmation"
                    loading={modalLoading}
                    onClose={() => {
                      setModal({ open: false, type: undefined });
                      setModalResult(null);
                    }}
                    onConfirm={() => {
                      if (modal.type === 'recovery') return handleSendPasswordRecovery();
                      if (modal.type === 'magic') return handleSendMagicLink();
                      if (modal.type === 'mfa') return handleRemoveMfa();
                      if (modal.type === 'ban') return handleBanUser();
                      if (modal.type === 'unban') return handleUnbanUser();
                    }}
                    confirmText={t('common.btnConfirm')}
                    cancelText={t('common.btnCancel')}
                  >
                    {modal.type === 'recovery' && t('clients.confirmSendPasswordRecovery')}
                    {modal.type === 'magic' && t('clients.confirmSendMagicLink')}
                    {modal.type === 'mfa' && t('clients.confirmRemoveMfa')}
                    {modal.type === 'ban' && t('clients.confirmBanUser')}
                    {modal.type === 'unban' && t('clients.confirmUnbanUser')}
                    {modalResult && (
                      <div style={{ marginTop: 16, color: modalResult.startsWith('Error') ? 'red' : 'green' }}>
                        {modalResult}
                      </div>
                    )}
                  </PopupModal>
                </Stack>
              </>
            ) : null
          }

        </CardContent>
        <Divider sx={{ my: 3 }} />
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          flexWrap="wrap"
          spacing={3}
          sx={{ p: 3 }}
        >
          <Tooltip
            title={
              validationMessages.length > 0 && (formik.isSubmitting || !formik.isValid || !formik.dirty)
                ? (
                  <Stack component="span" spacing={0.5}>
                    {validationMessages.map((msg, idx) => (
                      <Typography key={idx} variant="caption">{msg}</Typography>
                    ))}
                  </Stack>
                )
                : ''
            }
            disableFocusListener={validationMessages.length === 0}
            disableHoverListener={validationMessages.length === 0}
            disableTouchListener={validationMessages.length === 0}
          >
            <span>
              <Button
                disabled={formik.isSubmitting || !formik.isValid || !formik.dirty}
                type="submit"
                variant="contained"
                loading={formik.isSubmitting}
              >
                {t('clients.clientSave')}
              </Button>
            </span>
          </Tooltip>
          <Button
            color="inherit"
            component={RouterLink}
            disabled={formik.isSubmitting}
            href={
              showClientActions ?
                paths.dashboard.clients.index :
                paths.dashboard.index
            }
          >
            {t('common.btnCancel')}
          </Button>
        </Stack>
        {isMobile && validationMessages.length > 0 && (formik.isSubmitting || !formik.isValid || !formik.dirty) && (
          <Box sx={{ px: 3, pb: 3 }}>
            <Stack spacing={0.5}>
              {validationMessages.map((msg, idx) => (
                <Typography key={idx} variant="caption" color="error">
                  • {msg}
                </Typography>
              ))}
            </Stack>
          </Box>
        )}
      </Card>
    </form >
  )
}

