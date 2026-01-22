import React, { useState, forwardRef, useImperativeHandle } from "react";
import {
     TextField,
     List,
     ListItem,
     ListItemButton,
     ListItemText,
     Box,
     IconButton,
     InputAdornment,
     OutlinedInput,
} from "@mui/material";
import { Clear as ClearIcon } from "@mui/icons-material";
import { transliterateCyrillicToLatin } from "src/utils/transliterate";

interface AutocompleteProps {
     onAddressSelected: (feature: any) => void;
     label: string;
     initialValue?: string
     onClear?: () => void;
     disabled?: boolean;
}

export interface AutocompleteRef {
     clearField: () => void; // Expose the clear method
}

const Autocomplete = forwardRef<AutocompleteRef, AutocompleteProps>(({ onAddressSelected, label, initialValue, onClear, disabled }, ref) => {

     const [inputValue, setInputValue] = useState(initialValue || "");
     const [suggestions, setSuggestions] = useState<any[]>([]);
     const [loading, setLoading] = useState(false);

     // Expose clearField method to the parent
     useImperativeHandle(ref, () => ({
          clearField: () => {
               setInputValue("");
               setSuggestions([]);
          },
     }));

     const fetchSuggestions = async (query: string) => {
          if (!query) {
               setSuggestions([]);
               return;
          }

          try {
               setLoading(true);
               const response = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                         query
                    )}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_API_KEY}&limit=5`
               );
               const data = await response.json();
               const features = data.features || [];

               setSuggestions(features);
          } catch (error) {
               console.error("Error fetching suggestions:", error);
          } finally {
               setLoading(false);
          }
     };

     const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
          if (disabled) return;
          const value = event.target.value;
          setInputValue(value);
          fetchSuggestions(value);
     };

     const handleSelect = (feature: any) => {
          if (disabled) return;
          setInputValue(transliterateCyrillicToLatin(feature.place_name));
          setSuggestions([]);
          onAddressSelected(feature);
     };

     const handleClear = () => {
          if (disabled) return;
          setInputValue("");
          setSuggestions([]);
          onClear && onClear();
     };

     return (
          <Box sx={{ position: "relative", width: "100%" }}>
               <TextField
                    label={label}
                    variant="outlined"
                    fullWidth
                    value={inputValue}
                    onChange={handleInputChange}
                    disabled={disabled}
                    slots={{
                         input: OutlinedInput, // ✅ use MUI input, not raw HTML input
                    }}
                    slotProps={{
                         input: {
                              endAdornment: (
                                   <InputAdornment position="end">
                                        {loading && <span>Loading...</span>}
                                        {inputValue && (
                                             <IconButton onClick={handleClear} disabled={disabled}>
                                                  <ClearIcon />
                                             </IconButton>
                                        )}
                                   </InputAdornment>
                              ),
                         },
                    }}
               />

               {
                    !disabled && suggestions.length > 0 && (
                         <List
                              sx={{
                                   position: "absolute",
                                   top: "100%",
                                   left: 0,
                                   width: "100%",
                                   bgcolor: "background.paper",
                                   zIndex: 10,
                                   border: "1px solid #ccc",
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
                    )
               }
          </Box >
     );
}
);

Autocomplete.displayName = "Autocomplete";

export default Autocomplete;
