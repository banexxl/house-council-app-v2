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
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import OpacityIcon from '@mui/icons-material/Opacity';
import ElevatorIcon from '@mui/icons-material/Elevator';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import { buildingInitialValues, buildingValidationSchema, type Building } from 'src/types/building';
import type { File } from 'src/components/file-dropzone';
import { createBuilding } from 'src/app/actions/building/building-actions';
import { BaseEntity } from 'src/types/base-entity';
import { UserSessionCombined } from 'src/hooks/use-auth';
import { BuildingLocation } from 'src/types/location';
import { CustomAutocomplete } from 'src/components/autocomplete-custom';

type BuildingCreateFormProps = {
  buildingData?: Building
  buildingStatuses: BaseEntity[]
  userSession: UserSessionCombined
  locationData: BuildingLocation[]
}


export const BuildingCreateForm = ({ buildingData, buildingStatuses, locationData, userSession }: BuildingCreateFormProps) => {

  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const formik = useFormik({
    initialValues: buildingData ? buildingData : buildingInitialValues,
    validationSchema: buildingValidationSchema,
    onSubmit: async (values, helpers) => {
      setLoading(true);
      try {
        const { success } = await createBuilding({ ...values, client_id: userSession.client?.id! });
        if (!success) {
          toast.error('Something went wrong!');
          setLoading(false);
          return
        }

        setLoading(false);
        toast.success('Building created');
        // router.push(paths.dashboard.buildings.index);
      } catch (err: any) {
        setLoading(false);
        toast.error('Something went wrong!');
        helpers.setStatus(err.message);
        helpers.setSubmitting(false);
      }
    },
  });

  const handleFilesDrop = useCallback((newFiles: File[]): void => {
    setFiles((prev) => [...prev, ...newFiles]);
    const url = URL.createObjectURL(newFiles[0]); // simplify to single upload
    formik.setFieldValue('cover_image', url);
  }, [formik]);

  const handleFileRemove = useCallback((): void => {
    setFiles([]);
    formik.setFieldValue('cover_image', '');
  }, [formik]);

  const featureIcons: Record<string, JSX.Element> = {
    has_parking_lot: (
      <Tooltip title="Parking Lot">
        <DirectionsCarIcon sx={{ mr: 1 }} />
      </Tooltip>
    ),
    has_gas_heating: (
      <Tooltip title="Gas Heating">
        <WhatshotIcon sx={{ mr: 1 }} />
      </Tooltip>
    ),
    has_central_heating: (
      <Tooltip title="Central Heating">
        <AcUnitIcon sx={{ mr: 1 }} />
      </Tooltip>
    ),
    has_electric_heating: (
      <Tooltip title="Electric Heating">
        <BoltIcon sx={{ mr: 1 }} />
      </Tooltip>
    ),
    has_solar_power: (
      <Tooltip title="Solar Power">
        <SolarPowerIcon sx={{ mr: 1 }} />
      </Tooltip>
    ),
    has_bicycle_room: (
      <Tooltip title="Bicycle Room">
        <DirectionsBikeIcon sx={{ mr: 1 }} />
      </Tooltip>
    ),
    has_pre_heated_water: (
      <Tooltip title="Pre-Heated Water">
        <OpacityIcon sx={{ mr: 1 }} />
      </Tooltip>
    ),
    has_elevator: (
      <Tooltip title="Elevator">
        <ElevatorIcon sx={{ mr: 1 }} />
      </Tooltip>
    ),
    is_recently_built: (
      <Tooltip title="Recently Built">
        <HomeWorkIcon sx={{ mr: 1 }} />
      </Tooltip>
    ),
  };

  return (
    <form onSubmit={formik.handleSubmit}>
      <Stack spacing={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Search Address</Typography>
            <CustomAutocomplete<BuildingLocation>
              data={locationData}
              searchKey="street_address"
              label="Search Address"
              onValueChange={(id) => formik.setFieldValue('building_location', id)}
              renderOption={(item) => (
                <Box>
                  <Typography variant="body2">{item.country}</Typography>
                  <strong>{item.city}</strong> — {item.street_address} {item.street_number}
                </Box>
              )}
              getOptionLabel={(item) => `${item.city} — ${item.street_address} ${item.street_number}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6">Basic Info</Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              name="description"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.description}
              error={!!formik.touched.description && !!formik.errors.description}
              helperText={formik.touched.description && typeof formik.errors.description === 'string' ? formik.errors.description : undefined}
              sx={{ mt: 2 }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6">Features</Typography>
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
            <Typography variant="h6">Building Stats</Typography>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                type="number"
                label="Stories High"
                name="stories_high"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.stories_high}
              />
              <TextField
                type="number"
                label="Number of Apartments"
                name="number_of_apartments"
                onBlur={formik.handleBlur}
                onChange={formik.handleChange}
                value={formik.values.number_of_apartments}
              />
              <TextField
                label="Building Status"
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
                {buildingStatuses.map((option: BaseEntity) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Cover Image</Typography>
            <FileDropzone
              accept={{ 'image/*': [] }}
              caption="(SVG, JPG, PNG or GIF up to 900x400)"
              files={files}
              onDrop={handleFilesDrop}
              onRemoveAll={handleFileRemove}
              onRemove={handleFileRemove}
            />
            {formik.errors.cover_image && (
              <FormHelperText error>{formik.dirty}</FormHelperText>
            )}
          </CardContent>
        </Card>

        <Stack direction="row" justifyContent="flex-end" spacing={2}>
          <Button color="inherit" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!formik.isValid || !formik.dirty}
            loading={loading}>
            Create
          </Button>
        </Stack>
      </Stack>
    </form >
  );
};
