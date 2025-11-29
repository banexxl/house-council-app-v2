'use client';

import { useCallback, useEffect, useState } from 'react';
import { useFormik } from 'formik';
import {
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Tooltip
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'src/hooks/use-router';
import { paths } from 'src/paths';
import { FileDropzone } from 'src/components/file-dropzone';
import type { File, DBStoredImage } from 'src/components/file-dropzone';
import { apartmentInitialValues, apartmentValidationSchema, type Apartment, type ApartmentImage } from 'src/types/apartment';
import { createOrUpdateApartment } from 'src/app/actions/apartment/apartment-actions';
import { removeAllEntityFiles, removeEntityFile, setEntityFileAsCover, uploadEntityFiles } from 'src/libs/supabase/sb-storage';
import { Building } from 'src/types/building';
import { UserDataCombined } from 'src/libs/supabase/server-auth';
import { EntityFormHeader } from 'src/components/entity-form-header';

interface ApartmentCreateFormProps {
  apartmentData?: Apartment;
  userData: UserDataCombined;
  buildings: Building[];
}

export const ApartmentCreateForm = ({ apartmentData, userData: _userData, buildings }: ApartmentCreateFormProps) => {

  const router = useRouter();
  const { t } = useTranslation();
  const [uploadProgress, setUploadProgress] = useState<number | undefined>(undefined);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const [isHeaderNavigating, setIsHeaderNavigating] = useState(false);
  const [initialFormValues, setInitialFormValues] = useState<Apartment>(apartmentData ? { ...apartmentData } : apartmentInitialValues);

  useEffect(() => {
    if (apartmentData) {
      setInitialFormValues({ ...apartmentData });
    }
  }, [apartmentData]);

  const formik = useFormik<Apartment>({
    initialValues: initialFormValues,
    enableReinitialize: true,
    validationSchema: apartmentValidationSchema(t, apartmentData?.id),
    validateOnMount: false,
    onSubmit: async (values, helpers) => {
      helpers.setSubmitting(true); // manually set submitting state
      //Exclude building object from values
      delete (values as any).building;

      try {
        const response = await createOrUpdateApartment(values);

        if (!response.success) {
          toast.error(response.error || 'Error');
          return;
        }
        toast.success(t('common.actionSaveSuccess'));
        router.push(
          paths.dashboard.apartments.index + '/' + (response.data?.id)
        );
      } catch (error) {
        toast.error('Unexpected error');
      } finally {
        helpers.setSubmitting(false);
      }

    }
  });

  // Re-run validation if the underlying apartment data changes (does not mark fields as touched)
  useEffect(() => {
    if (apartmentData) {
      formik.validateForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apartmentData]);

  // Helper to decide when to show an error for a field
  const showFieldError = (name: keyof Apartment | string) => !!(formik.touched as any)[name] || formik.submitCount > 0;

  const handleImageUpload = useCallback(async (newFiles: File[]) => {
    if (!apartmentData?.id || !newFiles.length) {
      toast.error(t('common.actionUploadError'));
      return;
    }

    setUploadProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      if (progress <= 95) setUploadProgress(progress);
    }, 200);

    try {
      const upload = await uploadEntityFiles({
        entity: 'apartment-image',
        entityId: apartmentData.id,
        files: newFiles as unknown as globalThis.File[],
      });

      if (!upload.success || !upload.records) {
        toast.error(upload.error ?? t('common.actionUploadError'));
        return;
      }

      const existing = (formik.values.apartment_images || []).filter(
        (img): img is ApartmentImage => typeof img !== 'string'
      );
      const newImages = upload.records as unknown as ApartmentImage[];
      const appended = [...existing, ...newImages];
      formik.setFieldValue('apartment_images', appended);
      toast.success(t('common.actionSaveSuccess'));
    } catch (error) {
      toast.error(t('common.actionUploadError'));
    } finally {
      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(undefined), 500);
    }
  }, [apartmentData?.id, formik, t]);

  const handleFileRemoveAll = useCallback(async (): Promise<void> => {
    if (!formik.values.apartment_images?.length || !apartmentData?.id) return;

    try {

      const removeAllImagesResponse = await removeAllEntityFiles({
        entity: 'apartment-image',
        entityId: apartmentData.id,
      });

      if (!removeAllImagesResponse.success) {
        toast.error(t('common.actionDeleteError'));
        return;
      }

      // Clear local form state
      formik.setFieldValue('apartment_images', []);
      toast.success(t('common.actionDeleteSuccess'));

    } catch (error) {
      toast.error(t('common.actionDeleteError'));
    }
  }, [formik, apartmentData?.id, t]);

  return (
    <form onSubmit={formik.handleSubmit}>
      <Stack spacing={4}>
        <EntityFormHeader
          backHref={paths.dashboard.apartments.index}
          backLabel={t('apartments.apartmentList')}
          title={apartmentData
            ? `${t('apartments.apartmentEdit')}: ${apartmentData.apartment_number}`
            : t('apartments.apartmentCreate')}
          breadcrumbs={[
            { title: t('nav.adminDashboard'), href: paths.dashboard.index },
            { title: t('apartments.apartmentList'), href: paths.dashboard.apartments.index },
            {
              title: apartmentData
                ? `${t('apartments.apartmentEdit')}: ${apartmentData.apartment_number}`
                : t('apartments.apartmentCreate')
            }
          ]}
          actionComponent={
            <Button
              variant="contained"
              href={paths.dashboard.apartments.index}
              onClick={() => setIsHeaderNavigating(true)}
              disabled={isHeaderNavigating}
              startIcon={isHeaderNavigating ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {t('apartments.apartmentList')}
            </Button>
          }
        />
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
                  onChange={(e) => {
                    formik.handleChange(e);
                    if (!formik.touched.building_id) formik.setFieldTouched('building_id', true, false);
                  }}
                  onBlur={formik.handleBlur}
                  error={Boolean(formik.errors.building_id) && showFieldError('building_id')}
                  helperText={showFieldError('building_id') ? formik.errors.building_id : ''}
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
                  onChange={(e) => {
                    formik.handleChange(e);
                    if (!formik.touched.apartment_number) formik.setFieldTouched('apartment_number', true, false);
                  }}
                  onBlur={() => {
                    const trimmedValue = formik.values.apartment_number?.trim() ?? '';
                    formik.setFieldValue('apartment_number', trimmedValue);
                  }}
                  error={Boolean(formik.errors.apartment_number) && showFieldError('apartment_number')}
                  helperText={showFieldError('apartment_number') ? formik.errors.apartment_number : ''}
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
                  onChange={(e) => {
                    formik.handleChange(e);
                    if (!formik.touched.floor) formik.setFieldTouched('floor', true, false);
                  }}
                  onBlur={() => {
                    const value = parseInt(String(formik.values.floor), 10);
                    formik.setFieldValue('floor', isNaN(value) ? '' : value);
                  }}
                  error={Boolean(formik.errors.floor) && showFieldError('floor')}
                  helperText={showFieldError('floor') ? formik.errors.floor : ''}
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
                    formik.handleChange(e);
                    if (!formik.touched.square_meters) formik.setFieldTouched('square_meters', true, false);
                  }}
                  onBlur={() => {
                    const value = parseInt(String(formik.values.square_meters), 10);
                    formik.setFieldValue('square_meters', isNaN(value) ? '' : value);
                  }}
                  error={Boolean(formik.errors.square_meters) && showFieldError('square_meters')}
                  helperText={showFieldError('square_meters') ? formik.errors.square_meters : ''}
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
                  onChange={(e) => {
                    formik.handleChange(e); // update value
                    // mark as touched immediately so validation messages appear without waiting for blur
                    if (!formik.touched.room_count) {
                      formik.setFieldTouched('room_count', true, false);
                    }
                  }}
                  error={Boolean(formik.errors.room_count) && showFieldError('room_count')}
                  helperText={showFieldError('room_count') ? formik.errors.room_count : ''}
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
                  onChange={(e) => {
                    formik.handleChange(e);
                    if (!formik.touched.apartment_type) formik.setFieldTouched('apartment_type', true, false);
                  }}
                  error={Boolean(formik.errors.apartment_type) && showFieldError('apartment_type')}
                  helperText={showFieldError('apartment_type') ? formik.errors.apartment_type : ''}
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
                  onChange={(e) => {
                    formik.handleChange(e);
                    if (!formik.touched.apartment_status) formik.setFieldTouched('apartment_status', true, false);
                  }}
                  error={Boolean(formik.errors.apartment_status) && showFieldError('apartment_status')}
                  helperText={showFieldError('apartment_status') ? formik.errors.apartment_status : ''}
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
                  onChange={(e) => {
                    // Only update the field value without triggering validation
                    formik.setFieldValue('notes', e.target.value, false);
                  }}
                  onBlur={() => {
                    // Trigger validation only on blur
                    formik.setFieldTouched('notes', true, true);
                  }}
                  error={Boolean(formik.errors.notes) && showFieldError('notes')}
                  helperText={showFieldError('notes') ? formik.errors.notes : ''}
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
                onRemoveImage={async (image: DBStoredImage) => {
                  if (!apartmentData?.id) {
                    toast.error(t('common.actionDeleteError'));
                    return;
                  }
                  const result = await removeEntityFile({
                    entity: 'apartment-image',
                    entityId: apartmentData.id,
                    storagePathOrUrl: image.storage_path,
                  });
                  if (!result.success) {
                    toast.error(result.error ?? t('common.actionDeleteError'));
                    return;
                  }
                  const remaining = (formik.values.apartment_images || []).filter(
                    (img): img is ApartmentImage => typeof img !== 'string' && img.id !== image.id
                  );
                  formik.setFieldValue('apartment_images', remaining);
                  toast.success(t('common.actionDeleteSuccess'));
                }}
                onRemoveAll={handleFileRemoveAll}
                accept={{ 'image/*': [] }}
                caption="(SVG, JPG, PNG or GIF up to 900x400)"
                onDrop={handleImageUpload}
                uploadProgress={uploadProgress}
                images={((formik.values.apartment_images || []).filter(
                  (img): img is ApartmentImage => typeof img !== 'string'
                )) as unknown as import('src/components/file-dropzone').DBStoredImage[]}
                onSetAsCover={async (image) => {
                  if (!apartmentData?.id) {
                    throw new Error(t('common.actionSaveError'));
                  }
                  const result = await setEntityFileAsCover({
                    entity: 'apartment-image',
                    entityId: apartmentData.id,
                    fileId: image.id,
                  });
                  if (!result.success) {
                    throw new Error(result.error ?? t('common.actionSaveError'));
                  }
                  const updated = (formik.values.apartment_images || []).map((img) => {
                    if (typeof img === 'string') return img;
                    return { ...img, is_cover_image: img.id === image.id };
                  });
                  formik.resetForm({
                    values: {
                      ...formik.values,
                      apartment_images: updated,
                    },
                  });
                }}
                disabled={formik.isSubmitting || !formik.values.building_id}
              />
            </CardContent>
          </Card>
        )}

        <Stack direction="row" justifyContent="flex-end" spacing={2}>
          <Button
            color="inherit"
            onClick={() => {
              if (isNavigatingBack) return;
              setIsNavigatingBack(true);
              router.push(paths.dashboard.apartments.index);
            }}
            disabled={formik.isSubmitting || !formik.values.building_id || isNavigatingBack}
            startIcon={isNavigatingBack ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {t('common.btnCancel')}
          </Button>
          <Tooltip
            title={
              !formik.isValid && formik.submitCount >= 0
                ? Object.values(formik.errors)
                  .flatMap((err) => (typeof err === 'string' ? [err] : Object.values(err as any)))
                  .filter(Boolean)
                  .map((err, idx) => <Typography key={idx} variant="caption">{err as string}</Typography>)
                : ''
            }
          >
            <span>
              <Button
                type="submit"
                variant="contained"
                loading={formik.isSubmitting}
                disabled={formik.isSubmitting || !formik.isValid || !formik.dirty}
              >
                {apartmentData ? t('common.btnUpdate') : t('common.btnCreate')}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>
    </form>
  );
};

