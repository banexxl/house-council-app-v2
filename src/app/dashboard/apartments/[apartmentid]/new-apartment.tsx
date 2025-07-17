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
import { createOrUpdateApartment } from 'src/app/actions/apartment/apartment-actions';
import { removeAllImagesFromApartment, removeApartmentImageFilePath, setAsApartmentCoverImage, uploadApartmentImagesAndGetUrls } from 'src/libs/supabase/sb-storage';
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
  const [uploadProgress, setUploadProgress] = useState<number | undefined>(undefined);

  const formik = useFormik<Apartment>({
    initialValues: apartmentData ? apartmentData : apartmentInitialValues,
    validationSchema: apartmentValidationSchema(t, apartmentData?.id),
    onSubmit: async (values, helpers) => {
      helpers.setSubmitting(true); // manually set submitting state

      try {
        const response = await createOrUpdateApartment(values);

        if (!response.success) {
          toast.error(response.error || 'Error');
          return;
        }

        toast.success(t('common.actionSaveSuccess'));
        router.push(
          paths.dashboard.apartments.index + '/' + (values.id ?? response.data?.id)
        );
      } catch (error) {
        toast.error('Unexpected error');
      } finally {
        helpers.setSubmitting(false);
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

    const upload = await uploadApartmentImagesAndGetUrls(
      newFiles,
      userData.client?.name!,
      buildings[0].building_location?.city + ' ' + buildings[0].building_location?.street_address,
      apartmentData?.id || ''
    );

    clearInterval(interval);
    setUploadProgress(100);
    setTimeout(() => setUploadProgress(undefined), 500);

    if (upload.success && upload.urls) {
      const newImages = upload.urls.map((url) => url); // just strings

      formik.setFieldValue(
        'apartment_images',
        [...(formik.values.apartment_images || []), ...newImages]
      );
    } else {
      toast.error(t('common.actionUploadError'));
    }
  }, [apartmentData?.id, buildings, userData.client?.name, formik, t]);

  const handleFileRemove = useCallback(async (filePath: string): Promise<void> => {
    try {
      const { success, error } = await removeApartmentImageFilePath(apartmentData?.id!, filePath);

      if (!success) {
        toast.error(error ?? t('common.actionDeleteError'));
        return;
      }

      // Update local form state (UI)
      const newImages = formik.values.apartment_images!.filter((url) => url !== filePath);
      formik.setFieldValue('apartment_images', newImages);
      toast.success(t('common.actionDeleteSuccess'));
    } catch (error) {
      toast.error(t('common.actionDeleteError'));
    }
  }, [formik, apartmentData?.id]);

  const handleFileRemoveAll = useCallback(async (): Promise<void> => {
    if (!formik.values.apartment_images?.length || !apartmentData?.id) return;

    try {

      const removeAllImagesResponse = await removeAllImagesFromApartment(apartmentData.id);

      if (!removeAllImagesResponse.success) {
        toast.error(t('common.actionDeleteError'));
        return;
      }

      // Clear local form state
      formik.setFieldValue('building_images', []);
      toast.success(t('common.actionDeleteSuccess'));

    } catch (error) {
      toast.error(t('common.actionDeleteError'));
    }
  }, [formik, apartmentData?.id]);

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
                  onBlur={formik.handleBlur}
                  error={Boolean(formik.touched.building_id && formik.errors.building_id)}
                  helperText={formik.touched.building_id && formik.errors.building_id}
                  disabled={formik.isSubmitting || !!apartmentData?.id}
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
                  type="text"
                  value={formik.values.apartment_number}
                  onChange={formik.handleChange}
                  onBlur={() => {
                    const trimmedValue = formik.values.apartment_number?.trim() ?? '';
                    formik.setFieldValue("apartment_number", trimmedValue);
                    formik.setFieldTouched("apartment_number", true);
                  }}
                  error={Boolean(formik.touched.apartment_number && formik.errors.apartment_number)}
                  helperText={formik.touched.apartment_number && formik.errors.apartment_number}
                  disabled={formik.isSubmitting || !formik.values.building_id}
                />

              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label={t('apartments.lblFloor')}
                  name="floor"
                  value={formik.values.floor}
                  onChange={formik.handleChange}
                  onBlur={() => {
                    const value = parseInt(String(formik.values.floor), 10);
                    formik.setFieldValue("floor", isNaN(value) ? '' : value);
                    formik.setFieldTouched("floor", true);
                  }}
                  error={Boolean(formik.touched.floor && formik.errors.floor)}
                  helperText={formik.touched.floor && formik.errors.floor}
                  disabled={formik.isSubmitting || !formik.values.building_id}
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
                  disabled={formik.isSubmitting || !formik.values.building_id}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  slotProps={{
                    htmlInput: {
                      min: 0,
                      max: 8
                    }
                  }}
                  label={t('apartments.lblRooms')}
                  name="room_count"
                  value={formik.values.room_count}
                  onChange={formik.handleChange}
                  onBlur={() => {
                    const value = parseInt(String(formik.values.room_count), 10);
                    formik.setFieldValue("room_count", isNaN(value) ? '' : Math.min(8, Math.max(1, value)));
                    formik.setFieldTouched("room_count", true);
                  }}
                  error={Boolean(formik.touched.room_count && formik.errors.room_count)}
                  helperText={formik.touched.room_count && formik.errors.room_count}
                  disabled={formik.isSubmitting || !formik.values.building_id}
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
                  disabled={formik.isSubmitting || !formik.values.building_id}
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
                  name="apartment_status"
                  value={formik.values.apartment_status}
                  onChange={formik.handleChange}
                  disabled={formik.isSubmitting || !formik.values.building_id}
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
                  disabled={formik.isSubmitting || !formik.values.building_id}
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
                onRemoveImage={handleFileRemove}
                onRemoveAll={handleFileRemoveAll}
                accept={{ 'image/*': [] }}
                caption="(SVG, JPG, PNG or GIF up to 900x400)"
                onDrop={handleImageUpload}
                uploadProgress={uploadProgress}
                images={apartmentData.apartment_images || []}
                onSetAsCover={async (url) => {
                  const { success } = await setAsApartmentCoverImage(apartmentData.id!, url);
                  if (!success) throw new Error();
                }}
                disabled={formik.isSubmitting || !formik.values.building_id}
              />
            </CardContent>
          </Card>
        )}

        <Stack direction="row" justifyContent="flex-end" spacing={2}>
          <Button color="inherit" onClick={() => router.back()} disabled={formik.isSubmitting || !formik.values.building_id}>
            {t('common.btnCancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            loading={formik.isSubmitting}
            disabled={formik.isSubmitting || !formik.isValid || !formik.dirty}
          >
            {apartmentData ? t('common.btnUpdate') : t('common.btnCreate')}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
};

