import type { ChangeEvent, FC, MouseEvent } from 'react';
import { Fragment, useState } from 'react';
import numeral from 'numeral';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import ChevronDownIcon from '@untitled-ui/icons-react/build/esm/ChevronDown';
import ChevronRightIcon from '@untitled-ui/icons-react/build/esm/ChevronRight';
import DotsHorizontalIcon from '@untitled-ui/icons-react/build/esm/DotsHorizontal';
import Image01Icon from '@untitled-ui/icons-react/build/esm/Image01';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelIcon from '@mui/icons-material/Cancel';
import { Scrollbar } from 'src/components/scrollbar';
import { SeverityPill } from 'src/components/severity-pill';
import { Autocomplete, Checkbox, FormControlLabel } from '@mui/material';
import { QuillEditor } from '@/components/quill-editor';
import { ApartmentStatus, initialValues, validationSchema } from './building-apartments-options';
import { paths } from '@/paths';
import { useRouter } from 'next/router';
import Swal from 'sweetalert2';
import { BuildingApartment } from '@/types/building-appartment';
import { Customer } from '@/types/customer';
import { useFormik } from 'formik';
import moment from 'moment';

interface BuildingApartmentsListTableProps {
          count?: number;
          items?: BuildingApartment[];
          allOwners: Customer[];
          onPageChange?: (event: MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
          onRowsPerPageChange?: (event: ChangeEvent<HTMLInputElement>) => void;
          onDeselectOne?: (item: unknown) => void;
          onSelectOne?: (item: unknown) => void;
          selected?: BuildingApartment[];
          page?: number;
          rowsPerPage?: number;

}

export const BuildingApartmentsListTable: FC<BuildingApartmentsListTableProps> = (props) => {

          const [currentBuildingApartmentID, setCurrentBuildingApartmentID] = useState<string | null>();

          const router = useRouter();

          const {
                    count = 0,
                    items = [],
                    onPageChange = () => { },
                    onRowsPerPageChange,
                    page = 0,
                    rowsPerPage = 0,
                    selected = []
          } = props;
          console.log(props);

          const [currentBuildingApartment, setCurrentBuildingApartment] = useState<string | null>(null);

          const getObjectById = (_id: any, arrayToSearch: any) => {
                    for (const obj of arrayToSearch) {
                              if (obj._id === _id) {
                                        return obj;  // Found the object with the desired ID
                              }
                    }
                    return null;  // Object with the desired ID not found
          }

          const handleBuildingApartmentToggle = (buildingApartmentId: string): void => {
                    console.log(buildingApartmentId);

                    setCurrentBuildingApartment((prevBuildingApartmentId) => {
                              if (prevBuildingApartmentId === buildingApartmentId) {
                                        setCurrentBuildingApartmentID('')
                                        return null;
                              }
                              const map = new Map(items.map((obj: BuildingApartment) => [obj._id, obj]));
                              const result = map.get(buildingApartmentId);
                              setCurrentBuildingApartmentID(buildingApartmentId)
                              return buildingApartmentId;
                    });
          }

          const handleBuildingClose = (): void => {
                    setCurrentBuildingApartment(null);
          }

          const handleBuildingApartmentDeleteClick = () => {
                    Swal.fire({
                              title: 'Are you sure?',
                              text: "Deleting an apartment cannot be undone!",
                              icon: 'warning',
                              showCancelButton: true,
                              confirmButtonColor: '#3085d6',
                              cancelButtonColor: '#d33',
                              confirmButtonText: 'Yes, delete it!'
                    }).then((result: any) => {
                              if (result.isConfirmed) {
                                        handleBuildingApartmentDelete(selected)
                              }
                    })
          }

          const handleBuildingApartmentDelete = async (currentBuildingApartmentObject: any) => {
                    try {
                              await fetch('/api/building-apartments/apartments-api', {
                                        method: 'DELETE',
                                        headers: {
                                                  'Content-Type': 'application/json',
                                                  'Access-Control-Allow-Origin': '*',
                                                  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' // Set the content type to JSON
                                        },
                                        body: JSON.stringify(currentBuildingApartmentObject), // Convert your data to JSON
                              }).then(async (response) => {
                                        if (response.ok) {
                                                  toast.success('Building deleted!');
                                                  router.push(paths.dashboard.buildingApartments.index);
                                                  setCurrentBuildingApartment(null)
                                        } else {
                                                  const errorData = await response.json(); // Parse the error response
                                                  console.error(errorData);
                                                  toast.error('Something went wrong!');
                                        }
                              })
                    } catch (err) {
                              console.error(err);
                              toast.error('Something went wrong!');
                              // helpers.setStatus({ success: false });
                              // //helpers.setErrors({ submit: err.message });
                              // helpers.setSubmitting(false);
                    }
          }
          //propveri ovde ako nemamo props.items a to je kad je nemamo  i jedan stan
          const formik = useFormik({
                    initialValues: {
                              buildingAddress: props?.items![0].buildingAddress || '',
                              apartmentNumber: props?.items![0].apartmentNumber || 0,
                              surfaceArea: props?.items![0].surfaceArea || 0,
                              bedroomNumber: props?.items![0].bedroomNumber || 0,
                              bathroomNumber: props?.items![0].bathroomNumber || 0,
                              terraceNumber: props?.items![0].terraceNumber || 0,
                              description: props?.items![0].description || '',
                              images: props?.items![0].images || [],
                              tenants: props?.items![0].tenants || [],
                              owners: props?.items![0].owners || [],
                              status: props?.items![0].status || '',
                              petFriendly: props?.items![0].petFriendly || '',
                              smokingAllowed: props?.items![0].smokingAllowed || false,
                              furnished: props?.items![0].furnished || false,
                              hasOwnParking: props?.items![0].hasOwnParking || false,
                              utilitiesIncluded: props?.items![0].utilitiesIncluded || false,
                              createdDateTime: props?.items![0].createdDateTime || '',
                              updatedDateTime: props?.items![0].updatedDateTime || '',
                    },
                    validationSchema,
                    onSubmit: async (values: any, helpers: any): Promise<void> => {

                              Swal.fire({
                                        title: 'Are you sure?',
                                        text: "You can edit this Apartment at any time!",
                                        icon: 'warning',
                                        showCancelButton: true,
                                        confirmButtonColor: '#3085d6',
                                        cancelButtonColor: '#d33',
                                        confirmButtonText: 'Yes, update it!'
                              }).then(async (result: any) => {
                                        if (result.isConfirmed) {
                                                  try {
                                                            const buildingApartmentCreateResponse = await fetch('/api/building-apartments/apartments-api', {
                                                                      method: 'PUT',
                                                                      headers: {
                                                                                'Content-Type': 'application/json',
                                                                                'Access-Control-Allow-Origin': '*',
                                                                                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' // Set the content type to JSON
                                                                      },
                                                                      body: JSON.stringify({
                                                                                currentBuildingApartmentID,
                                                                                values
                                                                      }), // Convert your data to JSON
                                                            })

                                                            if (buildingApartmentCreateResponse.ok) {
                                                                      toast.success('Building apartment updated');
                                                                      router.push(paths.dashboard.buildingApartments.index);
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
                                        }
                              })

                    },
          });

          return (
                    <Box>
                              <Scrollbar>
                                        <Table sx={{ minWidth: 1200 }}>
                                                  <TableHead>
                                                            <TableRow>
                                                                      <TableCell />
                                                                      <TableCell>Full Address</TableCell>
                                                                      <TableCell>Apartment number</TableCell>
                                                                      <TableCell>Surface area</TableCell>
                                                                      <TableCell>Bedroom count</TableCell>
                                                                      <TableCell>Bathroom count</TableCell>
                                                                      <TableCell>Terrace count</TableCell>
                                                                      <TableCell>Has own parking spot</TableCell>
                                                            </TableRow>
                                                  </TableHead>
                                                  <TableBody>

                                                            {
                                                                      items.slice(page * rowsPerPage, (page * rowsPerPage) + rowsPerPage).map((apartment: BuildingApartment) => {

                                                                                const isCurrent = apartment._id === currentBuildingApartment;
                                                                                // const issueCountColor = apartment.unresolvedIssues.length >= 10 ? 'success' : 'error';
                                                                                const hasOwnParkingSpace = apartment.hasOwnParking === true ? 'success' : 'warning';
                                                                                // const hasManyVariants = apartment.variants > 1;

                                                                                return (

                                                                                          <Fragment key={apartment._id}>

                                                                                                    <TableRow
                                                                                                              hover
                                                                                                              key={apartment._id}
                                                                                                    >
                                                                                                              <TableCell
                                                                                                                        padding="checkbox"
                                                                                                                        sx={{
                                                                                                                                  ...(isCurrent && {
                                                                                                                                            position: 'relative',
                                                                                                                                            '&:after': {
                                                                                                                                                      position: 'absolute',
                                                                                                                                                      content: '" "',
                                                                                                                                                      top: 0,
                                                                                                                                                      left: 0,
                                                                                                                                                      backgroundColor: 'primary.main',
                                                                                                                                                      width: 3,
                                                                                                                                                      height: 'calc(100% + 1px)',
                                                                                                                                            },
                                                                                                                                  }),
                                                                                                                        }}
                                                                                                                        width="25%"
                                                                                                              >
                                                                                                                        <IconButton onClick={() => handleBuildingApartmentToggle(apartment._id!)}>
                                                                                                                                  <SvgIcon>{isCurrent ? <ChevronDownIcon /> : <ChevronRightIcon />}</SvgIcon>
                                                                                                                        </IconButton>
                                                                                                              </TableCell>
                                                                                                              <TableCell>{apartment.buildingAddress}</TableCell>
                                                                                                              <TableCell>{apartment.apartmentNumber}</TableCell>
                                                                                                              <TableCell>{apartment.surfaceArea}</TableCell>
                                                                                                              <TableCell>{apartment.bedroomNumber}</TableCell>
                                                                                                              <TableCell>{apartment.bathroomNumber}</TableCell>
                                                                                                              <TableCell>{apartment.terraceNumber}</TableCell>
                                                                                                              <TableCell>
                                                                                                                        {
                                                                                                                                  apartment.hasOwnParking ?
                                                                                                                                            <CheckCircleOutlineIcon color={hasOwnParkingSpace} />
                                                                                                                                            :
                                                                                                                                            <CancelIcon color={hasOwnParkingSpace} />
                                                                                                                        }
                                                                                                              </TableCell>
                                                                                                    </TableRow>

                                                                                                    {
                                                                                                              isCurrent && (

                                                                                                                        <TableRow>

                                                                                                                                  <TableCell
                                                                                                                                            colSpan={7}
                                                                                                                                            sx={{
                                                                                                                                                      p: 0,
                                                                                                                                                      position: 'relative',
                                                                                                                                                      '&:after': {
                                                                                                                                                                position: 'absolute',
                                                                                                                                                                content: '" "',
                                                                                                                                                                top: 0,
                                                                                                                                                                left: 0,
                                                                                                                                                                backgroundColor: 'primary.main',
                                                                                                                                                                width: 3,
                                                                                                                                                                height: 'calc(100% + 1px)',
                                                                                                                                                      },
                                                                                                                                            }}
                                                                                                                                  >
                                                                                                                                            <form
                                                                                                                                                      onSubmit={formik.handleSubmit}
                                                                                                                                                      {...props}
                                                                                                                                            >

                                                                                                                                                      <CardContent>
                                                                                                                                                                <Typography>
                                                                                                                                                                          {`${JSON.stringify(formik.errors)}`}
                                                                                                                                                                </Typography>
                                                                                                                                                                {
                                                                                                                                                                          count === 0 ? <Typography>aaaa</Typography> :
                                                                                                                                                                                    <Grid
                                                                                                                                                                                              container
                                                                                                                                                                                              spacing={3}
                                                                                                                                                                                    >
                                                                                                                                                                                              <Grid
                                                                                                                                                                                                        item
                                                                                                                                                                                                        md={6}
                                                                                                                                                                                                        xs={12}
                                                                                                                                                                                              >
                                                                                                                                                                                                        <Typography variant="h6">Basic Info</Typography>
                                                                                                                                                                                                        <Divider sx={{ my: 2 }} />
                                                                                                                                                                                                        <Grid
                                                                                                                                                                                                                  container
                                                                                                                                                                                                                  spacing={3}
                                                                                                                                                                                                        >
                                                                                                                                                                                                                  <Grid
                                                                                                                                                                                                                            item
                                                                                                                                                                                                                            md={6}
                                                                                                                                                                                                                            xs={12}
                                                                                                                                                                                                                  >
                                                                                                                                                                                                                            <TextField
                                                                                                                                                                                                                                      defaultValue={formik.values.buildingAddress}
                                                                                                                                                                                                                                      fullWidth
                                                                                                                                                                                                                                      label="Building Address"
                                                                                                                                                                                                                                      name="buildingAddress"
                                                                                                                                                                                                                                      disabled
                                                                                                                                                                                                                                      error={!!(formik.touched.buildingAddress && formik.errors.buildingAddress)}
                                                                                                                                                                                                                                      helperText={formik.touched.buildingAddress && formik.errors.buildingAddress}
                                                                                                                                                                                                                            />
                                                                                                                                                                                                                  </Grid>
                                                                                                                                                                                                                  <Grid
                                                                                                                                                                                                                            item
                                                                                                                                                                                                                            md={6}
                                                                                                                                                                                                                            xs={12}
                                                                                                                                                                                                                  >
                                                                                                                                                                                                                            <TextField
                                                                                                                                                                                                                                      fullWidth
                                                                                                                                                                                                                                      label="Apartment number"
                                                                                                                                                                                                                                      name="apartmentNumber"
                                                                                                                                                                                                                                      type='number'
                                                                                                                                                                                                                                      onBlur={formik.handleBlur}
                                                                                                                                                                                                                                      defaultValue={formik.values.apartmentNumber}
                                                                                                                                                                                                                                      onChange={(e) => formik.setFieldValue('apartmentNumber', e.target.value)}
                                                                                                                                                                                                                                      error={!!(formik.touched.apartmentNumber && formik.errors.apartmentNumber)}
                                                                                                                                                                                                                                      helperText={formik.touched.apartmentNumber && formik.errors.apartmentNumber}
                                                                                                                                                                                                                            />
                                                                                                                                                                                                                  </Grid>
                                                                                                                                                                                                                  <Grid
                                                                                                                                                                                                                            item
                                                                                                                                                                                                                            md={6}
                                                                                                                                                                                                                            xs={12}
                                                                                                                                                                                                                  >
                                                                                                                                                                                                                            <TextField
                                                                                                                                                                                                                                      defaultValue={formik.values.createdDateTime}
                                                                                                                                                                                                                                      fullWidth
                                                                                                                                                                                                                                      label="Created at:"
                                                                                                                                                                                                                                      name="createdDateTime"
                                                                                                                                                                                                                                      disabled
                                                                                                                                                                                                                            />
                                                                                                                                                                                                                  </Grid>
                                                                                                                                                                                                                  <Grid
                                                                                                                                                                                                                            item
                                                                                                                                                                                                                            md={6}
                                                                                                                                                                                                                            xs={12}
                                                                                                                                                                                                                  >
                                                                                                                                                                                                                            <TextField
                                                                                                                                                                                                                                      defaultValue={formik.values.updatedDateTime}
                                                                                                                                                                                                                                      disabled
                                                                                                                                                                                                                                      fullWidth
                                                                                                                                                                                                                                      label="Updated at:"
                                                                                                                                                                                                                                      name="updatedDateTime"
                                                                                                                                                                                                                            />
                                                                                                                                                                                                                  </Grid>
                                                                                                                                                                                                                  <Grid
                                                                                                                                                                                                                            item
                                                                                                                                                                                                                            md={12}
                                                                                                                                                                                                                            xs={12}
                                                                                                                                                                                                                  >
                                                                                                                                                                                                                            <Autocomplete
                                                                                                                                                                                                                                      multiple
                                                                                                                                                                                                                                      sx={{ minWidth: '300px' }}
                                                                                                                                                                                                                                      disablePortal
                                                                                                                                                                                                                                      id="combo-box-demo"
                                                                                                                                                                                                                                      options={props.allOwners}
                                                                                                                                                                                                                                      getOptionLabel={(customer: Customer) => customer.firstName + ' ' + customer.lastName + ' ' + customer.email}
                                                                                                                                                                                                                                      renderInput={(params) =>
                                                                                                                                                                                                                                                <TextField
                                                                                                                                                                                                                                                          {...params}
                                                                                                                                                                                                                                                          label="Owners"
                                                                                                                                                                                                                                                          helperText={formik.touched.owners && formik.errors.owners ? formik.errors.owners : ''}
                                                                                                                                                                                                                                                          error={formik.touched.owners && Boolean(formik.errors.owners)}
                                                                                                                                                                                                                                                />
                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                      onChange={(e: any, value: Customer[] | null) => {
                                                                                                                                                                                                                                                formik.setFieldValue('owners', value ? value : [])
                                                                                                                                                                                                                                                // formik.setFieldValue('buildingID', value ? value._id : '')
                                                                                                                                                                                                                                                // setBuildingID(value?._id || '')
                                                                                                                                                                                                                                      }}
                                                                                                                                                                                                                                      onBlur={formik.handleBlur('owners')}
                                                                                                                                                                                                                            />
                                                                                                                                                                                                                  </Grid>
                                                                                                                                                                                                                  <Grid
                                                                                                                                                                                                                            item
                                                                                                                                                                                                                            md={6}
                                                                                                                                                                                                                            xs={12}
                                                                                                                                                                                                                  >
                                                                                                                                                                                                                            <FormControlLabel
                                                                                                                                                                                                                                      control={<Checkbox />}
                                                                                                                                                                                                                                      defaultChecked={formik.values.hasOwnParking}
                                                                                                                                                                                                                                      name='hasOwnParking'
                                                                                                                                                                                                                                      onChange={(e: any) => formik.setFieldValue('hasOwnParking', e.target.checked)}
                                                                                                                                                                                                                                      label="Has own parking spot"
                                                                                                                                                                                                                            />
                                                                                                                                                                                                                  </Grid>
                                                                                                                                                                                                                  <Grid
                                                                                                                                                                                                                            item
                                                                                                                                                                                                                            md={12}
                                                                                                                                                                                                                            xs={12}
                                                                                                                                                                                                                  >
                                                                                                                                                                                                                            <Typography
                                                                                                                                                                                                                                      color="text.secondary"
                                                                                                                                                                                                                                      sx={{ mb: 2 }}
                                                                                                                                                                                                                                      variant="subtitle2"
                                                                                                                                                                                                                            >
                                                                                                                                                                                                                                      Description
                                                                                                                                                                                                                            </Typography>
                                                                                                                                                                                                                            <QuillEditor
                                                                                                                                                                                                                                      defaultValue={formik.values.description}
                                                                                                                                                                                                                                      placeholder="Short description"
                                                                                                                                                                                                                                      sx={{ height: 400 }}
                                                                                                                                                                                                                                      onChange={(e: any) => formik.setFieldValue('description', e)}
                                                                                                                                                                                                                                      onBlur={formik.handleBlur}
                                                                                                                                                                                                                                      style={{
                                                                                                                                                                                                                                                height: '200px'
                                                                                                                                                                                                                                      }}
                                                                                                                                                                                                                            />
                                                                                                                                                                                                                  </Grid>
                                                                                                                                                                                                        </Grid>
                                                                                                                                                                                              </Grid>
                                                                                                                                                                                              <Grid
                                                                                                                                                                                                        item
                                                                                                                                                                                                        md={6}
                                                                                                                                                                                                        xs={12}
                                                                                                                                                                                              >
                                                                                                                                                                                                        <Typography variant="h6">Detailed Info</Typography>
                                                                                                                                                                                                        <Divider sx={{ my: 2 }} />
                                                                                                                                                                                                        <Grid
                                                                                                                                                                                                                  container
                                                                                                                                                                                                                  spacing={4.5}
                                                                                                                                                                                                        >
                                                                                                                                                                                                                  <Grid
                                                                                                                                                                                                                            item
                                                                                                                                                                                                                            md={6}
                                                                                                                                                                                                                            xs={12}
                                                                                                                                                                                                                  >
                                                                                                                                                                                                                            <TextField
                                                                                                                                                                                                                                      defaultValue={formik.values.bathroomNumber}
                                                                                                                                                                                                                                      fullWidth
                                                                                                                                                                                                                                      label="Number of bathrooms"
                                                                                                                                                                                                                                      name="bathroomNumber"
                                                                                                                                                                                                                                      onChange={(e) => formik.setFieldValue('bathroomNumber', e.target.value)}
                                                                                                                                                                                                                                      onBlur={formik.handleBlur}
                                                                                                                                                                                                                                      type='number'
                                                                                                                                                                                                                                      error={!!(formik.touched.bathroomNumber && formik.errors.bathroomNumber)}
                                                                                                                                                                                                                                      helperText={formik.touched.bathroomNumber && formik.errors.bathroomNumber}
                                                                                                                                                                                                                            />
                                                                                                                                                                                                                  </Grid>
                                                                                                                                                                                                                  <Grid
                                                                                                                                                                                                                            item
                                                                                                                                                                                                                            md={6}
                                                                                                                                                                                                                            xs={12}
                                                                                                                                                                                                                  >
                                                                                                                                                                                                                            <TextField
                                                                                                                                                                                                                                      defaultValue={formik.values.bedroomNumber}
                                                                                                                                                                                                                                      onChange={(e) => formik.setFieldValue('bedroomNumber', e.target.value)}
                                                                                                                                                                                                                                      onBlur={formik.handleBlur}
                                                                                                                                                                                                                                      fullWidth
                                                                                                                                                                                                                                      label="Number of bedrooms"
                                                                                                                                                                                                                                      name="bedroomNumber"
                                                                                                                                                                                                                                      type='number'
                                                                                                                                                                                                                                      error={!!(formik.touched.bedroomNumber && formik.errors.bedroomNumber)}
                                                                                                                                                                                                                                      helperText={formik.touched.bedroomNumber && formik.errors.bedroomNumber}
                                                                                                                                                                                                                            />
                                                                                                                                                                                                                  </Grid>
                                                                                                                                                                                                                  <Grid
                                                                                                                                                                                                                            item
                                                                                                                                                                                                                            md={6}
                                                                                                                                                                                                                            xs={12}
                                                                                                                                                                                                                  >
                                                                                                                                                                                                                            <TextField
                                                                                                                                                                                                                                      defaultValue={formik.values.terraceNumber}
                                                                                                                                                                                                                                      onChange={(e) => formik.setFieldValue('terraceNumber', e.target.value)}
                                                                                                                                                                                                                                      onBlur={formik.handleBlur}
                                                                                                                                                                                                                                      error={!!(formik.touched.terraceNumber && formik.errors.terraceNumber)}
                                                                                                                                                                                                                                      helperText={formik.touched.terraceNumber && formik.errors.terraceNumber}
                                                                                                                                                                                                                                      fullWidth
                                                                                                                                                                                                                                      label="Number of terraces"
                                                                                                                                                                                                                                      name="terraceNumber"
                                                                                                                                                                                                                                      type='number'
                                                                                                                                                                                                                            />
                                                                                                                                                                                                                  </Grid>
                                                                                                                                                                                                                  <Grid
                                                                                                                                                                                                                            item
                                                                                                                                                                                                                            md={12}
                                                                                                                                                                                                                            xs={12}
                                                                                                                                                                                                                  >
                                                                                                                                                                                                                            <Autocomplete
                                                                                                                                                                                                                                      sx={{ minWidth: '300px' }}
                                                                                                                                                                                                                                      disablePortal
                                                                                                                                                                                                                                      id="combo-box-demo"
                                                                                                                                                                                                                                      options={['Empty', 'ForSale', 'Unavailable', 'OccupiedByOwner', 'OccupiedByTenants', 'OccupiedBySubtenants']}
                                                                                                                                                                                                                                      getOptionLabel={(status: ApartmentStatus) => status}
                                                                                                                                                                                                                                      renderInput={(params) =>
                                                                                                                                                                                                                                                <TextField
                                                                                                                                                                                                                                                          {...params}
                                                                                                                                                                                                                                                          label="Status"
                                                                                                                                                                                                                                                          helperText={formik.touched.status && formik.errors.status ? formik.errors.status : ''}
                                                                                                                                                                                                                                                          error={formik.touched.status && Boolean(formik.errors.status)}
                                                                                                                                                                                                                                                />
                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                      onChange={(e: any, value: ApartmentStatus | null) => {
                                                                                                                                                                                                                                                formik.setFieldValue('status', value ? value : []);
                                                                                                                                                                                                                                                // formik.setFieldValue('buildingID', value ? value._id : '')
                                                                                                                                                                                                                                                // setBuildingID(value?._id || '')
                                                                                                                                                                                                                                      }}
                                                                                                                                                                                                                                      onBlur={formik.handleBlur('status')}
                                                                                                                                                                                                                            />
                                                                                                                                                                                                                  </Grid>
                                                                                                                                                                                                                  <Grid
                                                                                                                                                                                                                            item
                                                                                                                                                                                                                            md={6}
                                                                                                                                                                                                                            xs={12}
                                                                                                                                                                                                                  >
                                                                                                                                                                                                                            <TextField
                                                                                                                                                                                                                                      defaultValue={formik.values.surfaceArea}
                                                                                                                                                                                                                                      onChange={(e) => formik.setFieldValue('surfaceArea', e.target.value)}
                                                                                                                                                                                                                                      error={!!(formik.touched.surfaceArea && formik.errors.surfaceArea)}
                                                                                                                                                                                                                                      helperText={formik.touched.surfaceArea && formik.errors.surfaceArea}
                                                                                                                                                                                                                                      onBlur={formik.handleBlur}
                                                                                                                                                                                                                                      fullWidth
                                                                                                                                                                                                                                      label="Surface area"
                                                                                                                                                                                                                                      name="surfaceArea"
                                                                                                                                                                                                                            />
                                                                                                                                                                                                                  </Grid>
                                                                                                                                                                                                                  <Grid
                                                                                                                                                                                                                            item
                                                                                                                                                                                                                            md={12}
                                                                                                                                                                                                                            xs={12}
                                                                                                                                                                                                                  >
                                                                                                                                                                                                                            <Box
                                                                                                                                                                                                                                      sx={{
                                                                                                                                                                                                                                                alignItems: 'center',
                                                                                                                                                                                                                                                display: 'flex',
                                                                                                                                                                                                                                                flexDirection: 'column',
                                                                                                                                                                                                                                      }}
                                                                                                                                                                                                                            >
                                                                                                                                                                                                                                      {apartment.images ? (
                                                                                                                                                                                                                                                <Box
                                                                                                                                                                                                                                                          sx={{
                                                                                                                                                                                                                                                                    alignItems: 'center',
                                                                                                                                                                                                                                                                    backgroundColor: 'neutral.50',
                                                                                                                                                                                                                                                                    backgroundImage: `url(${apartment.images})`,
                                                                                                                                                                                                                                                                    backgroundPosition: 'center',
                                                                                                                                                                                                                                                                    backgroundSize: 'cover',
                                                                                                                                                                                                                                                                    borderRadius: 1,
                                                                                                                                                                                                                                                                    display: 'flex',
                                                                                                                                                                                                                                                                    height: 300,
                                                                                                                                                                                                                                                                    justifyContent: 'center',
                                                                                                                                                                                                                                                                    overflow: 'hidden',
                                                                                                                                                                                                                                                                    width: 300,
                                                                                                                                                                                                                                                          }}
                                                                                                                                                                                                                                                />
                                                                                                                                                                                                                                      ) : (
                                                                                                                                                                                                                                                <Box
                                                                                                                                                                                                                                                          sx={{
                                                                                                                                                                                                                                                                    alignItems: 'center',
                                                                                                                                                                                                                                                                    backgroundColor: 'neutral.50',
                                                                                                                                                                                                                                                                    borderRadius: 1,
                                                                                                                                                                                                                                                                    display: 'flex',

                                                                                                                                                                                                                                                                    height: 300,
                                                                                                                                                                                                                                                                    justifyContent: 'center',
                                                                                                                                                                                                                                                                    width: 400,
                                                                                                                                                                                                                                                          }}
                                                                                                                                                                                                                                                >
                                                                                                                                                                                                                                                          <SvgIcon>
                                                                                                                                                                                                                                                                    <Image01Icon />
                                                                                                                                                                                                                                                          </SvgIcon>
                                                                                                                                                                                                                                                </Box>
                                                                                                                                                                                                                                      )}
                                                                                                                                                                                                                                      <Box
                                                                                                                                                                                                                                                sx={{
                                                                                                                                                                                                                                                          cursor: 'pointer',
                                                                                                                                                                                                                                                          ml: 2,
                                                                                                                                                                                                                                                }}
                                                                                                                                                                                                                                      >
                                                                                                                                                                                                                                                <Typography variant="subtitle2">{formik.values.buildingAddress}</Typography>
                                                                                                                                                                                                                                      </Box>
                                                                                                                                                                                                                            </Box>
                                                                                                                                                                                                                  </Grid>
                                                                                                                                                                                                        </Grid>
                                                                                                                                                                                              </Grid>
                                                                                                                                                                                    </Grid>
                                                                                                                                                                }
                                                                                                                                                      </CardContent>
                                                                                                                                                      <Divider />
                                                                                                                                                      <Stack
                                                                                                                                                                alignItems="center"
                                                                                                                                                                direction="row"
                                                                                                                                                                justifyContent="space-between"
                                                                                                                                                                sx={{ p: 2 }}
                                                                                                                                                      >
                                                                                                                                                                <Stack
                                                                                                                                                                          alignItems="center"
                                                                                                                                                                          direction="row"
                                                                                                                                                                          spacing={2}
                                                                                                                                                                >
                                                                                                                                                                          <Button
                                                                                                                                                                                    onClick={() => formik.setFieldValue('updatedDateTime', moment().format("YYYY/MM/DD HH:mm:ss"))}
                                                                                                                                                                                    type="submit"
                                                                                                                                                                                    variant="contained"
                                                                                                                                                                          >
                                                                                                                                                                                    Update
                                                                                                                                                                          </Button>
                                                                                                                                                                          <Button
                                                                                                                                                                                    color="inherit"
                                                                                                                                                                                    onClick={handleBuildingClose}
                                                                                                                                                                          >
                                                                                                                                                                                    Cancel
                                                                                                                                                                          </Button>
                                                                                                                                                                </Stack>

                                                                                                                                                                <Button
                                                                                                                                                                          onClick={handleBuildingApartmentDeleteClick}
                                                                                                                                                                          color="error"
                                                                                                                                                                >
                                                                                                                                                                          Delete building
                                                                                                                                                                </Button>

                                                                                                                                                      </Stack>
                                                                                                                                            </form>
                                                                                                                                  </TableCell>
                                                                                                                        </TableRow>

                                                                                                              )}

                                                                                          </Fragment>
                                                                                );
                                                                      })}
                                                  </TableBody>
                                        </Table>
                              </Scrollbar>
                              <TablePagination
                                        component="div"
                                        count={count}
                                        onPageChange={onPageChange}
                                        onRowsPerPageChange={onRowsPerPageChange}
                                        page={page}
                                        rowsPerPage={rowsPerPage}
                                        rowsPerPageOptions={[5, 10, 25]}
                              />
                    </Box >
          );
};

BuildingApartmentsListTable.propTypes = {
          count: PropTypes.number,
          items: PropTypes.array,
          onPageChange: PropTypes.func,
          onRowsPerPageChange: PropTypes.func,
          page: PropTypes.number,
          rowsPerPage: PropTypes.number,
          onDeselectOne: PropTypes.func,
          onSelectOne: PropTypes.func,
          selected: PropTypes.array
};
