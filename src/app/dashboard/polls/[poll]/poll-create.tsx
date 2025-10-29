'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik, getIn } from 'formik';
import {
     Box,
     Button,
     Card,
     CardContent,
     CardHeader,
     Container,
     Divider,
     FormControl,
     FormControlLabel,
     Grid,
     InputLabel,
     MenuItem,
     Select,
     Stack,
     Switch,
     TextField,
     Typography,
     Table,
     TableBody,
     TableCell,
     TableHead,
     TableRow,
     IconButton,
     Tooltip,
     Dialog,
     DialogTitle,
     DialogContent,
     DialogActions,
     List,
     ListItem,
     ListItemText,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import { Building } from 'src/types/building';
import {
     Poll,
     PollOption,
     PollAttachment,
     PollVote,
     PollType,
     DecisionRule,
     ScoreAgg,
     voteStatusLabel,
     DECISION_RULE_TRANSLATIONS,
     SCORE_AGG_TRANSLATIONS,
     buildPollValidationSchema,
     pollInitialValues,
} from 'src/types/poll';
import { closePoll, createOrUpdatePoll, getPollById, reopenPoll, reorderPolls } from 'src/app/actions/poll/polls';
import { createPollOption, updatePollOption, deletePollOption } from 'src/app/actions/poll/poll-options';
import { uploadPollImagesAndGetUrls, removePollAttachmentFilePath, removeAllPollAttachments } from 'src/app/actions/poll/poll-attachments';
import { FileDropzone, type File as DropFile } from 'src/components/file-dropzone';
import { paths } from 'src/paths';
import { DatePicker, TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import log from 'src/utils/logger';
import { SortableOptionsList } from 'src/components/drag-and-drop';
import type { DBStoredImage } from 'src/components/file-dropzone';

type Props = {
     clientId: string;
     buildings: Building[];
     poll?: Poll | null;
     votes?: PollVote[] | null;
};

export default function PollCreate({
     clientId,
     buildings,
     poll,
     votes = [],
}: Props) {
     const { t } = useTranslation();
     const router = useRouter();
     const [saving, setSaving] = useState(false);
     const [files, setFiles] = useState<DropFile[]>([]);
     const [uploadProgress, setUploadProgress] = useState<number | undefined>(undefined);
     const [infoOpen, setInfoOpen] = useState(false);

     // helper for MUI fields: injects error + helperText from Formik by path
     const fe = (name: string) => {
          const touched = getIn(formik.touched, name);
          const error = getIn(formik.errors, name);
          return {
               error: Boolean(touched && error),
               helperText: touched && error ? String(error) : undefined,
          };
     };

     const optionLabelById = useMemo(
          () => new Map((poll?.options! || []).map((o) => [o.id, o.label])),
          [poll?.options]
     );

     const summarizeVote = (v: PollVote): string => {
          if (v.abstain) return 'Abstain';
          switch (poll?.type) {
               case 'yes_no':
                    return v.choice_bool === true ? 'Yes' : v.choice_bool === false ? 'No' : '';
               case 'single_choice':
               case 'multiple_choice': {
                    const ids = v.choice_option_ids || [];
                    const labels = ids.map((id) => optionLabelById.get(id) || id);
                    return labels.join(', ');
               }
               case 'ranked_choice': {
                    const ranks = (v.ranks || []).slice().sort((a, b) => a.rank - b.rank);
                    return ranks
                         .map((r) => `${r.rank}. ${optionLabelById.get(r.option_id) || r.option_id}`)
                         .join(' | ');
               }
               case 'score': {
                    const scores = (v.scores || [])
                         .slice()
                         .sort((a, b) =>
                              (optionLabelById.get(a.option_id) || '').localeCompare(
                                   optionLabelById.get(b.option_id) || ''
                              )
                         );
                    return scores
                         .map((s) => `${optionLabelById.get(s.option_id) || s.option_id}: ${s.score}`)
                         .join(', ');
               }
               default:
                    return '';
          }
     };

     const buildingOptions = useMemo(
          () =>
               buildings.map((b) => ({
                    id: (b as any).id,
                    name: (b as any).name,
                    loc: (b as any).building_location,
               })),
          [buildings]
     );

     const formik = useFormik<Poll>({
          // Prevent large lists like attachments/votes from being part of the form state
          initialValues: poll ? { ...poll, attachments: [], votes: [] } : { ...pollInitialValues, client_id: clientId },
          validationSchema: buildPollValidationSchema(t),
          validateOnBlur: true,
          validateOnChange: true,
          onSubmit: async (values) => {
               log(`Formik submit ${values}`);
               setSaving(true);
               try {
                    // Poll options set by client
                    const pollId = values.id ?? poll?.id ?? '';
                    const desiredOptions = (values.options as PollOption[]).map((r, i) => ({
                         id: r.id,
                         poll_id: pollId,
                         label: r.label,
                         // Always derive sort_order from current position
                         sort_order: i,
                    }));

                    // Exclude non-column props and server-managed timestamps from payload
                    const { attachments: _attachments, votes: _votes, created_at: _created_at, closed_at: _closed_at, ...valuesNoExtras } = values as any;

                    // Normalize date-time fields: send null or ISO 8601 (UTC)
                    const toIsoOrNull = (v: any) => (v ? dayjs(v).toDate().toISOString() : null);

                    const pollInsert = {
                         ...valuesNoExtras,
                         starts_at: toIsoOrNull(valuesNoExtras.starts_at),
                         ends_at: toIsoOrNull(valuesNoExtras.ends_at),
                         options: desiredOptions,
                    } as any;
                    const { success, data, error } = await createOrUpdatePoll(pollInsert);
                    if (!success || !data) throw new Error(error || 'Failed to create poll');
                    // Fetch latest poll with options
                    const pollWithOptionsRes = await getPollById(data.id!);
                    if (!pollWithOptionsRes.success || !pollWithOptionsRes.data) throw new Error(pollWithOptionsRes.error || 'Failed to fetch poll options');
                    toast.success(t('common.actionSaveSuccess'));
                    // Reset Formik dirty/touched state after save
                    formik.resetForm({
                         values: pollWithOptionsRes.data,
                         touched: {},
                         errors: {},
                    });
                    router.push(`${paths.dashboard.polls.index}/${data.id}`);
               } catch (e: any) {
                    toast.error(e.message || 'Error');
               } finally {
                    setSaving(false);
               }
          },
     });

     // Ensure poll options edits do not toggle main form dirty state
     const setOptionsAndClearDirty = async (newOptions: any[]) => {
          // Update options value and immediately reset Formik with same values
          // so that formik.dirty remains false for option-only edits.
          formik.setFieldValue('options', newOptions, false);
          formik.resetForm({
               values: { ...formik.values, options: newOptions },
               touched: formik.touched,
               errors: formik.errors,
          });
          // Re-run validation to reflect new options (e.g., min count, uniqueness, winners <= options)
          await formik.validateForm();
     };

     const isFormLocked = formik.isSubmitting || !!poll?.closed_at || (poll?.status && poll.status !== 'draft' && poll.status !== 'active');

     const handleFilesDrop = async (newFiles: DropFile[]) => {
          if (!poll?.id) {
               toast.error(t('common.actionSaveError') || 'Save poll first');
               return;
          }

          let fakeProgress = 0;
          setUploadProgress(0);
          const interval = setInterval(() => {
               fakeProgress += 5;
               if (fakeProgress <= 99) setUploadProgress(fakeProgress);
          }, 300);

          try {
               const { success, error } = await uploadPollImagesAndGetUrls(
                    newFiles,
                    formik.values.client_id,
                    poll.id
               );
               clearInterval(interval);
               setUploadProgress(100);
               setTimeout(() => setUploadProgress(undefined), 700);
               if (!success) throw new Error(error || 'Upload failed');
               setFiles((prev) => [...prev, ...newFiles]);
               // Optimistically append new signed URLs to the local attachments list for immediate display
               // Note: Server returns signed URLs in the same order as provided files
               // We cannot read URLs here (not returned inline), so we refetch from argument? The action returns urls; adapt to it.
          } catch (e: any) {
               clearInterval(interval);
               setUploadProgress(undefined);
               toast.error(e?.message || t('common.actionUploadError') || 'Upload error');
               return;
          }

          // Fetch signed URLs were returned by the action via its return value; re-call to retrieve URLs is not needed because we already have them in the previous scope.
     };

     // Enhance: handleFilesDrop needs the URLs to update UI; adjust to capture them from the action result
     const handleFilesDropWithUrls = async (newFiles: DropFile[]) => {
          if (!poll?.id) {
               toast.error(t('common.actionSaveError') || 'Save poll first');
               return;
          }

          let fakeProgress = 0;
          setUploadProgress(0);
          const interval = setInterval(() => {
               fakeProgress += 5;
               if (fakeProgress <= 99) setUploadProgress(fakeProgress);
          }, 300);

          try {
               const res = await uploadPollImagesAndGetUrls(newFiles, formik.values.client_id, poll.id);
               clearInterval(interval);
               setUploadProgress(100);
               setTimeout(() => setUploadProgress(undefined), 700);
               if (!res.success || !res.urls) throw new Error(res.error || 'Upload failed');
               setFiles((prev) => [...prev, ...newFiles]);
               toast.success(t('common.actionUploadSuccess') || 'Uploaded');
          } catch (e: any) {
               clearInterval(interval);
               setUploadProgress(undefined);
               toast.error(e?.message || t('common.actionUploadError') || 'Upload error');
          }
     };

     const handleFileRemove = async (image: DBStoredImage) => {
          if (!poll?.id) return;
          try {
               const { success, error } = await removePollAttachmentFilePath(poll.id, image.storage_path);
               if (!success) {
                    toast.error(error || t('common.actionDeleteError') || 'Delete failed');
                    return;
               }
               toast.success(t('common.actionDeleteSuccess') || 'Deleted');
          } catch (e: any) {
               toast.error(e?.message || t('common.actionDeleteError') || 'Delete failed');
          }
     };

     const handleFileRemoveAll = async () => {
          if (!poll?.id) return;
          try {
               const res = await removeAllPollAttachments(poll.id);
               if (!res.success) {
                    toast.error(res.error || t('common.actionDeleteError') || 'Delete failed');
                    return;
               }
               toast.success(t('common.actionDeleteSuccess') || 'Deleted');
          } catch (e: any) {
               toast.error(e?.message || t('common.actionDeleteError') || 'Delete failed');
          }
     };

     const handleClosePoll = async () => {
          setSaving(true);
          try {
               const { success, error } = await closePoll(poll?.id!);
               if (!success) throw new Error(error || 'Failed to close poll');
               toast.success(t('polls.closed') || 'Poll closed');
          } catch (e: any) {
               toast.error(e.message || 'Error');
          } finally {
               setSaving(false);
          }
     };

     const handleReopenPoll = async () => {
          setSaving(true);
          try {
               const { success, error } = await reopenPoll(poll?.id!);
               if (!success) throw new Error(error || 'Failed to reopen poll');
               toast.success(t('polls.reopened') || 'Poll reopened');
          } catch (e: any) {
               toast.error(e.message || 'Error');
          } finally {
               setSaving(false);
          }
     }

     const canConfigureMaxChoices = formik.values.type === 'multiple_choice';

     // Integer-only input helpers for numeric-only fields
     const allowIntegerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
          const allowedKeys = [
               'Backspace',
               'Delete',
               'Tab',
               'Escape',
               'Enter',
               'ArrowLeft',
               'ArrowRight',
               'Home',
               'End',
          ];
          if (
               allowedKeys.includes(e.key) ||
               ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x', 'A', 'C', 'V', 'X'].includes(e.key))
          ) {
               return;
          }
          if (!/^[0-9]$/.test(e.key)) {
               e.preventDefault();
          }
     };

     const coerceInt = (raw: string): number | null => {
          if (!raw) return null;
          const digits = raw.replace(/\D+/g, '');
          if (digits === '') return null;
          return parseInt(digits, 10);
     };

     return (
          <Box component="main" sx={{ flexGrow: 1, py: 6 }}>
               <Container maxWidth="xl">
                    <Stack spacing={3} component="form" onSubmit={formik.handleSubmit}>
                         <Typography variant="h4">
                              {poll ? t('polls.editTitle') || 'Edit Poll' : t('polls.createTitle') || 'Create Poll'}
                         </Typography>

                         {/* Two-column layout */}
                         <Grid container spacing={2} >
                              <Grid size={{ xs: 12, md: 7 }}>
                                   <Card >
                                        <CardHeader title={t('polls.details') || 'Details'} />
                                        <Divider />
                                        <CardContent>
                                             <Grid container spacing={2}>
                                                  <Grid size={{ xs: 12 }}>
                                                       <TextField
                                                            disabled={isFormLocked}
                                                            fullWidth
                                                            name="title"
                                                            label={t('polls.title') || 'Title'}
                                                            value={formik.values.title}
                                                            onChange={formik.handleChange}
                                                            onBlur={formik.handleBlur}
                                                            {...fe('title')}
                                                       />
                                                  </Grid>

                                                  <Grid size={{ xs: 12 }}>
                                                       <TextField
                                                            disabled={isFormLocked}
                                                            fullWidth
                                                            name="description"
                                                            label={t('polls.description') || 'Description'}
                                                            multiline
                                                            minRows={3}
                                                            value={formik.values.description || ''}
                                                            onChange={formik.handleChange}
                                                            onBlur={formik.handleBlur}
                                                            {...fe('description')}
                                                       />
                                                  </Grid>

                                                  <Grid size={{ xs: 12, sm: 6 }}>
                                                       <FormControl
                                                            fullWidth
                                                            error={
                                                                 !!(getIn(formik.touched, 'type') && getIn(formik.errors, 'type'))
                                                            }
                                                       >
                                                            <InputLabel>{t('polls.type') || 'Type'}</InputLabel>
                                                            <Select
                                                                 disabled={isFormLocked}
                                                                 name="type"
                                                                 label={t('polls.type') || 'Type'}
                                                                 value={formik.values.type}
                                                                 onChange={formik.handleChange}
                                                                 onBlur={() => formik.setFieldTouched('type', true)}
                                                            >
                                                                 <MenuItem value={'yes_no'}>{t('polls.types.yes_no') || 'Yes/No'}</MenuItem>
                                                                 <MenuItem value={'single_choice'}>
                                                                      {t('polls.types.single_choice') || 'Single Choice'}
                                                                 </MenuItem>
                                                                 <MenuItem value={'multiple_choice'}>
                                                                      {t('polls.types.multiple_choice') || 'Multiple Choice'}
                                                                 </MenuItem>
                                                                 <MenuItem value={'ranked_choice'}>
                                                                      {t('polls.types.ranked_choice') || 'Ranked Choice'}
                                                                 </MenuItem>
                                                                 <MenuItem value={'score'}>{t('polls.types.score') || 'Score'}</MenuItem>
                                                            </Select>
                                                            {getIn(formik.touched, 'type') && getIn(formik.errors, 'type') && (
                                                                 <Typography variant="caption" color="error">
                                                                      {String(getIn(formik.errors, 'type'))}
                                                                 </Typography>
                                                            )}
                                                       </FormControl>
                                                  </Grid>

                                                  <Grid size={{ xs: 12, sm: 6 }}>
                                                       <FormControl
                                                            fullWidth
                                                            error={
                                                                 !!(
                                                                      getIn(formik.touched, 'building_id') &&
                                                                      getIn(formik.errors, 'building_id')
                                                                 )
                                                            }
                                                       >
                                                            <InputLabel>{t('polls.building') || 'Building'}</InputLabel>
                                                            <Select
                                                                 disabled={isFormLocked}
                                                                 name="building_id"
                                                                 label={t('polls.building') || 'Building'}
                                                                 value={formik.values.building_id}
                                                                 onChange={formik.handleChange}
                                                                 onBlur={() => formik.setFieldTouched('building_id', true)}
                                                            >
                                                                 {buildingOptions.map((b) => (
                                                                      <MenuItem key={b.id} value={b.id}>
                                                                           {b.name || `${b.loc?.city || ''} ${b.loc?.street_address || ''}`}
                                                                      </MenuItem>
                                                                 ))}
                                                            </Select>
                                                            {getIn(formik.touched, 'building_id') &&
                                                                 getIn(formik.errors, 'building_id') && (
                                                                      <Typography variant="caption" color="error">
                                                                           {String(getIn(formik.errors, 'building_id'))}
                                                                      </Typography>
                                                                 )}
                                                       </FormControl>
                                                  </Grid>

                                                  {canConfigureMaxChoices && (
                                                       <Grid size={{ xs: 12, sm: 6 }}>
                                                            <TextField
                                                                 disabled={isFormLocked}
                                                                 type="text"
                                                                 slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
                                                                 onKeyDown={allowIntegerKeyDown}
                                                                 fullWidth
                                                                 name="max_choices"
                                                                 label={t('polls.maxChoices') || 'Max choices'}
                                                                 value={formik.values.max_choices ?? ''}
                                                                 onChange={(e) =>
                                                                      formik.setFieldValue('max_choices', coerceInt(e.target.value))
                                                                 }
                                                                 onBlur={formik.handleBlur}
                                                                 {...fe('max_choices')}
                                                            />
                                                       </Grid>
                                                  )}

                                                  <Grid size={{ xs: 12 }}>
                                                       <Grid container spacing={2}>
                                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                                 <FormControlLabel
                                                                      disabled={isFormLocked}
                                                                      control={
                                                                           <Switch
                                                                                disabled={isFormLocked}
                                                                                checked={!!formik.values.allow_abstain}
                                                                                onChange={(e) =>
                                                                                     formik.setFieldValue('allow_abstain', e.target.checked)
                                                                                }
                                                                                onBlur={() => formik.setFieldTouched('allow_abstain', true)}
                                                                           />
                                                                      }
                                                                      label={t('polls.allowAbstain') || 'Allow abstain'}
                                                                 />
                                                            </Grid>
                                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                                 <FormControlLabel
                                                                      disabled={isFormLocked}
                                                                      control={
                                                                           <Switch
                                                                                disabled={isFormLocked}
                                                                                checked={!!formik.values.allow_comments}
                                                                                onChange={(e) =>
                                                                                     formik.setFieldValue('allow_comments', e.target.checked)
                                                                                }
                                                                                onBlur={() => formik.setFieldTouched('allow_comments', true)}
                                                                           />
                                                                      }
                                                                      label={t('polls.allowComments') || 'Allow comments'}
                                                                 />
                                                            </Grid>
                                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                                 <FormControlLabel
                                                                      disabled={isFormLocked}
                                                                      control={
                                                                           <Switch
                                                                                disabled={isFormLocked}
                                                                                checked={!!formik.values.allow_anonymous}
                                                                                onChange={(e) =>
                                                                                     formik.setFieldValue('allow_anonymous', e.target.checked)
                                                                                }
                                                                                onBlur={() => formik.setFieldTouched('allow_anonymous', true)}
                                                                           />
                                                                      }
                                                                      label={t('polls.allowAnonymous') || 'Allow anonymous'}
                                                                 />
                                                            </Grid>
                                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                                 <FormControlLabel
                                                                      disabled={isFormLocked}
                                                                      control={
                                                                           <Switch
                                                                                disabled={isFormLocked}
                                                                                checked={!!formik.values.allow_change_until_deadline}
                                                                                onChange={(e) =>
                                                                                     formik.setFieldValue(
                                                                                          'allow_change_until_deadline',
                                                                                          e.target.checked
                                                                                     )
                                                                                }
                                                                                onBlur={() =>
                                                                                     formik.setFieldTouched('allow_change_until_deadline', true)
                                                                                }
                                                                           />
                                                                      }
                                                                      label={
                                                                           t('polls.allowChangeUntilDeadline') || 'Allow change until deadline'
                                                                      }
                                                                 />
                                                            </Grid>
                                                       </Grid>
                                                  </Grid>

                                                  <Grid size={{ xs: 12 }}>
                                                       <Typography variant="subtitle2">
                                                            {t('polls.advanced') || 'Advanced'}
                                                       </Typography>
                                                       <InputLabel>
                                                            {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}> */}
                                                            {t('polls.decisionRule') || 'Decision rule'}
                                                            <Tooltip title={t('polls.help.tooltip') || 'How voting works'}>
                                                                 <IconButton
                                                                      size="small"
                                                                      onClick={() => setInfoOpen(true)}
                                                                      aria-label="How voting works"
                                                                 >
                                                                      <InfoOutlinedIcon fontSize="small" />
                                                                 </IconButton>
                                                            </Tooltip>
                                                            {/* </Box> */}
                                                       </InputLabel>
                                                  </Grid>

                                                  <Grid size={{ xs: 12, sm: 6 }}>
                                                       <FormControl
                                                            fullWidth
                                                            error={!!(getIn(formik.touched, 'rule') && getIn(formik.errors, 'rule'))}
                                                       >
                                                            <InputLabel>{t('polls.decisionRule') || 'Decision rule'}</InputLabel>
                                                            <Select
                                                                 disabled={isFormLocked}
                                                                 name="rule"
                                                                 label={t('polls.decisionRule') || 'Decision rule'}
                                                                 value={(formik.values.rule || '') as any}
                                                                 onChange={(e) => formik.setFieldValue('rule', (e.target.value || null) as any)}
                                                                 onBlur={() => formik.setFieldTouched('rule', true)}
                                                            >
                                                                 {DECISION_RULE_TRANSLATIONS.map((r) => (
                                                                      <MenuItem key={r.value || 'empty'} value={r.value}>
                                                                           <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                                {t(r.key) || r.defaultLabel}
                                                                                {r.value && (
                                                                                     <Tooltip title={t(`polls.help.${r.value}`) || ''}>
                                                                                          <InfoOutlinedIcon fontSize="small" sx={{ ml: 0.5 }} />
                                                                                     </Tooltip>
                                                                                )}
                                                                           </Box>
                                                                      </MenuItem>
                                                                 ))}
                                                            </Select>
                                                            {getIn(formik.touched, 'rule') && getIn(formik.errors, 'rule') && (
                                                                 <Typography variant="caption" color="error">
                                                                      {String(getIn(formik.errors, 'rule'))}
                                                                 </Typography>
                                                            )}
                                                       </FormControl>
                                                  </Grid>

                                                  <Grid size={{ xs: 12, sm: 6 }}>
                                                       <FormControl
                                                            fullWidth
                                                            error={
                                                                 !!(
                                                                      getIn(formik.touched, 'score_aggregation') &&
                                                                      getIn(formik.errors, 'score_aggregation')
                                                                 )
                                                            }
                                                       >
                                                            <InputLabel>
                                                                 {t('polls.scoreAggregation') || 'Score aggregation'}
                                                            </InputLabel>
                                                            <Select
                                                                 disabled={isFormLocked}
                                                                 name="score_aggregation"
                                                                 label={t('polls.scoreAggregation') || 'Score aggregation'}
                                                                 value={(formik.values.score_aggregation || '') as any}
                                                                 onChange={(e) =>
                                                                      formik.setFieldValue('score_aggregation', (e.target.value || null) as any)
                                                                 }
                                                                 onBlur={() => formik.setFieldTouched('score_aggregation', true)}
                                                            >
                                                                 {SCORE_AGG_TRANSLATIONS.map((s) => (
                                                                      <MenuItem key={s.value || 'empty'} value={s.value}>
                                                                           <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                                <span>{t(s.key) || s.defaultLabel}</span>
                                                                                <Tooltip
                                                                                     title={
                                                                                          s.value === 'avg'
                                                                                               ? (t('polls.scoreAggHelp.avg') || 'Average: Averages voter scores for each option')
                                                                                               : (t('polls.scoreAggHelp.sum') || 'Sum: Adds all voter scores for each option')
                                                                                     }
                                                                                >
                                                                                     <InfoOutlinedIcon fontSize="small" color="action" />
                                                                                </Tooltip>
                                                                           </Box>
                                                                      </MenuItem>
                                                                 ))}
                                                            </Select>
                                                            {getIn(formik.touched, 'score_aggregation') &&
                                                                 getIn(formik.errors, 'score_aggregation') && (
                                                                      <Typography variant="caption" color="error">
                                                                           {String(getIn(formik.errors, 'score_aggregation'))}
                                                                      </Typography>
                                                                 )}
                                                       </FormControl>
                                                  </Grid>

                                                  <Grid size={{ xs: 12, sm: 6 }}>
                                                       <TextField
                                                            disabled={isFormLocked}
                                                            name="supermajority_percent"
                                                            label={
                                                                 <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                                                      {t('polls.supermajorityPercent') || 'Supermajority %'}
                                                                      <Tooltip title={t('polls.help.supermajority_percent') || ''}>
                                                                           <InfoOutlinedIcon fontSize="small" />
                                                                      </Tooltip>
                                                                 </Box>
                                                            }
                                                            fullWidth
                                                            type="text"
                                                            slotProps={{
                                                                 htmlInput: { inputMode: 'numeric', pattern: '[0-9]*', max: 100, min: 0 },
                                                            }}
                                                            onKeyDown={allowIntegerKeyDown}
                                                            value={formik.values.supermajority_percent ?? ''}
                                                            onChange={(e) =>
                                                                 /^\d*$/.test(e.target.value) &&
                                                                 formik.setFieldValue(
                                                                      'supermajority_percent',
                                                                      e.target.value === '' ? null : Number(e.target.value)
                                                                 )
                                                            }
                                                            onBlur={formik.handleBlur}
                                                            {...fe('supermajority_percent')}
                                                       />
                                                  </Grid>

                                                  <Grid size={{ xs: 12, sm: 6 }}>
                                                       <TextField
                                                            disabled={isFormLocked}
                                                            name="threshold_percent"
                                                            label={
                                                                 <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                                                      {t('polls.thresholdPercent') || 'Threshold %'}
                                                                      <Tooltip title={t('polls.help.threshold_percent') || ''}>
                                                                           <InfoOutlinedIcon fontSize="small" />
                                                                      </Tooltip>
                                                                 </Box>
                                                            }
                                                            fullWidth
                                                            type="text"
                                                            slotProps={{
                                                                 htmlInput: { inputMode: 'numeric', pattern: '[0-9]*', max: 100, min: 0 },
                                                            }}
                                                            onKeyDown={allowIntegerKeyDown}
                                                            value={formik.values.threshold_percent ?? ''}
                                                            onChange={(e) =>
                                                                 /^\d*$/.test(e.target.value) &&
                                                                 formik.setFieldValue(
                                                                      'threshold_percent',
                                                                      e.target.value === '' ? null : Number(e.target.value)
                                                                 )
                                                            }
                                                            onBlur={formik.handleBlur}
                                                            {...fe('threshold_percent')}
                                                       />
                                                  </Grid>

                                                  <Grid size={{ xs: 12, sm: 6 }}>
                                                       <TextField
                                                            disabled={isFormLocked}
                                                            name="winners_count"
                                                            label={
                                                                 <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                                                      {t('polls.winnersCount') || 'Winners count'}
                                                                      <Tooltip title={t('polls.help.winners_count') || ''}>
                                                                           <InfoOutlinedIcon fontSize="small" />
                                                                      </Tooltip>
                                                                 </Box>
                                                            }
                                                            fullWidth
                                                            type="text"
                                                            slotProps={{
                                                                 htmlInput: { inputMode: 'numeric', pattern: '[0-9]*', min: 1 },
                                                            }}
                                                            onKeyDown={allowIntegerKeyDown}
                                                            value={formik.values.winners_count ?? ''}
                                                            onChange={(e) =>
                                                                 /^\d*$/.test(e.target.value) &&
                                                                 formik.setFieldValue(
                                                                      'winners_count',
                                                                      e.target.value === '' ? null : Number(e.target.value)
                                                                 )
                                                            }
                                                            onBlur={formik.handleBlur}
                                                            {...fe('winners_count')}
                                                       />
                                                  </Grid>
                                             </Grid>
                                        </CardContent>
                                   </Card>

                                   <Card>
                                        <CardHeader title={t('polls.details') || 'Details'} />
                                        <Divider />
                                        <CardContent>
                                             <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                       <Stack direction="row" spacing={2}>
                                                            <DatePicker
                                                                 disabled={isFormLocked}
                                                                 label={t('polls.startsAt') || 'Starts at'}
                                                                 value={formik.values.starts_at ? dayjs(formik.values.starts_at) : null}
                                                                 onChange={(newDate) => {
                                                                      const current = formik.values.starts_at
                                                                           ? dayjs(formik.values.starts_at)
                                                                           : null;
                                                                      const base = newDate || current;
                                                                      const timeRef = current || newDate || null;
                                                                      const composed =
                                                                           base && timeRef
                                                                                ? base
                                                                                     .hour(timeRef.hour())
                                                                                     .minute(timeRef.minute())
                                                                                     .second(0)
                                                                                     .millisecond(0)
                                                                                     .format('YYYY-MM-DDTHH:mm:ss')
                                                                                : null;
                                                                      formik.setFieldValue('starts_at', composed);
                                                                 }}
                                                                 onClose={() => formik.setFieldTouched('starts_at', true)}
                                                                 slotProps={{
                                                                      textField: {
                                                                           disabled: isFormLocked,
                                                                           onBlur: () => formik.setFieldTouched('starts_at', true),
                                                                           ...fe('starts_at'),
                                                                      },
                                                                 }}
                                                                 disablePast
                                                            />
                                                            <TimePicker
                                                                 disabled={isFormLocked}
                                                                 label={t('polls.startsAt') || 'Starts at'}
                                                                 value={formik.values.starts_at ? dayjs(formik.values.starts_at) : null}
                                                                 onChange={(newTime) => {
                                                                      const current = formik.values.starts_at
                                                                           ? dayjs(formik.values.starts_at)
                                                                           : null;
                                                                      const base = current || newTime;
                                                                      const timeRef = newTime || current || null;
                                                                      const composed =
                                                                           base && timeRef
                                                                                ? base
                                                                                     .hour(timeRef.hour())
                                                                                     .minute(timeRef.minute())
                                                                                     .second(0)
                                                                                     .millisecond(0)
                                                                                     .format('YYYY-MM-DDTHH:mm:ss')
                                                                                : null;
                                                                      formik.setFieldValue('starts_at', composed);
                                                                 }}
                                                                 onClose={() => formik.setFieldTouched('starts_at', true)}
                                                                 slotProps={{
                                                                      textField: {
                                                                           disabled: isFormLocked,
                                                                           onBlur: () => formik.setFieldTouched('starts_at', true),
                                                                           ...fe('starts_at'),
                                                                      },
                                                                 }}
                                                            />
                                                       </Stack>
                                                  </LocalizationProvider>

                                                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                       <Stack direction="row" spacing={2}>
                                                            <DatePicker
                                                                 disabled={isFormLocked}
                                                                 label={t('polls.endsAt') || 'Ends at'}
                                                                 value={formik.values.ends_at ? dayjs(formik.values.ends_at) : null}
                                                                 onChange={(newDate) => {
                                                                      const current = formik.values.ends_at
                                                                           ? dayjs(formik.values.ends_at)
                                                                           : null;
                                                                      const base = newDate || current;
                                                                      const timeRef = current || newDate || null;
                                                                      const composed =
                                                                           base && timeRef
                                                                                ? base
                                                                                     .hour(timeRef.hour())
                                                                                     .minute(timeRef.minute())
                                                                                     .second(0)
                                                                                     .millisecond(0)
                                                                                     .format('YYYY-MM-DDTHH:mm:ss')
                                                                                : null;
                                                                      formik.setFieldValue('ends_at', composed);
                                                                 }}
                                                                 onClose={() => formik.setFieldTouched('ends_at', true)}
                                                                 slotProps={{
                                                                      textField: {
                                                                           disabled: isFormLocked,
                                                                           onBlur: () => formik.setFieldTouched('ends_at', true),
                                                                           ...fe('ends_at'),
                                                                      },
                                                                 }}
                                                                 disablePast
                                                            />
                                                            <TimePicker
                                                                 disabled={isFormLocked}
                                                                 label={t('polls.endsAt') || 'Ends at'}
                                                                 value={formik.values.ends_at ? dayjs(formik.values.ends_at) : null}
                                                                 onChange={(newTime) => {
                                                                      const current = formik.values.ends_at
                                                                           ? dayjs(formik.values.ends_at)
                                                                           : null;
                                                                      const base = current || newTime;
                                                                      const timeRef = newTime || current || null;
                                                                      const composed =
                                                                           base && timeRef
                                                                                ? base
                                                                                     .hour(timeRef.hour())
                                                                                     .minute(timeRef.minute())
                                                                                     .second(0)
                                                                                     .millisecond(0)
                                                                                     .format('YYYY-MM-DDTHH:mm:ss')
                                                                                : null;
                                                                      formik.setFieldValue('ends_at', composed);
                                                                 }}
                                                                 onClose={() => formik.setFieldTouched('ends_at', true)}
                                                                 slotProps={{
                                                                      textField: {
                                                                           disabled: isFormLocked,
                                                                           onBlur: () => formik.setFieldTouched('ends_at', true),
                                                                           ...fe('ends_at'),
                                                                      },
                                                                 }}
                                                            />
                                                       </Stack>
                                                  </LocalizationProvider>
                                             </Box>
                                        </CardContent>
                                   </Card>

                                   <Card>
                                        <CardHeader title={t('polls.options') || 'Options'} />
                                        <Divider />
                                        <CardContent>
                                             <Stack spacing={1}>

                                                  {formik.values.options.length > 0 ?
                                                       <SortableOptionsList
                                                            options={formik.values.options}
                                                            disabled={isFormLocked}
                                                            onDelete={async (idx) => {
                                                                 const opt = formik.values.options[idx];
                                                                 if (!opt) return;
                                                                 try {
                                                                      if (opt.id) {
                                                                           const res = await deletePollOption(opt.id);
                                                                           if (!res.success) throw new Error(res.error || 'Delete failed');
                                                                      }
                                                                      setOptionsAndClearDirty(formik.values.options.filter((_, i) => i !== idx));
                                                                      toast.success(t('common.actionDeleteSuccess') || 'Deleted');
                                                                 } catch (e: any) {
                                                                      toast.error(e?.message || t('common.actionDeleteError') || 'Delete failed');
                                                                 }
                                                            }}
                                                            onSave={async (idx) => {
                                                                 const pollId = poll?.id;
                                                                 if (!pollId) {
                                                                      toast.error(t('common.actionSaveError') || 'Save poll first');
                                                                      return;
                                                                 }
                                                                 const opt = formik.values.options[idx];
                                                                 if (!opt) return;
                                                                 const label = (opt.label || '').trim();
                                                                 if (!label) return;
                                                                 try {
                                                                      if (opt.id) {
                                                                           const res = await updatePollOption(opt.id, { label, sort_order: opt.sort_order ?? idx });
                                                                           if (!res.success || !res.data) throw new Error(res.error || 'Update failed');
                                                                           const updated = formik.values.options.slice();
                                                                           updated[idx] = { ...updated[idx], label: res.data.label, sort_order: res.data.sort_order } as PollOption;
                                                                           setOptionsAndClearDirty(updated);
                                                                      } else {
                                                                           const res = await createPollOption({ poll_id: pollId, label, sort_order: idx } as any);
                                                                           if (!res.success || !res.data) throw new Error(res.error || 'Create failed');
                                                                           const updated = formik.values.options.slice();
                                                                           updated[idx] = { ...updated[idx], id: res.data.id, sort_order: res.data.sort_order } as PollOption;
                                                                           setOptionsAndClearDirty(updated);
                                                                      }
                                                                      toast.success(t('common.actionSaveSuccess') || 'Saved');
                                                                 } catch (e: any) {
                                                                      toast.error(e?.message || t('common.actionSaveError') || 'Save failed');
                                                                 }
                                                            }}
                                                            onLabelChange={(idx, value) => {
                                                                 const updated = formik.values.options.slice();
                                                                 updated[idx] = { ...updated[idx], label: value } as PollOption;
                                                                 setOptionsAndClearDirty(updated);
                                                            }}
                                                            onReorder={async (newOptions: PollOption[]) => {
                                                                 // Optimistically update local order in the form only
                                                                 setOptionsAndClearDirty(newOptions);

                                                                 // If poll exists, persist order for options that already have ids
                                                                 const pollId = poll?.id;
                                                                 const optionIds = newOptions.map((o) => o.id).filter(Boolean) as string[];

                                                                 if (!pollId) {
                                                                      // New poll not saved yet
                                                                      toast.success(t('polls.optionsReorderedLocal') || 'Order updated (not yet saved)');
                                                                      return;
                                                                 }
                                                                 try {
                                                                      if (optionIds.length < 2) {
                                                                           // Nothing meaningful to persist
                                                                           toast.success(t('polls.optionsReorderedLocal') || 'Order updated (not yet saved)');
                                                                           return;
                                                                      }
                                                                      const res = await reorderPolls(pollId, optionIds);
                                                                      if (!res.success) {
                                                                           toast.error(res.error || 'Failed to update order');
                                                                      } else {
                                                                           // Normalize local sort_order to match persisted order and clear dirty state
                                                                           const normalized: PollOption[] = newOptions.map((o, i) => ({ ...o, sort_order: i } as PollOption));
                                                                           formik.setFieldValue('options', normalized, false);
                                                                           // Reset formik's dirty flag without losing current values
                                                                           formik.resetForm({
                                                                                values: { ...formik.values, options: normalized },
                                                                                touched: formik.touched,
                                                                                errors: formik.errors,
                                                                           });
                                                                           // Revalidate to sync any dependent constraints
                                                                           await formik.validateForm();
                                                                           toast.success(t('common.actionSaveSuccess') || 'Order updated');
                                                                      }
                                                                 } catch (e: any) {
                                                                      toast.error(e?.message || 'Failed to update order');
                                                                 }
                                                            }}
                                                       />
                                                       : (
                                                            <Typography variant="body2" color="text.secondary">
                                                                 {t('polls.noOptions') || 'No options available'}
                                                            </Typography>
                                                       )}
                                                  <Button
                                                       onClick={() =>
                                                            setOptionsAndClearDirty([
                                                                 ...formik.values.options,
                                                                 { label: '', sort_order: formik.values.options.length },
                                                            ])
                                                       }
                                                       sx={{
                                                            width: '150px'
                                                       }}
                                                       disabled={isFormLocked || !poll?.id || poll.id == ''}
                                                  >
                                                       {t('polls.addOption') || 'Add option'}
                                                  </Button>

                                                  {Array.isArray(formik.errors.options) &&
                                                       formik.errors.options.map((err, idx) => {
                                                            if (!err) return null;
                                                            if (typeof err === 'string') {
                                                                 return (
                                                                      <Typography key={idx} variant="caption" color="error">
                                                                           Option {idx + 1}: {err}
                                                                      </Typography>
                                                                 );
                                                            }
                                                            if (typeof err === 'object' && err.label) {
                                                                 return (
                                                                      <Typography key={idx} variant="caption" color="error">
                                                                           Option {idx + 1}: {err.label}
                                                                      </Typography>
                                                                 );
                                                            }
                                                            return null;
                                                       })}
                                             </Stack>
                                        </CardContent>
                                   </Card>
                              </Grid>

                              {/* Attachments moved into right column so votes can be last on mobile */}
                              {
                                   poll && poll.id && (
                                        <Grid size={{ xs: 12, md: 5 }}>
                                             <Card>
                                                  <CardHeader title={t('polls.attachments') || 'Attachments'} />
                                                  <Divider />
                                                  <CardContent>
                                                       <Stack spacing={2}>
                                                            <FileDropzone
                                                                 entityId={poll.id}
                                                                 accept={{
                                                                      'image/*': [],
                                                                 }}
                                                                 caption={'(SVG, JPG, PNG or GIF up to 900x400)'}
                                                                 onDrop={handleFilesDropWithUrls}
                                                                 uploadProgress={uploadProgress}
                                                                 images={(((poll.attachments ?? (poll?.attachments as any)) as unknown as DBStoredImage[]) || [])}
                                                                 onRemoveImage={handleFileRemove}
                                                                 onRemoveAll={handleFileRemoveAll}
                                                            />
                                                       </Stack>
                                                  </CardContent>
                                             </Card>
                                        </Grid>
                                   )
                              }
                         </Grid>

                         {/* Votes moved after the grid so they appear last on mobile */}
                         <Card>
                              <CardHeader title={t('polls.votesList') || 'Votes'} />
                              <Divider />
                              <CardContent>
                                   <Stack spacing={1}>
                                        <Typography variant="subtitle2">{(poll?.votes!.length || 0)} votes</Typography>
                                        <Box sx={{ overflowX: 'auto' }}>
                                             <Table size="small" sx={{ minWidth: 800 }}>
                                                  <TableHead>
                                                       <TableRow>
                                                            <TableCell>{t('common.lblTime') || 'Time'}</TableCell>
                                                            <TableCell>{t('common.lblStatus') || 'Status'}</TableCell>
                                                            <TableCell>{t('polls.anonymous') || 'Anonymous'}</TableCell>
                                                            <TableCell>{t('common.comment') || 'Comment'}</TableCell>
                                                            <TableCell>{t('common.summary') || 'Summary'}</TableCell>
                                                       </TableRow>
                                                  </TableHead>
                                                  <TableBody>
                                                       {!votes || votes.length === 0 ? (
                                                            <TableRow>
                                                                 <TableCell colSpan={5}>
                                                                      <Typography variant="body2" color="text.secondary">
                                                                           {t('polls.noVotesYet') || 'No votes yet'}
                                                                      </Typography>
                                                                 </TableCell>
                                                            </TableRow>
                                                       ) : (
                                                            (votes || []).map((v) => (
                                                                 <TableRow key={v.id}>
                                                                      <TableCell>{new Date(v.cast_at).toLocaleString()}</TableCell>
                                                                      <TableCell>{voteStatusLabel(t, v.status)}</TableCell>
                                                                      <TableCell>
                                                                           {v.is_anonymous ? t('common.lblYes') || 'Yes' : t('common.lblNo') || 'No'}
                                                                      </TableCell>
                                                                      <TableCell>{v.comment || ''}</TableCell>
                                                                      <TableCell>{summarizeVote(v)}</TableCell>
                                                                 </TableRow>
                                                            ))
                                                       )}
                                                  </TableBody>
                                             </Table>
                                        </Box>
                                   </Stack>
                              </CardContent>
                         </Card>

                         <Stack direction="row" spacing={2} justifyContent="flex-start" sx={{ mb: 2 }}>
                              <Button variant="outlined" onClick={() => router.push(paths.dashboard.polls.index)}>
                                   {t('common.btnBack') || 'Back'}
                              </Button>
                              <Tooltip
                                   title={
                                        <Box>
                                             {!formik.isValid && (
                                                  <Box>
                                                       <Typography variant="subtitle2" color="error">
                                                            {t('common.formInvalid') || 'Form is invalid:'}
                                                       </Typography>
                                                       <List dense>
                                                            {Object.entries(formik.errors).map(([key, err]) => (
                                                                 <ListItem key={key}>
                                                                      <ListItemText
                                                                           primary={`${key}: ${typeof err === 'string' ? err : JSON.stringify(err)}`}
                                                                           slotProps={{ primary: { variant: 'caption', color: 'error' } }}
                                                                      />
                                                                 </ListItem>
                                                            ))}
                                                       </List>
                                                  </Box>
                                             )}
                                             {!formik.dirty && (
                                                  <Typography variant="caption" color="text.secondary">
                                                       {t('common.formNotChanged') || 'No changes to save'}
                                                  </Typography>
                                             )}
                                             {formik.isSubmitting && (
                                                  <Typography variant="caption" color="text.secondary">
                                                       {t('common.formSubmitting') || 'Submitting...'}
                                                  </Typography>
                                             )}
                                        </Box>
                                   }
                                   arrow
                                   placement="top"
                                   disableHoverListener={formik.isValid && formik.dirty && !formik.isSubmitting}
                              >
                                   <span>
                                        <Button
                                             variant="contained"
                                             type="submit"
                                             loading={saving}
                                             disabled={formik.isSubmitting || !formik.dirty || !formik.isValid}
                                        >
                                             {t('common.btnSave')}
                                        </Button>
                                   </span>
                              </Tooltip>

                              {(
                                   poll?.closed_at ? (
                                        <Button
                                             variant="outlined"
                                             color="success"
                                             onClick={handleReopenPoll}
                                        >
                                             {t('polls.btnReopenPoll') || 'Reopen Poll'}
                                        </Button>
                                   ) : (
                                        <Button
                                             variant="outlined"
                                             color="warning"
                                             onClick={handleClosePoll}
                                             loading={saving}
                                        >
                                             {t('polls.btnClosePoll') || 'Close Poll'}
                                        </Button>
                                   )
                              )}
                         </Stack>
                    </Stack>
               </Container>

               {/* Info dialog about how the poll system works */}
               <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>{t('polls.help.title') || 'How the poll system works'}</DialogTitle>
                    <DialogContent dividers>
                         <Stack spacing={1}>
                              <List
                                   component="ol"
                                   sx={{
                                        listStyleType: 'decimal',
                                        pl: 3,
                                        '& .MuiListItem-root': { display: 'list-item', py: 0.5 },
                                   }}
                              >
                                   <ListItem>
                                        <ListItemText
                                             primary={t('polls.help.plurality')}
                                             slotProps={{ primary: { variant: 'body2' } }}
                                        />
                                   </ListItem>
                                   <ListItem>
                                        <ListItemText
                                             primary={t('polls.help.absolute_majority')}
                                             slotProps={{ primary: { variant: 'body2' } }}
                                        />
                                   </ListItem>
                                   <ListItem>
                                        <ListItemText
                                             primary={t('polls.help.supermajority')}
                                             slotProps={{ primary: { variant: 'body2' } }}
                                        />
                                   </ListItem>
                                   <ListItem>
                                        <ListItemText
                                             primary={t('polls.help.threshold')}
                                             slotProps={{ primary: { variant: 'body2' } }}
                                        />
                                   </ListItem>
                                   <ListItem>
                                        <ListItemText
                                             primary={t('polls.help.top_k')}
                                             slotProps={{ primary: { variant: 'body2' } }}
                                        />
                                   </ListItem>
                              </List>
                         </Stack>
                    </DialogContent>
                    <DialogActions>
                         <Button onClick={() => setInfoOpen(false)}>{t('common.btnClose') || 'Close'}</Button>
                    </DialogActions>
               </Dialog>
          </Box >
     );
}
