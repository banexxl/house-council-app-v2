'use client'

import { useCallback, useState } from 'react';
import { useFormik } from 'formik';
import {
  Button, Card, CardContent, Grid, Stack, Switch,
  TextField, Typography, FormControlLabel, FormHelperText, MenuItem,
  Box,
  Tooltip
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
import { buildingInitialValues, buildingValidationSchema, statusMap, type Building } from 'src/types/building';
import type { File } from 'src/components/file-dropzone';
import { createBuilding, deleteBuilding, updateBuilding } from 'src/app/actions/building/building-actions';
import { BaseEntity } from 'src/types/base-entity';
import { UserDataCombined } from 'src/libs/supabase/server-auth';
import { BuildingLocation } from 'src/types/location';
import { CustomAutocomplete } from 'src/components/autocomplete-custom';
import { PopupModal } from 'src/components/modal-dialog';
import { useTranslation } from 'react-i18next';
import { removeAllImagesFromBuilding, removeBuildingImageFilePath, uploadImagesAndGetUrls } from 'src/libs/supabase/sb-storage';

type BuildingCreateFormProps = {
  buildingData?: Building
  userData: UserDataCombined
  locationData: BuildingLocation[]
}


export const BuildingCreateForm = ({ buildingData, locationData, userData }: BuildingCreateFormProps) => {

  const locationDataWithNoBuildingId = locationData.filter((location) => !location.building_id);
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [open, setOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | undefined>(undefined);
  const { t } = useTranslation();

  const formik = useFormik({
    initialValues: buildingData ? buildingData : buildingInitialValues,
    validationSchema: buildingValidationSchema(t),
    onSubmit: async (values, helpers) => {

      helpers.setSubmitting(true);
      try {
        if (buildingData && buildingData.id) {
          // ✏️ EDIT MODE
          const { success, error } = await updateBuilding(buildingData.id, {
            ...values,
            client_id: userData.client?.id!
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
            client_id: userData.client?.id!
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

  const handleFilesDrop = useCallback(async (newFiles: File[]): Promise<void> => {

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
      // Start upload
      const uploadResponse = await uploadImagesAndGetUrls(
        newFiles,
        userData.client?.name!,
        buildingData?.building_location?.city! + ' ' + buildingData?.building_location?.street_address! + ' ' + buildingData?.building_location?.street_number,
        buildingData?.id!
      );

      // Stop progress simulation
      clearInterval(interval);
      setUploadProgress(100);

      // Wait briefly before clearing
      setTimeout(() => {
        setUploadProgress(undefined);
      }, 700);

      if (uploadResponse.success) {
        setFiles((prev) => [...prev, ...newFiles]);
        formik.setFieldValue('building_images', uploadResponse.urls);
        toast.success(t('common.actionUploadSuccess'));
      } else {
        toast.error(t('common.actionUploadError'));
      }
    } catch (error) {
      clearInterval(interval);
      setUploadProgress(undefined);
      toast.error(t('common.actionUploadError'));
    }
  }, [formik, userData.client?.name]);

  const handleFileRemove = useCallback(async (filePath: string): Promise<void> => {
    try {
      const { success, error } = await removeBuildingImageFilePath(buildingData?.id!, filePath);

      if (!success) {
        toast.error(error ?? t('common.actionDeleteError'));
        return;
      }

      // Update local form state (UI)
      const newImages = formik.values.building_images!.filter((url: {
        image_url: string;
        is_cover_image: boolean;
      }) => url.image_url !== filePath);
      formik.setFieldValue('building_images', newImages);
      toast.success(t('common.actionDeleteSuccess'));
    } catch (error) {
      toast.error(t('common.actionDeleteError'));
    }
  }, [formik, buildingData?.id]);

  const handleFileRemoveAll = useCallback(async (): Promise<void> => {
    if (!formik.values.building_images?.length || !buildingData?.id) return;

    try {

      const removeAllImagesResponse = await removeAllImagesFromBuilding(buildingData.id);

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
  }, [formik, buildingData?.id]);

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

  const handleDeleteBuilding = async (buildingId: string) => {

    try {
      const { success, data, error } = await deleteBuilding(buildingId);
      if (!success) {
        toast.error(error!);
        return
      }
      toast.success('Building deleted');
      router.push(paths.dashboard.buildings.index);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <form onSubmit={formik.handleSubmit}>
      <Stack spacing={4}>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>{t('locations.searchLocationLabel')}</Typography>
            <CustomAutocomplete<BuildingLocation>
              data={locationDataWithNoBuildingId}
              selectedItem={formik.values.building_location?.id ? locationData.find(item => item.id === formik.values.building_location?.id) : undefined}
              searchKey="street_address"
              label={t('locations.searchLocationLabel')}
              onValueChange={(id) => formik.setFieldValue('building_location', locationData.find(item => item.id === id))}
              renderOption={(item) => (
                <Box>
                  <Typography variant="body2">{item.country}</Typography>
                  <strong>{item.city}</strong> — {item.street_address} {item.street_number}
                </Box>
              )}
              getOptionLabel={(item) => `${item.city} — ${item.street_address} ${item.street_number}`}
              disabled={!!buildingData}
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
              error={!!formik.touched.description && !!formik.errors.description}
              helperText={formik.touched.description && formik.errors.description}
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
                  formik.handleBlur(e); // ✅ ensures touched state is updated
                }}
                onChange={formik.handleChange}
                value={formik.values.stories_high}
                error={!!formik.touched.stories_high && !!formik.errors.stories_high}
                helperText={formik.touched.stories_high && formik.errors.stories_high}
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
                error={!!formik.touched.number_of_apartments && !!formik.errors.number_of_apartments}
                helperText={formik.touched.number_of_apartments && formik.errors.number_of_apartments}
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
                error={!!formik.touched.max_apartments_per_floor && !!formik.errors.max_apartments_per_floor}
                helperText={formik.touched.max_apartments_per_floor && formik.errors.max_apartments_per_floor}
              />

              <TextField
                label={t('common.lblStatus')}
                name="building_status"
                select
                fullWidth
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.building_status}
                error={!!formik.touched.building_status && !!formik.errors.building_status}
                helperText={
                  formik.touched.building_status && typeof formik.errors.building_status === 'string'
                    ? formik.errors.building_status
                    : undefined
                }
              >
                {Object.entries(statusMap).map(([value, resourceString]) => (
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
                onRemoveImage={handleFileRemove}
                uploadProgress={uploadProgress}
                images={buildingData.building_images || []}
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
            <Button color="inherit" onClick={() => router.back()}>
              {t('common.btnCancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!formik.isValid || !formik.dirty}
              loading={formik.isSubmitting}
            >
              {buildingData ? t('common.btnUpdate') : t('common.btnCreate')}
            </Button>
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
