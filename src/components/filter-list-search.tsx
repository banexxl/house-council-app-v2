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
     Typography,
     FormControl,
     InputLabel,
     Select
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

interface SelectFieldOption { value: string; label: string; }
interface SelectField { field: string; label: string; options: SelectFieldOption[]; }

interface Props {
     fields?: BooleanField[]; // existing boolean filters (checkboxes)
     selects?: SelectField[]; // new select filters (single-value)
     value: SearchAndBooleanFilterValue;
     onChange: (newValue: SearchAndBooleanFilterValue) => void;
     hideSearch?: boolean; // optionally hide search input for reuse
}

export const SearchAndBooleanFilters: FC<Props> = ({ fields = [], selects = [], value, onChange, hideSearch }) => {
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

     const handleSelectChange = useCallback(
          (field: string, newValue: string) => {
               onChange({
                    ...value,
                    [field]: newValue || undefined
               });
          },
          [onChange, value]
     );

     return (
          <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 2, flexWrap: 'wrap' }}>
               {!hideSearch && (
                    <TextField
                         label={t('common.search')}
                         variant="outlined"
                         size="small"
                         sx={{ minWidth: 220, flex: 1 }}
                         value={value.search ?? ''}
                         onChange={handleSearchChange}
                         slotProps={{
                              input: {
                                   endAdornment: value.search ? (
                                        <Button
                                             size="small"
                                             onClick={() => onChange({ ...value, search: '' })}
                                             sx={{ minWidth: 0, p: 0.5 }}
                                        >
                                             <SvgIcon fontSize="small">
                                                  {/* MUI Clear Icon */}
                                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
                                             </SvgIcon>
                                        </Button>
                                   ) : null
                              }
                         }}
                    />
               )}
               {selects.map(sel => (
                    <FormControl key={sel.field} size="small" sx={{ minWidth: 180 }}>
                         <InputLabel>{t(sel.label)}</InputLabel>
                         <Select
                              label={t(sel.label)}
                              value={(value[sel.field] as string) || ''}
                              onChange={(e) => handleSelectChange(sel.field, e.target.value)}
                         >
                              <MenuItem value=""><em>{t('common.lblAll', 'All')}</em></MenuItem>
                              {sel.options.map(opt => (
                                   <MenuItem key={opt.value} value={opt.value}>{t(opt.label)}</MenuItem>
                              ))}
                         </Select>
                    </FormControl>
               ))}
               <Button
                    color="inherit"
                    endIcon={
                         <SvgIcon>
                              <ChevronDownIcon />
                         </SvgIcon>
                    }
                    onClick={popover.handleOpen}
                    ref={popover.anchorRef}
               // sx={{ display: fields.length === 0 ? 'none' : 'flex' }}
               >
                    {t('common.lblFilters')}
               </Button>
               <Menu
                    anchorEl={popover.anchorRef.current}
                    onClose={popover.handleClose}
                    open={popover.open}
                    slotProps={{ paper: { style: { width: 220 } } }}
               >
                    {fields.length > 0 && fields.map((field) => {
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
                    {fields.length === 0 && (
                         <MenuItem disabled>
                              <Typography variant="caption" color="text.secondary">
                                   {t('common.lblNoBooleanFilters', 'No toggle filters')}
                              </Typography>
                         </MenuItem>
                    )}
               </Menu>
          </Stack>
     );
};
