'use client'

import { useRef, useState, type FC } from 'react'
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
import MenuItem from '@mui/material/MenuItem'
import { RouterLink } from 'src/components/router-link'
import { paths } from 'src/paths'
import toast from 'react-hot-toast'
import { Client, clientInitialValues, ClientStatus, ClientType, clientValidationSchema } from 'src/types/client'
import { useTranslation } from 'react-i18next'
import LocationAutocomplete, { AutocompleteRef } from '../locations/autocomplete'
import { saveClientAction } from 'src/app/actions/client-actions/client-actions'
import { AvatarUpload, AvatarUploadRef } from 'src/sections/dashboard/client/uplod-image'
import { transliterateCyrillicToLatin } from 'src/utils/transliterate'
import { useRouter } from 'next/navigation'
import { LoadingButton } from '@mui/lab'
import { BaseEntity } from 'src/services/base-entity-services'

interface ClientNewFormProps {
  clientTypes: ClientType[],
  clientStatuses: ClientStatus[],
  clientPaymentMethods?: BaseEntity[],
  clientData?: Client
}

export const ClientForm: FC<ClientNewFormProps> = ({ clientTypes, clientStatuses, clientData, clientPaymentMethods }) => {

  const { t } = useTranslation()
  const avatarUploadRef = useRef<AvatarUploadRef>(null)
  const autocompleteRef_1 = useRef<AutocompleteRef>(null)
  const autocompleteRef_2 = useRef<AutocompleteRef>(null)
  const router = useRouter()

  const formik = useFormik({
    initialValues: {
      ...clientInitialValues, // Default values for new clients
      ...clientData, // Overwrite with existing client data if editing
      type: clientData?.type || clientInitialValues.type || '', // Ensure type is valid
      status: clientData?.status || clientInitialValues.status || '', // Ensure status is valid
    },
    validationSchema: clientValidationSchema(t),

    onSubmit: async (values, { setSubmitting }) => {
      const submissionValues = {
        ...values,
      };

      try {
        // Simulate a server call
        const saveClientResponse = await saveClientAction(submissionValues)
        if (saveClientResponse.saveClientActionSuccess) {
          router.push(paths.dashboard.clients.details + '/' + saveClientResponse.saveClientActionData?.id)
          toast.success(t('clients.clientSaved'))
        } else if (saveClientResponse.saveClientActionError) {
          saveClientResponse.saveClientActionError.code === '23505' ? toast.error(t('clients.clientNotSaved') + ': \n' + t('errors.client.uniqueViolation'))
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

  return (
    <form onSubmit={formik.handleSubmit}>
      <Card>
        <CardHeader title={t('clients.clientFormBasicInfo')} />
        <CardContent sx={{ pt: 0 }}>
          {/* <Typography>
            {JSON.stringify(formik.values)}
          </Typography> */}
          <AvatarUpload
            buttonDisabled={Object.keys(formik.errors).length > 0 || !formik.dirty}
            ref={avatarUploadRef}
            onUploadSuccess={(url: string) => formik.setFieldValue('avatar', url)}
            folderName={formik.values.name}
            initialValue={clientData?.id == '' ? '' : clientData?.avatar}
          />
          <Grid container spacing={3}>
            <Grid xs={12} md={6}>
              <TextField
                select
                fullWidth
                label={t('clients.clientType')}
                name="type"
                disabled={formik.isSubmitting}
                value={formik.values.type || ''}
                onChange={formik.handleChange} // Use onChange for handling selection
                error={!!(formik.touched.type && formik.errors.type)}
                helperText={formik.touched.type && formik.errors.type}
              >
                {clientTypes.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.name} {/* Display human-readable name */}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid xs={12} md={6}>
              <TextField
                select
                fullWidth
                label={t('clients.clientStatus')}
                name="status"
                disabled={formik.isSubmitting}
                value={formik.values.status}
                onChange={formik.handleChange} // Use onChange for handling selection
                error={!!(formik.touched.status && formik.errors.status)}
                helperText={formik.touched.status && formik.errors.status}
              >
                {clientStatuses.map((status: ClientStatus) => (
                  <MenuItem
                    key={status.id} value={status.id}
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
                disabled={formik.isSubmitting}
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
                disabled={formik.isSubmitting}
              />
            </Grid>
            <Grid xs={12} md={6}>
              <LocationAutocomplete
                label={t('clients.clientAddress1')}
                onAddressSelected={(e: any) => {
                  formik.setFieldValue('address_1', transliterateCyrillicToLatin(e.matching_place_name));
                }}
                ref={autocompleteRef_1}
                initialValue={clientData?.id == '' ? '' : clientData?.address_1}
              />
            </Grid>
            <Grid xs={12} md={6}>
              <LocationAutocomplete
                label={t('clients.clientAddress2')}
                onAddressSelected={(e: any) => {
                  formik.setFieldValue('address_2', transliterateCyrillicToLatin(e.matching_place_name));
                }}
                ref={autocompleteRef_2}
                initialValue={clientData?.id == '' ? '' : clientData?.address_2}
              />

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
                disabled={formik.isSubmitting}
              />
            </Grid>
            <Grid xs={12} md={6}>
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
                disabled={formik.isSubmitting}
              />
            </Grid>
          </Grid>
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
            </Stack>
          </Stack>
        </CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          flexWrap="wrap"
          spacing={3}
          sx={{ p: 3 }}
        >
          <LoadingButton
            disabled={formik.isSubmitting || !formik.dirty || !formik.isValid}
            type="submit"
            variant="contained"
            loading={formik.isSubmitting}
          >
            {t('clients.clientSave')}
          </LoadingButton>
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

