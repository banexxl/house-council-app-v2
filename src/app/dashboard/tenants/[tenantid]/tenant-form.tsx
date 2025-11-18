'use client';

import { useEffect, useState, type FC } from 'react';
import { useFormik } from 'formik';
import {
     Box,
     Button,
     Card,
     CardContent,
     CardHeader,
     Grid,
     MenuItem,
     Stack,
     TextField,
     Typography,
     Checkbox,
     Tooltip,
     Divider,
     InputAdornment
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useTranslation } from 'react-i18next';
import { useRouter, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { paths } from 'src/paths';
import { RouterLink } from 'src/components/router-link';
import { createOrUpdateTenantAction } from 'src/app/actions/tenant/tenant-actions';
import { Tenant, tenantInitialValues, tenantValidationSchema, tenantTypeOptions } from 'src/types/tenant';
import dayjs from 'dayjs';
import { PopupModal } from 'src/components/modal-dialog';
import { banUser, removeAllMfaFactors, sendMagicLink, sendPasswordRecoveryEmail, unbanUser } from 'src/app/actions/client/client-actions';
import { EntityFormHeader } from 'src/components/entity-form-header';

interface TenantFormProps {
     tenantData?: Tenant;
     buildings: {
          id: string;
          name: string;
          apartments: {
               id: string;
               apartment_number: string;
          }[];
     }[];
}

export const TenantForm: FC<TenantFormProps> = ({ tenantData, buildings }) => {

     // Modal state for admin actions
     const [modal, setModal] = useState<{ open: boolean; type?: string }>({ open: false, type: undefined });
     const [modalLoading, setModalLoading] = useState(false);
     const [modalResult, setModalResult] = useState<string | null>(null);

     const [initialValues, setInitialValues] = useState<Tenant>(tenantData || tenantInitialValues);
     const { t } = useTranslation();
     const router = useRouter();
     const currentRoute = usePathname();

     const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
     const [availableApartments, setAvailableApartments] = useState<{ id: string; apartment_number: string }[]>([]);

     // Set selects from tenantData on load or when tenantData/buildings change
     useEffect(() => {
          if (tenantData?.apartment_id && buildings.length > 0) {
               const building = buildings.find(b => b.apartments.some(a => a.id === tenantData.apartment_id));
               if (building) {
                    setSelectedBuildingId(building.id);
                    setAvailableApartments(building.apartments);
               }
          }
     }, [tenantData, buildings]);

     // If no tenantData, set initial values to 
     useEffect(() => {
          if (selectedBuildingId) {
               const building = buildings.find(b => b.id === selectedBuildingId);
               if (building) {
                    setAvailableApartments(building.apartments);
               } else {
                    setAvailableApartments([]);
               }
          }
     }, [selectedBuildingId, buildings]);


     const formik = useFormik({
          initialValues: {
               ...tenantInitialValues,
               ...initialValues,
          },
          validationSchema: tenantValidationSchema(t),
          validateOnMount: false,
          onSubmit: async (values, { setSubmitting }) => {
               try {
                    const response = await createOrUpdateTenantAction(values as Tenant);
                    if (response.saveTenantActionSuccess) {
                         // Update local initialValues and reset Formik to new clean state so form is not marked dirty.
                         setInitialValues((prev) => ({ ...prev, ...response.saveTenantActionData }));
                         formik.resetForm({ values: { ...tenantInitialValues, ...response.saveTenantActionData } });
                         const tenantId = response.saveTenantActionData?.id;
                         if (tenantId && !currentRoute.includes(tenantId)) {
                              router.push(paths.dashboard.tenants.index + '/' + tenantId);
                         }
                         toast.success(t('tenants.tenantSaved'));
                    } else {
                         toast.error(t('tenants.tenantNotSaved') + ': ' + t(response.saveTenantActionError));
                    }
               } catch (error) {
                    toast.error(t('tenants.tenantNotSaved') + ': ' + t(error.message));
               } finally {
                    setSubmitting(false);
               }
          },
     });

     const apartmentSelected = !!formik.values.apartment_id;

     // Helper to decide when to show an error for a field
     const showFieldError = (name: keyof Tenant | string) => !!(formik.touched as any)[name] || formik.submitCount > 0;

     // Re-run validation if the underlying tenant data changes (does not mark fields as touched)
     useEffect(() => {
          if (tenantData) {
               formik.validateForm();
          }
          // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [tenantData]);

     // Admin action handlers (reuse logic from client form, but use tenantData)
     const handleSendPasswordRecovery = async () => {
          setModalLoading(true);
          try {
               const { success, error } = await sendPasswordRecoveryEmail(formik.values.email!);
               setModalResult(success ? t('clients.passwordResetEmailSent') : error || t('clients.tenantNotSaved'));
          } catch (error) {
               toast.error(t('clients.tenantNotSaved'), error.message);
               setModalResult(t('clients.tenantNotSaved'));
          }
          setModalLoading(false);
     };

     const handleSendMagicLink = async () => {
          setModalLoading(true);
          try {
               const { success, error } = await sendMagicLink(formik.values.email!);
               setModalResult(success ? t('clients.magicLinkSent') : error || t('clients.tenantNotSaved'));
          } catch (error) {
               toast.error(t('clients.tenantNotSaved'), error.message);
               setModalResult(t('clients.tenantNotSaved'));
          }
          setModalLoading(false);
     };

     const handleRemoveMfa = async () => {
          setModalLoading(true);
          try {
               const { success, error } = await removeAllMfaFactors(formik.values.user_id!);
               setModalResult(success ? t('clients.mfaRemoved') : error || t('clients.tenantNotSaved'));
          } catch (error) {
               toast.error(t('clients.tenantNotSaved'), error.message);
               setModalResult(t('clients.tenantNotSaved'));
          }
          setModalLoading(false);
     };

     const handleBanUser = async () => {
          setModalLoading(true);
          try {
               const { success, error } = await banUser(formik.values.user_id!);
               setModalResult(success ? t('clients.userBanned') : error || t('clients.tenantNotSaved'));
          } catch (error) {
               toast.error(t('clients.tenantNotSaved'), error.message);
               setModalResult(t('clients.tenantNotSaved'));
          }
          setModalLoading(false);
     };

     const handleUnbanUser = async () => {
          setModalLoading(true);
          try {
               const { success, error } = await unbanUser(formik.values.user_id!);
               setModalResult(success ? t('clients.userUnbanned') : error || t('clients.tenantNotSaved'));
          } catch (error) {
               toast.error(t('clients.tenantNotSaved'), error.message);
               setModalResult(t('clients.tenantNotSaved'));
          }
          setModalLoading(false);
     };

     return (
          <form onSubmit={formik.handleSubmit}>
               <Stack spacing={4}>
                    <EntityFormHeader
                         backHref={paths.dashboard.tenants.index}
                         backLabel={t('tenants.tenantsList')}
                         title={tenantData
                              ? `${t('tenants.tenantEdit')}: ${tenantData.first_name} ${tenantData.last_name}`
                              : t('tenants.tenantCreate')}
                         breadcrumbs={[
                              { title: t('nav.adminDashboard'), href: paths.dashboard.index },
                              { title: t('tenants.tenantsList'), href: paths.dashboard.tenants.index },
                              {
                                   title: tenantData
                                        ? `${t('tenants.tenantEdit')}: ${tenantData.first_name} ${tenantData.last_name}`
                                        : t('tenants.tenantCreate')
                              }
                         ]}
                    />
                    <Card>
                         <CardHeader title={t('common.formBasicInfo')} sx={{ pb: 0 }} />
                         <CardContent>
                              <Grid container spacing={3}>
                                   <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                             select
                                             fullWidth
                                             label={t('tenants.selectBuilding')}
                                             value={selectedBuildingId}
                                             onChange={(e) => {
                                                  const val = e.target.value;
                                                  setSelectedBuildingId(val);
                                                  formik.setFieldValue('apartment_id', '');
                                             }}
                                             sx={{ mb: 3 }}
                                        >
                                             {buildings.map((building) => (
                                                  <MenuItem key={building.id} value={building.id}>
                                                       {building.name}
                                                  </MenuItem>
                                             ))}
                                        </TextField>
                                   </Grid>

                                   <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                             select
                                             fullWidth
                                             label={t('tenants.selectApartment')}
                                             name="apartment_id"
                                             value={formik.values.apartment_id}
                                             onChange={formik.handleChange}
                                             disabled={!selectedBuildingId}
                                             sx={{ mb: 3 }}
                                        >
                                             {availableApartments.map((apt) => (
                                                  <MenuItem key={apt.id} value={apt.id}>
                                                       {apt.apartment_number}
                                                  </MenuItem>
                                             ))}
                                        </TextField>
                                   </Grid>

                                   <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                             fullWidth
                                             label={t('tenants.firstName')}
                                             name="first_name"
                                             value={formik.values.first_name}
                                             onChange={formik.handleChange}
                                             onBlur={formik.handleBlur}
                                             disabled={!apartmentSelected}
                                             error={Boolean(formik.errors.first_name) && showFieldError('first_name')}
                                             helperText={
                                                  <span style={{ display: 'block', minHeight: 24 }}>
                                                       {showFieldError('first_name') ? formik.errors.first_name : ''}
                                                  </span>
                                             }
                                        />
                                   </Grid>

                                   <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                             fullWidth
                                             label={t('tenants.lastName')}
                                             name="last_name"
                                             value={formik.values.last_name}
                                             onChange={formik.handleChange}
                                             onBlur={formik.handleBlur}
                                             disabled={!apartmentSelected}
                                             error={Boolean(formik.errors.last_name) && showFieldError('last_name')}
                                             helperText={
                                                  <span style={{ display: 'block', minHeight: 24 }}>
                                                       {showFieldError('last_name') ? formik.errors.last_name : ''}
                                                  </span>
                                             }
                                        />
                                   </Grid>

                                   <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                             fullWidth
                                             label={t('tenants.email')}
                                             name="email"
                                             value={formik.values.email}
                                             onChange={formik.handleChange}
                                             onBlur={formik.handleBlur}
                                             disabled={!apartmentSelected || !!tenantData}
                                             error={Boolean(formik.errors.email) && showFieldError('email')}
                                             helperText={
                                                  <span style={{ display: 'block', minHeight: 24 }}>
                                                       {showFieldError('email') ? formik.errors.email : ''}
                                                  </span>
                                             }
                                        />
                                   </Grid>

                                   <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                             select
                                             fullWidth
                                             label={t('tenants.tenantType')}
                                             name="tenant_type"
                                             value={formik.values.tenant_type}
                                             onChange={formik.handleChange}
                                             onBlur={formik.handleBlur}
                                             disabled={!apartmentSelected}
                                             error={Boolean(formik.errors.tenant_type) && showFieldError('tenant_type')}
                                             helperText={
                                                  <span style={{ display: 'block', minHeight: 24 }}>
                                                       {showFieldError('tenant_type') ? formik.errors.tenant_type : ''}
                                                  </span>
                                             }
                                        >
                                             {tenantTypeOptions.map((option) => (
                                                  <MenuItem key={option.value} value={option.value}>
                                                       {t(option.label)}
                                                  </MenuItem>
                                             ))}
                                        </TextField>
                                   </Grid>

                                   <Grid size={{ xs: 12, md: 6 }}>
                                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                             <DatePicker
                                                  label={t('tenants.birthDate')}
                                                  value={formik.values.date_of_birth ? dayjs(formik.values.date_of_birth) : null}
                                                  onChange={(date) => {
                                                       formik.setFieldValue('date_of_birth', date ? date.toISOString() : null);
                                                  }}
                                                  slotProps={{
                                                       textField: {
                                                            fullWidth: true,
                                                            name: 'date_of_birth',
                                                            error: Boolean(formik.errors.date_of_birth) && showFieldError('date_of_birth'),
                                                            helperText: showFieldError('date_of_birth') ? formik.errors.date_of_birth : '',
                                                       },
                                                  }}
                                                  disabled={!apartmentSelected}
                                                  disableFuture={true}
                                             />
                                        </LocalizationProvider>
                                   </Grid>

                                   <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                             fullWidth
                                             type="text"
                                             label={t('tenants.tenantPhoneNumber')}
                                             name="phone_number"
                                             value={formik.values.phone_number}
                                             onChange={(e) => {
                                                  const raw = e.target.value;
                                                  // Strip non-digits
                                                  const digits = raw.replace(/[^0-9]/g, '');
                                                  formik.setFieldValue('phone_number', digits);
                                             }}
                                             onBlur={formik.handleBlur}
                                             disabled={!apartmentSelected}
                                             error={Boolean(formik.errors.phone_number) && showFieldError('phone_number')}
                                             helperText={
                                                  <span style={{ display: 'block', minHeight: 24 }}>
                                                       {showFieldError('phone_number') ? formik.errors.phone_number : ''}
                                                  </span>
                                             }
                                             slotProps={{
                                                  htmlInput: {
                                                       inputMode: 'numeric',
                                                       pattern: '[0-9]*',
                                                       onKeyDown: (e: any) => {
                                                            const allowedControlKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
                                                            if (allowedControlKeys.includes(e.key)) return;
                                                            if (!/^[0-9]$/.test(e.key)) {
                                                                 e.preventDefault();
                                                            }
                                                       },
                                                       style: { MozAppearance: 'textfield' }
                                                  }
                                             }}
                                             sx={{
                                                  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                                                       WebkitAppearance: 'none',
                                                       margin: 0,
                                                  },
                                             }}
                                             InputProps={{
                                                  startAdornment: (
                                                       <InputAdornment position="start" sx={{ userSelect: 'none' }}>
                                                            <span style={{ fontWeight: 600 }}>+</span>
                                                       </InputAdornment>
                                                  ),
                                             }}
                                        />
                                   </Grid>

                                   <Grid size={{ xs: 12, md: 6 }}>
                                        <Checkbox
                                             name="is_primary"
                                             checked={formik.values.is_primary || false}
                                             onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                  formik.setFieldValue('is_primary', e.target.checked);
                                                  formik.setFieldTouched('email', true, false);
                                                  formik.setFieldTouched('phone_number', true, false);
                                             }}
                                             color="primary"
                                             id="is_primary_checkbox"
                                             sx={{ mr: 1 }}
                                             disabled={!apartmentSelected}
                                        />
                                        <Tooltip title={t('tenants.tenantIsPrimaryDescription')}>
                                             <label htmlFor="is_primary_checkbox">
                                                  <Typography variant="body1">{t('tenants.tenantIsPrimary')}</Typography>
                                             </label>
                                        </Tooltip>
                                   </Grid>
                              </Grid>
                         </CardContent>
                         <Divider sx={{ my: 3 }} >{t('common.lblClientAccountActions')}</Divider>
                         <Grid size={{ xs: 12, md: 6 }}>
                              {
                                   tenantData ? (
                                        <Stack alignItems="center" direction="row" justifyContent="space-between" spacing={3} sx={{ p: 3 }}>
                                             <Stack direction="column" spacing={2} sx={{ width: '100%' }}>
                                                  {/* Opt-in communication preferences */}
                                                  <Grid size={{ xs: 12 }}>
                                                       <Box
                                                            sx={{
                                                                 display: 'flex',
                                                                 flexWrap: 'wrap',
                                                                 gap: 2,
                                                                 alignItems: 'center'
                                                            }}
                                                       >
                                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                 <Checkbox
                                                                      name="email_opt_in"
                                                                      checked={formik.values.email_opt_in}
                                                                      onChange={(e) => formik.setFieldValue('email_opt_in', e.target.checked)}
                                                                      disabled={!apartmentSelected}
                                                                 />
                                                                 <Typography variant="body2">{t('tenants.tenantOptInEmail')}</Typography>
                                                            </Box>
                                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                 <Checkbox
                                                                      name="sms_opt_in"
                                                                      checked={formik.values.sms_opt_in}
                                                                      onChange={(e) => formik.setFieldValue('sms_opt_in', e.target.checked)}
                                                                      disabled={!apartmentSelected || !formik.values.phone_number}
                                                                 />
                                                                 <Typography variant="body2">{t('tenants.tenantOptInSms')}</Typography>
                                                            </Box>
                                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                 <Checkbox
                                                                      name="viber_opt_in"
                                                                      checked={formik.values.viber_opt_in}
                                                                      onChange={(e) => formik.setFieldValue('viber_opt_in', e.target.checked)}
                                                                      disabled={!apartmentSelected || !formik.values.phone_number}
                                                                 />
                                                                 <Typography variant="body2">{t('tenants.tenantOptInViber')}</Typography>
                                                            </Box>
                                                       </Box>
                                                  </Grid>
                                                  <Divider sx={{ my: 3 }} />
                                                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2, flexWrap: 'wrap' }}>
                                                       <Typography variant="body2" color="text.secondary" sx={{ flex: 1, fontWeight: 'bold' }}>
                                                            {t('clients.sendPasswordRecoveryDescription')}
                                                       </Typography>
                                                       <Button
                                                            variant="outlined"
                                                            color="primary"
                                                            disabled={formik.isSubmitting || !formik.values.email || modalLoading}
                                                            loading={modalLoading && modal.type === 'recovery'}
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
                                                            disabled={formik.isSubmitting || !formik.values.email || modalLoading}
                                                            loading={modalLoading && modal.type === 'magic'}
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
                                                            disabled={formik.isSubmitting || !formik.values.id || modalLoading}
                                                            loading={modalLoading && modal.type === 'mfa'}
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
                                                            disabled={formik.isSubmitting || !formik.values.id || modalLoading}
                                                            loading={modalLoading && modal.type === 'ban'}
                                                            onClick={() => setModal({ type: 'ban', open: true })}
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
                                                            disabled={formik.isSubmitting || !formik.values.id || modalLoading}
                                                            loading={modalLoading && modal.type === 'unban'}
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
                                   ) :
                                        <Stack alignItems="center" direction="row" justifyContent="space-between" spacing={3} sx={{ p: 3 }}>
                                             <Typography variant="body2" color="text.secondary">
                                                  {t('clients.noClientData')}
                                             </Typography>
                                        </Stack>
                              }
                         </Grid>
                         <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ p: 3 }}>
                              <Button
                                   type="submit"
                                   variant="contained"
                                   disabled={formik.isSubmitting || !formik.dirty || !formik.isValid}
                                   loading={formik.isSubmitting}
                              >
                                   {t('common.btnSave')}
                              </Button>
                              <Button
                                   color="inherit"
                                   component={RouterLink}
                                   href={paths.dashboard.tenants.index}
                                   disabled={formik.isSubmitting}
                              >
                                   {t('common.btnCancel')}
                              </Button>
                         </Stack>

                    </Card>
               </Stack>
          </form>
     );
};
