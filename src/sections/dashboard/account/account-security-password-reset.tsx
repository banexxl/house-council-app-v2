"use client"

import { Box, Button, Card, CardContent, Typography, Stack, InputAdornment, TextField, LinearProgress, IconButton, CircularProgress, Alert } from "@mui/material"
import LockIcon from "@mui/icons-material/Lock"
import { User } from "@supabase/supabase-js"
import { Visibility, VisibilityOff } from "@mui/icons-material"
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useFormik } from "formik"
import { challengeTOTP, disableTOTP, startEnrollTOTP, verifyTOTPEnrollment } from "src/app/actions/account-2fa-actions"
import { resetPasswordWithOldPassword } from "src/app/actions/customer/customer-actions"
import { calculatePasswordStrength, getStrengthColor, getStrengthLabel, validationSchemaWithOldPassword } from "src/app/auth/reset-password/reset-password-utils"
import { useTranslation } from "react-i18next"
import { tokens } from "src/locales/tokens"
import { PolarCustomer } from "src/types/polar-customer-types"

interface PasswordResetProps {
     userData: { customer: PolarCustomer; session: User }
}

export default function PasswordReset({ userData }: PasswordResetProps) {

     const { t } = useTranslation()
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
     const [totpAlreadyExists, setTotpAlreadyExists] = useState(false)

     const handleClickShowNewPassword = () => {
          setShowNewPassword(!showNewPassword)
     }

     const handleClickShowOldPassword = () => {
          setShowOldPassword(!showOldPassword)
     }

     const handleClickShowConfirmPassword = () => {
          setShowConfirmPassword(!showConfirmPassword)
     }

     const getLocalizedStrengthLabel = (strength: number) => {
          const label = getStrengthLabel(strength)
          if (label === "Weak") return t(tokens.account.security.passwordStrengthWeak)
          if (label === "Medium") return t(tokens.account.security.passwordStrengthMedium)
          return t(tokens.account.security.passwordStrengthStrong)
     }

     const handleEnable = async () => {
          setLoading(true)
          setTotpAlreadyExists(false)
          try {
               const result = await startEnrollTOTP(userData.session.id)
               if (result.error) {
                    if (result.error.includes('A factor with the friendly name "NestLink 2FA TOTP" for this user already exists')) {
                         setTotpAlreadyExists(true)
                    }
                    throw new Error(result.error)
               }
               setQrCode(result.qr_code ? result.qr_code : null)
               setFactorId(result.id ? result.id : null)
               setStep("verify")
          } catch (error) {
               const message = error instanceof Error && error.message
                    ? error.message
                    : t(tokens.common.actionSubmitError)
               toast.error(message)
          } finally {
               setLoading(false)
          }
     }

     const handleVerify = async () => {
          setLoading(true)
          if (!factorId) {
               toast.error(t(tokens.account.security.missingFactorId))
               setLoading(false)
               return
          }

          const challenge = await challengeTOTP(factorId, userData.session.id)
          if (!challenge.success || !challenge.challengeId) {
               const message = challenge.error
                    ? `${t(tokens.account.security.challengeFailed)}: ${challenge.error}`
                    : t(tokens.account.security.challengeFailed)
               toast.error(message)
               setLoading(false)
               return
          }

          const result = await verifyTOTPEnrollment(factorId, code, challenge.challengeId, userData.session.id)

          if (result.success) {
               toast.success(t(tokens.account.security.twofaEnabledSuccess))
               setStep("done")
               setLoading(false)
          } else {
               const message = result.error
                    ? `${t(tokens.account.security.verificationFailed)}: ${result.error}`
                    : t(tokens.account.security.verificationFailed)
               toast.error(message)
               setLoading(false)
          }
     }

     const handleDisable = async (e: React.FormEvent) => {
          e.preventDefault()
          setLoading(true)

          try {
               if (!factorId) {
                    toast.error(t(tokens.account.security.missingFactorId))
                    return
               }

               // 1. Trigger MFA challenge
               const { challengeId, error } = await challengeTOTP(factorId, userData.session.id)

               if (error || !challengeId) {
                    const message = error
                         ? `${t(tokens.account.security.challengeFailed)}: ${error}`
                         : t(tokens.account.security.challengeFailed)
                    toast.error(message)
                    return
               }

               // 2. Verify using the 6-digit code entered by the user
               const { success: verifySuccess, error: verifyError } = await verifyTOTPEnrollment(factorId, disableCode, challengeId, userData.session.id)

               if (verifyError || !verifySuccess) {
                    const message = verifyError
                         ? `${t(tokens.account.security.verificationFailed)}: ${verifyError}`
                         : t(tokens.account.security.verificationFailed)
                    toast.error(message)
                    return
               }

               // 3. Unenroll TOTP factor
               const { error: unenrollError } = await disableTOTP(factorId, userData.session.id!)
               if (unenrollError) {
                    toast.error(`${t(tokens.account.security.disableFailed)}: ${unenrollError}`)
                    return
               }

               // 4. Update UI
               toast.success(t(tokens.account.security.twofaDisabledSuccess))
               setDisableCode("")
               setFactorId(null)
               setStep("init")
               setIs2FAEnabled(false)
               setShowDisableInput(false)
          } catch (err) {
               toast.error(t(tokens.account.security.unexpectedDisableError))
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
                    const resetPasswordResponse = await resetPasswordWithOldPassword(userData.customer.email, values.oldPassword, values.newPassword);

                    if (resetPasswordResponse.success) {
                         toast.success(t(tokens.account.security.resetPasswordSuccess))
                         formik.resetForm()
                         setShowPasswordChange(false)
                    } else {
                         toast.error(resetPasswordResponse.error || t(tokens.account.security.resetPasswordError));
                    }
               } catch (error) {
                    const message = error instanceof Error && error.message
                         ? error.message
                         : t(tokens.account.security.resetPasswordError)
                    toast.error(message)
                    formik.setErrors({ newPassword: t(tokens.account.security.resetPasswordError) })
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
                              {t(tokens.account.security.changePassword)}
                         </Typography>

                         <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {t(tokens.account.security.changePasswordHint)}
                         </Typography>

                         <Box>

                              <Stack direction="row" spacing={2} justifyContent="space-between">
                                   <Box sx={{ display: "flex", justifyContent: "flex-start", gap: 2 }}>
                                        <Button variant="outlined" onClick={() => {
                                             setShowPasswordChange(!showPasswordChange)
                                        }} startIcon={<LockIcon />}>
                                             {t(tokens.account.security.changePassword)}
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
                                                  label={t(tokens.account.security.currentPassword)}
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
                                                  label={t(tokens.account.security.newPassword)}
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
                                                            <Typography variant="caption">{t(tokens.account.security.passwordStrength)}</Typography>
                                                            <Typography variant="caption" sx={{ color: getStrengthColor(passwordStrength) }}>
                                                                 {getLocalizedStrengthLabel(passwordStrength)}
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
                                                  label={t(tokens.account.security.confirmNewPassword)}
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
                                                  {t(tokens.account.security.passwordRequirements)}
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
                                                  {formik.isSubmitting ? <CircularProgress size={24} color="inherit" /> : t(tokens.account.security.resetPassword)}
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
                              <Typography variant="h6" sx={{ mb: 2 }}>{t(tokens.account.security.twoFactorAuth)}</Typography>
                              <Typography variant="body2" color="text.secondary" >
                                   {t(tokens.account.security.twoFactorAuthHint)}
                              </Typography>

                              {totpAlreadyExists && (
                                   <Alert severity="info" sx={{ mt: 2 }}>
                                        {t(tokens.account.security.totpAlreadyExistsInfo)}
                                   </Alert>
                              )}

                              {!is2FAEnabled && step === "init" && (
                                   <Box sx={{ m: 1, position: 'relative' }}>
                                        <Button
                                             sx={{ width: '200px' }}
                                             variant="contained"
                                             disabled={loading}
                                             onClick={handleEnable}
                                             startIcon={<CheckCircleIcon />}
                                        >
                                             {loading ? t(tokens.account.security.enabling) : t(tokens.account.security.enable2fa)}
                                        </Button>
                                   </Box>
                              )}

                              {step === "verify" && qrCode && (
                                   <Stack spacing={2}>
                                        <img src={qrCode} alt={t(tokens.account.security.qrCodeAlt)} style={{ width: 200, height: 200 }} />
                                        <form onSubmit={handleVerify}>
                                             <TextField
                                                  label={t(tokens.account.security.codeLabel)}
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
                                                  {loading ? t(tokens.account.security.verifying) : t(tokens.account.security.verify)}
                                             </Button>
                                        </form>
                                   </Stack>
                              )}

                              {step === "done" && (
                                   <Stack spacing={2}>
                                        <Alert severity="success">{t(tokens.account.security.twofaEnabled)}</Alert>

                                        {showDisableInput ? (
                                             <form onSubmit={handleDisable}>
                                                  <TextField
                                                       label={t(tokens.account.security.codeLabel)}
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
                                                       {loading ? t(tokens.account.security.disabling) : t(tokens.account.security.confirmDisable)}
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
                                                  {loading ? t(tokens.account.security.disabling) : t(tokens.account.security.disable2fa)}
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