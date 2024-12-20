'use client';

import { useFormik } from 'formik';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Seo } from 'src/components/seo';
import { initialValues, validationSchema } from './login-schema';
import { login } from '../actions';
import { useState } from 'react';

const Page = () => {

  const [message, setMessage] = useState<string | null>('')
  const [loginError, setLoginError] = useState<boolean>(false)

  const onSubmit = async (values: typeof initialValues) => {
    const result = await login(values.email)

    if (result.error) {
      setLoginError(true)
      setMessage(result.error)
    } else if (result.success) {

      setLoginError(false)
      setMessage(result.success)
    }
  };

  const formik = useFormik({
    initialValues,
    validationSchema,
    onSubmit,
  });

  return (
    <>
      <Seo title="Login" />
      <div>
        <Stack
          sx={{ mb: 4 }}
          spacing={1}
        >
          <Typography variant="h5">Log in</Typography>
          <Typography
            color="text.secondary"
            variant="body2"
          >
            If you already have an account, we'll send you an email with a link to log in.
          </Typography>
        </Stack>
        <form
          noValidate
          onSubmit={formik.handleSubmit}
        >
          <Stack spacing={3}>
            <TextField
              autoFocus
              error={!!(formik.touched.email && formik.errors.email)}
              fullWidth
              helperText={
                <span
                  style={{ color: formik.touched.email && formik.errors.email ? 'red' : loginError ? 'red' : 'green' }}
                >
                  {message || (formik.touched.email && formik.errors.email)}
                </span>
              }
              label="Email Address"
              name="email"
              onBlur={formik.handleBlur}
              onChange={formik.handleChange}
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
          >
            Continue
          </Button>
        </form>
      </div>
    </>
  );
};

export default Page;
