'use client'

import type { FC, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Image from 'next/image';
import { Logo } from 'src/components/logo';
import { RouterLink } from 'src/components/router-link';
import { paths } from 'src/paths';
import AuthPageGuard from 'src/components/auth-page-guard';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = (props) => {

  const { children } = props;
  const backgroundImage = '/assets/background-images/background-image-3.png';

  return (
    <Box
      sx={{
        display: 'flex',
        flex: '1 1 auto',
        minHeight: '100vh',
        flexDirection: {
          xs: 'column-reverse',
          md: 'row',
        },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          display: { xs: 'block', md: 'none' },
        }}
      >
        <Image
          src={backgroundImage}
          alt="Background"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)',
          }}
        />
      </Box>

      <Box
        sx={{
          position: 'relative',
          alignItems: 'center',
          backgroundColor: 'neutral.800',
          color: 'common.white',
          display: {
            xs: 'none',
            md: 'flex',
          },
          flex: {
            xs: '0 0 auto',
            md: '1 1 auto',
          },
          justifyContent: 'center',
          p: {
            xs: 4,
            md: 8,
          },
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
          }}
        >
          <Image
            src={backgroundImage}
            alt="Background"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, calc(100vw - 320px)"
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        </Box>

        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            display: { xs: 'none', md: 'none', lg: 'block' },
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            p: 2,
            textAlign: 'center',
          }}
        >
          <Typography
            sx={{ mb: 1, color: 'primary.darkest' }}
            variant="h4"
          >
            Welcome to Nest Link
          </Typography>
          <Typography
            sx={{ mt: 4, width: '80%', color: 'primary.darkest' }}
          >
            A modern platform that connects tenants and supervisors,
            bringing transparency and simplicity to building management and maintenance.
          </Typography>
        </Box>

      </Box>

      <Box
        sx={{
          display: 'flex',
          flex: {
            xs: '1 1 auto',
            md: '0 0 auto',
          },
          flexDirection: 'column',
          justifyContent: 'flex-start',
          maxWidth: '100%',
          position: 'relative',
          p: {
            xs: 4,
            md: 8,
          },
          backgroundColor: {
            xs: 'rgba(255,255,255,0.6)',
            md: 'background.paper',
          },
          backdropFilter: {
            xs: 'blur(4px)',
            md: 'none',
          },
          zIndex: 1,
          width: {
            md: 600,
          },
        }}
      >
        <div>
          <Box sx={{ mb: 4 }}>
            <Stack
              alignItems="center"
              component={RouterLink}
              href={paths.index}
              sx={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: { xs: 'center', md: 'flex-start' },
              }}
            >
              <Logo url='/assets/logo-icons/1-01.png' alt='/assets/no-image.png' height={100} width={100} />
              <Box
                sx={{
                  color: 'text.secondary',
                  // fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: '0.3px',
                  lineHeight: 2.5,
                  '& span': {
                    color: 'primary.main',
                  },
                  mb: 2
                }}
              >
                NestLink <span>APP</span>
              </Box>
            </Stack>
          </Box>
          <AuthPageGuard>
            {children}
          </AuthPageGuard>
        </div>
      </Box>
    </Box>
  );
};

Layout.propTypes = {

};
