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
import { Checkbox } from '@mui/material';

const initialValues: Customer = {
          address1: '',
          address2: '',
          appartmentNumber: 0,
          avatar: '',
          city: '',
          country: '',
          email: '',
          firstName: '',
          lastName: '',
          phoneNumber: '',
          state: '',
          updatedAt: 0,
          dateOfBirth: '',
          isOwner: false,
          zipCode: 0,
};

export const CustomerCreateForm: FC = (props) => {
          const router = useRouter();
          const [files, setFiles] = useState<File[]>([]);

          const formik = useFormik({
                    initialValues,
                    validationSchema,
                    onSubmit: async (values, helpers): Promise<void> => {

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

          const handleFileRemove = useCallback((file: File): void => {
                    setFiles((prevFiles) => {
                              return prevFiles.filter((_file) => _file.path !== file.path);
                    });
          }, []);

          const handleFilesRemoveAll = useCallback((): void => {
                    setFiles([]);
          }, []);

          return (
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

                                                                                          {/* <QuillEditor
                                                                                                              onChange={(value: string): void => {
                                                                                                                        formik.setFieldValue('description', value);
                                                                                                              }}
                                                                                                              placeholder="Write something"
                                                                                                              sx={{ height: 400 }}
                                                                                                              value={formik.values.description}
                                                                                                    />
                                                                                                    {!!(formik.touched.description && formik.errors.description) && (
                                                                                                              <Box sx={{ mt: 2 }}>
                                                                                                                        <FormHelperText error>{formik.errors.description}</FormHelperText>
                                                                                                              </Box>
                                                                                                    )} */}
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
                                                                                                    error={!!(formik.touched.address1 && formik.errors.address1)}
                                                                                                    fullWidth
                                                                                                    helperText={formik.touched.address1 && formik.errors.address1}
                                                                                                    label="Address"
                                                                                                    name="address1"
                                                                                                    onBlur={formik.handleBlur}
                                                                                                    onChange={formik.handleChange}
                                                                                                    value={formik.values.address1}
                                                                                          />
                                                                                          <TextField
                                                                                                    error={!!(formik.touched.appartmentNumber && formik.errors.appartmentNumber)}
                                                                                                    fullWidth
                                                                                                    helperText={formik.touched.appartmentNumber && formik.errors.appartmentNumber}
                                                                                                    label="Appartment number"
                                                                                                    name="appartmentNumber"
                                                                                                    onBlur={formik.handleBlur}
                                                                                                    onChange={formik.handleChange}
                                                                                                    value={formik.values.appartmentNumber}
                                                                                          />
                                                                                          <TextField
                                                                                                    error={!!(formik.touched.city && formik.errors.city)}
                                                                                                    fullWidth
                                                                                                    helperText={formik.touched.city && formik.errors.city}
                                                                                                    label="City"
                                                                                                    name="city"
                                                                                                    onBlur={formik.handleBlur}
                                                                                                    onChange={formik.handleChange}
                                                                                                    value={formik.values.city}
                                                                                          />
                                                                                          <TextField
                                                                                                    error={!!(formik.touched.country && formik.errors.country)}
                                                                                                    fullWidth
                                                                                                    helperText={formik.touched.country && formik.errors.country}
                                                                                                    label="Country"
                                                                                                    name="country"
                                                                                                    onBlur={formik.handleBlur}
                                                                                                    onChange={formik.handleChange}
                                                                                                    value={formik.values.country}
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
                                                                                          {/* <LocalizationProvider dateAdapter={AdapterMoment}>
                                                                                                    <DatePicker
                                                                                                              label="Date of birth"
                                                                                                              value={moment(formik.values.dateOfBirth)}
                                                                                                              //format="mm.dd.yyyy"
                                                                                                              onChange={(value) => { formik.setFieldValue('dateOfBirth', moment(value)); }}
                                                                                                              slotProps={{
                                                                                                                        textField: {
                                                                                                                                  variant: 'outlined',
                                                                                                                                  error: formik.touched.dateOfBirth && Boolean(formik.errors.dateOfBirth),
                                                                                                                                  helperText: formik.touched.dateOfBirth && formik.errors.dateOfBirth,
                                                                                                                        },
                                                                                                              }}
                                                                                                    />
                                                                                          </LocalizationProvider> */}
                                                                                          {/* <KeyboardDatePicker
                                                                                                    id="date-picker-dialog"
                                                                                                    label="Date picker dialog"
                                                                                                    inputVariant="outlined"
                                                                                                    format="MM/dd/yyyy"
                                                                                                    value={props.values.date}
                                                                                                    onChange={value => props.setFieldValue("date", value)}
                                                                                                    KeyboardButtonProps={{
                                                                                                              "aria-label": "change date"
                                                                                                    }}
                                                                                          /> */}
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
                                                                                </Stack>
                                                                                <FormControlLabel
                                                                                          control={<Checkbox />}
                                                                                          label={'Is owner'}
                                                                                          value={formik.values.isOwner}
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
                                                  >
                                                            Create
                                                  </Button>
                                        </Stack>
                              </Stack>
                    </form >
          );
};
