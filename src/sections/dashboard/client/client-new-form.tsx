'use client'

import { type FC } from 'react'
import { Field, useFormik } from 'formik'
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
import { Client, clientInitialValues, ClientStatus, ClientType, clientValidationSchema } from 'src/types/client'
import { useTranslation } from 'react-i18next'
import { ListItem, MenuItem } from '@mui/material'
import LocationAutocomplete from '../locations/autocomplete'

interface ClientNewFormProps {
  clientTypes: ClientType[],
  clientStatuses: ClientStatus[]
}

export const ClientNewForm: FC<ClientNewFormProps> = ({ clientTypes, clientStatuses }) => {

  const { t } = useTranslation()

  const formik = useFormik({
    initialValues: clientInitialValues,
    validationSchema: clientValidationSchema(t),

    onSubmit: async (values, { setSubmitting, resetForm }) => {
      console.log('values', values);

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
        <CardHeader title={t('clients.clientFormBasicInfo')} />

        <CardContent sx={{ pt: 0 }}>
          <Typography>
            {JSON.stringify(formik.errors)}
          </Typography>
          <Grid container spacing={3}>
            <Grid xs={12} md={6}>
              <TextField
                select
                fullWidth
                label={t('clients.clientType')}
                name="type"
                value={formik.values.type}
                onChange={formik.handleChange} // Use onChange for handling selection
                error={!!(formik.touched.type && formik.errors.type)}
                helperText={formik.touched.type && formik.errors.type}
              >
                {clientTypes.map((option: ClientType) => (
                  <MenuItem
                    key={option.id} value={option.name}
                    sx={{ cursor: 'pointer' }}
                  >
                    {option.name}
                  </MenuItem >
                ))}
              </TextField>
            </Grid>
            <Grid xs={12} md={6}>
              <TextField
                select
                fullWidth
                label={t('clients.clientStatus')}
                name="status"
                value={formik.values.status}
                onChange={formik.handleChange} // Use onChange for handling selection
                error={!!(formik.touched.status && formik.errors.status)}
                helperText={formik.touched.status && formik.errors.status}
              >
                {clientStatuses.map((status: ClientStatus) => (
                  <MenuItem
                    key={status.id} value={status.name}
                    sx={{ cursor: 'pointer' }}
                  >
                    {status.name}
                  </MenuItem >
                ))}
              </TextField>
            </Grid>
          </Grid>
          <Grid container spacing={3}>
            <Grid xs={12} md={6}>
              <TextField
                fullWidth
                label={t('clients.clientName')}
                name="name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={!!(formik.touched.name && formik.errors.name)}
                helperText={formik.touched.name && formik.errors.name}
              />
            </Grid>
            <Grid xs={12} md={6}>
              <TextField
                fullWidth
                label={t('clients.clientContactPerson')}
                name="contact_person"
                value={formik.values.contact_person}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={!!(formik.touched.contact_person && formik.errors.contact_person)}
                helperText={formik.touched.contact_person && formik.errors.contact_person}
              />
            </Grid>
            <Grid xs={12} md={6}>
              <LocationAutocomplete
                label={t('clients.clientAddress1')}
                onAddressSelected={(e: any) => {
                  formik.setFieldValue('address1', e.matching_place_name);
                }}
              />
            </Grid>
            <Grid xs={12} md={6}>
              <LocationAutocomplete label={t('clients.clientAddress2')} onAddressSelected={() => {
                formik.setFieldValue('address2', '');
              }} />

            </Grid>
            <Grid xs={12} md={6}>
              <TextField
                fullWidth
                label={t('clients.clientEmail')}
                name="email"
                error={!!(formik.touched.email && formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.email}
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
                fullWidth
                label={t('clients.clientMobilePhone')}
                name="mobile_phone"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.mobile_phone}
                error={!!(formik.touched.mobile_phone && formik.errors.mobile_phone)}
                helperText={formik.touched.mobile_phone && formik.errors.mobile_phone}
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
                checked={formik.values.is_verified}
                color="primary"
                edge="start"
                name="is_verified"
                onChange={formik.handleChange}
                value={formik.values.is_verified}
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
                checked={formik.values.has_accepted_marketing}
                color="primary"
                edge="start"
                name="hasDiscount"
                onChange={formik.handleChange}
                value={formik.values.has_accepted_marketing}
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
    </form >
  )
}

