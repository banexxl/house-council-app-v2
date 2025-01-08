import toast from "react-hot-toast";

// utils/location-permission.ts
export const askForLocationPermission = async (t: (key: string) => string): Promise<{ lat: number; lng: number } | null> => {


     if (navigator.geolocation) {
          try {
               const position = await new Promise<GeolocationPosition>((resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(resolve, reject)
               );

               return {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
               };
          } catch (error) {
               toast.error(`${t('errors.locationPermissionDenied')}`, {
                    duration: 3000,
                    position: 'top-center',
               });
          }
     }

     return null;
};
