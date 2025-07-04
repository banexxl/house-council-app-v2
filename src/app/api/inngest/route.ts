import { serve } from "inngest/next";
import { inngest } from "src/inngest/client";
import { checkIfLocationIsOccupied } from "src/inngest/functions/location-check";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
     client: inngest,
     functions: [
          checkIfLocationIsOccupied
     ],
});
