'use client';

import { useEffect, useMemo, useRef, useState, type FC } from 'react';
import { useFormik } from 'formik';
import {
     Box,
     Button,
     Card,
     CardContent,
     CardHeader,
     Divider,
     Grid,
     MenuItem,
     Stack,
     TextField,
     Typography
} from '@mui/material';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useTranslation } from 'react-i18next';
import { useRouter, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { paths } from 'src/paths';
import { RouterLink } from 'src/components/router-link';
import { createOrUpdateTenantAction } from 'src/app/actions/tenant/tenant-actions';
import { Tenant, tenantInitialValues, tenantValidationSchema } from 'src/types/tenant';
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
                         toast.error(t('tenants.tenantNotSaved'));
                    }
               } catch (error) {
                    toast.error(t('tenants.tenantNotSaved'), error.message);
               } finally {
                    setSubmitting(false);
               }
          },
     });

     useEffect(() => {
          if (selectedBuildingId) {
               const selected = buildings.find((b) => b.id === selectedBuildingId);
               setAvailableApartments(selected?.apartments || []);
          }
     }, [selectedBuildingId, buildings]);

     const apartmentSelected = !!formik.values.apartment_id;

     return (
          <form onSubmit={formik.handleSubmit}>
               <Card>
                    <CardHeader title={t('tenants.formTitle')} />
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
                                        helperText={formik.touched.first_name && formik.errors.first_name}
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
                                        helperText={formik.touched.last_name && formik.errors.last_name}
                                   />
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
                                        />
                                   </LocalizationProvider>
                              </Grid>

                              <Grid size={{ xs: 12, md: 6 }}>
                                   <TextField
                                        fullWidth
                                        label={t('tenants.email')}
                                        name="email"
                                        value={formik.values.email}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        disabled={!apartmentSelected}
                                        error={!!(formik.touched.email && formik.errors.email)}
                                        helperText={formik.touched.email && formik.errors.email}
                                   />
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
                                        helperText={formik.touched.phone_number && formik.errors.phone_number}
                                   />
                              </Grid>
                         </Grid>
                    </CardContent>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ p: 3 }}>
                         <Button
                              type="submit"
                              variant="contained"
                              disabled={formik.isSubmitting || !formik.dirty || !formik.isValid}
                         >
                              {t('tenants.tenantSave')}
                         </Button>
                         <Button
                              color="inherit"
                              component={RouterLink}
                              href={paths.dashboard.tenants.index}
                              disabled={formik.isSubmitting}
                         >
                              {t('common.cancel')}
                         </Button>
                    </Stack>
               </Card>
          </form>
     );
};
