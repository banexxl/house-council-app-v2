import type { FC } from 'react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { QuillEditor } from 'src/components/quill-editor';
import { useRouter } from 'src/hooks/use-router';
import { paths } from 'src/paths';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';
import { initialValues, validationSchema } from './building-options';
import { GoogleMaps } from './map-component'
import { Input } from '@mui/material';
import Image from 'next/image';

export const BuildingCreateForm: FC = (props) => {

          const router = useRouter();
          const [locationAddress, setLocationAddress] = useState()
          const [selectedImage, setSelectedImage] = useState(null);

          const handleImageChange = (event: any) => {
                    const file = event.target.files[0]; // Get the first selected file
                    if (file) {
                              const reader = new FileReader();
                              reader.onload = (e: any) => {
                                        setSelectedImage(e.target.result);
                                        formik.setFieldValue('image', e.target.result)
                              };

                              reader.readAsDataURL(file);
                    }
          };

          const formik = useFormik({
                    initialValues,
                    validationSchema,
                    onSubmit: async (values: any, helpers: any): Promise<void> => {
                              try {
                                        const buildingCreateResponse = await fetch('/api/buildings/buildings-api', {
                                                  method: 'POST',
                                                  headers: {
                                                            'Content-Type': 'application/json',
                                                            'Access-Control-Allow-Origin': '*',
                                                            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' // Set the content type to JSON
                                                  },
                                                  body: JSON.stringify(values), // Convert your data to JSON
                                        })

                                        if (buildingCreateResponse.ok) {
                                                  toast.success('Building added');
                                                  router.push(paths.dashboard.buildings.index);
                                        } else if (buildingCreateResponse.status === 409) {
                                                  const errorData = await buildingCreateResponse.json(); // Parse the error response
                                                  console.error(errorData);
                                                  toast.error('Building on that address already exists!');
                                                  helpers.setStatus({ success: false });
                                                  // helpers.setErrors({ submit: errorData.message }); // You can set specific error messages if needed
                                        } else {
                                                  const errorData = await buildingCreateResponse.json(); // Parse the error response
                                                  console.error(errorData);
                                                  toast.error('Something went wrong!');
                                                  helpers.setStatus({ success: false });
                                        }

                              } catch (err) {
                                        console.error(err);
                                        toast.error('Something went wrong!');
                                        helpers.setStatus({ success: false });
                                        //helpers.setErrors({ submit: err.message });
                                        helpers.setSubmitting(false);
                              }
                    },
          });

          // const handleFilesDrop = useCallback((newFile: File[]): void => {
          //           setSelectedImage(newFile)
          // }, []);

          const handleFileRemove = (): void => {
                    setSelectedImage(null);
          }

          const onMapAddressChange = (mapAddressProps: any) => {

                    formik.setFieldValue('lng', mapAddressProps.latLng.lng)
                    formik.setFieldValue('lat', mapAddressProps.latLng.lat)
                    setLocationAddress(mapAddressProps);
                    formik.setFieldValue('buildingAddress', mapAddressProps.address)
                    // const buildingAddressString = mapAddressProps.address as String
                    // const buildingAddressArray = buildingAddressString.split(',')
                    // formik.setFieldValue('country', buildingAddressArray[2])
                    // formik.setFieldValue('city', buildingAddressArray[1])
                    // const [street, streetNumber] = buildingAddressArray[0].split(/\s+(?=\d)/)
                    // formik.setFieldValue('street', street)
                    // formik.setFieldValue('streetNumber', streetNumber)
          }

          return (

                    <form
                              onSubmit={formik.handleSubmit}
                              {...props}
                    >

                              <Stack spacing={4}>
                                        {/*-------------------Basic info-------------------*/}
                                        <Card>
                                                  <Typography>
                                                            {`${JSON.stringify(formik.errors)}`}
                                                  </Typography>
                                                  <CardContent>
                                                            <Grid
                                                                      container
                                                                      spacing={3}
                                                            >
                                                                      <Grid
                                                                                xs={12}
                                                                                md={4}
                                                                      >
                                                                                <Typography variant="h6">Basic information</Typography>
                                                                      </Grid>
                                                                      <Grid
                                                                                xs={12}
                                                                                md={8}
                                                                      >
                                                                                <Stack spacing={3}>
                                                                                          <GoogleMaps onMapAddressChange={onMapAddressChange} />
                                                                                          <TextField
                                                                                                    fullWidth
                                                                                                    error={!!(formik.touched.buildingAddress && formik.errors.buildingAddress)}
                                                                                                    helperText={formik.touched.buildingAddress && formik.errors.buildingAddress}
                                                                                                    label="Building Address"
                                                                                                    name="buildingAddress"
                                                                                                    onBlur={formik.handleBlur}
                                                                                                    onChange={formik.handleChange}
                                                                                                    value={formik.values.buildingAddress}
                                                                                                    disabled
                                                                                          />
                                                                                          <TextField
                                                                                                    error={!!(formik.touched.region && formik.errors.region)}
                                                                                                    fullWidth
                                                                                                    label="Region"
                                                                                                    name="region"
                                                                                                    onBlur={formik.handleBlur}
                                                                                                    onChange={formik.handleChange}
                                                                                                    type="string"
                                                                                                    value={formik.values.region}
                                                                                          />
                                                                                          <Box>
                                                                                                    <Typography
                                                                                                              color="text.secondary"
                                                                                                              sx={{ mb: 2 }}
                                                                                                              variant="subtitle2"
                                                                                                    >
                                                                                                              Description
                                                                                                    </Typography>
                                                                                                    <QuillEditor
                                                                                                              onChange={(value: string): void => {
                                                                                                                        formik.setFieldValue('description', value);
                                                                                                              }}
                                                                                                              placeholder="Write something"
                                                                                                              sx={{ height: 400 }}
                                                                                                              value={formik.values.description}
                                                                                                    />

                                                                                          </Box>
                                                                                </Stack>
                                                                      </Grid>
                                                            </Grid>
                                                  </CardContent>
                                        </Card>
                                        {/*-------------------Image-------------------*/}
                                        <Card>
                                                  <CardContent>
                                                            <Grid
                                                                      container
                                                                      spacing={3}
                                                            >
                                                                      <Grid
                                                                                xs={12}
                                                                                md={4}
                                                                      >
                                                                                <Stack spacing={1}>
                                                                                          <Typography variant="h6">Images</Typography>
                                                                                          <Typography
                                                                                                    color="text.secondary"
                                                                                                    variant="body2"
                                                                                          >
                                                                                                    Images will appear in the store front of your website.
                                                                                          </Typography>
                                                                                </Stack>
                                                                      </Grid>
                                                                      <Box
                                                                                sx={{
                                                                                          display: 'flex',
                                                                                          flexDirection: 'column',
                                                                                          alignItems: 'center',
                                                                                          gap: '10px'
                                                                                }}
                                                                      >

                                                                                {
                                                                                          selectedImage ?
                                                                                                    <Image src={selectedImage}
                                                                                                              alt='sds'
                                                                                                              width={300}
                                                                                                              height={300}
                                                                                                              style={{
                                                                                                                        borderRadius: '10px',
                                                                                                                        cursor: 'pointer'
                                                                                                              }}
                                                                                                              onClick={() => handleFileRemove()}
                                                                                                    />
                                                                                                    :
                                                                                                    <InsertPhotoIcon
                                                                                                              color='primary'
                                                                                                              sx={{ width: '300px', height: '300px' }}
                                                                                                    />
                                                                                }

                                                                                <Button component="label"
                                                                                          variant="contained"
                                                                                          startIcon={<CloudUploadIcon />}
                                                                                          sx={{
                                                                                                    maxWidth: '150px'
                                                                                          }}

                                                                                >
                                                                                          Upload file
                                                                                          <Input
                                                                                                    type="file"
                                                                                                    inputProps={{ accept: 'image/*' }}
                                                                                                    sx={{
                                                                                                              clip: 'rect(0 0 0 0)',
                                                                                                              clipPath: 'inset(50%)',
                                                                                                              height: 1,
                                                                                                              overflow: 'hidden',
                                                                                                              position: 'absolute',
                                                                                                              bottom: 0,
                                                                                                              left: 0,
                                                                                                              whiteSpace: 'nowrap',
                                                                                                              width: 1,
                                                                                                    }}
                                                                                                    onInput={(e: any) => handleImageChange(e)}
                                                                                          />
                                                                                </Button>
                                                                                {/* <FileDropzone
                                                                                                    multiple={false}
                                                                                                    accept={{ 'image/*': [] }}
                                                                                                    caption="(SVG, JPG, PNG, or gif maximum 900x400)"
                                                                                                    files={files}
                                                                                                    onDrop={handleFilesDrop}
                                                                                                    onRemove={handleFileRemove}
                                                                                          /> */}
                                                                      </Box>
                                                            </Grid>
                                                  </CardContent>
                                        </Card>
                                        {/*-------------------Detailed information-------------------*/}
                                        <Card>
                                                  <CardContent>
                                                            <Grid
                                                                      container
                                                                      spacing={3}
                                                            >
                                                                      <Grid
                                                                                xs={12}
                                                                                md={4}
                                                                      >
                                                                                <Typography variant="h6">Detailed information</Typography>
                                                                      </Grid>
                                                                      <Grid
                                                                                xs={12}
                                                                                md={8}
                                                                                flexDirection={'row'}
                                                                                container
                                                                      >
                                                                                <Stack spacing={5}>
                                                                                          <Box>
                                                                                                    <FormControlLabel
                                                                                                              control={
                                                                                                                        <Switch
                                                                                                                                  value={formik.values.isRecentlyBuilt}
                                                                                                                                  name='isRecentlyBuilt'
                                                                                                                                  onChange={() => formik.setFieldValue('isRecentlyBuilt', !formik.values.isRecentlyBuilt)}
                                                                                                                        />
                                                                                                              }
                                                                                                              label="Is recently built"
                                                                                                    />
                                                                                          </Box><Box>
                                                                                                    <FormControlLabel
                                                                                                              control={
                                                                                                                        <Switch
                                                                                                                                  value={formik.values.hasOwnParkingLot}
                                                                                                                                  name='hasOwnParkingLot'
                                                                                                                                  onChange={() => formik.setFieldValue('hasOwnParkingLot', !formik.values.hasOwnParkingLot)}
                                                                                                                        />
                                                                                                              }
                                                                                                              label="Has own parking lot"
                                                                                                    />
                                                                                          </Box>
                                                                                          <Box>
                                                                                                    <FormControlLabel
                                                                                                              control={
                                                                                                                        <Switch
                                                                                                                                  value={formik.values.hasOwnElevator}
                                                                                                                                  name='hasOwnElevator'
                                                                                                                                  onChange={() => formik.setFieldValue('hasOwnElevator', !formik.values.hasOwnElevator)}
                                                                                                                        />
                                                                                                              }
                                                                                                              label="Has own elevator"
                                                                                                    />
                                                                                          </Box>
                                                                                          <Box>
                                                                                                    <FormControlLabel
                                                                                                              control={
                                                                                                                        <Switch
                                                                                                                                  value={formik.values.hasOwnBicycleRoom}
                                                                                                                                  name='hasOwnBicycleRoom'
                                                                                                                                  onChange={() => formik.setFieldValue('hasOwnBicycleRoom', !formik.values.hasOwnBicycleRoom)}
                                                                                                                        />
                                                                                                              }
                                                                                                              label="Has own bicycle room"
                                                                                                    />
                                                                                          </Box>
                                                                                </Stack>
                                                                                <Stack spacing={2}>
                                                                                          <TextField
                                                                                                    error={!!(formik.touched.storiesHigh && formik.errors.storiesHigh)}
                                                                                                    fullWidth
                                                                                                    label="Stories high"
                                                                                                    name="storiesHigh"
                                                                                                    onBlur={formik.handleBlur}
                                                                                                    onChange={formik.handleChange}
                                                                                                    type="number"
                                                                                                    value={formik.values.storiesHigh}
                                                                                          />
                                                                                </Stack>
                                                                      </Grid>
                                                            </Grid>
                                                  </CardContent>
                                        </Card>
                                        {/*-------------------Advanced information info-------------------*/}
                                        <Card>
                                                  <CardContent>
                                                            <Grid
                                                                      container
                                                                      spacing={3}
                                                            >
                                                                      <Grid
                                                                                xs={12}
                                                                                md={4}
                                                                      >
                                                                                <Typography variant="h6">Advanced information</Typography>
                                                                      </Grid>
                                                                      <Grid
                                                                                xs={12}
                                                                                md={8}
                                                                                flexDirection={'row'}
                                                                                container
                                                                      >
                                                                                <Stack spacing={2}>
                                                                                          <Box>
                                                                                                    <FormControlLabel
                                                                                                              control={
                                                                                                                        <Switch
                                                                                                                                  value={formik.values.hasGasHeating}
                                                                                                                                  name='hasGasHeating'
                                                                                                                                  onChange={() => formik.setFieldValue('hasGasHeating', !formik.values.hasGasHeating)}
                                                                                                                        />
                                                                                                              }
                                                                                                              label="Has gas heating"
                                                                                                              value={formik.values.hasGasHeating}
                                                                                                              name='hasGasHeating'
                                                                                                    />
                                                                                          </Box><Box>
                                                                                                    <FormControlLabel
                                                                                                              control={
                                                                                                                        <Switch
                                                                                                                                  value={formik.values.hasCentralHeating}
                                                                                                                                  name='hasCentralHeating'
                                                                                                                                  onChange={() => formik.setFieldValue('hasCentralHeating', !formik.values.hasCentralHeating)}
                                                                                                                        />
                                                                                                              }
                                                                                                              label="Has central heating"
                                                                                                    />
                                                                                          </Box>
                                                                                          <Box>
                                                                                                    <FormControlLabel
                                                                                                              control={
                                                                                                                        <Switch
                                                                                                                                  value={formik.values.hasElectricHeating}
                                                                                                                                  name='hasElectricHeating'
                                                                                                                                  onChange={() => formik.setFieldValue('hasElectricHeating', !formik.values.hasElectricHeating)}
                                                                                                                        />
                                                                                                              }
                                                                                                              label="Has electrical heating"
                                                                                                    />
                                                                                          </Box>
                                                                                          <Box>
                                                                                                    <FormControlLabel
                                                                                                              control={
                                                                                                                        <Switch
                                                                                                                                  value={formik.values.hasSolarPower}
                                                                                                                                  name='hasSolarPower'
                                                                                                                                  onChange={() => formik.setFieldValue('hasSolarPower', !formik.values.hasSolarPower)}
                                                                                                                        />
                                                                                                              }
                                                                                                              label="Has solar power"
                                                                                                    />
                                                                                          </Box>
                                                                                          <Box>
                                                                                                    <FormControlLabel
                                                                                                              control={
                                                                                                                        <Switch
                                                                                                                                  value={formik.values.hasOwnWaterPump}
                                                                                                                                  name='hasOwnWaterPump'
                                                                                                                                  onChange={() => formik.setFieldValue('hasOwnWaterPump', !formik.values.hasOwnWaterPump)}
                                                                                                                        />
                                                                                                              }
                                                                                                              label="Has own water pump"
                                                                                                    />
                                                                                          </Box>
                                                                                </Stack>
                                                                      </Grid>
                                                            </Grid>
                                                  </CardContent>
                                        </Card>
                                        <Stack
                                                  alignItems="center"
                                                  direction="row"
                                                  justifyContent="flex-end"
                                                  spacing={1}
                                        >
                                                  <Button color="inherit"
                                                            onClick={() => router.push(paths.dashboard.buildings.index)}
                                                  >
                                                            Cancel
                                                  </Button>
                                                  <Button
                                                            type="submit"
                                                            variant="contained"
                                                  >
                                                            Create
                                                  </Button>
                                        </Stack>
                              </Stack>
                    </form >


          );
};
