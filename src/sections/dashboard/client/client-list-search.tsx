'use client';

import React, { FC, useState, useCallback, ChangeEvent } from 'react';
import PropTypes from 'prop-types';
import SearchMdIcon from '@untitled-ui/icons-react/build/esm/SearchMd';
import { Box, Divider, InputAdornment, OutlinedInput, Stack, SvgIcon, Tab, Tabs, TextField } from '@mui/material';
import { Client } from 'src/types/client';
import { useTranslation } from 'react-i18next';

export interface TabOption {
  label: string;
  value: string;
}

export interface SortOption {
  label: string;
  value: string;
}

export type SortDir = 'asc' | 'desc';


interface FilterBarProps {

  tabs: TabOption[];

  sortOptions: SortOption[];

  onTabsChange?: (tab: string) => void

  onFiltersChange?: (filters: Record<string, any>) => void;

  onSortChange?: (sortBy: keyof Client, sortDir: SortDir) => void;

  initialSortBy?: keyof Client;

  initialSortDir?: SortDir;

  sortBy?: keyof Client;

  sortDir?: SortDir;

}

export const FilterBar: FC<FilterBarProps> = ({
  tabs,
  sortOptions,
  onFiltersChange,
  onSortChange,
  initialSortBy = '',
  initialSortDir = 'asc',
}) => {

  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState<string>(tabs[0]?.value || '');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sort, setSort] = useState<string>(`${initialSortBy}|${initialSortDir}`);

  const handleTabsChange = useCallback(
    (event: ChangeEvent<any>, value: string) => {
      setCurrentTab(value);

      // Update filters: set the selected tab to true and the rest to false
      const updatedFilters = tabs.reduce<Record<string, boolean>>((acc, tab) => {
        acc[tab.value] = tab.value === value; // Set only the matching tab to true
        return acc;
      }, {});

      setFilters(updatedFilters);
      onFiltersChange?.(updatedFilters); // Pass the updated filters to the callback
    },
    [tabs, onFiltersChange] // Include tabs in the dependency array
  );

  const handleQueryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setFilters((prev) => ({ ...prev, query }));
    onFiltersChange?.({ ...filters, query });
  }, [filters, onFiltersChange]);

  const handleSortChange = useCallback((event: ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
    const [sortBy, sortDir] = event.target.value.split('|') as [string, SortDir];
    setSort(event.target.value);
    onSortChange?.(sortBy as keyof Client, sortDir);
  }, [onSortChange]);

  return (
    <>
      <Tabs
        value={currentTab}
        onChange={handleTabsChange}
        indicatorColor="primary"
        textColor="primary"
        variant="scrollable"
        scrollButtons="auto"
        sx={{ px: 3 }}
      >
        {tabs.map((tab) => (
          <Tab key={tab.value} label={tab.label} value={tab.value} />
        ))}
      </Tabs>
      <Divider />
      <Stack
        direction="row"
        alignItems="center"
        spacing={3}
        sx={{ p: 3 }}
      >
        <Box component="form" sx={{ flexGrow: 1 }}>
          <OutlinedInput
            placeholder={t('common.search')}
            fullWidth
            startAdornment={
              <InputAdornment position="start">
                <SvgIcon>
                  <SearchMdIcon />
                </SvgIcon>
              </InputAdornment>
            }
            onChange={handleQueryChange}
          />
        </Box>
        <TextField
          label={t('common.sortBy')}
          select
          SelectProps={{ native: true }}
          value={sort}
          onChange={handleSortChange}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </TextField>
      </Stack>
    </>
  );
};

FilterBar.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    }).isRequired
  ).isRequired,
  sortOptions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    }).isRequired
  ).isRequired,
  onTabsChange: PropTypes.func,
  onFiltersChange: PropTypes.func,
  onSortChange: PropTypes.func,
  initialSortBy: PropTypes.oneOf<keyof Client>([
    'name',
    'email',
    'phone',
    'address_1',
    'contact_person',
    'type',
    'client_status',
    'notes',
    'address_2',
    'mobile_phone',
    'avatar',
    'balance',
    'has_accepted_marketing',
    'has_accepted_terms_and_conditions',
    'is_potential',
    'is_returning',
    'is_verified',
    'total_spent',
    'total_orders',
  ]),
  initialSortDir: PropTypes.oneOf<SortDir>(['asc', 'desc']),
};
