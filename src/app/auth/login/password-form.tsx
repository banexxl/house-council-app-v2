"use client"

import { useFormik } from "formik"
import { startTransition, useEffect, useState } from "react"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import Box from "@mui/material/Box"
import {
     initialValuesEmailAndPassword,
     validationSchemaEmailAndPassword,
} from "./login-schema"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"
import { Button } from "@mui/material"
import { createBrowserClient } from "@supabase/ssr"
import { signInWithEmailAndPassword } from "../actions"

type PasswordFormProps = {
     ipAddress: string | null;
}

export const PasswordForm = ({ ipAddress }: PasswordFormProps) => {

     const router = useRouter()
     const [doesRequire2FA, setDoesRequire2FA] = useState(false)
     const [challengeId, setChallengeId] = useState<string>("")
     const [factorId, setFactorId] = useState<string>("")
     const [loading, setLoading] = useState<boolean>(false)

     const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL as string,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
     )

     const handleNavClick = (path: string) => {
          startTransition(() => {
               router.push(path)
          })
     }

     const formik = useFormik({
          initialValues: initialValuesEmailAndPassword,
          validationSchema: validationSchemaEmailAndPassword,
          onSubmit: async (values) => {
               setLoading(true)
               try {
                    if (!doesRequire2FA) {

                         // Phase 1: Email + Password login
                         const { userData, error: signInError } =
                              await signInWithEmailAndPassword({
                                   email: values.email,
                                   password: values.password,
                                   ip: ipAddress || '',
                              })

                         if (signInError) {
                              toast.error(signInError.message!)
                              setLoading(false)
                              return
                         }

                         // ✅ No MFA required → done
                         if (!userData?.factors || userData.factors?.length === 0) {
                              toast.success("Sign in successful!")
                              handleNavClick("/")
                              formik.resetForm()
                              return
                         }

                         // ✅ MFA required
                         if (userData.factors?.length! >= 1) {

                              const factor = userData.factors?.find((f) => f.factor_type === 'totp');

                              const challenge = await supabase.auth.mfa.challenge({ factorId: factor?.id! });

                              if (!factor) {
                                   toast.error("2FA required but no valid factor found.")
                                   setLoading(false)
                                   return
                              }

                              if (!userData.factors) {
                                   toast.error("Failed to create 2FA challenge.")
                                   setLoading(false)
                                   return
                              }

                              console.log('challengeid', challenge.data?.id!);

                              setDoesRequire2FA(true)
                              setChallengeId(challenge.data?.id!)
                              setFactorId(factor.id)
                              toast("2FA required. Please enter your 6-digit code.")
                              // Logout partial session before OTP
                              await supabase.auth.signOut()
                              setLoading(false)
                              return
                         }
                    } else {
                         // Phase 2: MFA Verification
                         if (!values.otp) {
                              toast.error("Please enter your 2FA code.")
                              setLoading(false)
                              return
                         }

                         const { userData, error: signInError } =
                              await signInWithEmailAndPassword({
                                   email: values.email,
                                   password: values.password,
                                   ip: ipAddress || '',
                              })

                         if (signInError) {
                              toast.error("Sign in failed: " + signInError.message)
                              setLoading(false)
                              return
                         }

                         const { data, error } = await supabase.auth.mfa.verify({
                              factorId,
                              challengeId,
                              code: String(values.otp),
                         })

                         if (error) {
                              await supabase.auth.signOut()
                              toast.error("Invalid 2FA code: " + error.message)
                              setLoading(false)
                              return
                         }

                         if (userData) {
                              toast.success("2FA verified. You're now signed in!")
                              handleNavClick("/")
                         } else {
                              toast.error("Verification failed — no session returned.")
                         }
                    }
               } catch (err) {
                    toast.error("Unexpected error during sign in. Please try again.")
               } finally {
                    setLoading(false)
               }
          },
     })

     return (
          <Box sx={{ textAlign: "center", height: "auto" }}>

               <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
                    Sign in with your email and password
               </Typography>

               <form noValidate onSubmit={formik.handleSubmit}>
                    <Stack spacing={2}>
                         <TextField
                              fullWidth
                              helperText={formik.touched.email && formik.errors.email}
                              error={formik.touched.email && Boolean(formik.errors.email)}
                              label="Email"
                              name="email"
                              type="email"
                              onBlur={formik.handleBlur}
                              onChange={formik.handleChange}
                              value={formik.values.email}
                         />
                         <TextField
                              fullWidth
                              helperText={formik.touched.password && formik.errors.password}
                              error={formik.touched.password && Boolean(formik.errors.password)}
                              label="Password"
                              name="password"
                              type="password"
                              onBlur={formik.handleBlur}
                              onChange={formik.handleChange}
                              value={formik.values.password}
                         />

                         {doesRequire2FA && (
                              <TextField
                                   fullWidth
                                   label="6-digit code"
                                   name="otp"
                                   value={formik.values.otp || ""}
                                   onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "").slice(0, 6)
                                        formik.setFieldValue("otp", val)
                                   }}
                                   slotProps={{
                                        htmlInput: {
                                             inputMode: "numeric",
                                             pattern: "[0-9]*",
                                             maxLength: 6,
                                        },
                                   }}
                              />
                         )}
                    </Stack>

                    <Button
                         fullWidth
                         sx={{ mt: 3 }}
                         size="large"
                         type="submit"
                         variant="contained"
                         disabled={loading || !(formik.isValid && formik.dirty)}
                    >
                         {loading
                              ? doesRequire2FA
                                   ? "Verifying..."
                                   : "Signing in..."
                              : doesRequire2FA
                                   ? "Verify OTP"
                                   : "Sign in"}
                    </Button>
               </form>
          </Box>
     )
}
