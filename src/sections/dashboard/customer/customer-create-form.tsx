import type { FC } from 'react';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { File } from 'src/components/file-dropzone';
import { FileDropzone } from 'src/components/file-dropzone';
import { useRouter } from 'src/hooks/use-router';
import { paths } from 'src/paths';
import { customerSchema as validationSchema, Customer } from '@/types/customer';
import { RouterLink } from '@/components/router-link';
import FormControlLabel from '@mui/material/FormControlLabel';
import { Autocomplete, Box, Checkbox, FormControl, Input, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { Building } from '@/types/building';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment'
import { LocalizationProvider, MobileDatePicker } from '@mui/x-date-pickers';
import moment, { Moment } from 'moment';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';
import Image from 'next/image';

const initialValues: Customer = {
          avatar: '',
          email: '',
          firstName: '',
          lastName: '',
          phoneNumber: '',
          updatedDateTime: '',
          createdDateTime: '',
          dateOfBirth: '',
          isOwner: false,
          isSubtenant: false,
          permissionLevel: 0
};

export const CustomerCreateForm = (props: any) => {

          const router = useRouter();
          const [files, setFiles] = useState<File[]>([]);
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

          const handleFileRemove = (): void => {
                    setSelectedImage(null);
          }

          const formik = useFormik({
                    initialValues,
                    validationSchema,
                    onSubmit: async (values, helpers): Promise<void> => {
                              console.log('customer create values', values);

                              try {
                                        //API CALL
                                        const response = await fetch('/api/customers/customers-api', {
                                                  method: 'POST',
                                                  headers: {
                                                            'Content-Type': 'application/json',
                                                            'Access-Control-Allow-Origin': '*',
                                                            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' // Set the content type to JSON
                                                  },
                                                  body: JSON.stringify(values), // Convert your data to JSON
                                        });

                                        if (response.ok) {
                                                  toast.success('Customer added');
                                                  router.push(paths.dashboard.customers.index);
                                        } else if (response.status === 409) {
                                                  const errorData = await response.json(); // Parse the error response
                                                  console.error(errorData);
                                                  toast.error('User with this email already exists!');
                                                  helpers.setStatus({ success: false });
                                                  // helpers.setErrors({ submit: errorData.message }); // You can set specific error messages if needed
                                        } else {
                                                  const errorData = await response.json(); // Parse the error response
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

          const handleFilesDrop = useCallback((newFiles: File[]): void => {
                    setFiles((prevFiles) => {
                              return [...prevFiles, ...newFiles];
                    });
          }, []);

          return (
                    <form
                              onSubmit={formik.handleSubmit}
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
                                                                                md={6}
                                                                      >
                                                                                <Typography variant="h6">Basic details</Typography>
                                                                      </Grid>
                                                                      <Grid
                                                                                xs={12}
                                                                                md={8}
                                                                      >
                                                                                <Stack
                                                                                          spacing={3}
                                                                                          sx={{ mb: '10px' }}
                                                                                >
                                                                                          <TextField
                                                                                                    error={!!(formik.touched.firstName && formik.errors.firstName)}
                                                                                                    fullWidth
                                                                                                    helperText={formik.touched.firstName && formik.errors.firstName}
                                                                                                    label="First Name"
                                                                                                    name="firstName"
                                                                                                    onBlur={formik.handleBlur}
                                                                                                    onChange={formik.handleChange}
                                                                                                    value={formik.values.firstName}
                                                                                          />

                                                                                          <TextField
                                                                                                    error={!!(formik.touched.lastName && formik.errors.lastName)}
                                                                                                    fullWidth
                                                                                                    helperText={formik.touched.lastName && formik.errors.lastName}
                                                                                                    label="Last Name"
                                                                                                    name="lastName"
                                                                                                    onBlur={formik.handleBlur}
                                                                                                    onChange={formik.handleChange}
                                                                                                    value={formik.values.lastName}
                                                                                          />

                                                                                          <TextField
                                                                                                    error={!!(formik.touched.phoneNumber && formik.errors.phoneNumber)}
                                                                                                    fullWidth
                                                                                                    helperText={formik.touched.phoneNumber && formik.errors.phoneNumber}
                                                                                                    label="Phone number"
                                                                                                    name="phoneNumber"
                                                                                                    onBlur={formik.handleBlur}
                                                                                                    onChange={formik.handleChange}
                                                                                                    value={formik.values.phoneNumber}
                                                                                          />
                                                                                          <TextField
                                                                                                    error={!!(formik.touched.email && formik.errors.email)}
                                                                                                    fullWidth
                                                                                                    helperText={formik.touched.email && formik.errors.email}
                                                                                                    label="Email"
                                                                                                    name="email"
                                                                                                    onBlur={formik.handleBlur}
                                                                                                    onChange={formik.handleChange}
                                                                                                    value={formik.values.email}
                                                                                          />

                                                                                          <LocalizationProvider dateAdapter={AdapterMoment}>
                                                                                                    <MobileDatePicker
                                                                                                              views={['year', 'month', 'day']}
                                                                                                              label='Date of birth'
                                                                                                              disableFuture
                                                                                                              value={moment(formik.values.dateOfBirth)}
                                                                                                              onAccept={(date: Moment | null) => {
                                                                                                                        formik.setFieldValue('dateOfBirth', date)
                                                                                                              }}
                                                                                                              format='DD.MM.YYYY'
                                                                                                              slotProps={{
                                                                                                                        textField: {
                                                                                                                                  error: false
                                                                                                                        }
                                                                                                              }}
                                                                                                    />
                                                                                          </LocalizationProvider>
                                                                                </Stack>
                                                                                <FormControlLabel
                                                                                          control={<Checkbox />}
                                                                                          label={'Is owner'}
                                                                                          value={formik.values.isOwner}
                                                                                          onChange={(e: any) => formik.setFieldValue('isOwner', e.target.checked)}
                                                                                          disabled={formik.values.isSubtenant}
                                                                                />
                                                                                <FormControlLabel
                                                                                          control={<Checkbox />}
                                                                                          label={'Is subtenant'}
                                                                                          value={formik.values.isSubtenant}
                                                                                          onChange={(e: any) => formik.setFieldValue('isSubtenant', e.target.checked)}
                                                                                          disabled={formik.values.isOwner}
                                                                                />
                                                                      </Grid>
                                                            </Grid>
                                                  </CardContent>
                                        </Card>
                                        <Card>
                                                  <CardContent>
                                                            <Grid
                                                                      container
                                                                      spacing={5}
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
                                                                      <Card>
                                                                                <CardContent>
                                                                                          <Grid
                                                                                                    container
                                                                                                    spacing={3}
                                                                                          >
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
                                                                                                    </Box>
                                                                                          </Grid>
                                                                                </CardContent>
                                                                      </Card>
                                                            </Grid>
                                                  </CardContent>
                                        </Card>

                                        <Stack
                                                  alignItems="center"
                                                  direction="row"
                                                  justifyContent="flex-start"
                                                  spacing={5}
                                        >
                                                  <Button
                                                            component={RouterLink}
                                                            disabled={formik.isSubmitting}
                                                            href={paths.dashboard.customers.index}
                                                            color="inherit"
                                                  >
                                                            Cancel
                                                  </Button>
                                                  <Button
                                                            disabled={!formik.dirty}
                                                            type="submit"
                                                            variant="contained"
                                                            onClick={() => formik.setFieldValue('createdDateTime', moment().format("YYYY/MM/DD HH:mm:ss"))}
                                                            value={formik.values.createdDateTime}
                                                  >
                                                            Create
                                                  </Button>
                                        </Stack>
                              </Stack>
                    </form >
          );
};
