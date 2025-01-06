import type { FC } from 'react';
import { useTheme } from '@mui/material/styles';

export const Logo: FC = () => {
  const theme = useTheme();
  const fillColor = theme.palette.primary.main;

  return (
    <svg
      fill="none"
      height="100%"
      viewBox="0 0 24 24"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Building Base */}
      <rect
        x="4"
        y="2"
        width="16"
        height="20"
        fill={fillColor}
      />
      {/* Windows */}
      <rect x="6" y="6" width="3" height="3" fill="#FFFFFF" />
      <rect x="11" y="6" width="3" height="3" fill="#FFFFFF" />
      <rect x="16" y="6" width="3" height="3" fill="#FFFFFF" />
      <rect x="6" y="11" width="3" height="3" fill="#FFFFFF" />
      <rect x="11" y="11" width="3" height="3" fill="#FFFFFF" />
      <rect x="16" y="11" width="3" height="3" fill="#FFFFFF" />
      <rect x="6" y="16" width="3" height="3" fill="#FFFFFF" />
      <rect x="11" y="16" width="3" height="3" fill="#FFFFFF" />
      <rect x="16" y="16" width="3" height="3" fill="#FFFFFF" />
      {/* Door */}
      <rect x="10" y="16" width="4" height="5" fill="#FFFFFF" />
    </svg>
  );
};
