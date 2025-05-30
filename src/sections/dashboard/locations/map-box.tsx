'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import Marker from './map-marker';
import { BuildingLocation } from 'src/types/location';

interface MapComponentProps {
     mapBoxAccessToken?: string;
     center: { latitude: number; longitude: number };
     markers?: BuildingLocation[];
     zoom?: number;
     refreshKey?: number;
}

export const MapComponent = ({
     mapBoxAccessToken,
     center,
     markers = [],
     zoom = 12,
     refreshKey,
}: MapComponentProps) => {
     const mapContainerRef = useRef<HTMLDivElement | null>(null);
     const mapRef = useRef<mapboxgl.Map | null>(null);
     const [mapReady, setMapReady] = useState(false);

     mapboxgl.accessToken = mapBoxAccessToken || '';

     // (Re)initialize map when component mounts or refreshKey changes
     useEffect(() => {
          if (!mapContainerRef.current) return;

          if (mapRef.current) {
               mapRef.current.remove(); // clean up old map
               mapRef.current = null;
          }

          const map = new mapboxgl.Map({
               container: mapContainerRef.current,
               style: 'mapbox://styles/mapbox/streets-v12',
               center: [center.longitude, center.latitude],
               zoom,
          });

          mapRef.current = map;

          map.on('load', () => {
               setMapReady(true);
          });

          return () => {
               map.remove();
               mapRef.current = null;
               setMapReady(false);
          };
     }, [refreshKey]); // 👈 re-init map when refreshKey changes

     return (
          <div style={{ height: '600px', width: '100%', position: 'relative' }}>
               <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />

               {/* Render markers only after map is ready */}
               {mapReady &&
                    mapRef.current &&
                    markers.map((marker, index) => (
                         <Marker
                              key={`${marker.latitude}-${marker.longitude}-${index}`}
                              lat={marker.latitude}
                              lng={marker.longitude}
                              full_address={`${marker.city}, ${marker.street_address} ${marker.street_number}`}
                              map={mapRef.current!}
                         />
                    ))}
          </div>
     );
};
