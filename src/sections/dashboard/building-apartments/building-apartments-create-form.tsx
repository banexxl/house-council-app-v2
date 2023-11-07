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
import { initialValues, validationSchema } from './building-apartments-options';
import { Input } from '@mui/material';
import Image from 'next/image';

export const BuildingApartmentCreateForm: FC = (props) => {

          const router = useRouter();

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
                                        const buildingApartmentCreateResponse = await fetch('/api/building-apartments/apartments-api', {
                                                  method: 'POST',
                                                  headers: {
                                                            'Content-Type': 'application/json',
                                                            'Access-Control-Allow-Origin': '*',
                                                            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' // Set the content type to JSON
                                                  },
                                                  body: JSON.stringify(values), // Convert your data to JSON
                                        })

                                        if (buildingApartmentCreateResponse.ok) {
                                                  toast.success('Building apartment added');
                                                  router.push(paths.dashboard.buildingApartments.index);
                                        } else if (buildingApartmentCreateResponse.status === 409) {
                                                  const errorData = await buildingApartmentCreateResponse.json(); // Parse the error response
                                                  toast.error('Building apartment on that address already exists!');
                                                  helpers.setStatus({ success: false });
                                                  // helpers.setErrors({ submit: errorData.message }); // You can set specific error messages if needed
                                        } else {
                                                  const errorData = await buildingApartmentCreateResponse.json(); // Parse the error response
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

          return (
                    <Box>
                              <form
                                        onSubmit={formik.handleSubmit}
                                        {...props}
                              >

                                        <Stack spacing={4}>
                                                  <Card>
                                                            <CardContent>
                                                                      <Box
                                                                                sx={{ display: 'flex', justifyContent: 'space-between', maxWidth: '800px' }}

                                                                      >
                                                                                <Grid
                                                                                          xs={12}
                                                                                          md={4}
                                                                                >
                                                                                          <Typography variant="h6">Basic information</Typography>
                                                                                          <TextField
                                                                                                    error={!!(formik.touched.fullAddress && formik.errors.fullAddress)}
                                                                                                    fullWidth
                                                                                                    label="Full address"
                                                                                                    name="fullAddress"
                                                                                                    onBlur={formik.handleBlur}
                                                                                                    onChange={formik.handleChange}
                                                                                                    type="text"
                                                                                                    value={formik.values.fullAddress}
                                                                                          />
                                                                                </Grid>
                                                                                <Box
                                                                                          sx={{ display: 'flex', justifyContent: 'space-between' }}
                                                                                >
                                                                                          <Stack spacing={5}>
                                                                                                    <Box>
                                                                                                              <FormControlLabel
                                                                                                                        control={
                                                                                                                                  <Switch
                                                                                                                                            value={formik.values.smokingAllowed}
                                                                                                                                            name='smokingAllowed'
                                                                                                                                            onChange={() => formik.setFieldValue('smokingAllowed', !formik.values.smokingAllowed)}
                                                                                                                                  />
                                                                                                                        }
                                                                                                                        label="Smoking allowed"
                                                                                                              />
                                                                                                    </Box><Box>
                                                                                                              <FormControlLabel
                                                                                                                        control={
                                                                                                                                  <Switch
                                                                                                                                            value={formik.values.petFriendly}
                                                                                                                                            name='petFriendly'
                                                                                                                                            onChange={() => formik.setFieldValue('petFriendly', !formik.values.petFriendly)}
                                                                                                                                  />
                                                                                                                        }
                                                                                                                        label="Pet friendly"
                                                                                                              />
                                                                                                    </Box>
                                                                                                    <Box>
                                                                                                              <FormControlLabel
                                                                                                                        control={
                                                                                                                                  <Switch
                                                                                                                                            value={formik.values.hasOwnParking}
                                                                                                                                            name='hasOwnParking'
                                                                                                                                            onChange={() => formik.setFieldValue('hasOwnParking', !formik.values.hasOwnParking)}
                                                                                                                                  />
                                                                                                                        }
                                                                                                                        label="Has own parking"
                                                                                                              />
                                                                                                    </Box>
                                                                                                    <Box>
                                                                                                              <FormControlLabel
                                                                                                                        control={
                                                                                                                                  <Switch
                                                                                                                                            value={formik.values.furnished}
                                                                                                                                            name='furnished'
                                                                                                                                            onChange={() => formik.setFieldValue('furnished', !formik.values.furnished)}
                                                                                                                                  />
                                                                                                                        }
                                                                                                                        label="Furnished"
                                                                                                              />
                                                                                                    </Box>
                                                                                                    <Box>
                                                                                                              <FormControlLabel
                                                                                                                        control={
                                                                                                                                  <Switch
                                                                                                                                            value={formik.values.utilitiesIncluded}
                                                                                                                                            name='utilitiesIncluded'
                                                                                                                                            onChange={() => formik.setFieldValue('utilitiesIncluded', !formik.values.utilitiesIncluded)}
                                                                                                                                  />
                                                                                                                        }
                                                                                                                        label="Utilities included"
                                                                                                              />
                                                                                                    </Box>
                                                                                          </Stack>
                                                                                          <Stack spacing={2}>
                                                                                                    <TextField
                                                                                                              error={!!(formik.touched.apartmentNumber && formik.errors.apartmentNumber)}
                                                                                                              fullWidth
                                                                                                              label="Apartment number"
                                                                                                              name="apartmentNumber"
                                                                                                              onBlur={formik.handleBlur}
                                                                                                              onChange={formik.handleChange}
                                                                                                              type="number"
                                                                                                              value={formik.values.apartmentNumber}
                                                                                                    />
                                                                                                    <TextField
                                                                                                              error={!!(formik.touched.bathroomNumber && formik.errors.bathroomNumber)}
                                                                                                              fullWidth
                                                                                                              label="Bathroom number"
                                                                                                              name="bathroomNumber"
                                                                                                              onBlur={formik.handleBlur}
                                                                                                              onChange={formik.handleChange}
                                                                                                              type="number"
                                                                                                              value={formik.values.bathroomNumber}
                                                                                                    />
                                                                                                    <TextField
                                                                                                              error={!!(formik.touched.bedroomNumber && formik.errors.bedroomNumber)}
                                                                                                              fullWidth
                                                                                                              label="Bedroom number"
                                                                                                              name="bedroomNumber"
                                                                                                              onBlur={formik.handleBlur}
                                                                                                              onChange={formik.handleChange}
                                                                                                              type="number"
                                                                                                              value={formik.values.bedroomNumber}
                                                                                                    />
                                                                                                    <TextField
                                                                                                              error={!!(formik.touched.terraceNumber && formik.errors.terraceNumber)}
                                                                                                              fullWidth
                                                                                                              label="Terrace number"
                                                                                                              name="terraceNumber"
                                                                                                              onBlur={formik.handleBlur}
                                                                                                              onChange={formik.handleChange}
                                                                                                              type="number"
                                                                                                              value={formik.values.terraceNumber}
                                                                                                    />
                                                                                                    <TextField
                                                                                                              error={!!(formik.touched.surfaceArea && formik.errors.surfaceArea)}
                                                                                                              fullWidth
                                                                                                              label="Surface area"
                                                                                                              name="surfaceArea"
                                                                                                              onBlur={formik.handleBlur}
                                                                                                              onChange={formik.handleChange}
                                                                                                              type="number"
                                                                                                              value={formik.values.surfaceArea}
                                                                                                    />
                                                                                          </Stack>
                                                                                </Box>
                                                                      </Box>
                                                            </CardContent>
                                                  </Card>
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
                                                                                          flexDirection={'column'}
                                                                                          container
                                                                                >
                                                                                          <Stack spacing={5}>
                                                                                                    <Box>
                                                                                                              <TextField
                                                                                                                        error={!!(formik.touched.description && formik.errors.description)}
                                                                                                                        fullWidth
                                                                                                                        label="Description"
                                                                                                                        name="description"
                                                                                                                        onBlur={formik.handleBlur}
                                                                                                                        onChange={formik.handleChange}
                                                                                                                        type="text"
                                                                                                                        rows={5}
                                                                                                                        multiline
                                                                                                                        value={formik.values.description}
                                                                                                              />
                                                                                                    </Box>
                                                                                                    <Box>
                                                                                                              <TextField
                                                                                                                        error={!!(formik.touched.owners && formik.errors.owners)}
                                                                                                                        fullWidth
                                                                                                                        label="Owners"
                                                                                                                        name="owners"
                                                                                                                        onBlur={formik.handleBlur}
                                                                                                                        onChange={formik.handleChange}
                                                                                                                        type="text"
                                                                                                                        value={formik.values.owners}
                                                                                                              />
                                                                                                    </Box>
                                                                                                    <Box>
                                                                                                              <TextField
                                                                                                                        error={!!(formik.touched.tenants && formik.errors.tenants)}
                                                                                                                        fullWidth
                                                                                                                        label="Tenants"
                                                                                                                        name="tenants"
                                                                                                                        onBlur={formik.handleBlur}
                                                                                                                        onChange={formik.handleChange}
                                                                                                                        type="text"
                                                                                                                        value={formik.values.tenants}
                                                                                                              />
                                                                                                    </Box>
                                                                                                    <Box>
                                                                                                              <TextField
                                                                                                                        error={!!(formik.touched.status && formik.errors.status)}
                                                                                                                        fullWidth
                                                                                                                        label="Status"
                                                                                                                        name="status"
                                                                                                                        onBlur={formik.handleBlur}
                                                                                                                        onChange={formik.handleChange}
                                                                                                                        type="text"
                                                                                                                        value={formik.values.status}
                                                                                                              />
                                                                                                    </Box>
                                                                                                    <Box>
                                                                                                              <TextField
                                                                                                                        error={!!(formik.touched.updatedAt && formik.errors.updatedAt)}
                                                                                                                        fullWidth
                                                                                                                        label="Updated at"
                                                                                                                        name="updatedAt"
                                                                                                                        onBlur={formik.handleBlur}
                                                                                                                        onChange={formik.handleChange}
                                                                                                                        type="text"
                                                                                                                        value={formik.values.updatedAt}
                                                                                                              />
                                                                                                    </Box>
                                                                                                    <Box>
                                                                                                              <TextField
                                                                                                                        error={!!(formik.touched.createdAt && formik.errors.createdAt)}
                                                                                                                        fullWidth
                                                                                                                        label="Created at"
                                                                                                                        name="createdAt"
                                                                                                                        onBlur={formik.handleBlur}
                                                                                                                        onChange={formik.handleChange}
                                                                                                                        type="text"
                                                                                                                        value={formik.values.createdAt}
                                                                                                              />
                                                                                                    </Box>
                                                                                          </Stack>
                                                                                </Grid>
                                                                      </Grid>
                                                            </CardContent>
                                                  </Card>
                                                  <Card>
                                                            <CardContent>
                                                                      <Grid
                                                                                xs={12}
                                                                                md={4}
                                                                      >
                                                                                <Typography variant="h6">Images</Typography>

                                                                      </Grid>
                                                                      <Grid
                                                                                container
                                                                                spacing={3}
                                                                      >
                                                                                <Image src={''} alt={''} ></Image>
                                                                      </Grid>
                                                            </CardContent>
                                                  </Card>
                                        </Stack>
                              </form>
                    </Box>
          );
};
