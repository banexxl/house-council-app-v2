export const enableDevTools = process.env.NEXT_PUBLIC_ENABLE_REDUX_DEV_TOOLS === 'true';

export const firebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

export const gtmConfig = {
          containerId: process.env.NEXT_PUBLIC_GTM_CONTAINER_ID,
};

export const mapboxConfig = {
          apiKey: process.env.NEXT_PUBLIC_MAPBOX_API_KEY,
};

export const version = '6.4.2';
