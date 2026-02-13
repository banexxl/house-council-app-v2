import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import { usePopover } from 'src/hooks/use-popover';
import type { Language } from 'src/types/settings';

import { LanguagePopover } from './language-popover';

const languages: Record<Language, string> = {
  en: '/assets/flags/flag-uk.svg',
  de: '/assets/flags/flag-de.svg',
  es: '/assets/flags/flag-es.svg',
  rs: '/assets/flags/flag-rs.svg',
};

export const LanguageSwitch: FC = () => {
  const { i18n } = useTranslation();
  const popover = usePopover<HTMLButtonElement>();

  const activeLanguage = (i18n.resolvedLanguage ?? i18n.language).split('-')[0] as Language;
  const flag = languages[activeLanguage] ?? languages.rs;


  return (
    <>
      <Tooltip title="Language">
        <IconButton
          onClick={popover.handleOpen}
          ref={popover.anchorRef}
        >
          <Box
            sx={{
              width: 28,
              '& img': {
                width: '100%',
              },
            }}
          >
            <img src={flag} />
          </Box>
        </IconButton>
      </Tooltip>
      <LanguagePopover
        anchorEl={popover.anchorRef.current}
        onClose={popover.handleClose}
        open={popover.open}
      />
    </>
  );
};
