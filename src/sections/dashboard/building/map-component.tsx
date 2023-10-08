import React, { useEffect, useState } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import PlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-places-autocomplete';
import { Box } from '@mui/system';

const AutocompleteComponent = ({ selectedAddress, setSelectedAddress, handleSelect }: any) => {
          return (
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
                                                                                <div key={suggestion.placeId}
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
          );
};

export const GoogleMaps = () => {
          const [map, setMap] = useState<google.maps.Map>();
          const [mapCenter, setMapCenter] = useState({ lat: 45.2396, lng: 19.8227 });
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
                    // Initialize the map when the component mounts
                    const mapOptions = {
                              center: mapCenter,
                              zoom: 8,
                    };

                    const mapInstance = new window.google.maps.Map(document.getElementById('map') as HTMLElement, mapOptions)
                    setMap(mapInstance);
          }, [mapCenter]);

          return (
                    <div style={{ height: '500px', width: '100%' }}>
                              <Box height={300}
                                        width={400}
                                        id="map" />
                              {selectedAddress && map && <Marker position={mapCenter} />}
                              <AutocompleteComponent
                                        selectedAddress={selectedAddress}
                                        setSelectedAddress={setSelectedAddress}
                                        handleSelect={handleSelect}
                              />
                    </div>
          );
};
