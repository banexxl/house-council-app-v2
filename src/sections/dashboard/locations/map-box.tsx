'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css'; // Ensure Mapbox styles are loaded
import Marker from './map-marker';
import { BuildingLocation } from 'src/types/location';

interface MapComponentProps {
     mapBoxAccessToken?: string;
     center: { latitude: number; longitude: number };
     markers?: Array<BuildingLocation & {
          building_cover_bucket?: string;
          building_cover_path?: string;
          client_name?: string;
     }>;
     zoom?: number;
     refreshKey?: number;
     onMapClick?: (coords: { latitude: number; longitude: number }, address: string) => void;
}

export const MapComponent = ({
     mapBoxAccessToken,
     center,
     markers = [],
     zoom = 12,
     refreshKey,
     onMapClick,
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

          map.flyTo({
               center: [center.longitude, center.latitude],
               zoom,
               essential: true, // this animation is considered essential with respect to prefers-reduced-motion
          })

          mapRef.current = map;

          map.on('load', () => {
               setMapReady(true);
          });

          map.on('click', async (e) => {
               const { lng, lat } = e.lngLat;

               try {
                    const res = await fetch(
                         `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapBoxAccessToken}`
                    );

                    if (!res.ok) throw new Error('Failed to reverse geocode');
                    const data = await res.json();

                    const place = data.features?.[0];
                    if (place && onMapClick) {
                         onMapClick({ latitude: lat, longitude: lng }, place.place_name);
                    }
               } catch (err) {
                    console.error('Error reverse geocoding:', err);
               }
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
                              location_id={marker.id!}
                              map={mapRef.current!}
                              customerId={marker.customerId}
                              client_name={(marker as any).client_name}
                              cover_bucket={(marker as any).building_cover_bucket}
                              cover_path={(marker as any).building_cover_path}
                         />
                    ))}
          </div>
     );
};
