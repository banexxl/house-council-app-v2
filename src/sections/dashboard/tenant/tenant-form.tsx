'use client'

import { useRef, useState, type FC } from 'react';
import { useFormik } from 'formik';
import {
     Button,
     Card,
     CardContent,
     CardHeader,
     Divider,
     Grid,
     Stack,
     Switch,
     TextField,
     Typography,
     MenuItem,
} from '@mui/material';
import { RouterLink } from 'src/components/router-link';
import { paths } from 'src/paths';
import toast from 'react-hot-toast';
import { Tenant, tenantInitialValues, tenantValidationSchema, tenantTypeOptions } from 'src/types/tenant';
import { useTranslation } from 'react-i18next';
import { useRouter, usePathname } from 'next/navigation';
import { createOrUpdateTenantAction } from 'src/app/actions/tenant/tenant-actions';

interface TenantFormProps {
     tenantData?: Tenant;
}

export const TenantForm: FC<TenantFormProps> = ({ tenantData }) => {
     const [initialValues, setInitialValues] = useState<Tenant>(tenantData || tenantInitialValues);
     const { t } = useTranslation();
     const router = useRouter();
     const currentRoute = usePathname();

     const formik = useFormik({
          initialValues: {
               ...tenantInitialValues,
               ...initialValues,
          },
          validationSchema: tenantValidationSchema(t),

          onSubmit: async (values, { setSubmitting }) => {
               try {
                    const response = await createOrUpdateTenantAction(values);
                    if (response.saveTenantActionSuccess) {
                         setInitialValues(response.saveTenantActionData!);
                         const tenantId = response.saveTenantActionData?.id;
                         if (tenantId && !currentRoute.includes(tenantId)) {
                              router.push(`${paths.dashboard.tenants}/${tenantId}`);
                         }
                         toast.success(t('tenants.tenantSaved'));
                    } else {
                         toast.error(t('tenants.tenantNotSaved') + ': ' + (response.saveTenantActionError?.message || 'Unexpected error'));
                    }
               } catch (error: any) {
                    toast.error(t('tenants.tenantNotSaved') + ': ' + error.message);
               } finally {
                    setSubmitting(false);
               }
          },
     });

     return (
          <form onSubmit={formik.handleSubmit}>
               <Card>
                    <CardHeader title={t('common.formBasicInfo')} />
                    <CardContent sx={{ pt: 0 }}>
                         <Grid container spacing={3}>
                              <Grid size={{ xs: 12, md: 6 }}>
                                   <TextField
                                        fullWidth
                                        label={t('tenants.firstName')}
                                        name="first_name"
                                        value={formik.values.first_name}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        error={!!(formik.touched.first_name && formik.errors.first_name)}
                                        helperText={formik.touched.first_name && formik.errors.first_name}
                                        disabled={formik.isSubmitting}
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
                                        error={!!(formik.touched.last_name && formik.errors.last_name)}
                                        helperText={formik.touched.last_name && formik.errors.last_name}
                                        disabled={formik.isSubmitting}
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
                                        error={!!(formik.touched.email && formik.errors.email)}
                                        helperText={formik.touched.email && formik.errors.email}
                                        disabled={formik.isSubmitting}
                                   />
                              </Grid>
                              <Grid size={{ xs: 12, md: 6 }}>
                                   <TextField
                                        select
                                        fullWidth
                                        label={t('tenants.tenantType')}
                                        name="status"
                                        value={formik.values.tenant_type || ''}
                                        onChange={formik.handleChange}
                                        error={!!(formik.touched.tenant_type && formik.errors.tenant_type)}
                                        helperText={formik.touched.tenant_type && formik.errors.tenant_type}
                                        disabled={formik.isSubmitting}
                                   >
                                        {tenantTypeOptions.map(({ value, label }) => (
                                             <MenuItem key={value} value={value}>
                                                  {t(label)}
                                             </MenuItem>
                                        ))}
                                   </TextField>
                              </Grid>
                              <Grid size={{ xs: 12, md: 6 }}>
                                   <TextField
                                        fullWidth
                                        label={t('tenants.phone')}
                                        name="phone"
                                        value={formik.values.phone_number}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        error={!!(formik.touched.phone_number && formik.errors.phone_number)}
                                        helperText={formik.touched.phone_number && formik.errors.phone_number}
                                        disabled={formik.isSubmitting}
                                   />
                              </Grid>
                              <Grid size={{ xs: 12, md: 6 }}>
                                   <TextField
                                        fullWidth
                                        label={t('tenants.moveInDate')}
                                        name="move_in_date"
                                        type="date"
                                        value={formik.values.move_in_date || ''}
                                        onChange={formik.handleChange}
                                        InputLabelProps={{ shrink: true }}
                                        disabled={formik.isSubmitting}
                                   />
                              </Grid>
                         </Grid>

                         <Stack spacing={3} sx={{ mt: 4 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                   <Typography variant="subtitle1">{t('tenants.isPrimary')}</Typography>
                                   <Switch
                                        name="is_primary"
                                        checked={formik.values.is_primary}
                                        onChange={formik.handleChange}
                                        disabled={formik.isSubmitting}
                                   />
                              </Stack>
                         </Stack>
                    </CardContent>

                    <Stack direction={{ xs: 'column', sm: 'row' }} flexWrap="wrap" spacing={3} sx={{ p: 3 }}>
                         <Button
                              disabled={formik.isSubmitting || !formik.isValid || !formik.dirty}
                              type="submit"
                              variant="contained"
                         >
                              {t('tenants.tenantSave')}
                         </Button>
                         <Button
                              color="inherit"
                              component={RouterLink}
                              disabled={formik.isSubmitting}
                              href={paths.dashboard.tenants.index}
                         >
                              {t('common.cancel')}
                         </Button>
                    </Stack>
               </Card>
          </form>
     );
};
