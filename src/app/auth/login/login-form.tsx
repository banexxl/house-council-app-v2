"use client"

import type React from "react"

import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { LoadingButton } from "@mui/lab"
import Button from "@mui/material/Button"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import Divider from "@mui/material/Divider"
import Box from "@mui/material/Box"
import { initialValues, validationSchema } from "./login-schema"
import toast from "react-hot-toast"
import { loginWithGoogle, magicLinkLogin } from "../actions"
import { NextRequest } from "next/server"
import { useSessionUpdater } from "src/utils/client-session-update"

const LoginForm = () => {
     const [message, setMessage] = useState<string | null>("")
     const [loginError, setLoginError] = useState<boolean>(false)
     const [authMethod, setAuthMethod] = useState<"magic-link" | "google">("magic-link")

     useSessionUpdater()

     const onSubmit = async (values: typeof initialValues) => {
          const result = await magicLinkLogin(values.email)

          if (result.error) {
               setLoginError(true)
               toast.error("Failed to authenticate with Magic Link")
               setMessage(result.error)
          } else if (result.success) {
               setLoginError(false)
               toast.success("Successfully authenticated with Magic Link")
               setMessage(result.success)
          }
     }

     const handleGoogleLogin = async () => {
          try {
               await loginWithGoogle()
          } catch (error) {
               setLoginError(true)
               setMessage("Failed to authenticate with Google")
          }
     }

     const formik = useFormik({
          initialValues,
          validationSchema,
          onSubmit,
     })

     const handleAuthMethodChange = (_event: React.SyntheticEvent, newValue: "magic-link" | "google") => {
          setAuthMethod(newValue)
          // Reset error messages when switching methods
          setMessage("")
          setLoginError(false)
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
                    <Tab value="google" label="Google" />
               </Tabs>

               {authMethod === "magic-link" ? (
                    <Box sx={{ textAlign: "center", height: "300px" }}>
                         <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
                              We'll send you an email with a link to log in.
                         </Typography>
                         <form noValidate onSubmit={formik.handleSubmit}>
                              <Stack spacing={3}>
                                   <TextField
                                        autoFocus
                                        error={!!(formik.touched.email && formik.errors.email && formik.submitCount > 0) || loginError}
                                        fullWidth
                                        helperText={
                                             <span
                                                  style={{
                                                       color:
                                                            formik.touched.email && formik.errors.email && formik.submitCount > 0
                                                                 ? "red"
                                                                 : loginError
                                                                      ? "red"
                                                                      : message
                                                                           ? "green"
                                                                           : "transparent",
                                                  }}
                                             >
                                                  {message ||
                                                       (formik.touched.email && formik.errors.email && formik.submitCount > 0
                                                            ? formik.errors.email
                                                            : " ")}
                                             </span>
                                        }
                                        label="Email Address"
                                        name="email"
                                        onBlur={formik.handleBlur}
                                        onChange={(e) => {
                                             formik.handleChange(e)
                                             // Clear error message when typing
                                             if (loginError) {
                                                  setLoginError(false)
                                                  setMessage("")
                                             }
                                        }}
                                        type="email"
                                        value={formik.values.email}
                                   />
                              </Stack>
                              <LoadingButton
                                   fullWidth
                                   sx={{ mt: 3 }}
                                   size="large"
                                   type="submit"
                                   variant="contained"
                                   loading={formik.isSubmitting}
                                   disabled={!(formik.isValid && formik.dirty) || formik.errors.email == ''}
                              >
                                   Send Magic Link
                              </LoadingButton>
                         </form>
                    </Box>
               ) : (
                    <Box sx={{ textAlign: "center", height: "300px" }}>
                         <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
                              Sign in with your Google account
                         </Typography>

                         {loginError && (
                              <Typography color="error" sx={{ mb: 2 }}>
                                   {message}
                              </Typography>
                         )}

                         <Button
                              fullWidth
                              variant="outlined"
                              size="large"
                              onClick={handleGoogleLogin}
                              sx={{
                                   display: "flex",
                                   justifyContent: "center",
                                   alignItems: "center",
                                   backgroundColor: "white",
                                   color: "rgba(0, 0, 0, 0.87)",
                                   border: "1px solid #dadce0",
                                   borderRadius: "4px",
                                   boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                                   py: 1.5,
                                   "&:hover": {
                                        backgroundColor: "#f8f9fa",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                                        border: "1px solid #dadce0",
                                   },
                              }}
                         >
                              <Box sx={{ display: "flex", alignItems: "center" }}>
                                   <Box
                                        component="span"
                                        sx={{
                                             display: "flex",
                                             mr: 2,
                                             "& svg": {
                                                  height: 24,
                                                  width: 24,
                                             },
                                        }}
                                   >
                                        <svg viewBox="0 0 24 24">
                                             <path
                                                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                  fill="#4285F4"
                                             />
                                             <path
                                                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                  fill="#34A853"
                                             />
                                             <path
                                                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                                  fill="#FBBC05"
                                             />
                                             <path
                                                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                                  fill="#EA4335"
                                             />
                                             <path d="M1 1h22v22H1z" fill="none" />
                                        </svg>
                                   </Box>
                                   <Typography sx={{ fontWeight: 500 }}>Sign in with Google</Typography>
                              </Box>
                         </Button>
                    </Box>
               )}

               <Divider sx={{ my: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                         OR
                    </Typography>
               </Divider>

               <Button
                    fullWidth
                    onClick={() => setAuthMethod(authMethod === "magic-link" ? "google" : "magic-link")}
                    sx={{ textTransform: "none" }}
               >
                    {authMethod === "magic-link" ? "Sign in with Google instead" : "Sign in with Magic Link instead"}
               </Button>
          </div>
     )
}

export default LoginForm
