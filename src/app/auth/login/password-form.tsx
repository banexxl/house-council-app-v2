"use client";

import { useFormik } from "formik";
import { startTransition, useState } from "react";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { Button } from "@mui/material";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

import {
     initialValuesEmailAndPassword,
     validationSchemaEmailAndPassword,
} from "./login-schema";
import { signInWithEmailAndPassword } from "../actions";

type PasswordFormProps = {
     ipAddress: string | null;
     safeRedirect: string;
};

type SupabaseMfaFactor = {
     id: string;
     factor_type: "totp" | string;
     status: "unverified" | "verified" | string;
};

export const PasswordForm = ({ ipAddress, safeRedirect }: PasswordFormProps) => {
     const router = useRouter();

     const [doesRequire2FA, setDoesRequire2FA] = useState(false);
     const [challengeId, setChallengeId] = useState<string>("");
     const [factorId, setFactorId] = useState<string>("");
     const [loading, setLoading] = useState<boolean>(false);

     const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL as string,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
     );

     const handleNavClick = () => {
          startTransition(() => {
               router.push(safeRedirect);
          });
     };

     const formik = useFormik({
          initialValues: initialValuesEmailAndPassword,
          validationSchema: validationSchemaEmailAndPassword,
          onSubmit: async (values) => {
               setLoading(true);

               try {
                    // ===========================
                    // PHASE 1: EMAIL + PASSWORD
                    // ===========================
                    if (!doesRequire2FA) {
                         const { userData, error: signInError } =
                              await signInWithEmailAndPassword({
                                   email: values.email,
                                   password: values.password,
                                   ip: ipAddress || "",
                              });

                         if (signInError) {
                              toast.error(signInError.details || "Sign in failed");
                              setLoading(false);
                              return;
                         }

                         if (!userData) {
                              toast.error("Sign in failed — no user returned.");
                              setLoading(false);
                              return;
                         }

                         // Find a VERIFIED TOTP factor (only those actually enforce 2FA)
                         const totpFactor = (userData.factors || []).find(
                              (f: SupabaseMfaFactor) =>
                                   f.factor_type === "totp" && f.status === "verified"
                         ) as SupabaseMfaFactor | undefined;

                         // ✅ No verified TOTP factor → no 2FA required, user is fully logged in
                         if (!totpFactor) {
                              toast.success("Sign in successful!");
                              handleNavClick();
                              formik.resetForm();
                              setLoading(false);
                              return;
                         }

                         // ===========================
                         // VERIFIED FACTOR → START 2FA
                         // ===========================
                         const { data: challengeData, error: challengeError } =
                              await supabase.auth.mfa.challenge({
                                   factorId: totpFactor.id,
                              });

                         if (challengeError || !challengeData?.id) {
                              console.error("MFA challenge error:", challengeError);
                              toast.error("Failed to start 2FA challenge. Please try again.");
                              setLoading(false);
                              return;
                         }

                         setDoesRequire2FA(true);
                         setChallengeId(challengeData.id);
                         setFactorId(totpFactor.id);

                         toast("2FA required. Please enter your 6-digit code.");
                         // ❌ IMPORTANT: we do NOT sign out here. We keep the session alive.
                         setLoading(false);
                         return;
                    }

                    // ===========================
                    // PHASE 2: OTP VERIFICATION
                    // ===========================
                    if (!values.otp) {
                         toast.error("Please enter your 2FA code.");
                         setLoading(false);
                         return;
                    }

                    if (!factorId || !challengeId) {
                         toast.error("Missing 2FA challenge context. Please log in again.");
                         setLoading(false);
                         setDoesRequire2FA(false);
                         return;
                    }

                    const { data: verifyData, error: verifyError } =
                         await supabase.auth.mfa.verify({
                              factorId,
                              challengeId,
                              code: String(values.otp),
                         });

                    if (verifyError) {
                         console.error("MFA verify error:", verifyError);
                         toast.error("Invalid 2FA code. Please try again.");
                         setLoading(false);
                         return;
                    }

                    // At this point, Supabase has upgraded session to AAL2 (aal = 'aal2')
                    // verifyData.session may contain the upgraded session
                    if (verifyData?.user && verifyData.access_token) {
                         toast.success("2FA verified. You're now signed in!");
                         handleNavClick();
                    } else {
                         toast.error("Verification failed — no session returned.");
                    }
               } catch (err) {
                    console.error("Unexpected error during sign in:", err);
                    toast.error("Unexpected error during sign in. Please try again.");
               } finally {
                    setLoading(false);
               }
          },
     });

     const isSubmittingDisabled =
          loading ||
          !formik.dirty ||
          !formik.isValid ||
          (doesRequire2FA && (!formik.values.otp || String(formik.values.otp).length < 6));

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
                              disabled={doesRequire2FA} // lock email during OTP phase
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
                              disabled={doesRequire2FA} // lock password during OTP phase
                         />

                         {doesRequire2FA && (
                              <TextField
                                   fullWidth
                                   label="6-digit code"
                                   name="otp"
                                   value={formik.values.otp || ""}
                                   onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                                        formik.setFieldValue("otp", val);
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
                         disabled={isSubmittingDisabled}
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
     );
};
