'use client'

import type { FC } from 'react';
import { useState, useCallback, useRef } from 'react';
import Attachment01Icon from '@untitled-ui/icons-react/build/esm/Attachment01';
import FaceSmileIcon from '@untitled-ui/icons-react/build/esm/FaceSmile';
import Image01Icon from '@untitled-ui/icons-react/build/esm/Image01';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import OutlinedInput from '@mui/material/OutlinedInput';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles/createTheme';
import { toast } from 'react-hot-toast';

import { getInitials } from 'src/utils/get-initials';
import { TenantProfile } from 'src/types/social';
import { createTenantPost, uploadPostImages, uploadPostDocuments } from 'src/app/actions/social/post-actions';

interface SocialPostAddProps {
  user: TenantProfile;
  buildingId: string;
  onPostCreated?: () => void;
}

// Common emoji reactions
const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥'];

export const SocialPostAdd: FC<SocialPostAddProps> = (props) => {
  const { user, buildingId, onPostCreated } = props;
  const smUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('sm'));

  const [isPosting, setIsPosting] = useState(false);
  const [content, setContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<File[]>([]);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLButtonElement | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const handleEmojiClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setEmojiAnchorEl(event.currentTarget);
  }, []);

  const handleEmojiClose = useCallback(() => {
    setEmojiAnchorEl(null);
  }, []);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setContent(prev => prev + emoji);
    setEmojiAnchorEl(null);
  }, []);

  const handleImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length !== files.length) {
      toast.error('Only image files are allowed');
    }

    setSelectedImages(prev => [...prev, ...imageFiles]);

    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }, []);

  const handleDocumentSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedDocuments(prev => [...prev, ...files]);

    // Reset input
    if (documentInputRef.current) {
      documentInputRef.current.value = '';
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeDocument = useCallback((index: number) => {
    setSelectedDocuments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handlePost = useCallback(async () => {
    if (!content.trim() && selectedImages.length === 0 && selectedDocuments.length === 0) {
      toast.error('Please add some content, images, or documents');
      return;
    }

    setIsPosting(true);
    try {
      // Create the post
      const result = await createTenantPost({
        tenant_id: user.tenant_id,
        content_text: content,
        building_id: buildingId,
      });

      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to create post');
        return;
      }

      const postId = result.data.id;
      console.log('postid', postId);
      console.log('imges', selectedImages);

      // Upload images if any
      if (selectedImages.length > 0) {
        const imageResult = await uploadPostImages(postId, selectedImages);
        if (!imageResult.success) {
          toast.error('Post created but failed to upload images');
        }
      }

      // Upload documents if any
      if (selectedDocuments.length > 0) {
        const docResult = await uploadPostDocuments(postId, selectedDocuments);
        if (!docResult.success) {
          toast.error('Post created but failed to upload documents');
        }
      }

      toast.success('Post created successfully');

      // Reset form
      setContent('');
      setSelectedImages([]);
      setSelectedDocuments([]);

      // Notify parent
      onPostCreated?.();
    } catch (error) {
      console.error('Error posting:', error);
      toast.error('Failed to create post');
    } finally {
      setIsPosting(false);
    }
  }, [content, selectedImages, selectedDocuments, buildingId, onPostCreated]);

  return (
    <Card>
      <CardContent>
        <Stack
          alignItems="flex-start"
          direction="row"
          spacing={2}
        >
          <Avatar
            src={user.avatar_url}
            sx={{
              height: 40,
              width: 40,
            }}
          >
            {getInitials(user.first_name)}
          </Avatar>
          <Stack
            spacing={2}
            sx={{ flexGrow: 1 }}
          >
            <OutlinedInput
              fullWidth
              multiline
              placeholder="What's on your mind?"
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isPosting}

            />

            {/* Selected Images Preview */}
            {selectedImages.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {selectedImages.map((file, index) => {
                  const label = file.name.length > 20 ? file.name.slice(0, 20) + '...' : file.name;
                  return (
                    <Chip
                      key={index}
                      label={label}
                      onDelete={() => removeImage(index)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  );
                })}
              </Stack>
            )}

            {/* Selected Documents Preview */}
            {selectedDocuments.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {selectedDocuments.map((file, index) => (
                  <Chip
                    key={index}
                    label={file.name}
                    onDelete={() => removeDocument(index)}
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                ))}
              </Stack>
            )}

            <Stack
              alignItems="center"
              direction="row"
              justifyContent="space-between"
              spacing={3}
            >
              {smUp && (
                <Stack
                  alignItems="center"
                  direction="row"
                  spacing={1}
                >
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleImageSelect}
                  />
                  <IconButton
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isPosting}
                  >
                    <SvgIcon>
                      <Image01Icon />
                    </SvgIcon>
                  </IconButton>

                  <input
                    ref={documentInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.ppt,.pptx"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleDocumentSelect}
                  />
                  <IconButton
                    onClick={() => documentInputRef.current?.click()}
                    disabled={isPosting}
                  >
                    <SvgIcon>
                      <Attachment01Icon />
                    </SvgIcon>
                  </IconButton>

                  <IconButton
                    onClick={handleEmojiClick}
                    disabled={isPosting}
                  >
                    <SvgIcon>
                      <FaceSmileIcon />
                    </SvgIcon>
                  </IconButton>

                  <Popover
                    open={Boolean(emojiAnchorEl)}
                    anchorEl={emojiAnchorEl}
                    onClose={handleEmojiClose}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'left',
                    }}
                  >
                    <Box sx={{ p: 2, display: 'flex', gap: 1, flexWrap: 'wrap', maxWidth: 250 }}>
                      {EMOJI_OPTIONS.map((emoji) => (
                        <IconButton
                          key={emoji}
                          onClick={() => handleEmojiSelect(emoji)}
                          sx={{ fontSize: 24 }}
                        >
                          {emoji}
                        </IconButton>
                      ))}
                    </Box>
                  </Popover>
                </Stack>
              )}
              <Button
                variant="contained"
                onClick={handlePost}
                disabled={isPosting || (!content.trim())}
              >
                {isPosting ? 'Posting...' : 'Post'}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};
