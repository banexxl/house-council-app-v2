'use client';

import { useCallback, useState } from 'react';
import { useFormik } from 'formik';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'src/hooks/use-router';
import { paths } from 'src/paths';
import { FileDropzone } from 'src/components/file-dropzone';
import type { File } from 'src/components/file-dropzone';
import { apartmentInitialValues, apartmentValidationSchema, type Apartment } from 'src/types/apartment';
import { createApartment, updateApartment } from 'src/app/actions/apartment/apartment-actions';
import { uploadImagesAndGetUrls } from 'src/libs/supabase/sb-storage';
import { Building } from 'src/types/building';
import { UserDataCombined } from 'src/libs/supabase/server-auth';

interface ApartmentCreateFormProps {
  apartmentData?: Apartment;
  userData: UserDataCombined;
  buildings: Building[];
}

export const ApartmentCreateForm = ({ apartmentData, userData, buildings }: ApartmentCreateFormProps) => {
  const router = useRouter();
  const { t } = useTranslation();
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | undefined>(undefined);

  const formik = useFormik<Apartment>({
    initialValues: apartmentData ? apartmentData : apartmentInitialValues,
    validationSchema: apartmentValidationSchema,
    onSubmit: async (values, helpers) => {
      helpers.setSubmitting(true); // manually set submitting state

      try {
        let response;
        if (apartmentData?.id) {
          response = await updateApartment(apartmentData.id, values);
        } else {
          response = await createApartment(values);
        }

        if (!response.success) {
          toast.error(response.error || 'Error');
          return;
        }

        toast.success(t('common.actionSaveSuccess'));
        router.push(paths.dashboard.apartments.index + '/' + (apartmentData?.id ?? response.data?.id));
      } catch (error) {
        toast.error('Unexpected error');
      } finally {
        helpers.setSubmitting(false); // clear submitting state
      }
    }
  });

  const handleImageUpload = useCallback(async (newFiles: File[]) => {
    setUploadProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      if (progress <= 95) setUploadProgress(progress);
    }, 200);

    const upload = await uploadImagesAndGetUrls(
      newFiles,
      userData.client?.name!,
      buildings[0].building_location?.city + ' ' + buildings[0].building_location?.street_address,
      apartmentData?.id || ''
    );

    clearInterval(interval);
    setUploadProgress(100);
    setTimeout(() => setUploadProgress(undefined), 500);

    if (upload.success && upload.urls) {
      const newImages = upload.urls.map((url) => ({ image_url: url, is_cover_image: false }));
      formik.setFieldValue('apartment_images', [...(formik.values.apartment_images || []), ...newImages]);
    } else {
      toast.error(t('common.actionUploadError'));
    }
  }, [apartmentData?.id, buildings, userData.client?.name, formik, t]);

  return (
    <form onSubmit={formik.handleSubmit}>
      <Stack spacing={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>{t('common.formBasicInfo')}</Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label={t('buildings.buildingList')}
                  select
                  name="building_id"
                  value={formik.values.building_id}
                  onChange={formik.handleChange}
                >
                  {buildings?.map((building) => (
                    <MenuItem key={building.id} value={building.id}>
                      {building.building_location?.city} - {building.building_location?.street_address} - {building.building_location?.street_number}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label={t('apartments.lblApartmentNumber')}
                  name="apartment_number"
                  value={formik.values.apartment_number}
                  type="number"
                  onChange={(e) => {
                    // Update formik value directly with raw input
                    formik.setFieldValue("apartment_number", e.target.value);
                  }}
                  onBlur={() => {
                    // On blur, sanitize and cast to integer
                    const value = parseInt(String(formik.values.apartment_number), 10);
                    formik.setFieldValue("apartment_number", isNaN(value) ? '' : value);
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label={t('apartments.lblFloor')}
                  name="floor"
                  value={formik.values.floor}
                  onChange={(e) => {
                    formik.setFieldValue("floor", e.target.value);
                  }}
                  onBlur={() => {
                    const value = parseInt(String(formik.values.floor), 10);
                    formik.setFieldValue("floor", isNaN(value) ? '' : value);
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label={t('apartments.lblSizeM2')}
                  name="square_meters"
                  value={formik.values.square_meters}
                  onChange={(e) => {
                    formik.setFieldValue("square_meters", e.target.value);
                  }}
                  onBlur={() => {
                    const value = parseInt(String(formik.values.square_meters), 10);
                    formik.setFieldValue("square_meters", isNaN(value) ? '' : value);
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label={t('apartments.lblRooms')}
                  name="room_count"
                  value={formik.values.room_count}
                  onChange={(e) => {
                    formik.setFieldValue("room_count", e.target.value);
                  }}
                  onBlur={() => {
                    const value = parseInt(String(formik.values.room_count), 10);
                    formik.setFieldValue("room_count", isNaN(value) ? '' : value);
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  label={t('apartments.lblType')}
                  name="apartment_type"
                  value={formik.values.apartment_type}
                  onChange={formik.handleChange}
                >
                  {['residential',
                    'business',
                    'mixed_use',
                    'vacation',
                    'storage',
                    'garage',
                    'utility'].map((option) => (
                      <MenuItem key={option} value={option}>
                        {option === 'residential' && t('apartments.lblResidential')}
                        {option === 'business' && t('apartments.lblBusiness')}
                        {option === 'mixed_use' && t('apartments.lblMixedUse')}
                        {option === 'vacation' && t('apartments.lblVacation')}
                        {option === 'storage' && t('apartments.lblStorage')}
                        {option === 'garage' && t('apartments.lblGarage')}
                        {option === 'utility' && t('apartments.lblUtility')}
                      </MenuItem>
                    ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  label={t('apartments.lblRentalStatus')}
                  name="rental_status"
                  value={formik.values.rental_status}
                  onChange={formik.handleChange}
                >
                  {['owned', 'rented', 'for_rent', 'vacant'].map((option) => (
                    <MenuItem key={option} value={option}>
                      {option === 'owned' && t('apartments.lblOwned')}
                      {option === 'rented' && t('apartments.lblRented')}
                      {option === 'for_rent' && t('apartments.lblForRent')}
                      {option === 'vacant' && t('apartments.lblVacant')}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label={t('apartments.lblNotes')}
                  name="notes"
                  value={formik.values.notes}
                  onChange={formik.handleChange}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {apartmentData && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>{t('common.lblImages')}</Typography>
              <FileDropzone
                entityId={apartmentData.id}
                accept={{ 'image/*': [] }}
                caption="(SVG, JPG, PNG or GIF up to 900x400)"
                onDrop={handleImageUpload}
                uploadProgress={uploadProgress}
                images={apartmentData.apartment_images || []}
              />
            </CardContent>
          </Card>
        )}

        <Stack direction="row" justifyContent="flex-end" spacing={2}>
          <Button color="inherit" onClick={() => router.back()}>
            {t('common.btnCancel')}
          </Button>
          <Button type="submit" variant="contained" loading={formik.isSubmitting}>
            {apartmentData ? t('common.btnUpdate') : t('common.btnCreate')}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
};
