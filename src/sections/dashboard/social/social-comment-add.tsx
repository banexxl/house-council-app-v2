'use client'

import type { FC } from 'react';
import { useState, useCallback } from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { getInitials } from 'src/utils/get-initials';
import { tokens } from 'src/locales/tokens';

interface SocialCommentAddProps {
  onSubmit: (text: string) => Promise<void> | void;
  currentUserAvatar?: string | null;
  currentUserName?: string | null;
  disabled?: boolean;
}

export const SocialCommentAdd: FC<SocialCommentAddProps> = ({
  onSubmit,
  currentUserAvatar,
  currentUserName,
  disabled = false,
  ...props
}) => {
  const { t } = useTranslation();
  const [isSending, setIsSending] = useState(false);
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0 && !isSending && !disabled;

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    setIsSending(true);
    try {
      await onSubmit(text.trim());
      setText('');
    } catch (error) {
      console.error('Error sending comment:', error);
    } finally {
      setIsSending(false);
    }
  }, [canSend, onSubmit, text]);

  return (
    <div {...props}>
      <Stack
        alignItems="flex-start"
        direction="row"
        spacing={2}
      >
        <Avatar
          src={currentUserAvatar || undefined}
          sx={{
            height: 40,
            width: 40,
          }}
        >
          {getInitials(currentUserName || '')}
        </Avatar>
        <Stack
          spacing={1.5}
          sx={{ flexGrow: 1 }}
        >
          <TextField
            fullWidth
            multiline
            placeholder={t(tokens.tenants.socialCommentPlaceholder)}
            rows={3}
            variant="outlined"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled || isSending}
          />
          <Stack
            alignItems="center"
            direction="row"
            justifyContent="space-between"
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ visibility: isSending ? 'visible' : 'hidden' }}
            >
              {t(tokens.tenants.socialCommentSending)}
            </Typography>
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={!canSend}
            >
              {t(tokens.tenants.socialCommentSend)}
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </div>
  );
};
