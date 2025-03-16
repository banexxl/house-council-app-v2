"use client"

import type React from "react"
import { useState } from "react"
import Button from "@mui/material/Button"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import Divider from "@mui/material/Divider"
import { useSessionUpdater } from "src/utils/client-session-update"
import { MagicLinkForm } from "./magic-link-form"
import { PasswordForm } from "./password-form"

const LoginForm = () => {
     const [authMethod, setAuthMethod] = useState<"magic-link" | "password" | "google">("magic-link")

     useSessionUpdater()

     const handleAuthMethodChange = (_event: React.SyntheticEvent, newValue: "magic-link" | "password" | "google") => {
          setAuthMethod(newValue)
     }

     return (
          <div>
               <Stack sx={{ mb: 4 }} spacing={1}>
                    <Typography variant="h5">Log in</Typography>
                    <Typography color="text.secondary" variant="body2">
                         Choose your preferred login method
                    </Typography>
               </Stack>
               <Tabs value={authMethod} onChange={handleAuthMethodChange} variant="fullWidth" sx={{ mb: 3 }}>
                    <Tab value="magic-link" label="Magic Link" />
                    <Tab value="password" label="Password" />
                    <Tab value="google" label="Google" />
               </Tabs>

               {authMethod === "magic-link" && <MagicLinkForm />}
               {authMethod === "password" && <PasswordForm />}
               {authMethod === "google" && (
                    <Button
                         fullWidth
                         variant="contained"
                         sx={{ textTransform: "none", mb: 3 }}
                         onClick={() => {
                              // Implement Google auth logic here
                         }}
                    >
                         Sign in with Google
                    </Button>
               )}

               <Divider sx={{ my: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                         OR
                    </Typography>
               </Divider>

               <Button
                    fullWidth
                    onClick={() => {
                         if (authMethod === "magic-link") {
                              setAuthMethod("password");
                         } else if (authMethod === "password") {
                              setAuthMethod("google");
                         } else {
                              setAuthMethod("magic-link");
                         }
                    }}
                    sx={{ textTransform: "none" }}
               >
                    {authMethod === "magic-link"
                         ? "Sign in with password instead"
                         : authMethod === "password"
                              ? "Sign in with Google instead"
                              : "Sign in with Magic Link instead"}
               </Button>
          </div>
     )
}

export default LoginForm
