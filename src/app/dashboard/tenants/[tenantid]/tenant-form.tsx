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
     Tooltip
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
          onSubmit: async (values, { setSubmitting }) => {
               try {
                    const response = await createOrUpdateTenantAction(values as Tenant);
                    if (response.saveTenantActionSuccess) {
                         setInitialValues((prev) => ({ ...prev, ...response.saveTenantActionData }));
                         const tenantId = response.saveTenantActionData?.id;
                         if (!currentRoute.includes(tenantId!)) {
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

     return (
          <form onSubmit={formik.handleSubmit}>
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
                                        error={!!(formik.touched.first_name && formik.errors.first_name)}
                                        helperText={
                                             <span style={{ display: 'block', minHeight: 24 }}>
                                                  {formik.touched.first_name && formik.errors.first_name ? formik.errors.first_name : ''}
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
                                        error={!!(formik.touched.last_name && formik.errors.last_name)}
                                        helperText={
                                             <span style={{ display: 'block', minHeight: 24 }}>
                                                  {formik.touched.last_name && formik.errors.last_name ? formik.errors.last_name : ''}
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
                                        error={!!(formik.touched.email && formik.errors.email)}
                                        helperText={
                                             <span style={{ display: 'block', minHeight: 24 }}>
                                                  {formik.touched.email && formik.errors.email ? formik.errors.email : ''}
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
                                        error={!!(formik.touched.tenant_type && formik.errors.tenant_type)}
                                        helperText={
                                             <span style={{ display: 'block', minHeight: 24 }}>
                                                  {formik.touched.tenant_type && formik.errors.tenant_type ? formik.errors.tenant_type : ''}
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
                                                       error: !!(formik.touched.date_of_birth && formik.errors.date_of_birth),
                                                       helperText: formik.touched.date_of_birth && formik.errors.date_of_birth,
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
                                        label={t('tenants.tenantPhoneNumber')}
                                        name="phone_number"
                                        value={formik.values.phone_number}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        disabled={!apartmentSelected}
                                        error={!!(formik.touched.phone_number && formik.errors.phone_number)}
                                        helperText={
                                             <span style={{ display: 'block', minHeight: 24 }}>
                                                  {formik.touched.phone_number && formik.errors.phone_number ? formik.errors.phone_number : ''}
                                             </span>
                                        }
                                   />
                              </Grid>

                              <Grid size={{ xs: 12, md: 6 }}>
                                   <Box display="flex" alignItems="center" height="100%">
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
                                   </Box>
                              </Grid>

                         </Grid>
                    </CardContent>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ p: 3 }}>
                         <Button
                              type="submit"
                              variant="contained"
                              disabled={formik.isSubmitting || !formik.dirty || !formik.isValid}
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
          </form>
     );
};
