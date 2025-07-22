'use client';

import React, { FC, useState, useCallback, ChangeEvent } from 'react';
import PropTypes from 'prop-types';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Button, Divider, InputAdornment, OutlinedInput, Stack, SvgIcon, Tab, Tabs, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';


export interface TabOption {
  label: string;
  value: string;
}

export interface SortOption {
  label: string;
  value: string;
}

export type SortDir = 'asc' | 'desc';

interface FilterBarProps<T> {
  tabs: TabOption[];
  sortOptions: SortOption[];
  onTabsChange?: (tab: string) => void;
  onFiltersChange?: (filters: Record<string, any>) => void;
  onSortChange?: (sortBy: keyof T, sortDir: SortDir) => void;
  initialSortBy?: keyof T;
  initialSortDir?: SortDir;
  sortBy?: keyof T;
  sortDir?: SortDir;
  btnAddUrl?: string;
}

export const FilterBar = <T,>({
  tabs,
  sortOptions,
  onFiltersChange,
  onSortChange,
  initialSortBy,
  initialSortDir = 'asc',
  btnAddUrl
}: FilterBarProps<T>) => {

  const router = useRouter();
  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState<string>(tabs[0]?.value || '');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sort, setSort] = useState<string>(`${String(initialSortBy) || ''}|${initialSortDir}`);
  const [loading, setLoading] = useState<boolean>(false);

  const handleTabsChange = useCallback(
    (event: ChangeEvent<any>, value: string) => {
      setCurrentTab(value);
      const updatedFilters = tabs.reduce<Record<string, boolean>>((acc, tab) => {
        acc[tab.value] = tab.value === value;
        return acc;
      }, {});
      setFilters(updatedFilters);
      onFiltersChange?.(updatedFilters);
    },
    [tabs, onFiltersChange]
  );

  const handleQueryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setFilters((prev) => ({ ...prev, query }));
    onFiltersChange?.({ ...filters, query });
  }, [filters, onFiltersChange]);

  const handleSortChange = useCallback((event: ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
    const [sortBy, sortDir] = event.target.value.split('|') as [string, SortDir];
    setSort(event.target.value);
    onSortChange?.(sortBy as keyof T, sortDir);
  }, [onSortChange]);

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
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
        <Button
          variant="contained"
          loading={loading}
          onClick={() => {
            router.push(btnAddUrl!);
            setLoading(true)
          }}
        >
          {t('common.btnAdd')}
        </Button>
      </Box>
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
                  <SearchIcon />
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
};
