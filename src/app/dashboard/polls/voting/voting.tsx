'use client';

import React, { useState, useEffect } from 'react';
import {
     Container,
     Stack,
     Card,
     CardContent,
     Typography,
     Button,
     FormControl,
     FormLabel,
     RadioGroup,
     FormControlLabel,
     Radio,
     Checkbox,
     TextField,
     Box,
     Chip,
     Alert,
     CircularProgress,
     Divider,
     FormGroup,
     Rating,
     Select,
     MenuItem,
     ListItemText,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Poll, PollVote, PollType } from 'src/types/poll';
import { Tenant } from 'src/types/tenant';
import { EntityFormHeader } from 'src/components/entity-form-header';
import { submitVote, getTenantVote, revokeTenantVote } from 'src/app/actions/poll/votes/voting-actions';
import { toast } from 'react-hot-toast';

interface VotingProps {
     polls: Poll[];
     tenant: Tenant;
}

export function Voting({ polls, tenant }: VotingProps) {
     const { t } = useTranslation();
     const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
     const [existingVote, setExistingVote] = useState<PollVote | null>(null);
     const [isLoading, setIsLoading] = useState(false);
     const [isSubmitting, setIsSubmitting] = useState(false);

     // Vote form state
     const [voteData, setVoteData] = useState<{
          choice_bool?: boolean | null;
          choice_option_ids?: string[] | null;
          ranks?: { option_id: string; rank: number }[] | null;
          scores?: { option_id: string; score: number }[] | null;
     }>({});
     const [abstain, setAbstain] = useState(false);
     const [isAnonymous, setIsAnonymous] = useState(false);
     const [comment, setComment] = useState('');

     // Load existing vote when poll is selected
     useEffect(() => {
          const loadExistingVote = async () => {
               if (!selectedPoll) {
                    setExistingVote(null);
                    return;
               }

               setIsLoading(true);
               try {
                    const { success, data } = await getTenantVote(selectedPoll.id);
                    if (success && data) {
                         setExistingVote(data);
                         setAbstain(data.abstain);
                         setIsAnonymous(data.is_anonymous);
                         setComment(data.comment || '');

                         // Pre-fill vote data based on existing vote
                         if (data.choice_bool !== null) {
                              setVoteData({ choice_bool: data.choice_bool });
                         } else if (data.choice_option_ids) {
                              setVoteData({ choice_option_ids: data.choice_option_ids });
                         } else if (data.ranks) {
                              setVoteData({ ranks: data.ranks });
                         } else if (data.scores) {
                              setVoteData({ scores: data.scores });
                         }
                    } else {
                         setExistingVote(null);
                         resetVoteForm();
                    }
               } catch (error) {
                    console.error('Failed to load existing vote:', error);
                    setExistingVote(null);
                    resetVoteForm();
               } finally {
                    setIsLoading(false);
               }
          };

          loadExistingVote();
     }, [selectedPoll]);

     const resetVoteForm = () => {
          setVoteData({});
          setAbstain(false);
          setIsAnonymous(false);
          setComment('');
     };

     const handlePollSelect = (poll: Poll) => {
          setSelectedPoll(poll);
          resetVoteForm();
     };

     const handleVoteSubmit = async () => {
          if (!selectedPoll) return;

          setIsSubmitting(true);
          try {
               const { success, error } = await submitVote({
                    poll_id: selectedPoll.id,
                    vote_data: voteData,
                    abstain,
                    is_anonymous: isAnonymous,
                    comment: comment.trim() || null,
               });

               if (success) {
                    toast.success(existingVote ? 'Vote updated successfully!' : 'Vote submitted successfully!');
                    // Reload the existing vote to reflect changes
                    const { success: loadSuccess, data } = await getTenantVote(selectedPoll.id);
                    if (loadSuccess && data) {
                         setExistingVote(data);
                    }
               } else {
                    toast.error(error || 'Failed to submit vote');
               }
          } catch (error) {
               console.error('Vote submission failed:', error);
               toast.error('Failed to submit vote');
          } finally {
               setIsSubmitting(false);
          }
     };

     const handleVoteRevoke = async () => {
          if (!selectedPoll || !existingVote) return;

          setIsSubmitting(true);
          try {
               const { success, error } = await revokeTenantVote(selectedPoll.id);

               if (success) {
                    toast.success('Vote revoked successfully!');
                    setExistingVote(null);
                    resetVoteForm();
               } else {
                    toast.error(error || 'Failed to revoke vote');
               }
          } catch (error) {
               console.error('Vote revocation failed:', error);
               toast.error('Failed to revoke vote');
          } finally {
               setIsSubmitting(false);
          }
     };

     const renderVoteOptions = () => {
          if (!selectedPoll || abstain) return null;

          switch (selectedPoll.type) {
               case 'yes_no':
                    return (
                         <FormControl component="fieldset">
                              <FormLabel component="legend">Your Choice</FormLabel>
                              <RadioGroup
                                   value={voteData.choice_bool?.toString() || ''}
                                   onChange={(e) => setVoteData({ choice_bool: e.target.value === 'true' })}
                              >
                                   <FormControlLabel value="true" control={<Radio />} label="Yes" />
                                   <FormControlLabel value="false" control={<Radio />} label="No" />
                              </RadioGroup>
                         </FormControl>
                    );

               case 'single_choice':
                    return (
                         <FormControl component="fieldset">
                              <FormLabel component="legend">Select One Option</FormLabel>
                              <RadioGroup
                                   value={voteData.choice_option_ids?.[0] || ''}
                                   onChange={(e) => setVoteData({ choice_option_ids: [e.target.value] })}
                              >
                                   {selectedPoll.options.map((option) => (
                                        <FormControlLabel
                                             key={option.id}
                                             value={option.id}
                                             control={<Radio />}
                                             label={option.label}
                                        />
                                   ))}
                              </RadioGroup>
                         </FormControl>
                    );

               case 'multiple_choice':
                    const maxChoices = selectedPoll.max_choices || selectedPoll.options.length;
                    return (
                         <FormControl component="fieldset">
                              <FormLabel component="legend">
                                   Select Options (max {maxChoices})
                              </FormLabel>
                              <FormGroup>
                                   {selectedPoll.options.map((option) => (
                                        <FormControlLabel
                                             key={option.id}
                                             control={
                                                  <Checkbox
                                                       checked={voteData.choice_option_ids?.includes(option.id) || false}
                                                       onChange={(e) => {
                                                            const currentChoices = voteData.choice_option_ids || [];
                                                            if (e.target.checked) {
                                                                 if (currentChoices.length < maxChoices) {
                                                                      setVoteData({
                                                                           choice_option_ids: [...currentChoices, option.id]
                                                                      });
                                                                 }
                                                            } else {
                                                                 setVoteData({
                                                                      choice_option_ids: currentChoices.filter(id => id !== option.id)
                                                                 });
                                                            }
                                                       }}
                                                  />
                                             }
                                             label={option.label}
                                        />
                                   ))}
                              </FormGroup>
                         </FormControl>
                    );

               case 'ranked_choice':
                    const ranks = voteData.ranks || [];
                    return (
                         <FormControl component="fieldset" sx={{ width: '100%' }}>
                              <FormLabel component="legend">Rank Your Preferences (1 = highest)</FormLabel>
                              <Stack spacing={2}>
                                   {selectedPoll.options.map((option) => {
                                        const currentRank = ranks.find(r => r.option_id === option.id)?.rank || '';
                                        return (
                                             <Box key={option.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                  <Typography sx={{ flex: 1 }}>{option.label}</Typography>
                                                  <FormControl sx={{ minWidth: 80 }}>
                                                       <Select
                                                            value={currentRank}
                                                            size="small"
                                                            onChange={(e) => {
                                                                 const newRank = parseInt(String(e.target.value));
                                                                 const newRanks = ranks.filter(r => r.option_id !== option.id);
                                                                 if (newRank > 0) {
                                                                      newRanks.push({ option_id: option.id, rank: newRank });
                                                                 }
                                                                 setVoteData({ ranks: newRanks });
                                                            }}
                                                       >
                                                            <MenuItem value="">-</MenuItem>
                                                            {Array.from({ length: selectedPoll.options.length }, (_, i) => (
                                                                 <MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>
                                                            ))}
                                                       </Select>
                                                  </FormControl>
                                             </Box>
                                        );
                                   })}
                              </Stack>
                         </FormControl>
                    );

               case 'score':
                    const scores = voteData.scores || [];
                    return (
                         <FormControl component="fieldset" sx={{ width: '100%' }}>
                              <FormLabel component="legend">Rate Each Option (0-5 stars)</FormLabel>
                              <Stack spacing={2}>
                                   {selectedPoll.options.map((option) => {
                                        const currentScore = scores.find(s => s.option_id === option.id)?.score || 0;
                                        return (
                                             <Box key={option.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                  <Typography sx={{ flex: 1 }}>{option.label}</Typography>
                                                  <Rating
                                                       value={currentScore}
                                                       max={5}
                                                       onChange={(_, newValue) => {
                                                            const newScores = scores.filter(s => s.option_id !== option.id);
                                                            if (newValue && newValue > 0) {
                                                                 newScores.push({ option_id: option.id, score: newValue });
                                                            }
                                                            setVoteData({ scores: newScores });
                                                       }}
                                                  />
                                             </Box>
                                        );
                                   })}
                              </Stack>
                         </FormControl>
                    );

               default:
                    return null;
          }
     };

     const isVoteValid = () => {
          if (abstain) return true;
          if (!selectedPoll) return false;

          switch (selectedPoll.type) {
               case 'yes_no':
                    return voteData.choice_bool !== undefined && voteData.choice_bool !== null;
               case 'single_choice':
                    return voteData.choice_option_ids && voteData.choice_option_ids.length === 1;
               case 'multiple_choice':
                    return voteData.choice_option_ids && voteData.choice_option_ids.length > 0;
               case 'ranked_choice':
                    return voteData.ranks && voteData.ranks.length > 0;
               case 'score':
                    return voteData.scores && voteData.scores.length > 0;
               default:
                    return false;
          }
     };

     const activePollsCount = polls.filter(p => p.status === 'active').length;
     const scheduledPollsCount = polls.filter(p => p.status === 'scheduled').length;

     return (
          <Container maxWidth="lg">
               <Stack spacing={3}>
                    <EntityFormHeader
                         backHref="/dashboard/polls"
                         backLabel="Back to Polls"
                         title="Voting"
                         breadcrumbs={[
                              { title: 'Dashboard', href: '/dashboard' },
                              { title: 'Polls', href: '/dashboard/polls' },
                              { title: 'Voting' }
                         ]}
                    />

                    <Box sx={{ mb: 2 }}>
                         <Typography variant="body1" color="text.secondary">
                              Participate in active building polls • {activePollsCount} active, {scheduledPollsCount} scheduled
                         </Typography>
                    </Box>

                    {polls.length === 0 ? (
                         <Card>
                              <CardContent>
                                   <Typography variant="h6" align="center" color="text.secondary">
                                        No active or scheduled polls found for your building
                                   </Typography>
                                   <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 1 }}>
                                        Check back later for new polls from your building management
                                   </Typography>
                              </CardContent>
                         </Card>
                    ) : (
                         <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                              {/* Poll Selection */}
                              <Card sx={{ flex: 1 }}>
                                   <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                             Available Polls
                                        </Typography>
                                        <Stack spacing={2}>
                                             {polls.map((poll) => (
                                                  <Card
                                                       key={poll.id}
                                                       variant={selectedPoll?.id === poll.id ? 'outlined' : 'elevation'}
                                                       sx={{
                                                            cursor: 'pointer',
                                                            border: selectedPoll?.id === poll.id ? 2 : 1,
                                                            borderColor: selectedPoll?.id === poll.id ? 'primary.main' : 'divider',
                                                            '&:hover': {
                                                                 boxShadow: 2,
                                                            },
                                                       }}
                                                       onClick={() => handlePollSelect(poll)}
                                                  >
                                                       <CardContent>
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                                 <Typography variant="subtitle1" fontWeight="medium">
                                                                      {poll.title}
                                                                 </Typography>
                                                                 <Chip
                                                                      label={poll.status}
                                                                      color={poll.status === 'active' ? 'success' : 'warning'}
                                                                      size="small"
                                                                 />
                                                            </Box>
                                                            {poll.description && (
                                                                 <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                                      {poll.description}
                                                                 </Typography>
                                                            )}
                                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                                 <Chip label={poll.type.replace('_', ' ')} size="small" variant="outlined" />
                                                                 {poll.ends_at && (
                                                                      <Chip
                                                                           label={`Ends: ${new Date(poll.ends_at).toLocaleDateString()}`}
                                                                           size="small"
                                                                           variant="outlined"
                                                                      />
                                                                 )}
                                                            </Box>
                                                       </CardContent>
                                                  </Card>
                                             ))}
                                        </Stack>
                                   </CardContent>
                              </Card>

                              {/* Voting Interface */}
                              <Card sx={{ flex: 2 }}>
                                   <CardContent>
                                        {!selectedPoll ? (
                                             <Box sx={{ textAlign: 'center', py: 4 }}>
                                                  <Typography variant="h6" color="text.secondary">
                                                       Select a poll to start voting
                                                  </Typography>
                                             </Box>
                                        ) : (
                                             <Stack spacing={3}>
                                                  <Box>
                                                       <Typography variant="h6" gutterBottom>
                                                            {selectedPoll.title}
                                                       </Typography>
                                                       {selectedPoll.description && (
                                                            <Typography variant="body2" color="text.secondary" paragraph>
                                                                 {selectedPoll.description}
                                                            </Typography>
                                                       )}
                                                  </Box>

                                                  {isLoading ? (
                                                       <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                                            <CircularProgress />
                                                       </Box>
                                                  ) : (
                                                       <>
                                                            {existingVote && existingVote.status === 'cast' && (
                                                                 <Alert severity="info">
                                                                      You have already voted on this poll.
                                                                      {selectedPoll.allow_change_until_deadline
                                                                           ? ' You can update your vote until the deadline.'
                                                                           : ' Vote changes are not allowed.'}
                                                                 </Alert>
                                                            )}

                                                            {existingVote && existingVote.status === 'revoked' && (
                                                                 <Alert severity="warning">
                                                                      Your vote was revoked. You can vote again if desired.
                                                                 </Alert>
                                                            )}

                                                            <Divider />

                                                            {/* Abstain Option */}
                                                            {selectedPoll.allow_abstain && (
                                                                 <FormControlLabel
                                                                      control={
                                                                           <Checkbox
                                                                                checked={abstain}
                                                                                onChange={(e) => setAbstain(e.target.checked)}
                                                                           />
                                                                      }
                                                                      label="I choose to abstain from this vote"
                                                                 />
                                                            )}

                                                            {/* Vote Options */}
                                                            {renderVoteOptions()}

                                                            {/* Additional Options */}
                                                            <Stack spacing={2}>
                                                                 {selectedPoll.allow_anonymous && (
                                                                      <FormControlLabel
                                                                           control={
                                                                                <Checkbox
                                                                                     checked={isAnonymous}
                                                                                     onChange={(e) => setIsAnonymous(e.target.checked)}
                                                                                />
                                                                           }
                                                                           label="Submit vote anonymously"
                                                                      />
                                                                 )}

                                                                 {selectedPoll.allow_comments && (
                                                                      <TextField
                                                                           label="Comment (optional)"
                                                                           multiline
                                                                           rows={3}
                                                                           value={comment}
                                                                           onChange={(e) => setComment(e.target.value)}
                                                                           fullWidth
                                                                      />
                                                                 )}
                                                            </Stack>

                                                            {/* Action Buttons */}
                                                            <Stack direction="row" spacing={2} justifyContent="flex-end">
                                                                 {existingVote &&
                                                                      existingVote.status === 'cast' &&
                                                                      selectedPoll.allow_change_until_deadline && (
                                                                           <Button
                                                                                variant="outlined"
                                                                                color="warning"
                                                                                onClick={handleVoteRevoke}
                                                                                disabled={isSubmitting}
                                                                           >
                                                                                Revoke Vote
                                                                           </Button>
                                                                      )}

                                                                 <Button
                                                                      variant="contained"
                                                                      onClick={handleVoteSubmit}
                                                                      disabled={!isVoteValid() || isSubmitting || selectedPoll.status !== 'active'}
                                                                      startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                                                                 >
                                                                      {isSubmitting
                                                                           ? 'Submitting...'
                                                                           : existingVote?.status === 'cast'
                                                                                ? 'Update Vote'
                                                                                : 'Submit Vote'}
                                                                 </Button>
                                                            </Stack>

                                                            {selectedPoll.status !== 'active' && (
                                                                 <Alert severity="warning">
                                                                      This poll is not currently active for voting.
                                                                 </Alert>
                                                            )}
                                                       </>
                                                  )}
                                             </Stack>
                                        )}
                                   </CardContent>
                              </Card>
                         </Stack>
                    )}
               </Stack>
          </Container>
     );
}
