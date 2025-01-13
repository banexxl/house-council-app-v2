'use client'

import { type FC } from 'react'
import { useFormik } from 'formik'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Unstable_Grid2'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { RouterLink } from 'src/components/router-link'
import { paths } from 'src/paths'
import toast from 'react-hot-toast'
import { ClientType, clientValidationSchema } from 'src/types/client'
import { MenuItem } from '@mui/material'
import { useTranslation } from 'react-i18next'

interface ClientNewFormProps {
  clientTypes: ClientType[]
}

export const ClientNewForm: FC<ClientNewFormProps> = ({ clientTypes }) => {


  const { t } = useTranslation()

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      address1: '',
      address2: '',
      phone: '',
      mobilePhone: '',
      city: '',
      postalCode: '',
      country: '',
      state: '',
      clientType: '',
      isVerified: false,
      hasDiscount: false,
    },
    validationSchema: clientValidationSchema(t),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        // Simulate a server call
        await new Promise((resolve) => setTimeout(resolve, 1000))
        toast.success('Client information updated successfully!')
        resetForm()
      } catch (error) {
        toast.error('Something went wrong. Please try again.')
      } finally {
        setSubmitting(false)
      }
    },
  })

  return (
    <form onSubmit={formik.handleSubmit}>
      <Card>
        <CardHeader title={t('clients.clientCreate')} />
        <CardContent sx={{ pt: 0 }}>
          <Grid container spacing={3}>
            <Grid xs={12} md={6}>
              <TextField
                select
                fullWidth
                label={t('clients.clientType')}
                name="clientType"
                value={formik.values.clientType}
                onChange={formik.handleChange}
                error={formik.touched.clientType && Boolean(formik.errors.clientType)}
                helperText={formik.touched.clientType && formik.errors.clientType}
              >
                {clientTypes.map((option) => (
                  <MenuItem key={option.name} value={option.name}>
                    {option.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid xs={12} md={6}>
              <TextField
                error={!!(formik.touched.email && formik.errors.email)}
                fullWidth
                helperText={formik.touched.email && formik.errors.email}
                label={t('clients.clientEmail')}
                name="email"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.email}
              />
            </Grid>
            <Grid xs={12} md={6}>
              <TextField
                error={!!(formik.touched.address1 && formik.errors.address1)}
                fullWidth
                helperText={formik.touched.address1 && formik.errors.address1}
                label={t('clients.clientAddress1')}
                name="address1"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.address1}
              />
            </Grid>
            <Grid xs={12} md={6}>
              <TextField
                error={!!(formik.touched.address2 && formik.errors.address2)}
                fullWidth
                helperText={formik.touched.address2 && formik.errors.address2}
                label={t('clients.clientAddress2')}
                name="address2"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.address2}
              />
            </Grid>
            <Grid xs={12} md={6}>
              <TextField
                error={!!(formik.touched.city && formik.errors.city)}
                fullWidth
                helperText={formik.touched.city && formik.errors.city}
                label={t('clients.clientCity')}
                name="city"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.city}
              />
            </Grid>
            <Grid xs={12} md={6}>
              <TextField
                error={!!(formik.touched.postalCode && formik.errors.postalCode)}
                fullWidth
                helperText={formik.touched.postalCode && formik.errors.postalCode}
                label={t('clients.clientPostalCode')}
                name="postalCode"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.postalCode}
              />
            </Grid>
            <Grid xs={12} md={6}>
              <TextField
                error={!!(formik.touched.phone && formik.errors.phone)}
                fullWidth
                helperText={formik.touched.phone && formik.errors.phone}
                label={t('clients.clientPhone')}
                name="phone"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.phone}
              />
            </Grid>
            <Grid xs={12} md={6}>
              <TextField
                error={!!(formik.touched.mobilePhone && formik.errors.mobilePhone)}
                fullWidth
                helperText={formik.touched.mobilePhone && formik.errors.mobilePhone}
                label={t('clients.clientMobilePhone')}
                name="mobilePhone"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.mobilePhone}
              />
            </Grid>
            <Grid xs={12} md={6}>
              <TextField
                error={!!(formik.touched.country && formik.errors.country)}
                fullWidth
                helperText={formik.touched.country && formik.errors.country}
                label={t('clients.clientCountry')}
                name="country"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.country}
              />
            </Grid>
            <Grid xs={12} md={6}>
              <TextField
                error={!!(formik.touched.state && formik.errors.state)}
                fullWidth
                helperText={formik.touched.state && formik.errors.state}
                label={t('clients.clientState')}
                name="state"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.state}
              />
            </Grid>
          </Grid>
          <Stack divider={<Divider />} spacing={3} sx={{ mt: 3 }}>
            <Stack alignItems="center" direction="row" justifyContent="space-between" spacing={3}>
              <Stack spacing={1}>
                <Typography gutterBottom variant="subtitle1">
                  Make Contact Info Public
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Means that anyone viewing your profile will be able to see your contacts details
                </Typography>
              </Stack>
              <Switch
                checked={formik.values.isVerified}
                color="primary"
                edge="start"
                name="isVerified"
                onChange={formik.handleChange}
                value={formik.values.isVerified}
              />
            </Stack>
            <Stack alignItems="center" direction="row" justifyContent="space-between" spacing={3}>
              <Stack spacing={1}>
                <Typography gutterBottom variant="subtitle1">
                  Available to hire
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Toggling this will let your teammates know that you are available for acquiring
                  new projects
                </Typography>
              </Stack>
              <Switch
                checked={formik.values.hasDiscount}
                color="primary"
                edge="start"
                name="hasDiscount"
                onChange={formik.handleChange}
                value={formik.values.hasDiscount}
              />
            </Stack>
          </Stack>
        </CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          flexWrap="wrap"
          spacing={3}
          sx={{ p: 3 }}
        >
          <Button
            disabled={formik.isSubmitting || !formik.dirty || !formik.isValid}
            type="submit"
            variant="contained"
          >
            {t('clients.clientSave')}
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            disabled={formik.isSubmitting}
            href={paths.dashboard.clients.index}
          >
            Cancel
          </Button>
        </Stack>
      </Card>
    </form>
  )
}

