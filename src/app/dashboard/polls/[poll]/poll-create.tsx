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
import { closePoll, createOrUpdatePoll, reopenPoll } from 'src/app/actions/poll/polls';
import { uploadPollImagesAndGetUrls } from 'src/app/actions/poll/poll-attachments';
import { paths } from 'src/paths';
import { DatePicker, TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import log from 'src/utils/logger';

type Props = {
     clientId: string;
     buildings: Building[];
     poll?: Poll | null;
     options?: PollOption[] | null;
     attachments?: PollAttachment[] | null;
     attachmentsSigned?: { url: string; name?: string }[];
     votes?: PollVote[] | null;
};

export default function PollCreate({
     clientId,
     buildings,
     poll,
     options,
     attachments,
     attachmentsSigned = [],
     votes = [],
}: Props) {
     const { t } = useTranslation();
     const router = useRouter();
     const [saving, setSaving] = useState(false);
     const [uploading, setUploading] = useState(false);
     const [files, setFiles] = useState<File[]>([]);
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
          () => new Map((options || []).map((o) => [o.id, o.label])),
          [options]
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
          initialValues: poll ? poll : pollInitialValues,
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
                         sort_order: typeof r.sort_order === 'number' ? r.sort_order : i,
                    }));
                    const pollInsert = { ...values, options: desiredOptions };
                    const { success, data, error } = await createOrUpdatePoll(pollInsert);
                    if (!success || !data) throw new Error(error || 'Failed to create poll');
                    toast.success(t('common.actionSaveSuccess'));
                    router.push(`${paths.dashboard.polls.index}/${data.id}`);
               } catch (e: any) {
                    toast.error(e.message || 'Error');
               } finally {
                    setSaving(false);
               }
          },
     });

     const isFormLocked = formik.isSubmitting || !!poll?.closed_at || (poll?.status && poll.status !== 'draft' && poll.status !== 'active');

     const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const fs = Array.from(e.target.files || []);
          setFiles(fs);
     };

     const uploadAttachments = async () => {
          if (!files.length) return;
          if (!poll?.id) {
               toast.error(t('common.actionSaveError') || 'Save poll first');
               return;
          }
          setUploading(true);
          try {
               const pollId = poll?.id as string;
               const { success, error } = await uploadPollImagesAndGetUrls(
                    files,
                    formik.values.client_id,
                    pollId
               );
               if (!success) throw new Error(error || 'Upload failed');
               toast.success(t('common.actionUploadSuccess') || 'Uploaded');
               setFiles([]);
          } catch (e: any) {
               toast.error(e.message || 'Upload error');
          } finally {
               setUploading(false);
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
                              <Grid size={{ xs: 12, md: 8 }}>
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
                                                       <Stack direction="row" spacing={2}>
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
                                                       </Stack>
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
                                                            label={t('polls.supermajorityPercent') || 'Supermajority %'}
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
                                                            label={t('polls.thresholdPercent') || 'Threshold %'}
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
                                                            label={t('polls.winnersCount') || 'Winners count'}
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
                                                  {formik.values?.options.length !== 0 ? formik.values.options.map((r, idx) => {
                                                       const base = `options[${idx}]`;
                                                       return (
                                                            <Stack
                                                                 key={`${r.label ?? 'opt'}-${idx}`}
                                                                 direction="row"
                                                                 spacing={1}
                                                                 alignItems="center"
                                                            >
                                                                 <TextField
                                                                      disabled={isFormLocked}
                                                                      size="small"
                                                                      name={`${base}.label`}
                                                                      label={t('polls.optionLabel') || 'Label'}
                                                                      value={r.label}
                                                                      onChange={(e) => {
                                                                           formik.setFieldValue(`${base}.label`, e.target.value);
                                                                      }}
                                                                      onBlur={formik.handleBlur}
                                                                 />
                                                                 <TextField
                                                                      disabled={isFormLocked}
                                                                      size="small"
                                                                      name={`${base}.sort_order`}
                                                                      type="text"
                                                                      slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
                                                                      onKeyDown={allowIntegerKeyDown}
                                                                      label={t('polls.sortOrder') || 'Order'}
                                                                      value={r.sort_order}
                                                                      onChange={(e) => {
                                                                           const v = coerceInt(e.target.value) ?? idx;
                                                                           formik.setFieldValue(`${base}.sort_order`, v);
                                                                      }}
                                                                      onBlur={formik.handleBlur}
                                                                      {...fe(`${base}.sort_order`)}
                                                                 />
                                                                 <Button
                                                                      disabled={isFormLocked}
                                                                      color="error"
                                                                      variant="outlined"
                                                                      onClick={() =>
                                                                           formik.setFieldValue(
                                                                                'options',
                                                                                formik.values.options.filter((_, i) => i !== idx)
                                                                           )
                                                                      }
                                                                 >
                                                                      {t('common.btnDelete')}
                                                                 </Button>
                                                            </Stack>
                                                       );
                                                  })
                                                       : (
                                                            <Typography variant="body2" color="text.secondary">
                                                                 {t('polls.noOptions') || 'No options available'}
                                                            </Typography>
                                                       )}
                                                  <Button
                                                       disabled={isFormLocked}
                                                       onClick={() =>
                                                            formik.setFieldValue('options', [
                                                                 ...formik.values.options,
                                                                 { label: '', sort_order: formik.values.options.length },
                                                            ])
                                                       }
                                                       sx={{
                                                            width: '150px'
                                                       }}
                                                  >
                                                       {t('polls.addOption') || 'Add option'}
                                                  </Button>

                                                  {getIn(formik.touched, 'options') && getIn(formik.errors, 'options') && (
                                                       <Typography variant="caption" color="error">
                                                            {String(getIn(JSON.stringify(formik.errors), 'options'))}
                                                       </Typography>
                                                  )}
                                             </Stack>
                                        </CardContent>
                                   </Card>
                              </Grid>

                              {/* Current votes table */}
                              <Grid size={{ xs: 12, md: 4 }}>
                                   <Card>
                                        <CardHeader title={t('polls.votesList') || 'Votes'} />
                                        <Divider />
                                        <CardContent>
                                             <Stack spacing={1}>
                                                  <Typography variant="subtitle2">{(votes?.length || 0)} votes</Typography>
                                                  <Table size="small">
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
                                             </Stack>
                                        </CardContent>
                                   </Card>
                              </Grid>
                         </Grid>

                         <Card>
                              <CardHeader title={t('polls.attachments') || 'Attachments'} />
                              <Divider />
                              <CardContent>
                                   <Stack spacing={2}>
                                        {!!attachmentsSigned.length && (
                                             <Stack spacing={1}>
                                                  <Typography variant="subtitle2">
                                                       {t('polls.existingAttachments') || 'Existing attachments'}
                                                  </Typography>
                                                  <Stack spacing={1}>
                                                       {attachmentsSigned.map((a, i) => (
                                                            <a key={i} href={a.url} target="_blank" rel="noreferrer">
                                                                 {a.name || a.url}
                                                            </a>
                                                       ))}
                                                  </Stack>
                                             </Stack>
                                        )}
                                        <Button
                                             variant="outlined"
                                             component="label"
                                             disabled={isFormLocked}
                                             sx={{ width: '150px' }}
                                        >
                                             {t('polls.selectFiles') || 'Select files'}
                                             <input
                                                  type="file"
                                                  multiple
                                                  hidden
                                                  onChange={handleFileChange}
                                             />
                                        </Button>
                                        <Button
                                             variant="outlined"
                                             onClick={uploadAttachments}
                                             disabled={!files.length || isFormLocked}
                                             loading={uploading}
                                             sx={{
                                                  width: '150px'
                                             }}
                                        >
                                             {t('common.btnUpload') || 'Upload'}
                                        </Button>
                                   </Stack>
                              </CardContent>
                         </Card>

                         <Stack direction="row" spacing={2} justifyContent="flex-start" sx={{ mb: 2 }}>
                              <Button variant="outlined" onClick={() => router.push(paths.dashboard.polls.index)}>
                                   {t('common.btnBack') || 'Back'}
                              </Button>
                              <Button
                                   variant="contained"
                                   type="submit"
                                   loading={saving}
                                   disabled={formik.isSubmitting || !formik.dirty || !formik.isValid}
                              >
                                   {t('common.btnSave')}
                              </Button>

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
