import type { FC, ReactNode } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import { styled } from '@mui/material/styles';

const LayoutRoot = styled('div')(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  display: 'flex',
  flex: '1 1 auto',
  flexDirection: 'column',
}));

const LayoutContainer = styled('div')({
  display: 'flex',
  flex: '1 1 auto',
  flexDirection: 'column',
  width: '100%',
});

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = (props) => {
  const { children } = props;

  return (
    <LayoutRoot>
      <Box
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === 'dark' ? 'neutral.800' : 'neutral.50',
          py: '120px',
        }}
      >
      </Box>
      <Divider />
      <LayoutContainer>{children}</LayoutContainer>
    </LayoutRoot>
  );
};