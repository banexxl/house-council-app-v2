import type { FC } from 'react';
import { FormEvent, useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import SearchMdIcon from '@untitled-ui/icons-react/build/esm/SearchMd';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Input from '@mui/material/Input';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';

import { MultiSelect } from 'src/components/multi-select';
import { useUpdateEffect } from 'src/hooks/use-update-effect';
import { useTranslation } from 'react-i18next';

interface Filters {
  name?: string;
  amenities: string[];
  statuses: string[];
  specifications: string[];
}

interface SearchChip {
  label: string;
  field: 'name' | 'amenities' | 'statuses' | 'specifications';
  value: unknown;
  displayValue?: unknown;
}

interface Option {
  label: string;
  value: string;
}

const statusOptions: Option[] = [
  { label: 'Vacant', value: 'vacant' },
  { label: 'Partially Leased', value: 'partially_leased' },
  { label: 'Renovation', value: 'renovation' },
  { label: 'Under Construction', value: 'under_construction' },
  { label: 'Active', value: 'active' },
  { label: 'Temporary', value: 'temporary' },
  { label: 'Historical', value: 'historical' },
  { label: 'Condemned', value: 'condemned' },
  { label: 'For Sale', value: 'for_sale' },
  { label: 'Leased', value: 'leased' },
  { label: 'Planned', value: 'planned' },
  { label: 'Demolished', value: 'demolished' },
  { label: 'Restricted Access', value: 'restricted_access' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Under Inspection', value: 'under_inspection' },
];
const specificationOptions: Option[] = [
  {
    label: 'Number of apartments',
    value: 'number_of_apartments',
  },
  {
    label: 'Stories high',
    value: 'stories_high',
  },
];

interface BuildingListSearchProps {
  onFiltersChange?: (filters: Filters) => void;
}

export const BuildingListSearch: FC<BuildingListSearchProps> = (props) => {
  const { onFiltersChange, ...other } = props;
  const queryRef = useRef<HTMLInputElement | null>(null);
  const [chips, setChips] = useState<SearchChip[]>([]);
  const { t } = useTranslation();


  const amenityOptions: Option[] = [
    {
      label: t('common.lblHasParkingLot'),
      value: 'has_parking_lot',
    },
    {
      label: t('common.lblHasGasHeating'),
      value: 'has_gas_heating',
    },
    {
      label: t('common.lblHasCentralHeating'),
      value: 'has_central_heating',
    },
    {
      label: t('common.lblHasSolarPower'),
      value: 'has_solar_power',
    },
    {
      label: t('common.lblHasElectricHeating'),
      value: 'has_electric_heating',
    },
    {
      label: t('common.lblHasBicycleRoom'),
      value: 'has_bicycle_room',
    },
    {
      label: t('common.lblHasPreHeatedWater'),
      value: 'has_pre_heated_water',
    },
    {
      label: t('common.lblHasElevator'),
      value: 'has_elevator',
    },
    {
      label: t('common.lblRecentlyBuilt'),
      value: 'is_recently_built',
    }
  ];

  const handleChipsUpdate = useCallback(() => {
    const filters: Filters = {
      name: undefined,
      amenities: [],
      statuses: [],
      specifications: [],
    };

    chips.forEach((chip) => {
      switch (chip.field) {
        case 'name':
          // There will (or should) be only one chips with field "name"
          // so we can set up it directly
          filters.name = chip.value as string;
          break;
        case 'amenities':
          filters.amenities.push(chip.value as string);
          break;
        case 'statuses':
          filters.statuses.push(chip.value as string);
          break;
        case 'specifications':
          // The value can be "available" or "outOfStock" and we transform it to a boolean
          filters.specifications.push(chip.value as string);
          break;
        default:
          break;
      }
    });

    onFiltersChange?.(filters);
  }, [chips, onFiltersChange]);

  useUpdateEffect(() => {
    handleChipsUpdate();
  }, [chips, handleChipsUpdate]);

  const handleChipDelete = useCallback((deletedChip: SearchChip): void => {
    setChips((prevChips) => {
      return prevChips.filter((chip) => {
        // There can exist multiple chips for the same field.
        // Filter them by value.

        return !(deletedChip.field === chip.field && deletedChip.value === chip.value);
      });
    });
  }, []);

  const handleQueryChange = useCallback((event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const value = queryRef.current?.value || '';

    setChips((prevChips) => {
      const found = prevChips.find((chip) => chip.field === 'name');

      if (found && value) {
        return prevChips.map((chip) => {
          if (chip.field === 'name') {
            return {
              ...chip,
              value: queryRef.current?.value || '',
            };
          }

          return chip;
        });
      }

      if (found && !value) {
        return prevChips.filter((chip) => chip.field !== 'name');
      }

      if (!found && value) {
        const chip: SearchChip = {
          label: 'Name',
          field: 'name',
          value,
        };

        return [...prevChips, chip];
      }

      return prevChips;
    });

    if (queryRef.current) {
      queryRef.current.value = '';
    }
  }, []);

  const handleAmenityChange = useCallback((values: string[]): void => {
    setChips((prevChips) => {
      const valuesFound: string[] = [];

      // First cleanup the previous chips
      const newChips = prevChips.filter((chip) => {
        if (chip.field !== 'amenities') {
          return true;
        }

        const found = values.includes(chip.value as string);

        if (found) {
          valuesFound.push(chip.value as string);
        }

        return found;
      });

      // Nothing changed
      if (values.length === valuesFound.length) {
        return newChips;
      }

      values.forEach((value) => {
        if (!valuesFound.includes(value)) {
          const option = amenityOptions.find((option) => option.value === value);

          newChips.push({
            label: 'Amenity',
            field: 'amenities',
            value,
            displayValue: option!.label,
          });
        }
      });

      return newChips;
    });
  }, []);

  const handleStatusChange = useCallback((values: string[]): void => {
    setChips((prevChips) => {
      const valuesFound: string[] = [];

      // First cleanup the previous chips
      const newChips = prevChips.filter((chip) => {
        if (chip.field !== 'statuses') {
          return true;
        }

        const found = values.includes(chip.value as string);

        if (found) {
          valuesFound.push(chip.value as string);
        }

        return found;
      });

      // Nothing changed
      if (values.length === valuesFound.length) {
        return newChips;
      }

      values.forEach((value) => {
        if (!valuesFound.includes(value)) {
          const option = statusOptions.find((option) => option.value === value);

          newChips.push({
            label: 'Statuses',
            field: 'statuses',
            value,
            displayValue: option!.label,
          });
        }
      });

      return newChips;
    });
  }, []);

  const handleSpecificationChange = useCallback((values: string[]): void => {
    setChips((prevChips) => {
      const valuesFound: string[] = [];

      // First cleanup the previous chips
      const newChips = prevChips.filter((chip) => {
        if (chip.field !== 'specifications') {
          return true;
        }

        const found = values.includes(chip.value as string);

        if (found) {
          valuesFound.push(chip.value as string);
        }

        return found;
      });

      // Nothing changed
      if (values.length === valuesFound.length) {
        return newChips;
      }

      values.forEach((value) => {
        if (!valuesFound.includes(value)) {
          const option = specificationOptions.find((option) => option.value === value);

          newChips.push({
            label: 'Specifications',
            field: 'specifications',
            value,
            displayValue: option!.label,
          });
        }
      });

      return newChips;
    });
  }, []);

  // We memoize this part to prevent re-render issues
  const amenityValues = useMemo(
    () => chips.filter((chip) => chip.field === 'amenities').map((chip) => chip.value) as string[],
    [chips]
  );

  const statusValues = useMemo(
    () => chips.filter((chip) => chip.field === 'statuses').map((chip) => chip.value) as string[],
    [chips]
  );

  const specificationValues = useMemo(
    () => chips.filter((chip) => chip.field === 'specifications').map((chip) => chip.value) as string[],
    [chips]
  )

  const showChips = chips.length > 0;

  return (
    <div {...other}>
      <Stack
        alignItems="center"
        component="form"
        direction="row"
        onSubmit={handleQueryChange}
        spacing={2}
        sx={{ p: 2 }}
      >
        <SvgIcon>
          <SearchMdIcon />
        </SvgIcon>
        <Input
          defaultValue=""
          disableUnderline
          fullWidth
          inputProps={{ ref: queryRef }}
          placeholder={t('common.filterSearchByName')}
          sx={{ flexGrow: 1 }}
        />
      </Stack>
      <Divider />
      {showChips ? (
        <Stack
          alignItems="center"
          direction="row"
          flexWrap="wrap"
          gap={1}
          sx={{ p: 2 }}
        >
          {chips.map((chip, index) => (
            <Chip
              key={index}
              label={
                <Box
                  sx={{
                    alignItems: 'center',
                    display: 'flex',
                    '& span': {
                      fontWeight: 600,
                    },
                  }}
                >
                  <>
                    <span>{chip.label}</span>: {chip.displayValue || chip.value}
                  </>
                </Box>
              }
              onDelete={(): void => handleChipDelete(chip)}
              variant="outlined"
            />
          ))}
        </Stack>
      ) : (
        <Box sx={{ p: 2.5 }}>
          <Typography
            color="text.secondary"
            variant="subtitle2"
          >
            {t('common.tableFilterNoFilterSelected')}
          </Typography>
        </Box>
      )}
      <Divider />
      <Stack
        alignItems="center"
        direction="row"
        flexWrap="wrap"
        spacing={1}
        sx={{ p: 1 }}
      >
        <MultiSelect
          label={t('common.tableFilterAmenities')}
          onChange={handleAmenityChange}
          options={amenityOptions}
          value={amenityValues}
        />
        <MultiSelect
          label={t('common.tableFilterStatus')}
          onChange={handleStatusChange}
          options={statusOptions}
          value={statusValues}
        />
        <MultiSelect
          label={t('common.tableFilterSpecification')}
          onChange={handleSpecificationChange}
          options={specificationOptions}
          value={specificationValues}
        />
      </Stack>
    </div>
  );
};

BuildingListSearch.propTypes = {
  onFiltersChange: PropTypes.func,
};
