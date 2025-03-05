'use client';

import { useFormik } from 'formik';
import { useState } from 'react';
import { LoadingButton } from '@mui/lab';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import { Seo } from 'src/components/seo';
import { initialValues, validationSchema } from './login-schema';
import { magicLinkLogin, loginWithGoogle } from '../actions';
import GoogleIcon from '@mui/icons-material/Google';
import toast from 'react-hot-toast';

const Page = () => {
  const [message, setMessage] = useState<string | null>('');
  const [loginError, setLoginError] = useState<boolean>(false);
  const [authMethod, setAuthMethod] = useState<'magic-link' | 'google'>('magic-link');

  const onSubmit = async (values: typeof initialValues) => {
    const result = await magicLinkLogin(values.email);

    if (result.error) {
      setLoginError(true);
      toast.error('Failed to authenticate with Magic Link');
      setMessage(result.error);
    } else if (result.success) {
      setLoginError(false);
      toast.success('Successfully authenticated with Magic Link');
      setMessage(result.success);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      setLoginError(true);
      setMessage('Failed to authenticate with Google');
    }
  };

  const formik = useFormik({
    initialValues,
    validationSchema,
    onSubmit,
  });

  const handleAuthMethodChange = (_event: React.SyntheticEvent, newValue: 'magic-link' | 'google') => {
    setAuthMethod(newValue);
    // Reset error messages when switching methods
    setMessage('');
    setLoginError(false);
  };

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
            Choose your preferred login method
          </Typography>
        </Stack>

        <Tabs
          value={authMethod}
          onChange={handleAuthMethodChange}
          variant="fullWidth"
          sx={{ mb: 3 }}
        >
          <Tab value="magic-link" label="Magic Link" />
          <Tab value="google" label="Google" />
        </Tabs>

        {authMethod === 'magic-link' ? (
          <Box sx={{ textAlign: 'center', height: '300px' }}>
            <Typography
              color="text.secondary"
              variant="body2"
              sx={{ mb: 3 }}
            >
              We'll send you an email with a link to log in.
            </Typography>
            <form
              noValidate
              onSubmit={formik.handleSubmit}
            >
              <Stack spacing={3}>
                <TextField
                  autoFocus
                  error={!!(formik.touched.email && formik.errors.email) || loginError}
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
              <LoadingButton
                fullWidth
                sx={{ mt: 3 }}
                size="large"
                type="submit"
                variant="contained"
                loading={formik.isSubmitting}
              >
                Send Magic Link
              </LoadingButton>
            </form>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', height: '300px' }}>
            <Typography
              color="text.secondary"
              variant="body2"
              sx={{ mb: 3 }}
            >
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
              startIcon={<GoogleIcon />}
              onClick={handleGoogleLogin}
              sx={{
                borderColor: '#4285F4',
                color: '#4285F4',
                '&:hover': {
                  borderColor: '#4285F4',
                  backgroundColor: 'rgba(66, 133, 244, 0.04)',
                },
                py: 1.5
              }}
            >
              Sign in with Google
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
          onClick={() => setAuthMethod(authMethod === 'magic-link' ? 'google' : 'magic-link')}
          sx={{ textTransform: 'none' }}
        >
          {authMethod === 'magic-link' ? 'Sign in with Google instead' : 'Sign in with Magic Link instead'}
        </Button>
      </div>
    </>
  );
};

export default Page;
