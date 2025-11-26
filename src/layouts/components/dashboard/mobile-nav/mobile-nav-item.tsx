import type { FC, ReactNode } from 'react';
import { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import ChevronDownIcon from '@untitled-ui/icons-react/build/esm/ChevronDown';
import ChevronRightIcon from '@untitled-ui/icons-react/build/esm/ChevronRight';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Collapse from '@mui/material/Collapse';
import SvgIcon from '@mui/material/SvgIcon';

import { RouterLink } from 'src/components/router-link';
import { useTheme } from '@mui/material';

interface MobileNavItemProps {
  active?: boolean;
  children?: ReactNode;
  depth?: number;
  disabled?: boolean;
  external?: boolean;
  icon?: ReactNode;
  label?: ReactNode;
  open?: boolean;
  path?: string;
  title: string;
}

export const MobileNavItem: FC<MobileNavItemProps> = (props) => {
  const {
    active,
    children,
    depth = 0,
    disabled,
    external,
    icon,
    label,
    open: openProp,
    path,
    title,
  } = props;
  const [open, setOpen] = useState<boolean>(!!openProp);

  const theme = useTheme();
  const handleToggle = useCallback((): void => {
    setOpen((prevOpen) => !prevOpen);
  }, []);

  // Icons can be defined at top level only, deep levels have bullets instead of actual icons.

  let startIcon: ReactNode;

  if (depth === 0) {
    startIcon = icon;
  } else {
    startIcon = (
      <Box
        sx={{
          alignItems: 'center',
          display: 'center',
          height: 20,
          justifyContent: 'center',
          width: 20,
        }}
      >
        <Box
          sx={{
            borderRadius: '50%',
            backgroundColor: theme.palette.primary.main,
            height: 4,
            opacity: 0, // remove this if you want it to be visible
            width: 4,
            ...(active && {
              backgroundColor: theme.palette.primary.main,
              height: 6,
              opacity: 1,
              width: 6,
            }),
          }}
        />
      </Box>
    );
  }

  const offset = depth === 0 ? 0 : (depth - 1) * 16;

  // Branch

  if (children) {
    return (
      <li>
        <ButtonBase
          disabled={disabled}
          onClick={handleToggle}
          sx={{
            alignItems: 'center',
            borderRadius: 1,
            display: 'flex',
            justifyContent: 'flex-start',
            pl: `${16 + offset}px`,
            pr: '16px',
            py: '6px',
            textAlign: 'left',
            width: '100%',
            ...(active && {
              ...(depth === 0 && {
                backgroundColor: theme.palette.action.selected,
              }),
            }),
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
        >
          {startIcon && (
            <Box
              component="span"
              sx={{
                alignItems: 'center',
                color: theme.palette.text.primary,
                display: 'inline-flex',
                justifyContent: 'center',
                mr: 2,
                ...(active && {
                  color: theme.palette.primary.main,
                }),
              }}
            >
              {startIcon}
            </Box>
          )}
          <Box
            component="span"
            sx={{
              color: theme.palette.text.primary,
              flexGrow: 1,
              fontFamily: (theme) => theme.typography.fontFamily,
              fontSize: depth > 0 ? 13 : 14,
              fontWeight: depth > 0 ? 500 : 600,
              lineHeight: '24px',
              whiteSpace: 'nowrap',
              ...(active && {
                color: theme.palette.primary.main
              }),
              ...(disabled && {
                color: theme.palette.text.disabled,
              }),
            }}
          >
            {title}
          </Box>
          <SvgIcon
            sx={{
              color: theme.palette.text.primary,
              fontSize: 16,
              ml: 2,
            }}
          >
            {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </SvgIcon>
        </ButtonBase>
        <Collapse
          in={open}
          sx={{ mt: 0.5 }}
        >
          {children}
        </Collapse>
      </li>
    );
  }

  // Leaf

  const linkProps = path
    ? external
      ? {
        component: 'a',
        href: path,
        target: '_blank',
      }
      : {
        component: RouterLink,
        href: path,
      }
    : {};

  return (
    <li>
      <ButtonBase
        disabled={disabled}
        sx={{
          alignItems: 'center',
          borderRadius: 1,
          display: 'flex',
          justifyContent: 'flex-start',
          pl: `${16 + offset}px`,
          pr: '16px',
          py: '6px',
          textAlign: 'left',
          width: '100%',
          ...(active && {
            ...(depth === 0 && {
              backgroundColor: theme.palette.action.selected,
            }),
          }),
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        }}
        {...linkProps}
      >
        {startIcon && (
          <Box
            component="span"
            sx={{
              alignItems: 'center',
              color: theme.palette.text.primary,
              display: 'inline-flex',
              justifyContent: 'center',
              mr: 2,
              ...(active && {
                color: theme.palette.primary.main,
              }),
            }}
          >
            {startIcon}
          </Box>
        )}
        <Box
          component="span"
          sx={{
            color: theme.palette.text.primary,
            flexGrow: 1,
            fontFamily: (theme) => theme.typography.fontFamily,
            fontSize: depth > 0 ? 13 : 14,
            fontWeight: depth > 0 ? 500 : 600,
            lineHeight: '24px',
            whiteSpace: 'nowrap',
            ...(active && {
              color: theme.palette.text.primary
            }),
            ...(disabled && {
              color: theme.palette.text.disabled,
            }),
          }}
        >
          {title}
        </Box>
        {label && (
          <Box
            component="span"
            sx={{ ml: 2 }}
          >
            {label}
          </Box>
        )}
      </ButtonBase>
    </li>
  );
};

MobileNavItem.propTypes = {
  active: PropTypes.bool,

  depth: PropTypes.number,
  disabled: PropTypes.bool,
  external: PropTypes.bool,


  open: PropTypes.bool,
  path: PropTypes.string,
  title: PropTypes.string.isRequired,
};
