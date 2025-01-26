'use client'

import type { FC } from 'react';
import { ChangeEvent, FormEvent, useCallback, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import SearchMdIcon from '@untitled-ui/icons-react/build/esm/SearchMd';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';

import { useUpdateEffect } from 'src/hooks/use-update-effect';

interface Filters {
  query?: string;
  has_accepted_marketing?: boolean;
  is_potential?: boolean;
  is_returning?: boolean;
}

type TabValue = 'all' | 'has_accepted_marketing' | 'is_potential' | 'is_returning';

interface TabOption {
  label: string;
  value: TabValue;
}

const tabs: TabOption[] = [
  {
    label: 'All',
    value: 'all',
  },
  {
    label: 'Accepts Marketing',
    value: 'has_accepted_marketing',
  },
  {
    label: 'Prospect',
    value: 'is_potential',
  },
  {
    label: 'Returning',
    value: 'is_returning',
  },
];

export type SortValue = 'updated_at|desc' | 'updated_at|asc' | 'name|desc' | 'name|asc';

interface SortOption {
  label: string;
  value: SortValue;
}

const sortOptions: SortOption[] = [
  {
    label: 'Last update (newest)',
    value: 'updated_at|desc',
  },
  {
    label: 'Last update (oldest)',
    value: 'updated_at|asc',
  },
  {
    label: 'Name (descending)',
    value: 'name|desc',
  },
  {
    label: 'Name (ascending)',
    value: 'name|asc',
  },
];

export type SortDir = 'asc' | 'desc';

interface ClientListSearchProps {
  onFiltersChange?: (filters: Filters) => void;
  onSortChange?: (sortBy: string, sortDir: SortDir) => void;
  sortBy?: string;
  sortDir?: SortDir;
}

export const ClientListSearch: FC<ClientListSearchProps> = (props) => {
  const { onFiltersChange, onSortChange, sortBy, sortDir } = props;
  const [currentTab, setCurrentTab] = useState<TabValue>('all');
  const [filters, setFilters] = useState<Filters>({});

  const handleFiltersUpdate = useCallback(() => {
    onFiltersChange?.(filters);
  }, [filters, onFiltersChange]);

  useUpdateEffect(() => {
    handleFiltersUpdate();
  }, [filters, handleFiltersUpdate]);

  const handleTabsChange = useCallback((event: ChangeEvent<any>, value: TabValue): void => {
    setCurrentTab(value);
    setFilters((prevState) => {
      const updatedFilters: Filters = {
        ...prevState,
        has_accepted_marketing: undefined,
        is_potential: undefined,
        is_returning: undefined,
      };

      if (value !== 'all') {
        updatedFilters[value] = true;
      }

      return updatedFilters;
    });
  }, []);

  const handleQueryChange = useCallback((event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setFilters((prevState) => ({
      ...prevState,
      query: (event.target as HTMLInputElement).value,
    }));
  }, []);

  const handleSortChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const [sortBy, sortDir] = event.target.value.split('|') as [string, SortDir];
      onSortChange?.(sortBy, sortDir);
    },
    [onSortChange]
  );

  return (
    <>
      <Tabs
        indicatorColor="primary"
        onChange={handleTabsChange}
        scrollButtons="auto"
        sx={{ px: 3 }}
        textColor="primary"
        value={currentTab}
        variant="scrollable"
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.value}
            label={tab.label}
            value={tab.value}
          />
        ))}
      </Tabs>
      <Divider />
      <Stack
        alignItems="center"
        direction="row"
        flexWrap="wrap"
        spacing={3}
        sx={{ p: 3 }}
      >
        <Box
          component="form"
          sx={{ flexGrow: 1 }}
        >
          <OutlinedInput
            defaultValue=""
            fullWidth
            placeholder="Search clients"
            startAdornment={
              <InputAdornment position="start">
                <SvgIcon>
                  <SearchMdIcon />
                </SvgIcon>
              </InputAdornment>
            }
            onChange={(event: any) => handleQueryChange(event)}
          />
        </Box>
        <TextField
          label="Sort By"
          name="sort"
          onChange={handleSortChange}
          select
          SelectProps={{ native: true }}
          value={`${sortBy}|${sortDir}`}
        >
          {sortOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </TextField>
      </Stack>
    </>
  );
};

ClientListSearch.propTypes = {
  onFiltersChange: PropTypes.func,
  onSortChange: PropTypes.func,
  sortBy: PropTypes.string,
  sortDir: PropTypes.oneOf<SortDir>(['asc', 'desc']),
};
