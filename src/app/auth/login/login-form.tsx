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
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"
import { handleGoogleSignIn } from "../actions"
import { CircularProgress } from "@mui/material"

// Custom multi-colored Google icon as an SVG component
const GoogleMultiColorIcon = (props: any) => (
     <svg
          width="20"
          height="20"
          viewBox="0 0 46 46"
          {...props}
     >
          <defs>
               <path
                    id="a"
                    d="M44.5 20H42V20H24v6h11.8C34.4 32 30 36 24 36
        c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 
        3.1l4.7-4.7C33.2 7 28.9 5 24 5 13.5 5 5 13.5 5 
        24s8.5 19 19 19 19-8.5 19-19c0-1.3-.1-2.7-.5-4z"
               />
          </defs>
          <clipPath id="b">
               <use xlinkHref="#a" overflow="visible" />
          </clipPath>
          <path
               clipPath="url(#b)"
               fill="#FBBC05"
               d="M0 37V9l17 14z"
          />
          <path
               clipPath="url(#b)"
               fill="#EA4335"
               d="M0 9l17 14 7-6.1L48 14V0H0z"
          />
          <path
               clipPath="url(#b)"
               fill="#34A853"
               d="M0 37l30-23 7.9 1L48 0v48H0z"
          />
          <path
               clipPath="url(#b)"
               fill="#4285F4"
               d="M48 48L17 24l-4-3 35-10z"
          />
     </svg>
);

const LoginForm = () => {
     const [authMethod, setAuthMethod] = useState<"magic-link" | "password" | "google">("magic-link")
     const [googleSignInLoading, setGoogleSignInLoading] = useState(false)
     const router = useRouter()
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
                         variant="outlined"
                         startIcon={<GoogleMultiColorIcon />}
                         sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: "white",
                              border: "1px solid #dcdcdc",
                              color: "rgba(0, 0, 0, 0.54)",
                              textTransform: "none",
                              fontWeight: 500,
                              fontSize: "0.875rem",
                              py: 1,
                              borderRadius: 1,
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                              "&:hover": {
                                   backgroundColor: "#f7f7f7",
                                   borderColor: "#dcdcdc",
                              },
                         }}
                         onClick={async () => {
                              setGoogleSignInLoading(true)
                              const { success, error } = await handleGoogleSignIn()
                              if (success) {
                                   setGoogleSignInLoading(false)
                                   router.push('/dashboard')
                              }
                              if (error) {
                                   setGoogleSignInLoading(false)
                                   toast.error(error.message ? error.message : error.hint ? error.hint : error.details)
                              }
                         }}
                    >
                         {googleSignInLoading ? (
                              <CircularProgress size={20} sx={{ color: "rgba(0, 0, 0, 0.54)" }} />
                         ) : (
                              <Typography variant="body2">
                                   Continue with Google
                              </Typography>
                         )}
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
