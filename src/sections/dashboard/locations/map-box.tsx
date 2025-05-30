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
}

export const MapComponent = ({
     mapBoxAccessToken,
     center,
     markers,
     zoom = 12,
}: MapComponentProps) => {
     const mapContainerRef = useRef<HTMLDivElement>(null);
     const mapRef = useRef<mapboxgl.Map | null>(null);
     const [mapReady, setMapReady] = useState(false);
     mapboxgl.accessToken = mapBoxAccessToken || '';

     // Initialize map
     useEffect(() => {
          if (mapRef.current || !mapContainerRef.current) return;

          mapRef.current = new mapboxgl.Map({
               container: mapContainerRef.current,
               style: 'mapbox://styles/mapbox/streets-v12',
               center: [center.longitude, center.latitude],
               zoom,
          });

          mapRef.current.on('load', () => {
               setMapReady(true);
          });

          return () => {
               mapRef.current?.remove();
               mapRef.current = null;
          };
     }, []);

     // Fly to updated center
     useEffect(() => {
          if (mapRef.current) {
               mapRef.current.flyTo({ center: [center.longitude, center.latitude], zoom });
          }
     }, [center, zoom]);

     return (
          <div style={{ height: '600px', width: '100%', position: 'relative' }}>
               <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />

               {/* Render your custom Marker components */}
               {mapReady &&
                    mapRef.current &&
                    markers!.map((marker, index) => (
                         <Marker
                              key={`${marker.latitude}-${marker.longitude}-${index}`}
                              lat={marker.latitude}
                              lng={marker.longitude}
                              full_address={marker.city + ', ' + marker.street_address + ' ' + marker.street_number}
                              map={mapRef.current!}
                         />
                    ))}
          </div>
     );
};
