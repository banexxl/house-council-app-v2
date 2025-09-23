'use client'

import { useEffect, useRef, useState, type FC } from 'react'
import { useFormik } from 'formik'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import { Box, Grid } from '@mui/material';
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import { RouterLink } from 'src/components/router-link'
import { paths } from 'src/paths'
import toast from 'react-hot-toast'
import { Client, clientInitialValues, clientStatusMapping, clientTypeMapping, clientValidationSchema } from 'src/types/client'
import { useTranslation } from 'react-i18next'
import LocationAutocomplete from '../locations/autocomplete'
import { createOrUpdateClientAction, sendPasswordRecoveryEmail, sendMagicLink, removeAllMfaFactors, banUser, unbanUser } from 'src/app/actions/client/client-actions'
import { AvatarUpload, AvatarUploadRef } from 'src/sections/dashboard/client/uplod-image'
import { transliterateCyrillicToLatin } from 'src/utils/transliterate'
import { useRouter, usePathname } from 'next/navigation'
import { PopupModal } from 'src/components/modal-dialog'
import { CustomAutocomplete } from 'src/components/autocomplete-custom'
import { supabaseBrowserClient } from 'src/libs/supabase/sb-client'
import { BuildingLocation } from 'src/types/location'
import { ClientSubscription, SubscriptionPlan } from 'src/types/subscription-plan'
import dayjs, { Dayjs } from 'dayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { updateClientSubscriptionForClient } from 'src/app/actions/subscription-plan/subscription-plan-actions'

interface ClientNewFormProps {
  clientData?: Client
  clientSubscription?: ClientSubscription & { subscription_plan: SubscriptionPlan } | null
  availableSubscriptions?: SubscriptionPlan[]
  showAdvancedSettings?: boolean;
  showClientActions?: boolean;
}

export const ClientForm: FC<ClientNewFormProps> = ({ clientData, clientSubscription, availableSubscriptions, showAdvancedSettings, showClientActions }) => {

  // Modal state for admin actions
  const [modal, setModal] = useState<{ open: boolean; type?: string }>({ open: false, type: undefined });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalResult, setModalResult] = useState<string | null>(null);
  const [unassignedLocations, setUnassignedLocations] = useState<any[]>([]);
  const [initialValues, setInitialValues] = useState<Client>(clientData || clientInitialValues)
  const { t } = useTranslation()
  const avatarUploadRef = useRef<AvatarUploadRef>(null)
  const router = useRouter()
  const currentRoute = usePathname()

  useEffect(() => {
    const fetchBuildingLocations = async () => {
      // Make sure client_id is defined
      const client_id = clientData?.id;
      if (!client_id) return;
      const { data, error } = await supabaseBrowserClient.from('tblBuildingLocations').select('*').eq('client_id', client_id).is('building_id', null);
      setUnassignedLocations(data || []);
    };
    fetchBuildingLocations();
  }, [clientData?.id]);


  const formik = useFormik({
    initialValues: {
      ...clientInitialValues, // Default values for new clients
      ...initialValues, // Overwrite with existing client data if editing
      client_type: initialValues?.client_type || clientInitialValues.client_type || '', // Ensure type is valid
      client_status: initialValues?.client_status || clientInitialValues.client_status || '', // Ensure status is valid
      subscription_plan_id: clientSubscription?.subscription_plan_id || '',
      next_payment_date: clientSubscription?.next_payment_date ? dayjs(clientSubscription.next_payment_date) : null as Dayjs | null,
    },
    validationSchema: clientValidationSchema(t),

    onSubmit: async (values, { setSubmitting }) => {
      // Separate client vs subscription values before calling server actions
      const { subscription_plan_id, next_payment_date, ...clientOnly } = values as any;

      try {
        const saveClientResponse = await createOrUpdateClientAction(clientOnly as Client)
        // After save, update subscription plan and expiration if changed or provided
        if (saveClientResponse.saveClientActionSuccess) {
          const newPlanId = subscription_plan_id as string;
          const newExpiry = next_payment_date as Dayjs | null;
          const savedClientId = saveClientResponse.saveClientActionData?.id || clientData?.id;
          const hasPlanChanged = newPlanId && newPlanId !== (clientSubscription?.subscription_plan_id || '');
          const hasExpiryChanged = (clientSubscription?.next_payment_date || null) !== (newExpiry ? newExpiry.toISOString() : null);
          if (savedClientId && newPlanId && (hasPlanChanged || hasExpiryChanged)) {
            const { success, error } = await updateClientSubscriptionForClient(
              savedClientId,
              newPlanId,
              { nextPaymentDate: newExpiry ? newExpiry.toISOString() : null }
            );
            if (!success) {
              toast.error(t('common.error') + ': ' + (error || 'Failed to update subscription'))
            }
          }
        }
        if (saveClientResponse.saveClientActionSuccess) {
          setInitialValues((prev) => ({ ...prev, ...saveClientResponse.saveClientActionData }))
          const clientId = saveClientResponse.saveClientActionData?.id;
          if (!currentRoute.includes(clientId!)) {
            setInitialValues((prev) => ({ ...prev, ...saveClientResponse.saveClientActionData }))
            if (showClientActions) {
              router.push(paths.dashboard.clients.details + '/' + clientId);
            } else (
              router.push(paths.dashboard.account)
            )
          }
          toast.success(t('clients.clientSaved'))
        } else if (saveClientResponse.saveClientActionError) {
          saveClientResponse.saveClientActionError.code === '23505' ? toast.error(t('clients.clientNotSaved') + ': \n' + t('errors.client.uniqueEmailViolation'))
            : saveClientResponse.saveClientActionError.code === '23503' ? toast.error(t('clients.clientNotSaved') + ': \n' + t('errors.client.foreignKeyViolation'))
              : saveClientResponse.saveClientActionError.code === '23502' ? toast.error(t('clients.clientNotSaved') + ': \n' + t('errors.client.notNullViolation'))
                : saveClientResponse.saveClientActionError.code === '22P02' ? toast.error(t('clients.clientNotSaved') + ': \n' + t('errors.client.dataTypeMismatch'))
                  : saveClientResponse.saveClientActionError.code === '23514' ? toast.error(t('clients.clientNotSaved') + ': \n' + t('errors.client.checkViolation'))
                    : toast.error(t('clients.clientNotSaved') + ': \n' + t('errors.client.unexpectedError'))
        }
      } catch (error) {
        toast.error(t('clients.clientNotSaved'), error.message)
      } finally {
        setSubmitting(false)
      }
    },
  })

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

  return (
    <form onSubmit={formik.handleSubmit}>
      <Card>
        <CardHeader title={t('common.formBasicInfo')} />
        <CardContent sx={{ pt: 0 }}>
          <AvatarUpload
            buttonDisabled={initialValues?.id == '' ? true : false}
            ref={avatarUploadRef}
            onUploadSuccess={(url: string) => {
              formik.setFieldValue('avatar', url)
            }}
            folderName={formik.values.name}
            initialValue={clientData?.id == '' ? '' : clientData?.avatar}
          />
          {
            showAdvancedSettings && (
              <>
                <Divider sx={{ my: 3 }} >{t('clients.clientFormSettings')}</Divider>
                <Grid container spacing={3} sx={{ mb: 2 }}>
                  <Grid
                    size={{ xs: 12, md: 6 }}
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
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
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
            >
              <LocationAutocomplete
                label={t('clients.clientAddress1')}
                onAddressSelected={(e: any) => {
                  formik.setFieldValue('address_1', transliterateCyrillicToLatin(e.matching_place_name));
                }}
                initialValue={initialValues?.id == '' ? '' : initialValues?.address_1}
              />
            </Grid>
            <Grid
              size={{ xs: 12, md: 6 }}
            >
              <LocationAutocomplete
                label={t('clients.clientAddress2')}
                onAddressSelected={(e: any) => {
                  formik.setFieldValue('address_2', transliterateCyrillicToLatin(e.matching_place_name));
                }}
                initialValue={initialValues?.id == '' ? '' : initialValues?.address_2}
              />
            </Grid>
            <Grid
              size={{ xs: 12, md: 6 }}
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
                <Grid size={{ xs: 12, md: 6 }}>
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
          {clientData && clientSubscription && (
            <>
              <Divider sx={{ my: 3 }}>{t('clients.clientSubscriptionPlan')}</Divider>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label={t('clients.clientSubscriptionPlan')}
                    name="subscription_plan_id"
                    disabled={formik.isSubmitting}
                    value={(formik.values as any).subscription_plan_id || ''}
                    onChange={formik.handleChange}
                    defaultValue={formik.values.subscription_plan_id || ''}
                  >
                    {(availableSubscriptions || []).map((plan) => (
                      <MenuItem key={plan.id} value={plan.id!}>
                        {plan.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label={t('clients.clientCardExpirationDate')}
                      value={(formik.values as any).next_payment_date as Dayjs | null}
                      onChange={(val) => formik.setFieldValue('next_payment_date', val)}
                      slotProps={{ textField: { fullWidth: true, disabled: formik.isSubmitting } }}
                    />
                  </LocalizationProvider>
                </Grid>
              </Grid>
              {clientSubscription && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('subscriptionPlans.currentPlan')}: {clientSubscription.subscription_plan?.name} {clientSubscription.next_payment_date ? `— ${t('subscriptionPlans.expirationDate')}: ${dayjs(clientSubscription.next_payment_date).format('YYYY-MM-DD')}` : ''}
                  </Typography>
                </Box>
              )}
            </>
          )}
          {
            showAdvancedSettings && (
              <>
                <Divider sx={{ my: 3 }} >{t('common.formAdvancedInfo')}</Divider>
                <Stack divider={<Divider />} spacing={3} sx={{ mt: 3 }}>
                  <Stack alignItems="center" direction="row" justifyContent="space-between" spacing={3}>
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
                  <Stack alignItems="center" direction="row" justifyContent="space-between" spacing={3}>
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
                <Stack alignItems="center" direction="row" justifyContent="space-between" spacing={3}>
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
                      >
                        {t('clients.banUser')}
                      </Button>
                      <Button
                        variant="outlined"
                        color="success"
                        disabled={formik.isSubmitting || !formik.values.id}
                        onClick={() => setModal({ type: 'unban', open: true })}
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
          <Button
            disabled={formik.isSubmitting || !formik.isValid || !formik.dirty}
            type="submit"
            variant="contained"
            loading={formik.isSubmitting}
          >
            {t('clients.clientSave')}
          </Button>
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
      </Card>
    </form >
  )
}

