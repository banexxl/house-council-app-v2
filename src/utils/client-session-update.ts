'use client'

import { useEffect } from "react";


export const useSessionUpdater = () => {

     useEffect(() => {
          const handleSessionUpdate = () => {
               window.location.reload();
          };

          const handleFocus = () => {
               console.log("Window is focused - reloading page");
               handleSessionUpdate();
          };

          const handleVisibilityChange = () => {
               if (document.visibilityState === "visible") {
                    console.log("Tab is visible - reloading page");
                    handleSessionUpdate();
               }
          };

          window.addEventListener("focus", handleFocus);
          document.addEventListener("visibilitychange", handleVisibilityChange);

          return () => {
               window.removeEventListener("focus", handleFocus);
               document.removeEventListener("visibilitychange", handleVisibilityChange);
          };
     }, []);
};

