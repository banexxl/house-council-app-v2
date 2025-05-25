import type { ChangeEvent, FC, MouseEvent } from 'react';
import { Fragment, useCallback, useState } from 'react';
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

import { Scrollbar } from 'src/components/scrollbar';
import { SeverityPill } from 'src/components/severity-pill';
import type { Building } from 'src/types/building';

interface CategoryOption {
  label: string;
  value: string;
}

const categoryOptions: CategoryOption[] = [
  {
    label: 'Healthcare',
    value: 'healthcare',
  },
  {
    label: 'Makeup',
    value: 'makeup',
  },
  {
    label: 'Dress',
    value: 'dress',
  },
  {
    label: 'Skincare',
    value: 'skincare',
  },
  {
    label: 'Jewelry',
    value: 'jewelry',
  },
  {
    label: 'Blouse',
    value: 'blouse',
  },
];

interface BuildingListTableProps {
  count?: number;
  items?: Building[];
  onPageChange?: (event: MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
  onRowsPerPageChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  page?: number;
  rowsPerPage?: number;
}

export const BuildingListTable: FC<BuildingListTableProps> = (props) => {
  const {
    count = 0,
    items = [],
    onPageChange = () => { },
    onRowsPerPageChange,
    page = 0,
    rowsPerPage = 0,
  } = props;
  const [currentBuilding, setCurrentBuilding] = useState<string | null>(null);

  const handleBuildingToggle = useCallback((productId: string): void => {
    setCurrentBuilding((prevBuildingId) => {
      if (prevBuildingId === productId) {
        return null;
      }

      return productId;
    });
  }, []);

  const handleBuildingClose = useCallback((): void => {
    setCurrentBuilding(null);
  }, []);

  const handleBuildingUpdate = useCallback((): void => {
    setCurrentBuilding(null);
    toast.success('Building updated');
  }, []);

  const handleBuildingDelete = useCallback((): void => {
    toast.error('Building cannot be deleted');
  }, []);

  return (
    <div>
      <Scrollbar>
        <Table sx={{ minWidth: 1200 }}>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell width="25%">Name</TableCell>
              <TableCell width="25%">Stock</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>sku</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          {/* <TableBody>
            {items.map((building) => {
              const isCurrent = building.id === currentBuilding;
              const price = numeral(building.price).format(`${building.currency}0,0.00`);
              const quantityColor = building.quantity >= 10 ? 'success' : 'error';
              const statusColor = building.status === 'published' ? 'success' : 'info';
              const hasManyVariants = building.variants > 1;

              return (
                <Fragment key={building.id}>
                  <TableRow
                    hover
                    key={building.id}
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
                      <IconButton onClick={() => handleBuildingToggle(building.id)}>
                        <SvgIcon>{isCurrent ? <ChevronDownIcon /> : <ChevronRightIcon />}</SvgIcon>
                      </IconButton>
                    </TableCell>
                    <TableCell width="25%">
                      <Box
                        sx={{
                          alignItems: 'center',
                          display: 'flex',
                        }}
                      >
                        {building.image ? (
                          <Box
                            sx={{
                              alignItems: 'center',
                              backgroundColor: 'neutral.50',
                              backgroundImage: `url(${building.image})`,
                              backgroundPosition: 'center',
                              backgroundSize: 'cover',
                              borderRadius: 1,
                              display: 'flex',
                              height: 80,
                              justifyContent: 'center',
                              overflow: 'hidden',
                              width: 80,
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              alignItems: 'center',
                              backgroundColor: 'neutral.50',
                              borderRadius: 1,
                              display: 'flex',
                              height: 80,
                              justifyContent: 'center',
                              width: 80,
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
                          <Typography variant="subtitle2">{building.name}</Typography>
                          <Typography
                            color="text.secondary"
                            variant="body2"
                          >
                            in {building.category}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell width="25%">
                      <LinearProgress
                        value={building.quantity}
                        variant="determinate"
                        color={quantityColor}
                        sx={{
                          height: 8,
                          width: 36,
                        }}
                      />
                      <Typography
                        color="text.secondary"
                        variant="body2"
                      >
                        {building.quantity} in stock
                        {hasManyVariants && ` in ${building.variants} variants`}
                      </Typography>
                    </TableCell>
                    <TableCell>{price}</TableCell>
                    <TableCell>{building.sku}</TableCell>
                    <TableCell>
                      <SeverityPill color={statusColor}>{building.status}</SeverityPill>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton>
                        <SvgIcon>
                          <DotsHorizontalIcon />
                        </SvgIcon>
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  {isCurrent && (
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
                        <CardContent>
                          <Grid
                            container
                            spacing={3}
                          >
                            <Grid
                              item
                              size={{ xs: 12, md: 6 }}
                            >
                              <Typography variant="h6">Basic details</Typography>
                              <Divider sx={{ my: 2 }} />
                              <Grid
                                container
                                spacing={3}
                              >
                                <Grid
                                  item
                                  size={{ xs: 12, md: 6 }}
                                >
                                  <TextField
                                    defaultValue={building.name}
                                    fullWidth
                                    label="Building name"
                                    name="name"
                                  />
                                </Grid>
                                <Grid
                                  item
                                  size={{ xs: 12, md: 6 }}
                                >
                                  <TextField
                                    defaultValue={building.sku}
                                    disabled
                                    fullWidth
                                    label="SKU"
                                    name="sku"
                                  />
                                </Grid>
                                <Grid
                                  item
                                  size={{ xs: 12, md: 6 }}
                                >
                                  <TextField
                                    defaultValue={building.category}
                                    fullWidth
                                    label="Category"
                                    select
                                  >
                                    {categoryOptions.map((option) => (
                                      <MenuItem
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                      </MenuItem>
                                    ))}
                                  </TextField>
                                </Grid>
                                <Grid
                                  item
                                  size={{ xs: 12, md: 6 }}
                                >
                                  <TextField
                                    defaultValue={building.id}
                                    disabled
                                    fullWidth
                                    label="Barcode"
                                    name="barcode"
                                  />
                                </Grid>
                              </Grid>
                            </Grid>
                            <Grid
                              item
                              size={{ xs: 12, md: 6 }}
                            >
                              <Typography variant="h6">Pricing and stocks</Typography>
                              <Divider sx={{ my: 2 }} />
                              <Grid
                                container
                                spacing={3}
                              >
                                <Grid
                                  item
                                  size={{ xs: 12, md: 6 }}
                                >
                                  <TextField
                                    defaultValue={building.price}
                                    fullWidth
                                    label="Old price"
                                    name="old-price"
                                    InputProps={{
                                      startAdornment: (
                                        <InputAdornment position="start">
                                          {building.currency}
                                        </InputAdornment>
                                      ),
                                    }}
                                    type="number"
                                  />
                                </Grid>
                                <Grid
                                  item
                                  size={{ xs: 12, md: 6 }}
                                >
                                  <TextField
                                    defaultValue={building.price}
                                    fullWidth
                                    label="New price"
                                    name="new-price"
                                    InputProps={{
                                      startAdornment: (
                                        <InputAdornment position="start">$</InputAdornment>
                                      ),
                                    }}
                                    type="number"
                                  />
                                </Grid>
                                <Grid
                                  item
                                  size={{ xs: 12, md: 6 }}
                                  sx={{
                                    alignItems: 'center',
                                    display: 'flex',
                                  }}
                                >
                                  <Switch />
                                  <Typography variant="subtitle2">
                                    Keep selling when stock is empty
                                  </Typography>
                                </Grid>
                              </Grid>
                            </Grid>
                          </Grid>
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
                              onClick={handleBuildingUpdate}
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
                          <div>
                            <Button
                              onClick={handleBuildingDelete}
                              color="error"
                            >
                              Delete building
                            </Button>
                          </div>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody> */}
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
    </div>
  );
};

BuildingListTable.propTypes = {
  count: PropTypes.number,
  items: PropTypes.array,
  onPageChange: PropTypes.func,
  onRowsPerPageChange: PropTypes.func,
  page: PropTypes.number,
  rowsPerPage: PropTypes.number,
};
