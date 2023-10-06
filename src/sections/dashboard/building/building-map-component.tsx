import React from "react";
import GoogleMapReact from 'google-map-react';

const AnyReactComponent = ({ text }: any) => <div>{text}</div>;

export default function BuildingMap() {
          const defaultProps = {
                    center: {
                              lat: 45.2396,
                              lng: 19.8227
                    },
                    zoom: 13
          };

          return (
                    // Important! Always set the container height explicitly
                    <div style={{ height: '400px', width: '600px' }}>
                              <GoogleMapReact
                                        bootstrapURLKeys={{ key: "" }}
                                        defaultCenter={defaultProps.center}
                                        defaultZoom={defaultProps.zoom}
                              >
                                        <AnyReactComponent
                                                  lat={59.955413}
                                                  lng={30.337844}
                                                  text="My Marker"
                                        />
                              </GoogleMapReact>
                    </div>
          );
}