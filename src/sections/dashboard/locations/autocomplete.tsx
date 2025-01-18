import React, { useState } from 'react';
import { TextField, List, ListItem, ListItemButton, ListItemText, Box, IconButton } from '@mui/material';
import { ClearIcon } from '@mui/x-date-pickers';
import { useTranslation } from 'react-i18next';

interface AutocompleteProps {
     onAddressSelected: (feature: any) => void;
     label: string;
}

const Autocomplete: React.FC<AutocompleteProps> = ({ onAddressSelected, label }) => {

     const { t } = useTranslation();
     const [inputValue, setInputValue] = useState('');
     const [suggestions, setSuggestions] = useState<any[]>([]);
     const [loading, setLoading] = useState(false);

     const fetchSuggestions = async (query: string) => {
          if (!query) {
               setSuggestions([]);
               return;
          }

          try {
               setLoading(true);
               const response = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_API_KEY}&limit=5`
               );
               const data = await response.json();
               const features = data.features || [];
               setSuggestions(features);
          } catch (error) {
               console.error('Error fetching suggestions:', error);
          } finally {
               setLoading(false);
          }
     };

     const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
          const value = event.target.value;
          setInputValue(value);
          fetchSuggestions(value);
     };

     const handleSelect = (feature: any) => {
          setInputValue(feature.matching_place_name);
          setSuggestions([]);
          onAddressSelected(feature);
     };

     const handleClear = () => {
          setInputValue('');
          setSuggestions([]);
     };

     return (
          <Box sx={{ position: 'relative', width: '300px' }}>
               <TextField
                    label={label}
                    variant="outlined"
                    fullWidth
                    value={inputValue}
                    onChange={handleInputChange}
                    InputProps={{
                         endAdornment: (
                              <>
                                   {loading && <span>Loading...</span>}
                                   {inputValue && (
                                        <IconButton onClick={handleClear}>
                                             <ClearIcon />
                                        </IconButton>
                                   )}
                              </>
                         ),
                    }}
               />
               {suggestions.length > 0 && (
                    <List
                         sx={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              width: '100%',
                              bgcolor: 'background.paper',
                              zIndex: 10,
                              border: '1px solid #ccc',
                              borderRadius: 1,
                         }}
                    >
                         {suggestions.map((suggestion, index) => (
                              <ListItem key={index} disablePadding>
                                   <ListItemButton onClick={() => handleSelect(suggestion)}>
                                        <ListItemText primary={suggestion.place_name} />
                                   </ListItemButton>
                              </ListItem>
                         ))}
                    </List>
               )}
          </Box>
     );
};

export default Autocomplete;
