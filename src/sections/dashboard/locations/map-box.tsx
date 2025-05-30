'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import Marker from './map-marker';

export interface MarkerData {
     latitude: number;
     longitude: number;
     street_address?: string;
     image?: string;
}

interface MapComponentProps {
     mapBoxAccessToken?: string;
     center: { latitude: number; longitude: number };
     markers?: MarkerData[];
     zoom?: number;
     onMapClick?: (latitude: number, longitude: number) => void;
}

export const MapComponent = ({
     mapBoxAccessToken,
     center,
     markers = [],
     zoom = 12,
     onMapClick,
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

          if (onMapClick) {
               mapRef.current.on('click', (e) => {
                    onMapClick(e.lngLat.lat, e.lngLat.lng);
               });
          }

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
          <div style={{ height: '400px', width: '100%', position: 'relative' }}>
               <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />

               {/* Render your custom Marker components */}
               {mapReady &&
                    mapRef.current &&
                    markers.map((marker, index) => (
                         <Marker
                              key={`${marker.latitude}-${marker.longitude}-${index}`}
                              lat={marker.latitude}
                              lng={marker.longitude}
                              address={marker.street_address ?? ''}
                              map={mapRef.current!}
                         />
                    ))}
          </div>
     );
};
