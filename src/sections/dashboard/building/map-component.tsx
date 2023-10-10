import React, { useEffect, useRef, useState } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import PlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-places-autocomplete';
import { Box } from '@mui/system';
import { TextField, Typography } from '@mui/material';

const AutocompleteComponent = ({ selectedAddress, setSelectedAddress, handleSelect }: any) => {

          return (
                    <PlacesAutocomplete value={selectedAddress}
                              onChange={setSelectedAddress}
                              onSelect={handleSelect}>
                              {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
                                        <div>
                                                  <TextField
                                                            fullWidth
                                                            {...getInputProps({ placeholder: 'Search Places...' })}
                                                            variant="outlined"
                                                            margin="dense"
                                                            label="Search Places"
                                                  />
                                                  <div>
                                                            {loading && (
                                                                      <Box>
                                                                                <Typography>Loading...</Typography>
                                                                      </Box>
                                                            )}
                                                            {suggestions.map((suggestion, index) => {
                                                                      const style = {};
                                                                      return (
                                                                                <div {...getSuggestionItemProps(suggestion, { style })}
                                                                                          key={`${suggestion.placeId}-${index}`}>
                                                                                          {suggestion.description}
                                                                                </div>
                                                                      );
                                                            })}
                                                  </div>
                                        </div>
                              )}
                    </PlacesAutocomplete>
          );
};

export const GoogleMaps = ({ onMapAddressChange }: any) => {
          const [map, setMap] = useState<google.maps.Map>();
          const [mapCenter, setMapCenter] = useState({ lat: 45.2396, lng: 19.8227 });
          const [selectedAddress, setSelectedAddress] = useState('');

          const handleSelect = async (address: any) => {
                    try {
                              const results = await geocodeByAddress(address);
                              const latLng = await getLatLng(results[0]);
                              setSelectedAddress(address);
                              setMapCenter(latLng);
                              onMapAddressChange({ address, latLng })
                    } catch (error) {
                              console.error('Error selecting address:', error);
                    }
          };

          useEffect(() => {
                    // Initialize the map when the component mounts
                    const mapOptions = {
                              center: mapCenter,
                              zoom: 17,
                    };

                    const mapInstance = new window.google.maps.Map(document.getElementById('map') as HTMLElement, mapOptions)
                    setMap(mapInstance);
          }, [mapCenter]);

          const mapContainerStyle = {
                    borderRadius: '10px',
                    height: '400px',
                    width: '500px'
          }

          const icon = {
                    url: "/assets/icons/icons8-google-home.svg", // url
                    scaledSize: new google.maps.Size(30, 30), // scaled size
                    origin: new google.maps.Point(0, 0), // origin
                    anchor: new google.maps.Point(0, 0) // anchor
          };

          new google.maps.Marker({
                    position: mapCenter,
                    map,
                    title: "Hello World!",
                    icon: icon
          });


          return (
                    <Box>
                              <GoogleMap
                                        center={mapCenter}
                                        mapContainerStyle={mapContainerStyle}
                                        id="map"
                              >
                                        {/* {selectedAddress &&
                                                  <Marker position={mapCenter}
                                                            key={'map'}
                                                            title='Marker'
                                                            icon={customMarker}
                                                  />
                                        } */}
                              </GoogleMap>
                              <AutocompleteComponent
                                        selectedAddress={selectedAddress}
                                        setSelectedAddress={setSelectedAddress}
                                        handleSelect={handleSelect}
                              />
                    </Box>
          );
};


