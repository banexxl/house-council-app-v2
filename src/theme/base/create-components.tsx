import { inputLabelClasses } from '@mui/material/InputLabel';
import { tableCellClasses } from '@mui/material/TableCell';
import type { Components } from '@mui/material/styles/components';
import { createTheme } from '@mui/material/styles';
import { orange } from 'src/theme/colors';

// Used only to create transitions
const muiTheme = createTheme();

export const createComponents = (): Components => {
  return {
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 0,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          textTransform: 'none',
          position: 'relative',
          fontWeight: 600,
          // Base 'physical' shadow (a flat drop to simulate a raised block)
          boxShadow: '0 4px 0 0 rgba(0,0,0,0.15)',
          transform: 'translateY(0)',
          transition: muiTheme.transitions.create(['transform', 'box-shadow'], { duration: 110, easing: muiTheme.transitions.easing.easeOut }),
          // Smooth out color/elevation changes on hover
          '&:hover': {
            boxShadow: '0 4px 0 0 rgba(0,0,0,0.18)',
            transform: 'translateY(0)',
          },
          // Generic loading state (apply className "hc-loading")
          '&.hc-loading': {
            pointerEvents: 'none',
            // Keep button in raised position
            transform: 'translateY(0) !important',
            // Preserve original shadow to avoid layout jump
            boxShadow: '0 4px 0 0 rgba(0,0,0,0.15) !important',
            color: 'transparent !important', // hide label text while keeping width
            '&::after': {
              content: '""',
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 16,
              height: 16,
              marginTop: -8,
              marginLeft: -8,
              borderRadius: '50%',
              border: '2px solid currentColor',
              borderColor: 'currentColor transparent currentColor transparent',
              animation: 'hc-btn-spin 0.8s linear infinite',
            },
            // Prevent press styles while loading
            '&:active': {
              transform: 'translateY(0)',
              boxShadow: '0 4px 0 0 rgba(0,0,0,0.15)',
            },
          },
          // Active press: move button down exactly the shadow height so it looks "pressed in"
          '&:active:not(.Mui-disabled)': {
            transform: 'translateY(4px)',
            boxShadow: '0 0 0 0 rgba(0,0,0,0.15)',
          },
          // Keyboard focus keeps elevation but adds outline for accessibility
          '&:focus-visible': {
            outline: '2px solid rgba(0,0,0,0.35)',
            outlineOffset: '2px',
          },
          '&.Mui-disabled': {
            boxShadow: 'none',
            transform: 'none',
            opacity: 0.5,
          },
          // Contained variant tweaks (retain background + pressed effect synergy)
          '&.MuiButton-contained': {
            boxShadow: '0 4px 0 0 rgba(0,0,0,0.15) !important',
            '&:hover': {
              boxShadow: '0 4px 0 0 rgba(0,0,0,0.18) !important',
            },
            '&:active:not(.Mui-disabled)': {
              boxShadow: '0 0 0 0 rgba(0,0,0,0.18) !important',
            },
          },
          // Outlined variant: add a subtle fill when pressed
          '&.MuiButton-outlined': {
            boxShadow: '0 4px 0 0 rgba(0,0,0,0.12)',
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.03)',
            },
            '&:active:not(.Mui-disabled)': {
              backgroundColor: 'rgba(0,0,0,0.06)',
            },
          },
          // Text variant: lighter shadow
          '&.MuiButton-text': {
            boxShadow: '0 3px 0 0 rgba(0,0,0,0.10)',
            '&:hover': {
              boxShadow: '0 3px 0 0 rgba(0,0,0,0.14)',
            },
            '&:active:not(.Mui-disabled)': {
              boxShadow: '0 0 0 0 rgba(0,0,0,0.14)',
            },
          },
        },
        sizeSmall: {
          padding: '6px 16px',
        },
        sizeMedium: {
          padding: '8px 20px',
        },
        sizeLarge: {
          padding: '11px 24px',
        },
        textSizeSmall: {
          padding: '7px 12px',
        },
        textSizeMedium: {
          padding: '9px 16px',
        },
        textSizeLarge: {
          padding: '12px 16px',
        },

      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '32px 24px',
          '&:last-child': {
            paddingBottom: '32px',
          },
        },
      },
    },
    MuiCardHeader: {
      defaultProps: {
        titleTypographyProps: {
          variant: 'h6',
        },
        subheaderTypographyProps: {
          variant: 'body2',
        },
      },
      styleOverrides: {
        root: {
          padding: '32px 24px 16px',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          boxSizing: 'border-box',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge legacy
        },
        // Spinner animation for generic button loading state
        '@keyframes hc-btn-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        '::-webkit-scrollbar': { width: 0, height: 0 },
        '::-webkit-scrollbar-track': { background: 'transparent' },
        '::-webkit-scrollbar-thumb': { background: 'transparent', border: 'none' },
        '::-webkit-scrollbar-corner': { background: 'transparent' },
        '*::-webkit-scrollbar': { display: 'none' },
        html: {
          MozOsxFontSmoothing: 'grayscale',
          WebkitFontSmoothing: 'antialiased',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          width: '100%',
          scrollbarWidth: 'none',
          scrollbarColor: 'transparent transparent',
        },
        body: {
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
          minHeight: '100%',
          width: '100%',
        },
        '#root, #__next': {
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
        },
        '#nprogress': { pointerEvents: 'none' },
        '#nprogress .bar': {
          height: 3,
          left: 0,
          position: 'fixed',
          top: 0,
          width: '100%',
          zIndex: 2000,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        sizeSmall: {
          padding: 4,
          color: muiTheme.palette.warning.main
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          '&::placeholder': {
            opacity: 1,
          },
        },
      },
    },
    MuiInput: {
      styleOverrides: {
        input: {
          fontSize: 14,
          fontWeight: 500,
          lineHeight: '24px',
        },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
          borderRadius: 8,
          borderStyle: 'solid',
          borderWidth: 1,
          overflow: 'hidden',
          transition: muiTheme.transitions.create(['border-color', 'box-shadow']),
          '&:before': {
            display: 'none',
          },
          '&:after': {
            display: 'none',
          },
        },
        input: {
          fontSize: 14,
          fontWeight: 500,
          lineHeight: '24px',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        input: {
          fontSize: 14,
          fontWeight: 500,
          lineHeight: '24px',
        },
        notchedOutline: {
          transition: muiTheme.transitions.create(['border-color', 'box-shadow']),
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: 14,
          fontWeight: 500,
          [`&.${inputLabelClasses.filled}`]: {
            transform: 'translate(12px, 18px) scale(1)',
          },
          [`&.${inputLabelClasses.shrink}`]: {
            [`&.${inputLabelClasses.standard}`]: {
              transform: 'translate(0, -1.5px) scale(0.85)',
            },
            [`&.${inputLabelClasses.filled}`]: {
              transform: 'translate(12px, 6px) scale(0.85)',
            },
            [`&.${inputLabelClasses.outlined}`]: {
              transform: 'translate(14px, -9px) scale(0.85)',
            },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      },
    },
    MuiLink: {
      defaultProps: {
        underline: 'hover',
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          marginRight: '16px',
          minWidth: 'unset',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiPopover: {
      defaultProps: {
        elevation: 16,
      },
    },
    MuiRadio: {
      defaultProps: {
        color: 'primary',
      },
    },
    MuiSwitch: {
      defaultProps: {
        color: 'primary',
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontSize: 14,
          fontWeight: 500,
          lineHeight: 1.71,
          minWidth: 'auto',
          paddingLeft: 0,
          paddingRight: 0,
          textTransform: 'none',
          '& + &': {
            marginLeft: 24,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '15px 16px',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          borderBottom: 'none',
          [`& .${tableCellClasses.root}`]: {
            borderBottom: 'none',
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          },
          [`& .${tableCellClasses.paddingCheckbox}`]: {
            paddingTop: 4,
            paddingBottom: 4,
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'filled',
      },
    },
  };
};
