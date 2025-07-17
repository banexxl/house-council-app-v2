'use client';

import type { FC, FormEvent } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
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
import PropTypes from 'prop-types';

interface Filters {
  apartment_number?: string;
  apartment_types: string[];
  apartment_statuses: string[];
}

interface SearchChip {
  label: string;
  field: keyof Filters;
  value: string;
  displayValue: string;
}

const typeOptions = [
  { name: 'residential', resource_string: 'apartments.lblApartmentTypeResidential' },
  { name: 'business', resource_string: 'apartments.lblApartmentTypeBusiness' },
  { name: 'mixed_use', resource_string: 'apartments.lblApartmentTypeMixedUse' },
  { name: 'vacation', resource_string: 'apartments.lblApartmentTypeVacation' },
  { name: 'storage', resource_string: 'apartments.lblApartmentTypeStorage' },
  { name: 'garage', resource_string: 'apartments.lblApartmentTypeGarage' },
  { name: 'utility', resource_string: 'apartments.lblApartmentTypeUtility' },
];

const rentalStatusOptions = [
  { name: 'owned', resource_string: 'apartments.lblOwned' },
  { name: 'rented', resource_string: 'apartments.lblRented' },
  { name: 'for_rent', resource_string: 'apartments.lblForRent' },
  { name: 'vacant', resource_string: 'apartments.lblVacant' },
];

interface ApartmentListSearchProps {
  onFiltersChange?: (filters: Filters) => void;
}

export const ApartmentListSearch: FC<ApartmentListSearchProps> = ({ onFiltersChange }) => {
  const queryRef = useRef<HTMLInputElement | null>(null);
  const [chips, setChips] = useState<SearchChip[]>([]);
  const { t } = useTranslation();

  const handleChipsUpdate = useCallback(() => {
    const filters: Filters = {
      apartment_number: undefined,
      apartment_types: [],
      apartment_statuses: [],
    };

    chips.forEach((chip) => {
      if (chip.field === 'apartment_number') filters.apartment_number = chip.value;
      else if (chip.field === 'apartment_types') filters.apartment_types.push(chip.value);
      else if (chip.field === 'apartment_statuses') filters.apartment_statuses.push(chip.value);
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
            label: 'apartments.lblApartmentNumber',
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

  const handleGenericChange = useCallback(
    (field: 'apartment_types' | 'apartment_statuses', label: string) =>
      (values: string[]) => {
        setChips((prevChips) => {
          const existing = prevChips.filter((chip) => chip.field === field).map((chip) => chip.value);
          const toRemove = new Set(existing);
          const newChips = prevChips.filter((chip) => chip.field !== field || values.includes(chip.value));

          values.forEach((value) => {
            if (!toRemove.has(value)) {
              newChips.push({
                label,
                field,
                value,
                displayValue: t(value),
              });
            }
          });

          return newChips;
        });
      },
    [t]
  );

  // Usage
  const handleTypeChange = handleGenericChange('apartment_types', 'apartments.lblType');
  const handleRentalStatusChange = handleGenericChange('apartment_statuses', 'apartments.lblRentalStatus');

  // Selected values
  const typeValues = useMemo(() => chips.filter((c) => c.field === 'apartment_types').map((c) => c.value), [chips]);
  const rentalValues = useMemo(() => chips.filter((c) => c.field === 'apartment_statuses').map((c) => c.value), [chips]);

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
          placeholder={t('apartments.filterSearchByApartmentNumber')}
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
            {t('apartments.tableFilterNoFilterSelected')}
          </Typography>
        </Box>
      )}
      <Divider />
      <Stack direction="row" flexWrap="wrap" spacing={1} sx={{ p: 1 }}>
        <MultiSelect
          label={t('apartments.lblType')}
          onChange={handleTypeChange}
          options={typeOptions.map((val) => ({
            resource_string: val.resource_string,
          }))}
          value={typeValues}
        />
        <MultiSelect
          label={t('apartments.lblRentalStatus')}
          onChange={handleRentalStatusChange}
          options={rentalStatusOptions.map((val) => ({
            resource_string: val.resource_string,
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
