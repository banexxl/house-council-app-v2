import type { FC } from 'react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Unstable_Grid2';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import type { File } from 'src/components/file-dropzone';
import { FileDropzone } from 'src/components/file-dropzone';
import { QuillEditor } from 'src/components/quill-editor';
import { useRouter } from 'src/hooks/use-router';
import { paths } from 'src/paths';
import { buildingCategoryOptions, initialValues, validationSchema } from './building-options';
import { GoogleMaps } from './map-component';
import Head from 'next/head';
import Script from 'next/script';

export const BuildingCreateForm: FC = (props) => {
          const router = useRouter();
          const [files, setFiles] = useState<File[]>([]);
          const formik = useFormik({
                    initialValues,
                    validationSchema,
                    onSubmit: async (values, helpers): Promise<void> => {
                              try {
                                        // NOTE: Make API request
                                        toast.success('Building created');
                                        router.push(paths.dashboard.buildings.index);
                              } catch (err) {
                                        console.error(err);
                                        toast.error('Something went wrong!');
                                        helpers.setStatus({ success: false });
                                        //helpers.setErrors({ submit: err.message });
                                        helpers.setSubmitting(false);
                              }
                    },
          });

          const handleFilesDrop = useCallback((newFiles: File[]): void => {
                    setFiles((prevFiles) => {
                              return [...prevFiles, ...newFiles];
                    });
          }, []);

          const handleFileRemove = useCallback((file: File): void => {
                    setFiles((prevFiles) => {
                              return prevFiles.filter((_file) => _file.path !== file.path);
                    });
          }, []);

          const handleFilesRemoveAll = useCallback((): void => {
                    setFiles([]);
          }, []);




          return (
                    <div>
                              <form
                                        onSubmit={formik.handleSubmit}
                                        {...props}
                              >


                                        <Stack spacing={4}>
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
                                                                                          <Typography variant="h6">Please add building address</Typography>
                                                                                </Grid>
                                                                                <Grid
                                                                                          xs={12}
                                                                                          md={8}
                                                                                >
                                                                                          <Stack spacing={3}>
                                                                                                    <GoogleMaps />
                                                                                                    <TextField
                                                                                                              error={!!(formik.touched.fullAddress && formik.errors.fullAddress)}
                                                                                                              fullWidth
                                                                                                              helperText={formik.touched.fullAddress && formik.errors.fullAddress}
                                                                                                              label="Building Address"
                                                                                                              name="fullAddress"
                                                                                                              onBlur={formik.handleBlur}
                                                                                                              onChange={formik.handleChange}
                                                                                                              value={formik.values.fullAddress}
                                                                                                    />

                                                                                                    <div>
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
                                                                                                                        value={formik.values.country}
                                                                                                              />

                                                                                                    </div>
                                                                                          </Stack>
                                                                                </Grid>
                                                                      </Grid>
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
                                                                                <Grid
                                                                                          xs={12}
                                                                                          md={8}
                                                                                >
                                                                                          <FileDropzone
                                                                                                    accept={{ 'image/*': [] }}
                                                                                                    caption="(SVG, JPG, PNG, or gif maximum 900x400)"
                                                                                                    files={files}
                                                                                                    onDrop={handleFilesDrop}
                                                                                                    onRemove={handleFileRemove}
                                                                                                    onRemoveAll={handleFilesRemoveAll}
                                                                                          />
                                                                                </Grid>
                                                                      </Grid>
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
                                                                                          <Typography variant="h6">Pricing</Typography>
                                                                                </Grid>
                                                                                <Grid
                                                                                          xs={12}
                                                                                          md={8}
                                                                                >
                                                                                          <Stack spacing={3}>
                                                                                                    <TextField
                                                                                                              error={!!(formik.touched.country && formik.errors.country)}
                                                                                                              fullWidth
                                                                                                              label="Old price"
                                                                                                              name="oldPrice"
                                                                                                              onBlur={formik.handleBlur}
                                                                                                              onChange={formik.handleChange}
                                                                                                              type="number"
                                                                                                              value={formik.values.country}
                                                                                                    />
                                                                                                    <TextField
                                                                                                              error={!!(formik.touched.country && formik.errors.country)}
                                                                                                              fullWidth
                                                                                                              label="New Price"
                                                                                                              name="newPrice"
                                                                                                              onBlur={formik.handleBlur}
                                                                                                              onChange={formik.handleChange}
                                                                                                              type="number"
                                                                                                              value={formik.values.country}
                                                                                                    />
                                                                                                    <div>
                                                                                                              <FormControlLabel
                                                                                                                        control={<Switch defaultChecked />}
                                                                                                                        label="Keep selling when stock is empty"
                                                                                                              />
                                                                                                    </div>
                                                                                          </Stack>
                                                                                </Grid>
                                                                      </Grid>
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
                                                                                          <Typography variant="h6">Category</Typography>
                                                                                </Grid>
                                                                                <Grid
                                                                                          xs={12}
                                                                                          md={8}
                                                                                >
                                                                                          <Stack spacing={3}>
                                                                                                    <TextField
                                                                                                              error={!!(formik.touched.country && formik.errors.country)}
                                                                                                              fullWidth
                                                                                                              label="Category"
                                                                                                              name="category"
                                                                                                              onBlur={formik.handleBlur}
                                                                                                              onChange={formik.handleChange}
                                                                                                              select
                                                                                                              value={formik.values.country}
                                                                                                    >
                                                                                                              {buildingCategoryOptions.map((option: any) => (
                                                                                                                        <MenuItem
                                                                                                                                  key={option.value}
                                                                                                                                  value={option.value}
                                                                                                                        >
                                                                                                                                  {option.label}
                                                                                                                        </MenuItem>
                                                                                                              ))}
                                                                                                    </TextField>
                                                                                                    <TextField
                                                                                                              disabled
                                                                                                              error={!!(formik.touched.country && formik.errors.country)}
                                                                                                              fullWidth
                                                                                                              label="Barcode"
                                                                                                              name="barcode"
                                                                                                              onBlur={formik.handleBlur}
                                                                                                              onChange={formik.handleChange}
                                                                                                              value={formik.values.country}
                                                                                                    />
                                                                                                    <TextField
                                                                                                              disabled
                                                                                                              error={!!(formik.touched.country && formik.errors.country)}
                                                                                                              fullWidth
                                                                                                              label="SKU"
                                                                                                              name="sku"
                                                                                                              onBlur={formik.handleBlur}
                                                                                                              onChange={formik.handleChange}
                                                                                                              value={formik.values.country}
                                                                                                    />
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
                                                            <Button color="inherit">Cancel</Button>
                                                            <Button
                                                                      type="submit"
                                                                      variant="contained"
                                                            >
                                                                      Create
                                                            </Button>
                                                  </Stack>
                                        </Stack>
                              </form>
                    </div>

          );
};
