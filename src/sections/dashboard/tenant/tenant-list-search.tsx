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
  name: string;
  email: string
  tenant_types: string[];
  is_primary?: boolean | null;
}

interface SearchChip {
  label: string;
  field: keyof Filters;
  value: string;
  displayValue: string;
}

const tenantTypeOptions = [
  { name: 'owner', resource_string: 'tenants.tenantTypeOwner' },
  { name: 'renter', resource_string: 'tenants.tenantTypeRenter' },
];

interface TenantListSearchProps {
  onFiltersChange?: (filters: Filters) => void;
}

export const TenantListSearch: FC<TenantListSearchProps> = ({ onFiltersChange }) => {
  const queryRef = useRef<HTMLInputElement | null>(null);
  const [chips, setChips] = useState<SearchChip[]>([]);
  const { t } = useTranslation();

  const handleChipsUpdate = useCallback(() => {
    const filters: Filters = {
      name: '',
      email: '',
      tenant_types: [],
      is_primary: null,
    };

    chips.forEach((chip) => {
      if (chip.field === 'name') filters.name = chip.value;
      else if (chip.field === 'tenant_types') filters.tenant_types.push(chip.value);
      else if (chip.field === 'is_primary') filters.is_primary = chip.value === 'true';
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
      const existing = prev.find((chip) => chip.field === 'name');

      if (existing && value) {
        return prev.map((chip) =>
          chip.field === 'name' ? { ...chip, value, displayValue: value } : chip
        );
      }

      if (existing && !value) {
        return prev.filter((chip) => chip.field !== 'name');
      }

      if (!existing && value) {
        return [
          ...prev,
          {
            label: 'tenants.lblTenantName',
            field: 'name',
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
    (field: 'tenant_types' | 'is_primary', label: string) => (values: string[]) => {
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

  const handleTypeChange = handleGenericChange('tenant_types', 'tenants.lblTenantType');
  const handlePrimaryChange = handleGenericChange('is_primary', 'tenants.lblIsPrimary');

  const typeValues = useMemo(() => chips.filter((c) => c.field === 'tenant_types').map((c) => c.value), [chips]);
  const primaryValues = useMemo(() => chips.filter((c) => c.field === 'is_primary').map((c) => c.value), [chips]);

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
          placeholder={t('tenants.filterSearchByName')}
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
            {t('tenants.tableFilterNoFilterSelected')}
          </Typography>
        </Box>
      )}
      <Divider />
      <Stack direction="row" flexWrap="wrap" spacing={1} sx={{ p: 1 }}>
        <MultiSelect
          label={t('tenants.lblTenantType')}
          onChange={handleTypeChange}
          options={tenantTypeOptions.map((val) => ({ resource_string: val.resource_string }))}
          value={typeValues}
        />
        <MultiSelect
          label={t('tenants.lblIsPrimary')}
          onChange={handlePrimaryChange}
          options={[{ resource_string: 'common.lblYes' }, { resource_string: 'common.lblNo' }]}
          value={primaryValues}
        />
      </Stack>
    </div>
  );
};

TenantListSearch.propTypes = {
  onFiltersChange: PropTypes.func,
};
