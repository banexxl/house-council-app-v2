import { useState, useMemo, useRef, useEffect } from 'react';
import { TextField, MenuItem, Paper, Box, ClickAwayListener, Portal } from '@mui/material';

interface CustomAutocompleteProps<T> {
     data: T[];
     searchKey: keyof T;
     label?: string;
     renderOption?: (item: T) => React.ReactNode;
     getOptionLabel?: (item: T) => string;
     onValueChange?: (id: string) => void;
}

export function CustomAutocomplete<T extends Record<string, any>>({
     data,
     searchKey,
     label = 'Search...',
     renderOption,
     getOptionLabel,
     onValueChange
}: CustomAutocompleteProps<T>) {
     const [inputValue, setInputValue] = useState(data ? data[0][searchKey]?.toString() || '' : '');
     const [open, setOpen] = useState(false);
     const anchorRef = useRef<HTMLDivElement>(null);
     const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);

     useEffect(() => {
          if (anchorRef.current) setAnchorEl(anchorRef.current);
     }, [anchorRef.current]);

     const filteredData = useMemo(() => {
          const lower = inputValue.toLowerCase();
          return data
               .filter(item => item[searchKey]?.toString().toLowerCase().includes(lower))
               .slice(0, 5);
     }, [data, inputValue, searchKey]);

     const handleSelect = (item: T) => {
          if (getOptionLabel) {
               setInputValue(getOptionLabel(item));
          } else {
               setInputValue(item[searchKey]?.toString() || '');
          }

          // 👇 NEW
          if (onValueChange && item.id) {
               onValueChange(item.id);
          }

          setOpen(false);
     };

     return (
          <ClickAwayListener onClickAway={() => setOpen(false)}>
               <Box ref={anchorRef} position="relative">
                    <TextField
                         label={label}
                         fullWidth
                         value={inputValue}
                         onChange={(e) => {
                              setInputValue(e.target.value);
                              setOpen(true);
                         }}
                         onFocus={() => setOpen(true)}
                    />
                    {open && filteredData.length > 0 && (
                         <Portal>
                              <Paper
                                   sx={{
                                        position: 'absolute',
                                        top: anchorEl?.getBoundingClientRect().bottom! + window.scrollY,
                                        left: anchorEl?.getBoundingClientRect().left! + window.scrollX,
                                        width: anchorEl?.offsetWidth,
                                        zIndex: 1300,
                                        maxHeight: 200,
                                        overflowY: 'auto',
                                   }}
                                   elevation={4}
                              >
                                   {filteredData.map((item, idx) => (
                                        <MenuItem key={idx} onClick={() => handleSelect(item)}>
                                             {renderOption ? renderOption(item) : item[searchKey]}
                                        </MenuItem>
                                   ))}
                              </Paper>
                         </Portal>
                    )}
               </Box>
          </ClickAwayListener>
     );
}
