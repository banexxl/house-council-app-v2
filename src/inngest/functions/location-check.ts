import { inngest } from "../client";

export const checkIfLocationIsOccupied = inngest.createFunction(
     { id: "check-if-location-is-occupied" },
     { cron: "0 * * * *" }, // every hour
     async ({ step }) => {
          await step.run("Check if location is occupied, and if not, delete it.", async () => {
               try {
                    const response = await fetch(`${process.env.BASE_URL}/api/location-check/`, {
                         method: "POST",
                         headers: { "Content-Type": "application/json" },
                    });

                    if (!response.ok) {
                         const errorText = await response.text();
                         throw new Error(`Failed to check locations: ${response.status} - ${errorText}`);
                    }

                    const result = await response.json();

                    return {
                         success: true,
                         summary: {
                              deleted: result.addressesDeleted || [],
                         },

                    };
               } catch (err: any) {
                    return {
                         success: false,
                         error: err.message,
                    };
               }
          });
     }
);
