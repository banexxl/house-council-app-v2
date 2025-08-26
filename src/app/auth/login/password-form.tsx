"use client"

import { useFormik } from "formik"
import { useEffect, useState } from "react"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import Box from "@mui/material/Box"
import { initialValuesEmailAndPassword, validationSchemaEmailAndPassword } from "./login-schema"
import toast from "react-hot-toast"
import { signInWithEmailAndPassword } from "../actions"
import { useRouter } from "next/navigation"
import { Button } from "@mui/material"

export const PasswordForm = () => {
     const [message, setMessage] = useState<string | null>("")
     const [loginError, setLoginError] = useState<boolean>(false)
     const router = useRouter();
     const [ip, setIp] = useState<string>("");

     useEffect(() => {
          fetch("/api/ip")
               .then((res) => res.json())
               .then((data) => setIp(data.ip));
     }, [])


     const onSubmit = async (values: typeof initialValuesEmailAndPassword) => {

          const { success, error } = await signInWithEmailAndPassword({ email: values.email, password: values.password, ip })

          if (error) {
               setLoginError(true)
               toast.error("Failed to authenticate with password")
               setMessage(error.message ? error.message : '')
          } else if (success) {
               setLoginError(false)
               toast.success("Successfully signed in")
               router.push("/dashboard")
               formik.resetForm() // Reset the form after successful submission
          }
     }

     const formik = useFormik({
          initialValues: initialValuesEmailAndPassword,
          validationSchema: validationSchemaEmailAndPassword,
          onSubmit,
     })

     return (
          <Box sx={{ textAlign: "center", height: "300px" }}>
               <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
                    Sign in with your email and password
               </Typography>

               {loginError && (
                    <Typography color="error" sx={{ mb: 2 }}>
                         {message}
                    </Typography>
               )}

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
                         Sign in
                    </Button>
               </form>
          </Box>
     )
}

