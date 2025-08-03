'use client'

import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useState, useTransition } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useSearchParams } from "next/navigation";
import { resetTenantPassword } from "src/app/actions/tenant/tenant-actions";
import Link from "next/link";


export default function TenantPasswordResetPage() {
     const [isPending, startTransition] = useTransition();
     const [success, setSuccess] = useState(false);
     const [submitError, setSubmitError] = useState("");
     const searchParams = useSearchParams();
     const emailFromUrl = searchParams.get("email") || "";
     const tokenFromUrl = searchParams.get("token") || "";

     const validationSchema = Yup.object({
          email: Yup.string().email("Invalid email").required("Email is required"),
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
     });

     const formik = useFormik({
          initialValues: {
               email: emailFromUrl,
               newPassword: "",
               confirmPassword: "",
          },
          enableReinitialize: true,
          validationSchema,
          onSubmit: (values, { resetForm }) => {
               setSubmitError("");
               setSuccess(false);
               startTransition(async () => {
                    const result = await resetTenantPassword(values.email, values.newPassword, tokenFromUrl);
                    if (result.success) {
                         setSuccess(true);
                         resetForm();
                    } else {
                         setSubmitError(result.error || "Failed to reset password.");
                    }
               });
          },
     });

     return (
          <Box sx={{ maxWidth: 400, mx: "auto", mt: 8, p: 3, border: "1px solid #eee", borderRadius: 2 }}>
               <Typography variant="h5" sx={{ mb: 2 }}>
                    Tenant Password Reset
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
                              disabled={!!emailFromUrl}
                         />
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
                         {submitError && <Typography color="error">{submitError}</Typography>}
                         {success && <Typography color="success.main">Password reset successfully!</Typography>}
                         <Button type="submit" variant="contained" fullWidth disabled={isPending || !formik.isValid || !formik.dirty}>
                              {isPending ? "Resetting..." : "Reset Password"}
                         </Button>
                    </Stack>
                    <Box mt={2}>
                         <Link href={'/auth/login'} passHref>
                              <Button variant="outlined" fullWidth>
                                   Back to Login
                              </Button>
                         </Link>
                    </Box>
               </form>
          </Box>
     );
}

