import toast from "react-hot-toast";

// utils/location-permission.ts
export const askForLocationPermission = async (t: (key: string) => string): Promise<{ lat: number; lng: number; locationPermissionGranted?: boolean } | null> => {
     if (navigator.geolocation) {
          try {
               const position = await new Promise<GeolocationPosition>((resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(resolve, reject)
               );

               return {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    locationPermissionGranted: true,
               };
          } catch (error) {
               toast.error(`${t('errors.locationPermissionDenied')}`, {
                    duration: 3000,
                    position: 'top-center',
               });
               // Default to Budapest
               return {
                    lat: 47.4979,
                    lng: 19.0402,
                    locationPermissionGranted: false,
               };
          }
     }

     return null;
};
