"use client"

import { useFormik } from "formik"
import { useState } from "react"

import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import Box from "@mui/material/Box"
import { initialValuesEmailOnly, validationSchemaEmailOnly } from "./login-schema"
import toast from "react-hot-toast"
import { magicLinkLogin } from "../actions"
import { Button } from "@mui/material"

type MagicLinkFormProps = {
     ipAddress: string | null;
}

export const MagicLinkForm = ({ ipAddress }: MagicLinkFormProps) => {
     const [message, setMessage] = useState<string | null>("")
     const [loginError, setLoginError] = useState<boolean>(false)

     const onSubmit = async (values: typeof initialValuesEmailOnly) => {
          const result = await magicLinkLogin(values.email, ipAddress || '')

          setMessage(result.error || null)

          if (result.error) {
               setLoginError(true)
               toast.error("Failed to authenticate with Magic Link")
               setMessage(result.error)
          } else if (result.success) {
               setLoginError(false)
               toast.success("Successfully authenticated with Magic Link")
               formik.resetForm() // Reset the form after successful submission
          }
     }

     const formik = useFormik({
          initialValues: initialValuesEmailOnly,
          validationSchema: validationSchemaEmailOnly,
          onSubmit,
     })

     return (
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
                                             (formik.touched.email && formik.errors.email && formik.submitCount > 0 ? formik.errors.email : " ")}
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
                    <Button
                         fullWidth
                         sx={{ mt: 3 }}
                         size="large"
                         type="submit"
                         variant="contained"
                         loading={formik.isSubmitting}
                         disabled={!(formik.isValid && formik.dirty) || formik.errors.email == ""}
                    >
                         Send Magic Link
                    </Button>
               </form>
          </Box>
     )
}

