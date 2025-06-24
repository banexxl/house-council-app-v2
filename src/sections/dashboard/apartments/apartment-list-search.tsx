'use client';

import type { FC, FormEvent } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import SearchMdIcon from '@untitled-ui/icons-react/build/esm/SearchMd';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Input from '@mui/material/Input';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';

import { useTranslation } from 'react-i18next';
import { MultiSelect } from 'src/components/multi-select';
import { useUpdateEffect } from 'src/hooks/use-update-effect';

interface Filters {
  apartment_number?: string;
  types: string[];
  rentalStatuses: string[];
}

interface SearchChip {
  label: string;
  field: keyof Filters;
  value: string;
  displayValue: string;
}

const typeOptions = [
  'residential',
  'business',
  'mixed_use',
  'vacation',
  'storage',
  'garage',
  'utility',
];

const rentalStatusOptions = ['owned', 'rented', 'for_rent', 'vacant'];

interface ApartmentListSearchProps {
  onFiltersChange?: (filters: Filters) => void;
}

export const ApartmentListSearch: FC<ApartmentListSearchProps> = ({ onFiltersChange }) => {
  const queryRef = useRef<HTMLInputElement | null>(null);
  const { t } = useTranslation();

  const [chips, setChips] = useState<SearchChip[]>([]);

  const handleChipsUpdate = useCallback(() => {
    const filters: Filters = {
      apartment_number: undefined,
      types: [],
      rentalStatuses: [],
    };

    chips.forEach((chip) => {
      if (chip.field === 'apartment_number') {
        filters.apartment_number = chip.value;
      } else if (chip.field === 'types') {
        filters.types.push(chip.value);
      } else if (chip.field === 'rentalStatuses') {
        filters.rentalStatuses.push(chip.value);
      }
    });

    onFiltersChange?.(filters);
  }, [chips, onFiltersChange]);

  useUpdateEffect(() => {
    handleChipsUpdate();
  }, [chips, handleChipsUpdate]);

  const handleChipDelete = useCallback((chipToDelete: SearchChip) => {
    setChips((prev) =>
      prev.filter(
        (chip) =>
          !(chip.field === chipToDelete.field && chip.value === chipToDelete.value)
      )
    );
  }, []);

  const handleQueryChange = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = queryRef.current?.value || '';

    setChips((prev) => {
      const existing = prev.find((chip) => chip.field === 'apartment_number');

      if (existing && value) {
        return prev.map((chip) =>
          chip.field === 'apartment_number' ? { ...chip, value, displayValue: value } : chip
        );
      }

      if (existing && !value) {
        return prev.filter((chip) => chip.field !== 'apartment_number');
      }

      if (!existing && value) {
        return [
          ...prev,
          {
            label: 'common.lblApartmentNumber',
            field: 'apartment_number',
            value,
            displayValue: value,
          },
        ];
      }

      return prev;
    });

    if (queryRef.current) queryRef.current.value = '';
  }, []);

  const handleTypeChange = useCallback((values: string[]) => {
    setChips((prev) => {
      const found: string[] = [];
      const newChips = prev.filter((chip) => {
        if (chip.field !== 'types') return true;
        const match = values.includes(chip.value);
        if (match) found.push(chip.value);
        return match;
      });

      values.forEach((val) => {
        if (!found.includes(val)) {
          newChips.push({
            label: 'common.lblType',
            field: 'types',
            value: val,
            displayValue: t(`apartments.type.${val}`),
          });
        }
      });

      return newChips;
    });
  }, [t]);

  const handleRentalStatusChange = useCallback((values: string[]) => {
    setChips((prev) => {
      const found: string[] = [];
      const newChips = prev.filter((chip) => {
        if (chip.field !== 'rentalStatuses') return true;
        const match = values.includes(chip.value);
        if (match) found.push(chip.value);
        return match;
      });

      values.forEach((val) => {
        if (!found.includes(val)) {
          newChips.push({
            label: 'common.lblRentalStatus',
            field: 'rentalStatuses',
            value: val,
            displayValue: t(`apartments.rentalStatus.${val}`),
          });
        }
      });

      return newChips;
    });
  }, [t]);

  const typeValues = useMemo(() => chips.filter((c) => c.field === 'types').map((c) => c.value), [chips]);
  const rentalValues = useMemo(() => chips.filter((c) => c.field === 'rentalStatuses').map((c) => c.value), [chips]);

  return (
    <div>
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
          placeholder={t('common.filterSearchByApartmentNumber')}
          sx={{ flexGrow: 1 }}
        />
      </Stack>
      <Divider />
      {chips.length > 0 ? (
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ p: 2 }}>
          {chips.map((chip, index) => (
            <Chip
              key={index}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', '& span': { fontWeight: 600 } }}>
                  <span>{t(chip.label)}</span>: {chip.displayValue}
                </Box>
              }
              onDelete={() => handleChipDelete(chip)}
              variant="outlined"
            />
          ))}
        </Stack>
      ) : (
        <Box sx={{ p: 2.5 }}>
          <Typography color="text.secondary" variant="subtitle2">
            {t('common.tableFilterNoFilterSelected')}
          </Typography>
        </Box>
      )}
      <Divider />
      <Stack direction="row" flexWrap="wrap" spacing={1} sx={{ p: 1 }}>
        <MultiSelect
          label={t('common.lblType')}
          onChange={handleTypeChange}
          options={typeOptions.map((val) => ({
            resource_string: val,
          }))}
          value={typeValues}
        />
        <MultiSelect
          label={t('common.lblRentalStatus')}
          onChange={handleRentalStatusChange}
          options={rentalStatusOptions.map((val) => ({
            resource_string: val,
          }))}
          value={rentalValues}
        />
      </Stack>
    </div>
  );
};

ApartmentListSearch.propTypes = {
  onFiltersChange: PropTypes.func,
};
