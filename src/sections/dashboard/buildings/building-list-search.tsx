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
import { BaseEntity } from 'src/types/base-entity';

interface Filters {
  name?: string;
  amenities: string[];
  statuses: string[];
}

interface SearchChip {
  label: string;
  field: 'name' | 'amenities' | 'statuses';
  value: string;
  displayValue: string;
}

interface Option {
  resource_string: string;
}

const amenityOptions: Option[] = [
  {
    resource_string: 'common.lblHasParkingLot',
  },
  {
    resource_string: 'common.lblHasGasHeating',
  },
  {
    resource_string: 'common.lblHasCentralHeating',
  },
  {
    resource_string: 'common.lblHasSolarPower',
  },
  {
    resource_string: 'common.lblHasElectricHeating',
  },
  {
    resource_string: 'common.lblHasBicycleRoom',
  },
  {
    resource_string: 'common.lblHasPreHeatedWater',
  },
  {
    resource_string: 'common.lblHasElevator',
  },
  {
    resource_string: 'common.lblRecentlyBuilt',
  }
];

interface BuildingListSearchProps {
  onFiltersChange?: (filters: Filters) => void;
  buildingStatuses: (BaseEntity & { resource_string: string })[]
}

export const BuildingListSearch: FC<BuildingListSearchProps> = (props) => {
  const { onFiltersChange, ...other } = props;
  const queryRef = useRef<HTMLInputElement | null>(null);
  const [chips, setChips] = useState<SearchChip[]>([]);
  const { t } = useTranslation();

  const handleChipsUpdate = useCallback(() => {
    const filters: Filters = {
      name: undefined,
      amenities: [],
      statuses: [],
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
          displayValue: value,
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
          const option = amenityOptions.find((option) => option.resource_string === value);

          newChips.push({
            label: t('common.lblAmenity'),
            field: 'amenities',
            value,
            displayValue: option!.resource_string,
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
          const option = props.buildingStatuses.find((option) => option.resource_string === value);

          newChips.push({
            label: t('common.lblStatus'),
            field: 'statuses',
            value,
            displayValue: option!.name,
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
          placeholder={t('common.filterSearchByAddress')}
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
                    <span>{t(chip.label)}</span>: {t(chip.displayValue || chip.value)}
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
          options={props.buildingStatuses}
          value={statusValues}
        />
      </Stack>
    </div>
  );
};

BuildingListSearch.propTypes = {
  onFiltersChange: PropTypes.func,
};
