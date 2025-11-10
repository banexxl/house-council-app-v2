import type { FC } from 'react';
import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { alpha } from '@mui/material/styles';

interface SimpleTypingIndicatorProps {
     isTyping: boolean;
     userName?: string;
}

const TypingDots: FC = () => (
     <Box
          component="span"
          sx={{
               display: 'inline-flex',
               alignItems: 'center',
               gap: 0.5,
               ml: 1,
          }}
     >
          {[0, 1, 2].map((dot) => (
               <Box
                    key={dot}
                    sx={{
                         width: 4,
                         height: 4,
                         borderRadius: '50%',
                         backgroundColor: 'text.secondary',
                         animation: 'typing-dots 1.4s infinite',
                         animationDelay: `${dot * 0.2}s`,
                         '@keyframes typing-dots': {
                              '0%, 60%, 100%': {
                                   opacity: 0.3,
                                   transform: 'translateY(0)',
                              },
                              '30%': {
                                   opacity: 1,
                                   transform: 'translateY(-4px)',
                              },
                         },
                    }}
               />
          ))}
     </Box>
);

export const SimpleTypingIndicator: FC<SimpleTypingIndicatorProps> = (props) => {
     const { isTyping, userName = 'Someone' } = props;

     if (!isTyping) {
          return null;
     }

     return (
          <Box
               sx={{
                    px: 3,
                    py: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    borderTop: 1,
                    borderColor: 'divider',
                    backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.8),
               }}
          >
               <Chip
                    size="small"
                    variant="outlined"
                    sx={{
                         fontSize: '0.75rem',
                         height: 24,
                         backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
                         borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
                         color: 'text.secondary',
                         '& .MuiChip-label': {
                              px: 1,
                         },
                    }}
                    label={
                         <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="caption" component="span">
                                   {userName} is typing
                              </Typography>
                              <TypingDots />
                         </Box>
                    }
               />
          </Box>
     );
};

SimpleTypingIndicator.propTypes = {
     isTyping: PropTypes.bool.isRequired,
     userName: PropTypes.string,
};