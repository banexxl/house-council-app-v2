import type { FC, CSSProperties } from 'react';
import Image, { ImageProps } from 'next/image';
import { Box } from '@mui/material';

export interface LogoProps {
  url: string;
  alt?: string;
  width?: number; // default 120
  height?: number; // default 40
  priority?: boolean;
  style?: CSSProperties;
  imageProps?: Omit<ImageProps, 'src' | 'alt' | 'width' | 'height'>; // for advanced usage (sizes, placeholder, etc.)
}

export const Logo: FC<LogoProps> = ({
  url,
  alt = 'Logo',
  width = 120,
  height = 40,
  priority = false,
  style,
  imageProps
}) => {
  return (
    <Box sx={{ display: 'inline-flex', lineHeight: 0 }} >
      <Image
        src={url}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        style={{ width: 'auto', height: 'auto', maxWidth: '100%', ...style }}
        {...imageProps}
      />
    </Box>
  );
};
