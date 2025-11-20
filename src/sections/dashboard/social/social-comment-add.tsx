'use client'

import type { FC } from 'react';
import { useState, useCallback } from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { getInitials } from 'src/utils/get-initials';

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
            placeholder="Type your reply"
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
              Sending...
            </Typography>
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={!canSend}
            >
              Send
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </div>
  );
};
