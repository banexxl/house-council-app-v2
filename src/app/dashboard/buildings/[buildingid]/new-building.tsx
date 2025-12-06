'use client'

import { useCallback, useState, useEffect } from 'react';
import { useFormik } from 'formik';
import {
  Button, Card, CardContent, Grid, Stack, Switch,
  TextField, Typography, FormControlLabel, FormHelperText, MenuItem,
  Box,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import toast from 'react-hot-toast';
import { FileDropzone } from 'src/components/file-dropzone';
import { useRouter } from 'src/hooks/use-router';
import { paths } from 'src/paths';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import BoltIcon from '@mui/icons-material/Bolt';
import SolarPowerIcon from '@mui/icons-material/SolarPower';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import OpacityIcon from '@mui/icons-material/Opacity';
import ElevatorIcon from '@mui/icons-material/Elevator';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import DeleteIcon from '@mui/icons-material/Delete';
import { buildingInitialValues, buildingValidationSchema, buildingStatusMap, type Building, type BuildingImage } from 'src/types/building';
import type { DBStoredImage, File } from 'src/components/file-dropzone';
import { createBuilding, deleteBuilding, updateBuilding } from 'src/app/actions/building/building-actions';
import { UserDataCombined } from 'src/libs/supabase/server-auth';
import { BuildingLocation } from 'src/types/location';
import { CustomAutocomplete } from 'src/components/autocomplete-custom';
import { PopupModal } from 'src/components/modal-dialog';
import { useTranslation } from 'react-i18next';
import { removeAllEntityFiles, removeEntityFile, setEntityFileAsCover, uploadEntityFiles } from 'src/libs/supabase/sb-storage';
import { EntityFormHeader } from 'src/components/entity-form-header';

type BuildingCreateFormProps = {
  buildingData?: Building
  userData: UserDataCombined
  locationData: BuildingLocation[]
}


export const BuildingCreateForm = ({ buildingData, locationData, userData }: BuildingCreateFormProps) => {

  const locationDataWithNoBuildingId = locationData.filter((location) => !location.building_id);
  const router = useRouter();
  const [initialFormValues, setInitialFormValues] = useState<Building>(buildingData ? { ...buildingData } : buildingInitialValues);
  const [open, setOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | undefined>(undefined);
  const [deletingBuilding, setDeletingBuilding] = useState(false);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const [isHeaderNavigating, setIsHeaderNavigating] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (buildingData) {
      setInitialFormValues({ ...buildingData });
    }
  }, [buildingData]);

  const formik = useFormik({
    initialValues: initialFormValues,
    enableReinitialize: true,
    validationSchema: buildingValidationSchema(t),
    validateOnMount: false,
    onSubmit: async (values, helpers) => {

      helpers.setSubmitting(true);
      try {
        if (buildingData && buildingData.id) {
          // ✏️ EDIT MODE
          const { success, error } = await updateBuilding(buildingData.id, {
            ...values,
            client_id: userData.client?.id! ? userData.client?.id! : userData.clientMember?.client_id!
          });

          if (!success) {
            toast.error(error!);
            formik.setSubmitting(false);
            return;
          }

          toast.success(t('common.actionSaveSuccess'));
          router.push(paths.dashboard.buildings.index + '/' + buildingData.id);
        } else {
          // ➕ CREATE MODE
          const { success, data, error } = await createBuilding({
            ...values,
            client_id: userData.client?.id ? userData.client.id : userData.clientMember?.client_id!
          });

          if (!success) {
            toast.error(error!);
            formik.setSubmitting(false);
            return;
          }

          toast.success(t('common.actionSaveSuccess'));
          router.push(paths.dashboard.buildings.index + '/' + data?.id);
        }
      } catch (err: any) {
        formik.setSubmitting(false);
        toast.error(err.message);
        helpers.setSubmitting(false);
      }
    }

  });

  // Re-run validation when editing entity changes, without marking fields touched
  useEffect(() => {
    if (buildingData) {
      formik.validateForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingData]);

  const showFieldError = (name: string) => !!(formik.touched as any)[name] || formik.submitCount > 0;

  const handleFilesDrop = useCallback(async (newFiles: File[]): Promise<void> => {
    if (!buildingData?.id || !newFiles.length) {
      toast.error(t('common.actionUploadError'));
      return;
    }

    let fakeProgress = 0;
    setUploadProgress(0);

    // Simulate gradual progress while uploading
    const interval = setInterval(() => {
      fakeProgress += 5;
      if (fakeProgress <= 99) {
        setUploadProgress(fakeProgress);
      }
    }, 300); // adjust speed here

    try {
      const uploadResponse = await uploadEntityFiles({
        entity: 'building-image',
        entityId: buildingData.id,
        files: newFiles as unknown as globalThis.File[],
        clientId: userData.client?.id ?? userData.clientMember?.client_id ?? undefined,
      });

      // Stop progress simulation
      clearInterval(interval);
      setUploadProgress(100);

      // Wait briefly before clearing
      setTimeout(() => {
        setUploadProgress(undefined);
      }, 700);

      if (!uploadResponse.success || !uploadResponse.records?.length) {
        toast.error(uploadResponse.error ?? t('common.actionUploadError'));
        return;
      }

      const existing = (formik.values.building_images || []).filter(
        (img): img is BuildingImage => typeof img !== 'string'
      );
      const appended = [...existing, ...(uploadResponse.records as unknown as BuildingImage[])];
      formik.setFieldValue('building_images', appended);
      toast.success(t('common.actionUploadSuccess'));
    } catch (error) {
      clearInterval(interval);
      setUploadProgress(undefined);
      toast.error(t('common.actionUploadError'));
    }
  }, [buildingData?.id, formik, t, userData.client?.id, userData.clientMember?.client_id]);

  const handleFileRemove = useCallback(async (filePath: string): Promise<void> => {
    try {
      if (!buildingData?.id) {
        toast.error(t('common.actionDeleteError'));
        return;
      }

      const result = await removeEntityFile({
        entity: 'building-image',
        entityId: buildingData.id,
        storagePathOrUrl: filePath,
      });

      if (!result.success) {
        toast.error(result.error ?? t('common.actionDeleteError'));
        return;
      }

      // Update local form state (UI)
      const newImages = (formik.values.building_images || []).filter((img) => {
        if (typeof img === 'string') {
          return img !== filePath;
        }
        return img.storage_path !== filePath;
      });
      formik.setFieldValue('building_images', newImages);
      toast.success(t('common.actionDeleteSuccess'));
    } catch (error) {
      toast.error(t('common.actionDeleteError'));
    }
  }, [formik, buildingData?.id, t]);

  const handleFileRemoveAll = useCallback(async (): Promise<void> => {
    if (!formik.values.building_images?.length || !buildingData?.id) return;

    try {
      const removeAllImagesResponse = await removeAllEntityFiles({
        entity: 'building-image',
        entityId: buildingData.id,
      });

      if (!removeAllImagesResponse.success) {
        toast.error(removeAllImagesResponse.error ?? t('common.actionDeleteError'));
        return;
      }

      // Clear local form state
      formik.setFieldValue('building_images', []);
      toast.success(t('common.actionDeleteSuccess'));

    } catch (error) {
      toast.error(t('common.actionDeleteError'));
    }
  }, [formik, buildingData?.id, t]);

  const handleDeleteBuilding = useCallback(async (buildingId: string): Promise<void> => {
    setDeletingBuilding(true);
    try {
      const { success, error } = await deleteBuilding(buildingId);

      if (!success) {
        toast.error(error ?? t('common.actionDeleteError'));
        setDeletingBuilding(false);
        return;
      }

      toast.success(t('common.actionDeleteSuccess'));
      router.push(paths.dashboard.buildings.index);
    } catch (error) {
      toast.error(t('common.actionDeleteError'));
      setDeletingBuilding(false);
    }
  }, [router, t]);

  const featureIcons: Record<string, JSX.Element> = {
    has_parking_lot: (
      <Tooltip title={t('common.lblHasParkingLot')}>
        <DirectionsCarIcon sx={{ mr: 1 }} />
      </Tooltip>
    ),
    has_gas_heating: (
      <Tooltip title={t('common.lblHasGasHeating')}>
        <WhatshotIcon sx={{ mr: 1 }} />
      </Tooltip>
    ),
    has_central_heating: (
      <Tooltip title={t('common.lblHasCentralHeating')}>
        <AcUnitIcon sx={{ mr: 1 }} />
      </Tooltip>
    ),
    has_electric_heating: (
      <Tooltip title={t('common.lblHasElectricHeating')}>
        <BoltIcon sx={{ mr: 1 }} />
      </Tooltip>
    ),
    has_solar_power: (
      <Tooltip title={t('common.lblHasSolarPower')}>
        <SolarPowerIcon sx={{ mr: 1 }} />
      </Tooltip>
    ),
    has_bicycle_room: (
      <Tooltip title={t('common.lblHasBicycleRoom')}>
        <DirectionsBikeIcon sx={{ mr: 1 }} />
      </Tooltip>
    ),
    has_pre_heated_water: (
      <Tooltip title={t('common.lblHasPreHeatedWater')}>
        <OpacityIcon sx={{ mr: 1 }} />
      </Tooltip>
    ),
    has_elevator: (
      <Tooltip title={t('common.lblHasElevator')}>
        <ElevatorIcon sx={{ mr: 1 }} />
      </Tooltip>
    ),
    is_recently_built: (
      <Tooltip title={t('common.lblRecentlyBuilt')}>
        <HomeWorkIcon sx={{ mr: 1 }} />
      </Tooltip>
    ),
    has_ground_floor_apartments: (
      <Tooltip title={t('common.lblHasGroundFloorApartments')}>
        <MeetingRoomIcon sx={{ mr: 1 }} />
      </Tooltip>
    )
  };

  return (
    <form onSubmit={formik.handleSubmit}>
      <Stack spacing={4}>
        <EntityFormHeader
          backHref={paths.dashboard.buildings.index}
          backLabel={t('buildings.buildingList')}
          title={buildingData
            ? `${t('buildings.buildingEdit')}: ${buildingData.building_location?.street_address ?? ''}`
            : t('buildings.buildingCreate')}
          breadcrumbs={[
            { title: t('nav.adminDashboard'), href: paths.dashboard.index },
            { title: t('buildings.buildingList'), href: paths.dashboard.buildings.index },
            {
              title: buildingData
                ? `${t('buildings.buildingEdit')}: ${buildingData.building_location?.street_address ?? ''}`
                : t('buildings.buildingCreate')
            }
          ]}
          actionComponent={
            buildingData?.id ? (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                <Button
                  variant="contained"
                  href={paths.dashboard.buildings.index}
                  onClick={() => setIsHeaderNavigating(true)}
                  disabled={isHeaderNavigating || isCreatingNew}
                  startIcon={isHeaderNavigating ? <CircularProgress size={16} color="inherit" /> : undefined}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  {t('buildings.buildingList')}
                </Button>
                <Button
                  variant="outlined"
                  href={paths.dashboard.buildings.new}
                  onClick={() => setIsCreatingNew(true)}
                  disabled={isHeaderNavigating || isCreatingNew}
                  startIcon={isCreatingNew ? <CircularProgress size={16} color="inherit" /> : undefined}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  {t('buildings.buildingCreate')}
                </Button>
              </Stack>
            ) : (
              <Button
                variant="contained"
                href={paths.dashboard.buildings.index}
                onClick={() => setIsHeaderNavigating(true)}
                disabled={isHeaderNavigating}
                startIcon={isHeaderNavigating ? <CircularProgress size={16} color="inherit" /> : undefined}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {t('buildings.buildingList')}
              </Button>
            )
          }
        />

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>{t('locations.searchLocationLabel')}</Typography>
            <CustomAutocomplete<BuildingLocation>
              data={locationDataWithNoBuildingId}
              selectedItem={
                buildingData?.building_location?.id === formik.values.building_location?.id!
                  ? buildingData?.building_location
                  : undefined  // Only pass `undefined` when no match
              }
              searchKey="street_address"
              label={locationData.length > 0 ? t('locations.searchLocationLabel') : t('locations.addLocationsFirstLabel')}
              onValueChange={(id) => formik.setFieldValue('building_location', locationData.find(item => item.id === id))}
              renderOption={(item) => (
                <Box>
                  <Typography variant="body2">{item.country}</Typography>
                  <strong>{item.city}</strong> — {item.street_address} {item.street_number}
                </Box>
              )}
              getOptionLabel={(item) => `${item.city} — ${item.street_address} ${item.street_number}`}
              disabled={!locationDataWithNoBuildingId || formik.values.id !== ''}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>{t('common.formBasicInfo')}</Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              label={t('common.lblDescription')}
              name="description"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.description}
              error={Boolean(formik.errors.description) && showFieldError('description')}
              helperText={showFieldError('description') ? formik.errors.description : ''}
              sx={{ mt: 2 }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>{t('common.formAdvancedInfo')}</Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {Object.keys(featureIcons).map((key) => (
                <Grid key={key} size={{ xs: 12, sm: 6, md: 4 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        name={key}
                        checked={formik.values[key as keyof Building] as boolean}
                        onChange={formik.handleChange}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {featureIcons[key]}
                        {key.replaceAll('_', ' ').replace(/^./, (m) => m.toUpperCase())}
                      </Box>
                    }
                  />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>{t('buildings.buildingStats')}</Typography>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                type="number"
                label={t('buildings.buildingStories')}
                name="stories_high"
                fullWidth
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  const rounded = Math.round(val);
                  const absolute = rounded < 0 ? Math.abs(rounded) : rounded;
                  formik.setFieldValue('stories_high', absolute);
                  formik.handleBlur(e);
                }}
                onChange={formik.handleChange}
                value={formik.values.stories_high}
                error={Boolean(formik.errors.stories_high) && showFieldError('stories_high') && formik.errors.stories_high !== t('buildings.yupBuildingNumberOfApartmentsMaxCheck')}
                helperText={showFieldError('stories_high') && formik.errors.stories_high !== t('buildings.yupBuildingNumberOfApartmentsMaxCheck') ? formik.errors.stories_high : ''}
              />

              <TextField
                type="number"
                label={t('buildings.numberOfApartments')}
                name="number_of_apartments"
                fullWidth
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  const rounded = Math.round(val);
                  const absolute = rounded < 0 ? Math.abs(rounded) : rounded;
                  formik.setFieldValue('number_of_apartments', absolute);
                  formik.handleBlur(e);
                }}
                onChange={formik.handleChange}
                value={formik.values.number_of_apartments}
                error={Boolean(formik.errors.number_of_apartments) && showFieldError('number_of_apartments')}
                helperText={showFieldError('number_of_apartments') ? formik.errors.number_of_apartments : ''}
              />

              <TextField
                type="number"
                label={t('common.lblMaximumApartmentsPerFloor')}
                name="max_apartments_per_floor"
                fullWidth
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  const rounded = Math.round(val);
                  const absolute = rounded < 0 ? Math.abs(rounded) : rounded;
                  formik.setFieldValue('max_apartments_per_floor', absolute);
                  formik.handleBlur(e);
                }}
                onChange={formik.handleChange}
                value={formik.values.max_apartments_per_floor}
                error={Boolean(formik.errors.max_apartments_per_floor) && showFieldError('max_apartments_per_floor')}
                helperText={showFieldError('max_apartments_per_floor') ? formik.errors.max_apartments_per_floor : ''}
              />

              <TextField
                label={t('common.lblStatus')}
                name="building_status"
                select
                fullWidth
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.building_status}
                error={Boolean(formik.errors.building_status) && showFieldError('building_status')}
                helperText={showFieldError('building_status') && typeof formik.errors.building_status === 'string' ? formik.errors.building_status : ''}
              >
                {Object.entries(buildingStatusMap).map(([value, resourceString]) => (
                  <MenuItem key={value} value={value}>
                    {t(resourceString)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </CardContent>
        </Card>

        {buildingData && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>{t('common.lblImages')}</Typography>
              <FileDropzone
                entityId={buildingData.id}
                accept={{ 'image/*': [] }}
                caption="(SVG, JPG, PNG or GIF up to 900x400)"
                onDrop={handleFilesDrop}
                onRemoveAll={handleFileRemoveAll}
                onRemoveImage={async (image: DBStoredImage) => {
                  if (!buildingData?.id) {
                    toast.error(t('common.actionDeleteError'));
                    return;
                  }
                  const result = await removeEntityFile({
                    entity: 'building-image',
                    entityId: buildingData.id,
                    storagePathOrUrl: image.storage_path,
                  });
                  if (!result.success) {
                    toast.error(result.error ?? t('common.actionDeleteError'));
                    return;
                  }
                  const nextImages = (formik.values.building_images || []).filter((img) => {
                    if (typeof img === 'string') {
                      return img !== image.storage_path;
                    }
                    return img.id !== image.id;
                  });
                  formik.setFieldValue('building_images', nextImages);
                  toast.success(t('common.actionDeleteSuccess'));
                }}
                uploadProgress={uploadProgress}
                images={((formik.values.building_images || []).filter(
                  (img): img is BuildingImage => typeof img !== 'string'
                )) as unknown as DBStoredImage[]}
                onSetAsCover={async (image: DBStoredImage) => {
                  if (!buildingData?.id) {
                    throw new Error(t('common.actionSaveError'));
                  }
                  const result = await setEntityFileAsCover({
                    entity: 'building-image',
                    entityId: buildingData.id,
                    fileId: image.id,
                  });
                  if (!result.success) {
                    throw new Error(result.error ?? 'Failed to set cover');
                  }
                  const updated = (formik.values.building_images || []).map((img) => {
                    if (typeof img === 'string') {
                      return img;
                    }
                    return { ...img, is_cover_image: img.id === image.id };
                  });
                  formik.setFieldValue('building_images', updated);
                }}
              />
              {formik.errors.building_images && (
                <FormHelperText error>{formik.dirty}</FormHelperText>
              )}
            </CardContent>
          </Card>
        )}

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 3 }}>
          {/* Left: Delete button (only if editing) */}
          {buildingData ? (
            <Button
              variant="contained"
              startIcon={<DeleteIcon />}
              loading={deletingBuilding}
              disabled={deletingBuilding}
              sx={{
                color: 'text.main',
                backgroundColor: 'error.main',
                '&:hover': {
                  backgroundColor: 'error.dark',
                },
              }}
              onClick={() => {
                setOpen(true);
              }}
            >
              {t('common.btnDelete')}
            </Button>
          ) : (
            <Box /> // Empty box to keep layout aligned if no Delete
          )}
          {/* Right: Cancel + Create/Update */}
          <Stack direction="row" spacing={2}>
            <Button
              color="inherit"
              onClick={() => {
                if (isNavigatingBack) return;
                setIsNavigatingBack(true);
                router.push(paths.dashboard.buildings.index);
              }}
              disabled={formik.isSubmitting || isNavigatingBack}
              startIcon={isNavigatingBack ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {t('common.btnCancel')}
            </Button>
            <Tooltip
              title={
                !formik.isValid && formik.submitCount >= 0
                  ? (
                    <Stack component="ol" spacing={0.5} sx={{ m: 0, pl: 2 }}>
                      {Object.values(formik.errors)
                        .flatMap((err) => (typeof err === 'string' ? [err] : Object.values(err as any)))
                        .filter(Boolean)
                        .map((err, idx) => (
                          <Typography component="li" key={idx} variant="caption">
                            {err as string}
                          </Typography>
                        ))}
                    </Stack>
                  )
                  : ''
              }
            >
              <span>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!formik.isValid || !formik.dirty}
                  loading={formik.isSubmitting}
                >
                  {buildingData ? t('common.btnUpdate') : t('common.btnCreate')}
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

      </Stack>
      <PopupModal
        isOpen={open}
        onClose={() => {
          setOpen(false)
        }}
        onConfirm={() => handleDeleteBuilding(buildingData?.id!)}
        title={'Are you sure you want to delete this building?'}
        type={'confirmation'}
      />
    </form >
  );
};
