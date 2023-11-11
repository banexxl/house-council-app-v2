import { type FC, ChangeEvent, useState } from 'react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import * as Yup from 'yup';
import { useFormik } from 'formik';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { RouterLink } from 'src/components/router-link';
import { paths } from 'src/paths';
import type { Customer } from 'src/types/customer';
import { LocalizationProvider, MobileDatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment'
import { enUS } from '@mui/x-date-pickers/locales'
import 'dayjs/locale/en';
import 'dayjs/locale/en-gb';
import { Autocomplete, Checkbox, FormControlLabel } from '@mui/material';
import moment, { Moment } from 'moment'
import { useRouter } from 'next/router';
import { Building } from '@/types/building';


interface CustomerEditFormProps {
          customer: Customer;
          allBuildings: Building[]
}

export const CustomerEditForm: FC<CustomerEditFormProps> = (props) => {

          const { customer, ...other } = props;
          const router = useRouter()

          const formik = useFormik({
                    initialValues: {
                              _id: customer._id,
                              email: customer.email,
                              firstName: customer.firstName,
                              lastName: customer.lastName,
                              phoneNumber: customer.phoneNumber,
                              avatar: customer.avatar,
                              updatedDateTime: customer.updatedDateTime,
                              createdDateTime: customer.createdDateTime,
                              dateOfBirth: customer.dateOfBirth,
                              isOwner: customer.isOwner,
                              isSubtenant: customer.isSubtenant,
                    },
                    validationSchema: Yup.object({
                              _id: Yup.string().max(36),
                              //fullAddress: Yup.string().max(100).required('Full address is required'),
                              email: Yup.string().email('Must be a valid email').max(255).required('Email is required'),
                              // isVerified: Yup.bool(),
                              firstName: Yup.string().max(32).required('First name is required'),
                              lastName: Yup.string().max(32).required('Last name is required'),
                              phoneNumber: Yup.string().max(15).required('Phone is required'),
                    }),
                    onSubmit: async (values, helpers): Promise<void> => {
                              console.log('edit customer values', values);

                              try {
                                        const response = await fetch('/api/customers/customers-api', {
                                                  method: 'PUT',
                                                  headers: {
                                                            'Content-Type': 'application/json',
                                                            'Access-Control-Allow-Origin': '*',
                                                            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' // Set the content type to JSON
                                                  },
                                                  body: JSON.stringify(values),
                                        })

                                        if (response.statusText == 'OK') {
                                                  helpers.setStatus({ success: true })
                                                  helpers.setSubmitting(false)
                                                  toast.success('Customer updated')
                                                  router.push(paths.dashboard.customers.index)
                                        } else {
                                                  helpers.setStatus({ success: false })
                                                  helpers.setSubmitting(false)
                                                  toast.error('Something went wrong!')
                                        }

                              } catch (err) {
                                        console.error(err);
                                        toast.error('Something went wrong!');
                                        helpers.setStatus({ success: false });
                                        helpers.setSubmitting(false);
                              }
                    },
          });

          return (
                    <form
                              onSubmit={formik.handleSubmit}
                              {...other}
                    >
                              <Card>
                                        <CardHeader title="Edit Customer" />
                                        <CardContent sx={{ pt: 0 }}>
                                                  <Grid
                                                            container
                                                            spacing={3}
                                                  >
                                                            <Typography>
                                                                      {`${JSON.stringify(formik.values)}`}
                                                            </Typography>
                                                            <Grid
                                                                      xs={12}
                                                                      md={6}
                                                            >
                                                                      <TextField
                                                                                error={!!(formik.touched._id && formik.errors._id)}
                                                                                fullWidth
                                                                                helperText={formik.touched._id && formik.errors._id}
                                                                                label="ID"
                                                                                name="_id"
                                                                                required
                                                                                disabled
                                                                                value={formik.values._id}
                                                                      />
                                                            </Grid>
                                                            <Grid
                                                                      xs={12}
                                                                      md={6}
                                                            >
                                                                      <TextField
                                                                                error={!!(formik.touched.firstName && formik.errors.firstName)}
                                                                                fullWidth
                                                                                helperText={formik.touched.firstName && formik.errors.firstName}
                                                                                label="First name"
                                                                                name="firstName"
                                                                                onBlur={formik.handleBlur}
                                                                                onChange={formik.handleChange}
                                                                                required
                                                                                value={formik.values.firstName}
                                                                      />
                                                            </Grid>
                                                            <Grid
                                                                      xs={12}
                                                                      md={6}
                                                            >
                                                                      <TextField
                                                                                error={!!(formik.touched.lastName && formik.errors.lastName)}
                                                                                fullWidth
                                                                                helperText={formik.touched.lastName && formik.errors.lastName}
                                                                                label="Last name"
                                                                                name="lastName"
                                                                                onBlur={formik.handleBlur}
                                                                                onChange={formik.handleChange}
                                                                                required
                                                                                value={formik.values.lastName}
                                                                      />
                                                            </Grid>
                                                            <Grid
                                                                      xs={12}
                                                                      md={6}
                                                            >
                                                                      <TextField
                                                                                error={!!(formik.touched.email && formik.errors.email)}
                                                                                fullWidth
                                                                                helperText={formik.touched.email && formik.errors.email}
                                                                                label="Email address"
                                                                                name="email"
                                                                                onBlur={formik.handleBlur}
                                                                                onChange={formik.handleChange}
                                                                                required
                                                                                value={formik.values.email}
                                                                      />
                                                            </Grid>
                                                            {/* <Grid
                                                                      xs={12}
                                                                      md={6}
                                                            >
                                                                      <Autocomplete
                                                                                disablePortal
                                                                                id="combo-box-demo"
                                                                                options={props.allBuildings}
                                                                                getOptionLabel={(building: Building) => building.fullAddress}
                                                                                renderInput={(params) =>
                                                                                          <TextField
                                                                                                    {...params}
                                                                                                    label="Building address"
                                                                                                    helperText={
                                                                                                              formik.touched.ApartmentNumber && formik.errors.fullAddress
                                                                                                                        ? formik.errors.fullAddress
                                                                                                                        : ''
                                                                                                    }
                                                                                                    error={formik.touched.fullAddress && Boolean(formik.errors.fullAddress)}
                                                                                          />
                                                                                }
                                                                                onChange={(e: any) => formik.setFieldValue('fullAddress', e.target.textContent)}
                                                                                defaultValue={props.allBuildings.find(
                                                                                          (building) => building.fullAddress === formik.values.fullAddress
                                                                                )}
                                                                      />
                                                            </Grid> */}
                                                            <Grid
                                                                      xs={12}
                                                                      md={6}
                                                            >
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
                                                            </Grid>
                                                            <Grid
                                                                      xs={12}
                                                                      md={6}
                                                            >
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
                                                            </Grid>

                                                            <Grid
                                                                      xs={12}
                                                                      md={6}
                                                            >
                                                                      <TextField
                                                                                error={!!(formik.touched.updatedDateTime && formik.errors.updatedDateTime)}
                                                                                fullWidth
                                                                                helperText={formik.touched.updatedDateTime && formik.errors.updatedDateTime}
                                                                                label="Updated date/time"
                                                                                name="updatedDateTime"
                                                                                disabled
                                                                                value={formik.values.updatedDateTime}
                                                                      />
                                                            </Grid>
                                                            <Grid
                                                                      xs={12}
                                                                      md={6}
                                                            >
                                                                      <TextField
                                                                                error={!!(formik.touched.createdDateTime && formik.errors.createdDateTime)}
                                                                                fullWidth
                                                                                helperText={formik.touched.createdDateTime && formik.errors.createdDateTime}
                                                                                label="Created date/time"
                                                                                name="createdDateTime"
                                                                                disabled
                                                                                value={formik.values.createdDateTime}
                                                                      />
                                                            </Grid>
                                                            <Grid
                                                                      xs={12}
                                                                      md={6}
                                                            >
                                                                      <FormControlLabel
                                                                                control={<Checkbox
                                                                                          value={formik.values.isOwner}
                                                                                          onChange={(e: any) => {
                                                                                                    formik.setFieldValue('isOwner', e.target.checked);
                                                                                                    formik.setFieldValue('isSubtenant', !e.target.checked ? formik.values.isSubtenant : false);
                                                                                          }}
                                                                                          itemType='boolean'
                                                                                          checked={formik.values.isOwner}
                                                                                />}
                                                                                label={'Is owner'}

                                                                      />
                                                                      <FormControlLabel
                                                                                control={<Checkbox />}
                                                                                label={'Is subtenant'}
                                                                                value={formik.values.isSubtenant}
                                                                                onChange={(e: any) => {
                                                                                          formik.setFieldValue('isSubtenant', e.target.checked);
                                                                                          formik.setFieldValue('isOwner', !e.target.checked ? formik.values.isOwner : false);
                                                                                }}
                                                                                checked={formik.values.isSubtenant}
                                                                      />
                                                            </Grid>
                                                  </Grid>
                                                  <Stack
                                                            divider={<Divider />}
                                                            spacing={3}
                                                            sx={{ mt: 3 }}
                                                  >
                                                            <Stack
                                                                      alignItems="center"
                                                                      direction="row"
                                                                      justifyContent="space-between"
                                                                      spacing={3}
                                                            >
                                                                      <Stack spacing={1}>
                                                                                <Typography
                                                                                          gutterBottom
                                                                                          variant="subtitle1"
                                                                                >
                                                                                          Make Contact Info Public
                                                                                </Typography>
                                                                                <Typography
                                                                                          color="text.secondary"
                                                                                          variant="body2"
                                                                                >
                                                                                          Means that anyone viewing your profile will be able to see your contacts details
                                                                                </Typography>
                                                                      </Stack>
                                                            </Stack>
                                                            <Stack
                                                                      alignItems="center"
                                                                      direction="row"
                                                                      justifyContent="space-between"
                                                                      spacing={3}
                                                            >
                                                                      <Stack spacing={1}>
                                                                                <Typography
                                                                                          gutterBottom
                                                                                          variant="subtitle1"
                                                                                >
                                                                                          Available to hire
                                                                                </Typography>
                                                                                <Typography
                                                                                          color="text.secondary"
                                                                                          variant="body2"
                                                                                >
                                                                                          Toggling this will let your teammates know that you are available for acquiring
                                                                                          new projects
                                                                                </Typography>
                                                                      </Stack>
                                                            </Stack>
                                                  </Stack>
                                        </CardContent>
                                        <Stack
                                                  direction={{
                                                            xs: 'column',
                                                            sm: 'row',
                                                  }}
                                                  flexWrap="wrap"
                                                  spacing={3}
                                                  sx={{ p: 3 }}
                                        >
                                                  <Button
                                                            disabled={formik.isSubmitting}
                                                            type="submit"
                                                            variant="contained"
                                                            onClick={() => formik.setFieldValue('updatedDateTime', moment().format('YYYY/MM/DD HH:mm:ss').toString())}
                                                            value={formik.values.updatedDateTime}
                                                  >
                                                            Update
                                                  </Button>
                                                  <Button
                                                            color="inherit"
                                                            component={RouterLink}
                                                            disabled={formik.isSubmitting}
                                                            href={paths.dashboard.customers.index}
                                                  >
                                                            Cancel
                                                  </Button>
                                        </Stack>
                              </Card>
                    </form >
          );
};

CustomerEditForm.propTypes = {
          // @ts-ignore
          customer: PropTypes.object.isRequired,
};
