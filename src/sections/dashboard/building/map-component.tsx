// Map.js
import React, { useEffect, useState } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import PlacesAutocomplete, { geocodeByAddress, getLatLng, geocodeByPlaceId } from 'react-places-autocomplete';
import { Box } from '@mui/system';

export const GoogleMaps = () => {

          const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });
          const [selectedAddress, setSelectedAddress] = useState('');

          const handleSelect = async (address: any) => {
                    try {
                              const results = await geocodeByAddress(address);
                              const latLng = await getLatLng(results[0]);
                              setSelectedAddress(address);
                              setMapCenter(latLng);
                    } catch (error) {
                              console.error('Error selecting address:', error);
                    }
          };

          useEffect(() => {

                    let mapElement = document.getElementById("map") as HTMLElement;
                    let mapOptions = {
                              center: { lat: -34.397, lng: 150.644 },
                              zoom: 8
                    };

                    let map = new google.maps.Map(mapElement, mapOptions);

          }, [])

          return (
                    <div style={{ height: '500px', width: '100%' }}>
                              <Box
                                        height={300}
                                        width={300}
                                        id='map'
                              >
                                        {selectedAddress && <Marker position={mapCenter} />}
                              </Box>

                              <PlacesAutocomplete value={selectedAddress}
                                        onChange={setSelectedAddress}
                                        onSelect={handleSelect}>
                                        {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
                                                  <div>
                                                            <input {...getInputProps({ placeholder: 'Search Places...' })} />
                                                            <div>
                                                                      {loading && <div>Loading...</div>}
                                                                      {suggestions.map((suggestion) => {
                                                                                const style = {
                                                                                          backgroundColor: suggestion.active ? '#41b6e6' : '#fff',
                                                                                };
                                                                                return (
                                                                                          <div
                                                                                                    key={suggestion.placeId}
                                                                                          //{...getSuggestionItemProps(suggestion, { style })}
                                                                                          >
                                                                                                    {suggestion.description}
                                                                                          </div>
                                                                                );
                                                                      })}
                                                            </div>
                                                  </div>
                                        )}
                              </PlacesAutocomplete>

                    </div>
          );
};
