'use client';

import { ChangeEvent, FC, useCallback } from 'react';
import {
     Box,
     Button,
     Checkbox,
     Divider,
     Menu,
     MenuItem,
     Stack,
     SvgIcon,
     TextField,
     Typography
} from '@mui/material';
import ChevronDownIcon from '@untitled-ui/icons-react/build/esm/ChevronDown';
import { usePopover } from 'src/hooks/use-popover';
import { useTranslation } from 'react-i18next';

interface BooleanField {
     field: string;
     label: string;
}

interface SearchAndBooleanFilterValue {
     search?: string;
     [key: string]: boolean | string | undefined;
}

interface Props {
     fields: BooleanField[];
     value: SearchAndBooleanFilterValue;
     onChange: (newValue: SearchAndBooleanFilterValue) => void;
}

export const SearchAndBooleanFilters: FC<Props> = ({ fields, value, onChange }) => {
     const popover = usePopover<HTMLButtonElement>();
     const { t } = useTranslation();

     const handleCheckboxChange = useCallback(
          (field: string, checked: boolean) => {
               onChange({
                    ...value,
                    [field]: checked ? true : undefined
               });
          },
          [onChange, value]
     );

     const handleSearchChange = useCallback(
          (event: ChangeEvent<HTMLInputElement>) => {
               onChange({
                    ...value,
                    search: event.target.value
               });
          },
          [onChange, value]
     );

     return (
          <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 2 }}>
               <TextField
                    label={t('common.search')}
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={value.search ?? ''}
                    onChange={handleSearchChange}
               />
               <Button
                    color="inherit"
                    endIcon={
                         <SvgIcon>
                              <ChevronDownIcon />
                         </SvgIcon>
                    }
                    onClick={popover.handleOpen}
                    ref={popover.anchorRef}
               >
                    {t('common.lblFilters')}
               </Button>
               <Menu
                    anchorEl={popover.anchorRef.current}
                    onClose={popover.handleClose}
                    open={popover.open}
                    PaperProps={{ style: { width: 220 } }}
               >
                    {fields.map((field) => {
                         const checked = value[field.field] === true;
                         return (
                              <MenuItem key={field.field}>
                                   <Checkbox
                                        checked={checked}
                                        onChange={(e) => handleCheckboxChange(field.field, e.target.checked)}
                                   />
                                   <Typography>{t(field.label)}</Typography>
                              </MenuItem>
                         );
                    })}
               </Menu>
          </Stack>
     );
};
