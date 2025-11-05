'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
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
     Paper,
     Table,
     TableBody,
     TableCell,
     TableContainer,
     TableHead,
     TableRow,
     LinearProgress,
     Tabs,
     Tab,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Poll, PollVote, PollType, pollTypeLabel, pollStatusLabel } from 'src/types/poll';
import { Tenant } from 'src/types/tenant';
import { EntityFormHeader } from 'src/components/entity-form-header';
import { submitVote, getTenantVote, revokeTenantVote, getPollResults } from 'src/app/actions/poll/votes/voting-actions';
import { toast } from 'react-hot-toast';

// Dynamic import for ApexCharts to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface VotingProps {
     polls: Poll[];
     closedPolls: Poll[];
     tenant: Tenant;
}

export function Voting({ polls, closedPolls, tenant }: VotingProps) {
     const { t } = useTranslation();
     const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
     const [existingVote, setExistingVote] = useState<PollVote | null>(null);
     const [isLoading, setIsLoading] = useState(false);
     const [isSubmitting, setIsSubmitting] = useState(false);
     const [tabValue, setTabValue] = useState(0);

     // Closed polls results state
     const [selectedClosedPoll, setSelectedClosedPoll] = useState<Poll | null>(null);
     const [pollResults, setPollResults] = useState<any>(null);
     const [isLoadingResults, setIsLoadingResults] = useState(false);

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

     const handleClosedPollSelect = async (poll: Poll) => {
          setSelectedClosedPoll(poll);
          setIsLoadingResults(true);

          try {
               const { success, data, error } = await getPollResults(poll.id);
               if (success && data) {
                    setPollResults(data);
               } else {
                    toast.error(error || 'Failed to load poll results');
                    setPollResults(null);
               }
          } catch (error) {
               console.error('Failed to load poll results:', error);
               toast.error('Failed to load poll results');
               setPollResults(null);
          } finally {
               setIsLoadingResults(false);
          }
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

     const renderResultsChart = () => {
          if (!pollResults || !selectedClosedPoll) return null;

          const { poll, statistics } = pollResults;

          switch (poll.type) {
               case 'yes_no':
                    if (statistics.yes_no_results) {
                         const pieOptions = {
                              chart: { type: 'pie' as const },
                              labels: ['Yes', 'No'],
                              colors: ['#4caf50', '#f44336'],
                              legend: { position: 'bottom' as const },
                              responsive: [{
                                   breakpoint: 480,
                                   options: {
                                        chart: { width: 200 },
                                        legend: { position: 'bottom' as const }
                                   }
                              }]
                         };

                         const pieSeries = [
                              statistics.yes_no_results.yes,
                              statistics.yes_no_results.no
                         ];

                         return (
                              <Box>
                                   <Typography variant="h6" gutterBottom>Vote Distribution</Typography>
                                   <Chart options={pieOptions} series={pieSeries} type="pie" height={300} />
                              </Box>
                         );
                    }
                    break;

               case 'single_choice':
               case 'multiple_choice':
                    if (statistics.results_by_option) {
                         const barOptions = {
                              chart: { type: 'bar' as const },
                              xaxis: {
                                   categories: statistics.results_by_option.map((r: any) => r.option_label),
                                   labels: { style: { fontSize: '12px' } }
                              },
                              yaxis: { title: { text: 'Number of Votes' } },
                              colors: ['#2196f3'],
                              plotOptions: {
                                   bar: { horizontal: false, borderRadius: 4 }
                              },
                              dataLabels: { enabled: true }
                         };

                         const barSeries = [{
                              name: 'Votes',
                              data: statistics.results_by_option.map((r: any) => r.count)
                         }];

                         const pieOptions = {
                              chart: { type: 'pie' as const },
                              labels: statistics.results_by_option.map((r: any) => r.option_label),
                              legend: { position: 'bottom' as const },
                              responsive: [{
                                   breakpoint: 480,
                                   options: {
                                        chart: { width: 200 },
                                        legend: { position: 'bottom' as const }
                                   }
                              }]
                         };

                         const pieSeries = statistics.results_by_option.map((r: any) => r.count);

                         return (
                              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                                   <Box sx={{ flex: 1 }}>
                                        <Typography variant="h6" gutterBottom>Vote Count by Option</Typography>
                                        <Chart options={barOptions} series={barSeries} type="bar" height={300} />
                                   </Box>
                                   <Box sx={{ flex: 1 }}>
                                        <Typography variant="h6" gutterBottom>Vote Distribution</Typography>
                                        <Chart options={pieOptions} series={pieSeries} type="pie" height={300} />
                                   </Box>
                              </Box>
                         );
                    }
                    break;

               case 'ranked_choice':
                    if (statistics.ranking_results) {
                         const barOptions = {
                              chart: { type: 'bar' as const },
                              xaxis: {
                                   categories: statistics.ranking_results.map((r: any) => r.option_label),
                                   labels: { style: { fontSize: '12px' } }
                              },
                              yaxis: { title: { text: 'Total Points' } },
                              colors: ['#ff9800'],
                              plotOptions: {
                                   bar: { horizontal: false, borderRadius: 4 }
                              },
                              dataLabels: { enabled: true }
                         };

                         const barSeries = [{
                              name: 'Points',
                              data: statistics.ranking_results.map((r: any) => r.total_points)
                         }];

                         return (
                              <Box>
                                   <Typography variant="h6" gutterBottom>Ranking Results (by Total Points)</Typography>
                                   <Chart options={barOptions} series={barSeries} type="bar" height={350} />
                              </Box>
                         );
                    }
                    break;

               case 'score':
                    if (statistics.score_results) {
                         const barOptions = {
                              chart: { type: 'bar' as const },
                              xaxis: {
                                   categories: statistics.score_results.map((r: any) => r.option_label),
                                   labels: { style: { fontSize: '12px' } }
                              },
                              yaxis: { title: { text: 'Average Score' }, max: 5 },
                              colors: ['#9c27b0'],
                              plotOptions: {
                                   bar: { horizontal: false, borderRadius: 4 }
                              },
                              dataLabels: { enabled: true, formatter: (val: number) => val.toFixed(2) }
                         };

                         const barSeries = [{
                              name: 'Average Score',
                              data: statistics.score_results.map((r: any) => r.average_score)
                         }];

                         return (
                              <Box>
                                   <Typography variant="h6" gutterBottom>Score Results (Average Rating)</Typography>
                                   <Chart options={barOptions} series={barSeries} type="bar" height={350} />
                              </Box>
                         );
                    }
                    break;
          }

          return null;
     };

     const renderResultsTable = () => {
          if (!pollResults || !selectedClosedPoll) return null;

          const { poll, statistics } = pollResults;

          switch (poll.type) {
               case 'yes_no':
                    if (statistics.yes_no_results) {
                         return (
                              <TableContainer component={Paper}>
                                   <Table>
                                        <TableHead>
                                             <TableRow>
                                                  <TableCell>Option</TableCell>
                                                  <TableCell align="right">Votes</TableCell>
                                                  <TableCell align="right">Percentage</TableCell>
                                             </TableRow>
                                        </TableHead>
                                        <TableBody>
                                             <TableRow>
                                                  <TableCell>Yes</TableCell>
                                                  <TableCell align="right">{statistics.yes_no_results.yes}</TableCell>
                                                  <TableCell align="right">{statistics.yes_no_results.yes_percentage}%</TableCell>
                                             </TableRow>
                                             <TableRow>
                                                  <TableCell>No</TableCell>
                                                  <TableCell align="right">{statistics.yes_no_results.no}</TableCell>
                                                  <TableCell align="right">{statistics.yes_no_results.no_percentage}%</TableCell>
                                             </TableRow>
                                        </TableBody>
                                   </Table>
                              </TableContainer>
                         );
                    }
                    break;

               case 'single_choice':
               case 'multiple_choice':
                    if (statistics.results_by_option) {
                         return (
                              <TableContainer component={Paper}>
                                   <Table>
                                        <TableHead>
                                             <TableRow>
                                                  <TableCell>Option</TableCell>
                                                  <TableCell align="right">Votes</TableCell>
                                                  <TableCell align="right">Percentage</TableCell>
                                                  <TableCell>Progress</TableCell>
                                             </TableRow>
                                        </TableHead>
                                        <TableBody>
                                             {statistics.results_by_option.map((result: any) => (
                                                  <TableRow key={result.option_id}>
                                                       <TableCell>{result.option_label}</TableCell>
                                                       <TableCell align="right">{result.count}</TableCell>
                                                       <TableCell align="right">{result.percentage}%</TableCell>
                                                       <TableCell>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', width: 100 }}>
                                                                 <LinearProgress
                                                                      variant="determinate"
                                                                      value={result.percentage}
                                                                      sx={{ flex: 1, mr: 1 }}
                                                                 />
                                                            </Box>
                                                       </TableCell>
                                                  </TableRow>
                                             ))}
                                        </TableBody>
                                   </Table>
                              </TableContainer>
                         );
                    }
                    break;

               case 'ranked_choice':
                    if (statistics.ranking_results) {
                         return (
                              <TableContainer component={Paper}>
                                   <Table>
                                        <TableHead>
                                             <TableRow>
                                                  <TableCell>Rank</TableCell>
                                                  <TableCell>Option</TableCell>
                                                  <TableCell align="right">Total Points</TableCell>
                                                  <TableCell align="right">Average Score</TableCell>
                                             </TableRow>
                                        </TableHead>
                                        <TableBody>
                                             {statistics.ranking_results.map((result: any, index: number) => (
                                                  <TableRow key={result.option_id}>
                                                       <TableCell>#{index + 1}</TableCell>
                                                       <TableCell>{result.option_label}</TableCell>
                                                       <TableCell align="right">{result.total_points}</TableCell>
                                                       <TableCell align="right">{result.average_rank}</TableCell>
                                                  </TableRow>
                                             ))}
                                        </TableBody>
                                   </Table>
                              </TableContainer>
                         );
                    }
                    break;

               case 'score':
                    if (statistics.score_results) {
                         return (
                              <TableContainer component={Paper}>
                                   <Table>
                                        <TableHead>
                                             <TableRow>
                                                  <TableCell>Rank</TableCell>
                                                  <TableCell>Option</TableCell>
                                                  <TableCell align="right">Average Score</TableCell>
                                                  <TableCell align="right">Total Score</TableCell>
                                                  <TableCell align="right">Vote Count</TableCell>
                                                  <TableCell>Rating</TableCell>
                                             </TableRow>
                                        </TableHead>
                                        <TableBody>
                                             {statistics.score_results.map((result: any, index: number) => (
                                                  <TableRow key={result.option_id}>
                                                       <TableCell>#{index + 1}</TableCell>
                                                       <TableCell>{result.option_label}</TableCell>
                                                       <TableCell align="right">{result.average_score}</TableCell>
                                                       <TableCell align="right">{result.total_score}</TableCell>
                                                       <TableCell align="right">{result.vote_count}</TableCell>
                                                       <TableCell>
                                                            <Rating value={result.average_score} max={5} readOnly size="small" />
                                                       </TableCell>
                                                  </TableRow>
                                             ))}
                                        </TableBody>
                                   </Table>
                              </TableContainer>
                         );
                    }
                    break;
          }

          return null;
     };

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

                    {/* Tabs for Active/Closed Polls */}
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                         <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                              <Tab label={`Active Polls (${activePollsCount + scheduledPollsCount})`} />
                              <Tab label={`Results (${closedPolls.length})`} />
                         </Tabs>
                    </Box>

                    {/* Active Polls Tab */}
                    {tabValue === 0 && (
                         <>
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
                                                                                label={pollStatusLabel(t, poll.status)}
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
                                                                           <Chip label={pollTypeLabel(t, poll.type)} size="small" variant="outlined" />
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
                         </>
                    )}

                    {/* Closed Polls Results Tab */}
                    {tabValue === 1 && (
                         <>
                              {closedPolls.length === 0 ? (
                                   <Card>
                                        <CardContent>
                                             <Typography variant="h6" align="center" color="text.secondary">
                                                  No closed polls found for your building
                                             </Typography>
                                             <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 1 }}>
                                                  Completed polls will appear here with their results
                                             </Typography>
                                        </CardContent>
                                   </Card>
                              ) : (
                                   <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
                                        {/* Closed Polls Selection */}
                                        <Card sx={{ flex: 1, maxWidth: { lg: 400 } }}>
                                             <CardContent>
                                                  <Typography variant="h6" gutterBottom>
                                                       Completed Polls
                                                  </Typography>
                                                  <Stack spacing={2}>
                                                       {closedPolls.map((poll) => (
                                                            <Card
                                                                 key={poll.id}
                                                                 variant={selectedClosedPoll?.id === poll.id ? 'outlined' : 'elevation'}
                                                                 sx={{
                                                                      cursor: 'pointer',
                                                                      border: selectedClosedPoll?.id === poll.id ? 2 : 1,
                                                                      borderColor: selectedClosedPoll?.id === poll.id ? 'primary.main' : 'divider',
                                                                      '&:hover': {
                                                                           boxShadow: 2,
                                                                      },
                                                                 }}
                                                                 onClick={() => handleClosedPollSelect(poll)}
                                                            >
                                                                 <CardContent>
                                                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                                           <Typography variant="subtitle1" fontWeight="medium">
                                                                                {poll.title}
                                                                           </Typography>
                                                                           <Chip
                                                                                label={pollStatusLabel(t, poll.status)}
                                                                                color="default"
                                                                                size="small"
                                                                           />
                                                                      </Box>
                                                                      {poll.description && (
                                                                           <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                                                {poll.description}
                                                                           </Typography>
                                                                      )}
                                                                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                                           <Chip label={pollTypeLabel(t, poll.type)} size="small" variant="outlined" />
                                                                           {poll.closed_at && (
                                                                                <Chip
                                                                                     label={`Closed: ${new Date(poll.closed_at).toLocaleDateString()}`}
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

                                        {/* Poll Results Display */}
                                        <Card sx={{ flex: 2 }}>
                                             <CardContent>
                                                  {!selectedClosedPoll ? (
                                                       <Box sx={{ textAlign: 'center', py: 4 }}>
                                                            <Typography variant="h6" color="text.secondary">
                                                                 Select a poll to view results
                                                            </Typography>
                                                       </Box>
                                                  ) : isLoadingResults ? (
                                                       <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                                            <CircularProgress />
                                                       </Box>
                                                  ) : pollResults ? (
                                                       <Stack spacing={3}>
                                                            <Box>
                                                                 <Typography variant="h5" gutterBottom>
                                                                      {selectedClosedPoll.title}
                                                                 </Typography>
                                                                 {selectedClosedPoll.description && (
                                                                      <Typography variant="body1" color="text.secondary" paragraph>
                                                                           {selectedClosedPoll.description}
                                                                      </Typography>
                                                                 )}
                                                            </Box>

                                                            {/* Poll Statistics */}
                                                            <Paper sx={{ p: 2 }}>
                                                                 <Typography variant="h6" gutterBottom>
                                                                      Participation Statistics
                                                                 </Typography>
                                                                 <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 3 }}>
                                                                      <Box sx={{ textAlign: 'center' }}>
                                                                           <Typography variant="h4" color="primary">
                                                                                {pollResults.statistics.total_votes}
                                                                           </Typography>
                                                                           <Typography variant="body2" color="text.secondary">
                                                                                Total Votes
                                                                           </Typography>
                                                                      </Box>
                                                                      <Box sx={{ textAlign: 'center' }}>
                                                                           <Typography variant="h4" color="primary">
                                                                                {pollResults.statistics.total_eligible}
                                                                           </Typography>
                                                                           <Typography variant="body2" color="text.secondary">
                                                                                Eligible Voters
                                                                           </Typography>
                                                                      </Box>
                                                                      <Box sx={{ textAlign: 'center' }}>
                                                                           <Typography variant="h4" color="success.main">
                                                                                {pollResults.statistics.participation_rate}%
                                                                           </Typography>
                                                                           <Typography variant="body2" color="text.secondary">
                                                                                Participation
                                                                           </Typography>
                                                                      </Box>
                                                                      <Box sx={{ textAlign: 'center' }}>
                                                                           <Typography variant="h4" color="warning.main">
                                                                                {pollResults.statistics.abstentions}
                                                                           </Typography>
                                                                           <Typography variant="body2" color="text.secondary">
                                                                                Abstentions
                                                                           </Typography>
                                                                      </Box>
                                                                 </Box>
                                                            </Paper>

                                                            {/* Charts */}
                                                            <Paper sx={{ p: 2 }}>
                                                                 {renderResultsChart()}
                                                            </Paper>

                                                            {/* Detailed Results Table */}
                                                            <Paper sx={{ p: 2 }}>
                                                                 <Typography variant="h6" gutterBottom>
                                                                      Detailed Results
                                                                 </Typography>
                                                                 {renderResultsTable()}
                                                            </Paper>
                                                       </Stack>
                                                  ) : (
                                                       <Box sx={{ textAlign: 'center', py: 4 }}>
                                                            <Typography variant="h6" color="error">
                                                                 Failed to load poll results
                                                            </Typography>
                                                       </Box>
                                                  )}
                                             </CardContent>
                                        </Card>
                                   </Stack>
                              )}
                         </>
                    )}
               </Stack>
          </Container>
     );
}
