import { Polar } from "@polar-sh/sdk";

export const polar = new Polar({
     accessToken: process.env.NODE_ENV === "development" ? process.env.POLAR_ACCESS_TOKEN_SANDBOX! : process.env.POLAR_ACCESS_TOKEN!,
     // Polar supports sandbox vs production; choose based on env.
     // Many setups just keep separate env vars per environment.
     server: process.env.NODE_ENV === "development" ? "sandbox" : "production",
});
