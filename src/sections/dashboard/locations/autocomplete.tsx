import React, { useState, forwardRef, useImperativeHandle } from "react";
import {
     TextField,
     List,
     ListItem,
     ListItemButton,
     ListItemText,
     Box,
     IconButton,
} from "@mui/material";
import { Clear as ClearIcon } from "@mui/icons-material";
import { transliterateCyrillicToLatin } from "src/utils/transliterate";

interface AutocompleteProps {
     onAddressSelected: (feature: any) => void;
     label: string;
}

export interface AutocompleteRef {
     clearField: () => void; // Expose the clear method
}

const Autocomplete = forwardRef<AutocompleteRef, AutocompleteProps>(({ onAddressSelected, label }, ref) => {

     const [inputValue, setInputValue] = useState("");
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
          const value = event.target.value;
          setInputValue(value);
          fetchSuggestions(value);
     };

     const handleSelect = (feature: any) => {
          setInputValue(transliterateCyrillicToLatin(feature.place_name));
          setSuggestions([]);
          onAddressSelected(feature);
     };

     const handleClear = () => {
          setInputValue("");
          setSuggestions([]);
     };

     return (
          <Box sx={{ position: "relative", width: "100%" }}>
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
               )}
          </Box>
     );
}
);

Autocomplete.displayName = "Autocomplete";

export default Autocomplete;
