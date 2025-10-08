import type { SyntheticEvent } from 'react';
import { useCallback, useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import OutlinedInput from '@mui/material/OutlinedInput';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';

import { useMockedUser } from 'src/hooks/use-mocked-user';
import { getInitials } from 'src/utils/get-initials';

export const CompanyReviewAdd = () => {
  const user = useMockedUser();
  const [rating, setRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingChange = useCallback(
    (event: SyntheticEvent, newRating: number | null): void => {
      setRating(newRating);
    },
    []
  );

  const handleSubmitReview = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Handle review submission logic here
      setRating(null);
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return (
    <Stack
      alignItems="flex-start"
      direction="row"
      spacing={2}
    >
      <Avatar src={user.avatar}>{getInitials(user.name)}</Avatar>
      <Box sx={{ flexGrow: 1 }}>
        <OutlinedInput
          fullWidth
          multiline
          placeholder="Send your review"
          rows={3}
        />
        <Stack
          alignItems="center"
          direction="row"
          flexWrap="wrap"
          justifyContent="space-between"
          spacing={1}
          sx={{ mt: 3 }}
        >
          <Rating
            onChange={handleRatingChange}
            value={rating}
          />
          <Button
            variant="contained"
            onClick={handleSubmitReview}
            disabled={isSubmitting || !rating}
            loading={isSubmitting}
          >
            Send Review
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
};
