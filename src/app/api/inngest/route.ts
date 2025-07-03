import { serve } from "inngest/next";
import { inngest } from "src/inngest/client";
import { checkAllClientSubscriptions } from "src/inngest/functions/check-free-trials";

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
     client: inngest,
     functions: [
          checkAllClientSubscriptions
     ],
});
