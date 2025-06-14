import { Box, CircularProgress, Typography } from '@mui/material';
import type { FC } from 'react';

interface FullScreenLoaderProps {
     progress?: number;
     message?: string;
}

export const FullScreenLoader: FC<FullScreenLoaderProps> = ({ progress, message }) => {
     return (
          <Box
               sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    zIndex: 1300,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
               }}
          >
               <CircularProgress
                    variant={progress !== undefined ? 'determinate' : 'indeterminate'}
                    value={progress}
                    size={64}
               />
               {progress !== undefined && (
                    <Typography variant="body1" sx={{ mt: 2 }}>
                         {progress}%
                    </Typography>
               )}
               {message && (
                    <Typography variant="subtitle1" sx={{ mt: 1 }}>
                         {message}
                    </Typography>
               )}
          </Box>
     );
};
