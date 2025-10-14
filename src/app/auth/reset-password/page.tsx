'use client'

import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useState, useTransition } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useSearchParams } from "next/navigation";
import { resetTenantPassword } from "src/app/actions/tenant/tenant-actions";
import Link from "next/link";
import { resetClientMemberPassword } from "src/app/actions/client/client-members";
import toast from "react-hot-toast";
import { logout } from "src/app/auth/actions";
import { useRouter } from "next/navigation";
import { sendPasswordRecoveryEmail } from "src/app/actions/client/client-actions";


export default function TenantPasswordResetPage() {
     const [isPending, startTransition] = useTransition();
     const [success, setSuccess] = useState(false);
     const [submitError, setSubmitError] = useState("");
     const [isLoggingOut, setIsLoggingOut] = useState(false);
     const [isSendingEmail, setIsSendingEmail] = useState(false);
     const router = useRouter();
     const searchParams = useSearchParams();
     const tokenFromUrl = searchParams.get("token") || "";
     const emailFromUrl = searchParams.get("email") || "";
     const clientIdFromUrl = searchParams.get("client_id") || "";
     const isClientMember = searchParams.get("role") === "client_member";
     const hasValidToken = !!tokenFromUrl;

     // Different validation schemas based on whether we have a token
     const validationSchema = Yup.object({
          email: Yup.string().email("Invalid email").required("Email is required"),
          ...(hasValidToken && {
               newPassword: Yup.string()
                    .required("Password is required")
                    .min(8, "Password must be at least 8 characters")
                    .matches(/[a-z]/, "Password must contain a lowercase letter")
                    .matches(/[A-Z]/, "Password must contain an uppercase letter")
                    .matches(/[0-9]/, "Password must contain a number")
                    .matches(/[^a-zA-Z0-9]/, "Password must contain a special character"),
               confirmPassword: Yup.string()
                    .oneOf([Yup.ref("newPassword")], "Passwords must match")
                    .required("Confirm your password"),
          })
     });

     const formik = useFormik({
          initialValues: {
               email: emailFromUrl || '',
               newPassword: "",
               confirmPassword: "",
          },
          enableReinitialize: true,
          validationSchema,
          onSubmit: (values, { resetForm }) => {
               setSubmitError("");
               setSuccess(false);
               startTransition(async () => {
                    if (isClientMember) {
                         const { success, error } = await resetClientMemberPassword(values.email, values.newPassword);
                         if (success) {
                              toast.success("Password reset successfully!");
                              setSuccess(success);
                              resetForm();
                         } else {
                              toast.error(error || "Failed to reset password.");
                              setSubmitError(error || "Failed to reset password.");
                         }
                    } else {
                         const result = await resetTenantPassword(values.email, values.newPassword, tokenFromUrl);
                         if (result.success) {
                              toast.success("Password reset successfully!");
                              setSuccess(true);
                              resetForm();
                         } else {
                              setSubmitError(result.error || "Failed to reset password.");
                         }
                    }
               });
          },
     });

     const handleSendRecoveryEmail = async () => {
          if (!formik.values.email) {
               toast.error("Please enter your email address first");
               return;
          }

          setIsSendingEmail(true);
          try {
               const { success, error } = await sendPasswordRecoveryEmail(formik.values.email);
               if (success) {
                    toast.success("Password recovery email sent! Check your inbox.");
               } else {
                    toast.error(error || "Failed to send recovery email");
               }
          } catch (error) {
               toast.error("Failed to send recovery email");
          } finally {
               setIsSendingEmail(false);
          }
     };

     const handleBackToLogin = async () => {
          setIsLoggingOut(true);
          try {
               await logout();
               router.push('/auth/login');
          } catch (error) {
               console.error('Logout failed:', error);
               // Navigate anyway even if logout fails
               router.push('/auth/login');
          } finally {
               setIsLoggingOut(false);
          }
     };

     return (
          <Box sx={{ maxWidth: 400, mx: "auto", mt: 8, p: 3, border: "1px solid #eee", borderRadius: 2 }}>
               <Typography variant="h5" sx={{ mb: 2 }}>
                    {hasValidToken ? (
                         isClientMember ? <span>Client Member Password Reset</span> : <span>Password Reset</span>
                    ) : (
                         <span>Send Password Recovery Email</span>
                    )}
               </Typography>
               <form onSubmit={formik.handleSubmit} noValidate>
                    <Stack spacing={2}>
                         <TextField
                              label="Email"
                              name="email"
                              value={formik.values.email}
                              onChange={formik.handleChange}
                              onBlur={formik.handleBlur}
                              error={formik.touched.email && Boolean(formik.errors.email)}
                              helperText={formik.touched.email && formik.errors.email}
                              fullWidth
                              required
                              disabled={hasValidToken} // Disable if email came from URL
                         />

                         {hasValidToken && (
                              <>
                                   <TextField
                                        label="New Password"
                                        name="newPassword"
                                        type="password"
                                        value={formik.values.newPassword}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        error={formik.touched.newPassword && Boolean(formik.errors.newPassword)}
                                        helperText={formik.touched.newPassword && formik.errors.newPassword}
                                        fullWidth
                                        required
                                   />
                                   <TextField
                                        label="Confirm Password"
                                        name="confirmPassword"
                                        type="password"
                                        value={formik.values.confirmPassword}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
                                        helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
                                        fullWidth
                                        required
                                   />
                              </>
                         )}
                         {submitError && <Typography color="error">{submitError}</Typography>}
                         {success && <Typography color="success.main">Password reset successfully!</Typography>}

                         {hasValidToken ? (
                              // Show password reset button when token is present
                              <Button type="submit" variant="contained" fullWidth disabled={isPending || !formik.isValid || !formik.dirty}>
                                   {isPending ? "Resetting..." : "Reset Password"}
                              </Button>
                         ) : (
                              // Show send recovery email button when no token
                              <>
                                   <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 1 }}>
                                        Enter your email address and we'll send you a link to reset your password.
                                   </Typography>
                                   <Button
                                        variant="contained"
                                        fullWidth
                                        onClick={handleSendRecoveryEmail}
                                        disabled={isSendingEmail || !formik.values.email}
                                   >
                                        {isSendingEmail ? "Sending..." : "Send Recovery Email"}
                                   </Button>
                              </>
                         )}
                    </Stack>
                    <Box mt={2}>
                         <Button
                              variant="outlined"
                              fullWidth
                              onClick={handleBackToLogin}
                              disabled={isLoggingOut || isPending}
                         >
                              {isLoggingOut ? "Logging out..." : "Back to Login"}
                         </Button>
                    </Box>
               </form>
          </Box>
     );
}

