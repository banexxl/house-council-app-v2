// Refactored version of BuildingListSearch with corrected chip handling and name-based filtering
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

import { MultiSelect } from 'src/components/multi-select';
import { useUpdateEffect } from 'src/hooks/use-update-effect';
import { useTranslation } from 'react-i18next';
import { BuildingOptions } from 'src/types/building';

interface Filters {
  address?: string;
  amenities: string[];
  statuses: string[];
}

interface SearchChip {
  label: string;
  field: 'address' | 'amenities' | 'statuses';
  value: string; // <- name is stored here
  displayValue: string; // <- translated string for UI
}

const amenityOptions: BuildingOptions[] = [
  { name: 'has_parking_lot', resource_string: 'common.lblHasParkingLot' },
  { name: 'has_gas_heating', resource_string: 'common.lblHasGasHeating' },
  { name: 'has_central_heating', resource_string: 'common.lblHasCentralHeating' },
  { name: 'has_electric_heating', resource_string: 'common.lblHasElectricHeating' },
  { name: 'has_solar_power', resource_string: 'common.lblHasSolarPower' },
  { name: 'has_bicycle_room', resource_string: 'common.lblHasBicycleRoom' },
  { name: 'has_pre_heated_water', resource_string: 'common.lblHasPreHeatedWater' },
  { name: 'has_elevator', resource_string: 'common.lblHasElevator' },
  { name: 'is_recently_built', resource_string: 'common.lblRecentlyBuilt' }
];

const buildingStatuses: BuildingOptions[] = [
  { name: 'vacant', resource_string: 'buildings.lblBuildingStatusVacant' },
  { name: 'partially_leased', resource_string: 'buildings.lblBuildingStatusPartiallyLeased' },
  { name: 'renovation', resource_string: 'buildings.lblBuildingStatusRenovation' },
  { name: 'under_construction', resource_string: 'buildings.lblBuildingStatusUnderConstruction' },
  { name: 'active', resource_string: 'buildings.lblBuildingStatusActive' },
  { name: 'temporary', resource_string: 'buildings.lblBuildingStatusTemporary' },
  { name: 'historical', resource_string: 'buildings.lblBuildingStatusHistorical' },
  { name: 'condemned', resource_string: 'buildings.lblBuildingStatusCondemned' },
  { name: 'for_sale', resource_string: 'buildings.lblBuildingStatusForSale' },
  { name: 'leased', resource_string: 'buildings.lblBuildingStatusLeased' },
  { name: 'planned', resource_string: 'buildings.lblBuildingStatusPlanned' },
  { name: 'demolished', resource_string: 'buildings.lblBuildingStatusDemolished' },
  { name: 'restricted_access', resource_string: 'buildings.lblBuildingStatusRestrictedAccess' },
  { name: 'inactive', resource_string: 'buildings.lblBuildingStatusInactive' },
  { name: 'under_inspection', resource_string: 'buildings.lblBuildingStatusUnderInspection' }
];

interface BuildingListSearchProps {
  onFiltersChange?: (filters: Filters) => void;
}

export const BuildingListSearch: FC<BuildingListSearchProps> = ({ onFiltersChange }) => {
  const queryRef = useRef<HTMLInputElement | null>(null);
  const [chips, setChips] = useState<SearchChip[]>([]);
  const { t } = useTranslation();

  const handleChipsUpdate = useCallback(() => {
    const filters: Filters = { address: undefined, amenities: [], statuses: [] };

    chips.forEach((chip) => {
      if (chip.field === 'address') filters.address = chip.value;
      else if (chip.field === 'amenities') filters.amenities.push(chip.value);
      else if (chip.field === 'statuses') filters.statuses.push(chip.value); // value is name
    });

    onFiltersChange?.(filters);
  }, [chips, onFiltersChange]);

  useUpdateEffect(() => { handleChipsUpdate(); }, [chips, handleChipsUpdate]);

  const handleChipDelete = useCallback((deletedChip: SearchChip): void => {
    setChips((prev) => prev.filter((chip) => chip.field !== deletedChip.field || chip.value !== deletedChip.value));
  }, []);

  const handleQueryChange = useCallback((event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const value = queryRef.current?.value.trim() || '';

    setChips((prevChips) => {
      const existing = prevChips.find((chip) => chip.field === 'address');
      if (existing && value) {
        return prevChips.map((chip) => chip.field === 'address' ? { ...chip, value, displayValue: value } : chip);
      }
      if (existing && !value) return prevChips.filter((chip) => chip.field !== 'address');
      if (!existing && value) return [...prevChips, { label: 'Name', field: 'address', value, displayValue: value }];
      return prevChips;
    });

    if (queryRef.current) queryRef.current.value = '';
  }, []);

  const handleGenericChange = useCallback(
    (field: 'amenities' | 'statuses', options: BuildingOptions[]) => (values: string[]) => {
      setChips((prevChips) => {
        const existing = prevChips.filter((chip) => chip.field === field).map((chip) => chip.value);
        const toRemove = new Set(existing);
        const newChips = prevChips.filter((chip) => chip.field !== field || values.includes(chip.value));

        values.forEach((value) => {
          if (!toRemove.has(value)) {
            const option = options.find((opt) => opt.name === value);
            newChips.push({
              label: field === 'amenities' ? t('common.lblAmenity') : t('common.lblStatus'),
              field,
              value, // store name
              displayValue: t(option?.resource_string || value),
            });
          }
        });

        return newChips;
      });
    },
    [t]
  );

  const handleAmenityChange = handleGenericChange('amenities', amenityOptions);
  const handleStatusChange = handleGenericChange('statuses', buildingStatuses);

  const amenityValues = useMemo(() => chips.filter((c) => c.field === 'amenities').map((c) => c.value), [chips]);
  const statusValues = useMemo(() => chips.filter((c) => c.field === 'statuses').map((c) => c.value), [chips]);
  const showChips = chips.length > 0;

  return (
    <div>
      <Stack alignItems="center" component="form" direction="row" onSubmit={handleQueryChange} spacing={2} sx={{ p: 2 }}>
        <SvgIcon><SearchMdIcon /></SvgIcon>
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
        <Stack alignItems="center" direction="row" flexWrap="wrap" gap={1} sx={{ p: 2 }}>
          {chips.map((chip, index) => (
            <Chip
              key={index}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', '& span': { fontWeight: 600 } }}>
                  <>
                    <span>{t(chip.label)}</span>: {t(chip.displayValue || chip.value)}
                  </>
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
      <Stack alignItems="center" direction="row" flexWrap="wrap" spacing={1} sx={{ p: 1 }}>
        <MultiSelect label={t('common.tableFilterAmenities')} onChange={handleAmenityChange} options={amenityOptions} value={amenityValues} />
        <MultiSelect label={t('common.tableFilterStatus')} onChange={handleStatusChange} options={buildingStatuses} value={statusValues} />
      </Stack>
    </div>
  );
};

BuildingListSearch.propTypes = {
  onFiltersChange: PropTypes.func,
};
