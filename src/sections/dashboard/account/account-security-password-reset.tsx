"use client"

import { Box, Button, Card, CardContent, Typography, Stack, InputAdornment, TextField, LinearProgress, IconButton, CircularProgress, useTheme, Alert } from "@mui/material"
import LockIcon from "@mui/icons-material/Lock"
import { User } from "@supabase/supabase-js"
import { createBrowserClient } from '@supabase/ssr'
import { Visibility, VisibilityOff } from "@mui/icons-material"
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useFormik } from "formik"
import { Client } from "src/types/client"
import { challengeTOTP, startEnrollTOTP, verifyTOTPEnrollment } from "src/app/actions/account-2fa-actions"
import { resetPasswordWithOldPassword } from "src/app/actions/client/client-actions"
import { calculatePasswordStrength, getStrengthColor, getStrengthLabel, validationSchemaWithOldPassword } from "src/app/auth/reset-password/reset-password-utils"

interface PasswordResetProps {
     userData: { client: Client; session: User }
}

export default function PasswordReset({ userData }: PasswordResetProps) {

     const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
     const [showPasswordChange, setShowPasswordChange] = useState(false);
     const [resetingPassword, setResetingPassword] = useState(false);
     const [is2FAEnabled, setIs2FAEnabled] = useState(false)
     const [disableCode, setDisableCode] = useState("")
     const [showOldPassword, setShowOldPassword] = useState(false)
     const [showNewPassword, setShowNewPassword] = useState(false)
     const [showConfirmPassword, setShowConfirmPassword] = useState(false)
     const [passwordStrength, setPasswordStrength] = useState(0)
     const [showDisableInput, setShowDisableInput] = useState(false)
     const [factorId, setFactorId] = useState<string | null>(null)
     const [step, setStep] = useState<"init" | "verify" | "disable" | "done">("init")
     const [qrCode, setQrCode] = useState<string | null>(null)
     const [code, setCode] = useState("")
     const [loading, setLoading] = useState(false)

     const handleClickShowNewPassword = () => {
          setShowNewPassword(!showNewPassword)
     }

     const handleClickShowOldPassword = () => {
          setShowOldPassword(!showOldPassword)
     }

     const handleClickShowConfirmPassword = () => {
          setShowConfirmPassword(!showConfirmPassword)
     }

     const handleEnable = async () => {
          setLoading(true)
          try {
               const result = await startEnrollTOTP(userData.session.id)
               if (result.error) throw new Error(result.error)
               setQrCode(result.qr_code ? result.qr_code : null)
               setFactorId(result.id ? result.id : null)
               setStep("verify")
          } catch (error) {
               if (error instanceof Error) {
                    toast.error(error.message)
               } else {
                    toast.error("An unexpected error occurred")
               }
          } finally {
               setLoading(false)
          }
     }

     const handleVerify = async () => {
          setLoading(true)
          if (!factorId) return toast.error("Missing factor ID")

          const challenge = await challengeTOTP(factorId, userData.session.id)
          if (!challenge.success || !challenge.challengeId) {
               return toast.error("Failed to create challenge: " + challenge.error)
          }

          const result = await verifyTOTPEnrollment(factorId, code, challenge.challengeId, userData.session.id)

          if (result.success) {
               toast.success("2FA enabled successfully!")
               setStep("done")
               setLoading(false)
          } else {
               toast.error("Verification failed: " + result.error)
               setLoading(false)
          }
     }

     const handleDisable = async (e: React.FormEvent) => {
          e.preventDefault()
          setLoading(true)

          try {
               if (!factorId) {
                    toast.error("Missing factor ID")
                    return
               }

               // 1. Trigger MFA challenge
               const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
                    factorId,
               })

               if (challengeError || !challengeData?.id) {
                    toast.error("Challenge failed: " + (challengeError?.message || "Unknown error"))
                    return
               }

               // 2. Verify using the 6-digit code entered by the user
               const { error: verifyError } = await supabase.auth.mfa.verify({
                    factorId,
                    challengeId: challengeData.id,
                    code: disableCode, // must come from your input field
               })

               if (verifyError) {
                    toast.error("Verification failed: " + verifyError.message)
                    return
               }

               // 3. Unenroll TOTP factor
               const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId })
               if (unenrollError) {
                    toast.error("Disable failed: " + unenrollError.message)
                    return
               }

               // 4. Update UI
               toast.success("2FA disabled successfully!")
               setDisableCode("")
               setFactorId(null)
               setStep("init")
               setIs2FAEnabled(false)
               setShowDisableInput(false)
          } catch (err) {
               toast.error("Unexpected error disabling 2FA")
          } finally {
               setLoading(false)
          }
     }

     const formik = useFormik({
          initialValues: {
               oldPassword: "",
               newPassword: "",
               confirmPassword: "",
          },
          validationSchema: validationSchemaWithOldPassword,

          onSubmit: async (values) => {
               setResetingPassword(true)
               try {
                    const resetPasswordResponse = await resetPasswordWithOldPassword(userData.client.email, values.oldPassword, values.newPassword);

                    if (resetPasswordResponse.success) {
                         toast.success("Password reset successfully.")
                         formik.resetForm()
                         setShowPasswordChange(false)
                    } else {
                         toast.error("Error resetting password: " + resetPasswordResponse.error!);
                    }
               } catch (error) {
                    toast.error("Error resetting password: " + (error.message || "Unknown error"));
                    formik.setErrors({ newPassword: "Failed to reset password. Please try again." })
               } finally {
                    setResetingPassword(false)
               }
          },
     })

     // Update password strength when password changes
     useEffect(() => {
          setPasswordStrength(calculatePasswordStrength(formik.values.newPassword))

          const factors = userData.session?.factors || []
          const hasTotpFactor = factors.some(factor => factor.factor_type === 'totp' && factor.status === 'verified')

          if (hasTotpFactor) {
               const totp = factors.find(f => f.factor_type === 'totp')
               setFactorId(totp?.id || null)
               setIs2FAEnabled(true)
               setStep("done") // Optional: show "Disable 2FA" UI by default
          }

     }, [formik.values.newPassword, userData.session])

     return (
          <>
               <Card variant="outlined" sx={{ mb: 4 }}>
                    <CardContent>
                         <Typography variant="h6" gutterBottom>
                              Change Password
                         </Typography>

                         <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              It's a good idea to use a strong password that you don't use elsewhere.
                         </Typography>

                         <Box>

                              <Stack direction="row" spacing={2} justifyContent="space-between">
                                   <Box sx={{ display: "flex", justifyContent: "flex-start", gap: 2 }}>
                                        <Button variant="outlined" onClick={() => {
                                             setShowPasswordChange(!showPasswordChange)
                                        }} startIcon={<LockIcon />}>
                                             Change Password
                                        </Button>
                                   </Box>
                              </Stack>

                              {showPasswordChange && (
                                   // <Box sx={{ display: "flex", flexDirection: "column" }}>
                                   <Box component="main" sx={{ flexGrow: 1, py: { xs: 6, md: 5 } }}>
                                        <Box component="form" onSubmit={formik.handleSubmit} noValidate>
                                             <TextField
                                                  fullWidth
                                                  id="oldPassword"
                                                  name="oldPassword"
                                                  label="Current Password"
                                                  type={showOldPassword ? "text" : "password"}
                                                  margin="normal"
                                                  value={formik.values.oldPassword}
                                                  onChange={formik.handleChange}
                                                  onBlur={formik.handleBlur}
                                                  error={formik.touched.oldPassword && Boolean(formik.errors.oldPassword)}
                                                  helperText={formik.touched.oldPassword && formik.errors.oldPassword}
                                                  slotProps={{
                                                       input: {
                                                            endAdornment: (
                                                                 <InputAdornment position="end">
                                                                      <IconButton
                                                                           aria-label="toggle password visibility"
                                                                           onClick={handleClickShowOldPassword}
                                                                           edge="end"
                                                                      >
                                                                           {showOldPassword ? <VisibilityOff /> : <Visibility />}
                                                                      </IconButton>
                                                                 </InputAdornment>
                                                            ),
                                                       },
                                                  }}
                                             />


                                             <TextField
                                                  fullWidth
                                                  id="newPassword"
                                                  name="newPassword"
                                                  label="New Password"
                                                  type={showNewPassword ? "text" : "password"}
                                                  margin="normal"
                                                  value={formik.values.newPassword}
                                                  onChange={formik.handleChange}
                                                  onBlur={formik.handleBlur}
                                                  error={formik.touched.newPassword && Boolean(formik.errors.newPassword)}
                                                  helperText={formik.touched.newPassword && formik.errors.newPassword}
                                                  slotProps={{
                                                       input: {
                                                            endAdornment: (
                                                                 <InputAdornment position="end">
                                                                      <IconButton
                                                                           aria-label="toggle password visibility"
                                                                           onClick={handleClickShowNewPassword}
                                                                           edge="end"
                                                                      >
                                                                           {showNewPassword ? <VisibilityOff /> : <Visibility />}
                                                                      </IconButton>
                                                                 </InputAdornment>
                                                            ),
                                                       },
                                                  }}
                                             />

                                             {formik.values.newPassword && (
                                                  <Box sx={{ mt: 1, mb: 2 }}>
                                                       <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                                                            <Typography variant="caption">Password strength:</Typography>
                                                            <Typography variant="caption" sx={{ color: getStrengthColor(passwordStrength) }}>
                                                                 {getStrengthLabel(passwordStrength)}
                                                            </Typography>
                                                       </Box>
                                                       <LinearProgress
                                                            variant="determinate"
                                                            value={passwordStrength}
                                                            sx={{
                                                                 height: 8,
                                                                 borderRadius: 4,
                                                                 bgcolor: "grey.200",
                                                                 "& .MuiLinearProgress-bar": {
                                                                      bgcolor: getStrengthColor(passwordStrength),
                                                                 },
                                                            }}
                                                       />
                                                  </Box>
                                             )}

                                             <TextField
                                                  fullWidth
                                                  id="confirmPassword"
                                                  name="confirmPassword"
                                                  label="Confirm New Password"
                                                  type={showConfirmPassword ? "text" : "password"}
                                                  margin="normal"
                                                  value={formik.values.confirmPassword}
                                                  onChange={formik.handleChange}
                                                  onBlur={formik.handleBlur}
                                                  error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
                                                  helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
                                                  slotProps={{
                                                       input: {
                                                            endAdornment: (
                                                                 <InputAdornment position="end">
                                                                      <IconButton
                                                                           aria-label="toggle confirm password visibility"
                                                                           onClick={handleClickShowConfirmPassword}
                                                                           edge="end"
                                                                      >
                                                                           {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                                                      </IconButton>
                                                                 </InputAdornment>
                                                            ),
                                                       },
                                                  }}
                                             />

                                             <Alert severity="info" sx={{ mt: 2, mb: 3 }}>
                                                  Your password must be at least 8 characters long and include uppercase letters, lowercase letters,
                                                  and numbers.
                                             </Alert>

                                             <Button
                                                  type="submit"
                                                  fullWidth
                                                  variant="contained"
                                                  size="large"
                                                  disabled={formik.isSubmitting}
                                                  sx={{ mt: 2 }}
                                                  loading={resetingPassword}
                                             >
                                                  {formik.isSubmitting ? <CircularProgress size={24} color="inherit" /> : "Reset Password"}
                                             </Button>
                                        </Box>
                                   </Box>
                                   // </Box>
                              )}

                         </Box >
                    </CardContent>
               </Card>

               <Card variant="outlined" sx={{ mb: 4 }}>
                    <CardContent>
                         <Box sx={{ mt: 2 }}>
                              <Typography variant="h6" sx={{ mb: 2 }}>Two-Factor Authentication</Typography>
                              <Typography variant="body2" color="text.secondary" >
                                   Add an extra layer of security to your account by requiring both your password and a verification code from your mobile phone.
                              </Typography>

                              {!is2FAEnabled && step === "init" && (
                                   <Box sx={{ m: 1, position: 'relative' }}>
                                        <Button
                                             sx={{ width: '200px' }}
                                             variant="contained"
                                             disabled={loading}
                                             onClick={handleEnable}
                                             startIcon={<CheckCircleIcon />}
                                        >
                                             {loading ? "Enabling..." : "Enable"}
                                        </Button>
                                   </Box>
                              )}

                              {step === "verify" && qrCode && (
                                   <Stack spacing={2}>
                                        <img src={qrCode} alt="2FA QR Code" style={{ width: 200, height: 200 }} />
                                        <form onSubmit={handleVerify}>
                                             <TextField
                                                  label="6-digit code"
                                                  value={code}
                                                  onChange={(e) => {
                                                       const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                                                       setCode(val)
                                                  }}
                                                  slotProps={{
                                                       htmlInput: {
                                                            inputMode: 'numeric',
                                                            pattern: '[0-9]*',
                                                            maxLength: 6,
                                                       },
                                                  }}
                                                  fullWidth
                                                  onKeyDown={(e) => {
                                                       if (e.key === 'Enter') {
                                                            handleVerify();
                                                       }
                                                  }}
                                             />
                                             <Button
                                                  type="submit"
                                                  sx={{ width: '200px', mt: 2 }}
                                                  variant="contained"
                                                  disabled={loading}
                                             >
                                                  {
                                                       loading ? "Verifying..." : "Verify"
                                                  }
                                             </Button>
                                        </form>
                                   </Stack>
                              )}

                              {step === "done" && (
                                   <Stack spacing={2}>
                                        <Alert severity="success">2FA is currently enabled for your account.</Alert>

                                        {showDisableInput ? (
                                             <form onSubmit={handleDisable}>
                                                  <TextField
                                                       label="6-digit code"
                                                       value={disableCode}
                                                       onChange={(e) => {
                                                            const val = e.target.value.replace(/\D/g, "").slice(0, 6)
                                                            setDisableCode(val)
                                                       }}
                                                       slotProps={{
                                                            htmlInput: {
                                                                 inputMode: "numeric",
                                                                 pattern: "[0-9]*",
                                                                 maxLength: 6,
                                                            },
                                                       }}
                                                       fullWidth
                                                  />
                                                  <Button
                                                       type="submit"
                                                       sx={{ width: "200px", mt: 2 }}
                                                       variant="contained"
                                                       disabled={loading}
                                                  >
                                                       {loading ? "Disabling..." : "Confirm Disable"}
                                                  </Button>
                                             </form>
                                        ) : (
                                             <Button
                                                  sx={{ width: "200px" }}
                                                  variant="outlined"
                                                  color="error"
                                                  onClick={() => setShowDisableInput(true)}
                                                  disabled={loading}
                                             >
                                                  {loading ? "Disabling..." : "Disable"}
                                             </Button>
                                        )}
                                   </Stack>
                              )}

                         </Box>
                    </CardContent>
               </Card>
          </>
     )
}

