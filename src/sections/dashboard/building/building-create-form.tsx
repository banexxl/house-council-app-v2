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
import { GoogleMaps } from './map-component'
import axios from 'axios';
import { Board } from './building-kanban/building-kanban';
import { Divider, Paper } from '@mui/material';
import { BoardsList } from './building-kanban/building-issue-list';

export const BuildingCreateForm: FC = (props) => {
          const router = useRouter();
          const [files, setFiles] = useState<File[]>([]);
          const [locationAddress, setLocationAddress] = useState()
          const [tasks, setTasks] = useState([])

          const url = '/db.json'

          useEffect(() => {
                    const loading = async () => {
                              try {
                                        const res = await fetch(url)


                                        let response = await res.json()

                                        setTasks(response.tasksList)
                                        console.log('aaaaaaaaaaaaa', tasks);
                              } catch (error) {
                                        console.log('Error', error)
                              }
                    }
                    loading()
          }, [])



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

          const onMapAddressChange = (mapAddressProps: any) => {
                    setLocationAddress(mapAddressProps);
                    formik.setFieldValue('fullAddress', mapAddressProps.address)
          }

          const data = {
                    lanes: [
                              {
                                        id: 'lane1',
                                        title: 'Planned Tasks',
                                        label: '2/2',
                                        cards: [
                                                  { id: 'Card1', title: 'Write Blog', description: 'Can AI make memes', label: '30 mins', draggable: false },
                                                  { id: 'Card2', title: 'Pay Rent', description: 'Transfer via NEFT', label: '5 mins', metadata: { sha: 'be312a1' } }
                                        ]
                              },
                              {
                                        id: 'lane2',
                                        title: 'Completed',
                                        label: '0/0',
                                        cards: []
                              }
                    ]
          }

          return (
                    <div>
                              <form
                                        onSubmit={formik.handleSubmit}
                                        {...props}
                              >


                                        <Stack spacing={4}>
                                                  {/*-------------------Basic info-------------------*/}
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
                                                                                          <Typography variant="h6">Basic information</Typography>
                                                                                </Grid>
                                                                                <Grid
                                                                                          xs={12}
                                                                                          md={8}
                                                                                >
                                                                                          <Stack spacing={3}>
                                                                                                    <GoogleMaps onMapAddressChange={onMapAddressChange} />
                                                                                                    <TextField
                                                                                                              error={!!(formik.touched.fullAddress && formik.errors.fullAddress)}
                                                                                                              fullWidth
                                                                                                              helperText={formik.touched.fullAddress && formik.errors.fullAddress}
                                                                                                              label="Building Address"
                                                                                                              name="fullAddress"
                                                                                                              onBlur={formik.handleBlur}
                                                                                                              onChange={formik.handleChange}
                                                                                                              value={formik.values.fullAddress}
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
                                                                                                    <div>
                                                                                                              <FormControlLabel
                                                                                                                        control={<Switch defaultChecked />}
                                                                                                                        label="Is receintly built"
                                                                                                                        value={formik.values.isRecentlyBuilt}
                                                                                                                        name='isReceintlyBuilt'
                                                                                                              />
                                                                                                    </div><div>
                                                                                                              <FormControlLabel
                                                                                                                        control={<Switch defaultChecked />}
                                                                                                                        label="Has own parking lot"
                                                                                                                        value={formik.values.hasOwnParkingLot}
                                                                                                                        name='hasOwnParkingLot'
                                                                                                              />
                                                                                                    </div>
                                                                                                    <div>
                                                                                                              <FormControlLabel
                                                                                                                        control={<Switch defaultChecked />}
                                                                                                                        label="Has own elevator"
                                                                                                                        value={formik.values.hasOwnElevator}
                                                                                                                        name='hasOwnElevator'
                                                                                                              />
                                                                                                    </div>
                                                                                                    <div>
                                                                                                              <FormControlLabel
                                                                                                                        control={<Switch defaultChecked />}
                                                                                                                        label="Has own bicycle room"
                                                                                                                        value={formik.values.hasOwnBicycleRoom}
                                                                                                                        name='hasOwnBicycleRoom'
                                                                                                              />
                                                                                                    </div>
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
                                                                                                    <TextField
                                                                                                              error={!!(formik.touched.parkingLotCount && formik.errors.parkingLotCount)}
                                                                                                              fullWidth
                                                                                                              label="Parking lot count"
                                                                                                              name="parkingLotCount"
                                                                                                              onBlur={formik.handleBlur}
                                                                                                              onChange={formik.handleChange}
                                                                                                              type="number"
                                                                                                              value={formik.values.parkingLotCount}
                                                                                                    />
                                                                                                    <TextField
                                                                                                              error={!!(formik.touched.appartmentCount && formik.errors.appartmentCount)}
                                                                                                              fullWidth
                                                                                                              label="Appartment count"
                                                                                                              name="appartmentCount"
                                                                                                              onBlur={formik.handleBlur}
                                                                                                              onChange={formik.handleChange}
                                                                                                              type="number"
                                                                                                              value={formik.values.appartmentCount}
                                                                                                    />
                                                                                                    <TextField
                                                                                                              error={!!(formik.touched.tenantCount && formik.errors.tenantCount)}
                                                                                                              fullWidth
                                                                                                              label="Tenant count"
                                                                                                              name="tenantCount"
                                                                                                              onBlur={formik.handleBlur}
                                                                                                              onChange={formik.handleChange}
                                                                                                              type="number"
                                                                                                              value={formik.values.tenantCount}
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
                                                                                                    <div>
                                                                                                              <FormControlLabel
                                                                                                                        control={<Switch defaultChecked />}
                                                                                                                        label="Has gas heating"
                                                                                                                        value={formik.values.hasGasHeating}
                                                                                                                        name='hasGasHeating'
                                                                                                              />
                                                                                                    </div><div>
                                                                                                              <FormControlLabel
                                                                                                                        control={<Switch defaultChecked />}
                                                                                                                        label="Has central heating"
                                                                                                                        value={formik.values.hasCentralHeating}
                                                                                                                        name='hasCentralHeating'
                                                                                                              />
                                                                                                    </div>
                                                                                                    <div>
                                                                                                              <FormControlLabel
                                                                                                                        control={<Switch defaultChecked />}
                                                                                                                        label="Has electrical heating"
                                                                                                                        value={formik.values.hasElectricHeating}
                                                                                                                        name='hasElectricHeating'
                                                                                                              />
                                                                                                    </div>
                                                                                                    <div>
                                                                                                              <FormControlLabel
                                                                                                                        control={<Switch defaultChecked />}
                                                                                                                        label="Has solar power"
                                                                                                                        value={formik.values.hasSolarPower}
                                                                                                                        name='hasSolarPower'
                                                                                                              />
                                                                                                    </div>
                                                                                                    <div>
                                                                                                              <FormControlLabel
                                                                                                                        control={<Switch defaultChecked />}
                                                                                                                        label="Has own water pump"
                                                                                                                        value={formik.values.hasOwnWaterPump}
                                                                                                                        name='hasOwnWaterPump'
                                                                                                              />
                                                                                                    </div>
                                                                                          </Stack>
                                                                                </Grid>
                                                                      </Grid>
                                                            </CardContent>
                                                  </Card>
                                                  {/*-------------------Issues-------------------*/}
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
                                                                                          <Typography variant="h6">Issues</Typography>
                                                                                </Grid>
                                                                                <Grid
                                                                                          xs={12}
                                                                                          md={8}
                                                                                >
                                                                                          <Stack spacing={3}>
                                                                                                    <Grid container
                                                                                                    // className={classes.root} spacing={3}
                                                                                                    >
                                                                                                              <Grid container
                                                                                                              // className={classes.boardsWrap}
                                                                                                              >
                                                                                                                        <Grid
                                                                                                                        // className={classes.boardsContent}
                                                                                                                        >
                                                                                                                                  {
                                                                                                                                            tasks !== null && tasks !== undefined && tasks.length != 0 ?
                                                                                                                                                      tasks.map((task: any) => {
                                                                                                                                                                return (
                                                                                                                                                                          <Paper key={task.id}
                                                                                                                                                                                    elevation={3}
                                                                                                                                                                          // className={classes.boardCard}
                                                                                                                                                                          >
                                                                                                                                                                                    {/* <BoardHeader title={task.title} /> */}
                                                                                                                                                                                    <Divider />
                                                                                                                                                                                    <BoardsList boards={task.boards} />
                                                                                                                                                                                    <Divider
                                                                                                                                                                                    // className={classes.divider}
                                                                                                                                                                                    />
                                                                                                                                                                                    {/* <BoardFooter /> */}
                                                                                                                                                                          </Paper>
                                                                                                                                                                )

                                                                                                                                                      })
                                                                                                                                                      :
                                                                                                                                                      null
                                                                                                                                  }
                                                                                                                        </Grid>
                                                                                                              </Grid>
                                                                                                    </Grid>
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
