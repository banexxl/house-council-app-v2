'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
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
} from '@mui/material';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import { Building } from 'src/types/building';
import { Poll, PollInsert, PollOption, PollOptionInsert, PollType, ScoreAgg, DecisionRule, PollAttachment, buildPollValidationSchema, NewPollForm } from 'src/types/poll';
import { createPoll, updatePoll, closePoll } from 'src/app/actions/poll/polls';
import { createPollOption, updatePollOption, deletePollOption } from 'src/app/actions/poll/poll-options';
import { uploadPollImagesAndGetUrls } from 'src/app/actions/poll/poll-attachments';
import { paths } from 'src/paths';
import { DatePicker, TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

type Props = {
     clientId: string;
     buildings: Building[];
     poll?: Poll | null;
     options?: PollOption[] | null;
     attachments?: PollAttachment[] | null;
     attachmentsSigned?: { url: string; name?: string }[];
};

type OptRow = { id?: string; label: string; sort_order: number };

const decisionRules: (DecisionRule | '')[] = ['', 'plurality', 'absolute_majority', 'supermajority', 'threshold', 'top_k'];
const scoreAggs: (ScoreAgg | '')[] = ['', 'sum', 'avg'];

export default function PollCreate({ clientId, buildings, poll, options, attachments, attachmentsSigned = [] }: Props) {
     const { t } = useTranslation();
     const router = useRouter();
     const isEdit = !!poll?.id;
     const [saving, setSaving] = useState(false);
     const [uploading, setUploading] = useState(false);
     const [files, setFiles] = useState<File[]>([]);

     const buildingOptions = useMemo(() => buildings.map(b => ({ id: (b as any).id, name: (b as any).name, loc: (b as any).building_location })), [buildings]);

     const initialOptions: OptRow[] = useMemo(() => {
          const base = (options ?? [])
               .map(o => ({ id: o.id, label: o.label, sort_order: o.sort_order }))
               .sort((a, b) => a.sort_order - b.sort_order);
          if (!base.length && (poll?.type || 'yes_no') === 'yes_no') {
               return [
                    { label: t('common.lblYes') || 'Yes', sort_order: 1 },
                    { label: t('common.lblNo') || 'No', sort_order: 2 },
               ];
          }
          return base;
     }, [options, poll?.type, t]);

     const formik = useFormik<NewPollForm & { options: OptRow[] }>({
          initialValues: {
               client_id: poll?.client_id || clientId,
               building_id: poll?.building_id || ((buildings[0] as any)?.id ?? ''),
               type: (poll?.type as PollType) || 'yes_no',
               title: poll?.title || '',
               description: (poll?.description as any) || '',
               allow_change_until_deadline: poll?.allow_change_until_deadline ?? false,
               allow_abstain: poll?.allow_abstain ?? true,
               allow_comments: poll?.allow_comments ?? true,
               allow_anonymous: poll?.allow_anonymous ?? false,
               options: initialOptions,
               max_choices: poll?.max_choices ?? undefined,
               rule: poll?.rule ?? null,
               supermajority_percent: poll?.supermajority_percent ?? null,
               threshold_percent: poll?.threshold_percent ?? null,
               winners_count: poll?.winners_count ?? null,
               score_aggregation: poll?.score_aggregation ?? null,
               starts_at: poll?.starts_at ?? null,
               ends_at: poll?.ends_at ?? null,
               activate_now: false,
          },
          validationSchema: buildPollValidationSchema(t),
          onSubmit: async (values) => {
               setSaving(true);
               try {
                    if (!isEdit) {
                         const pollInsert: Poll = {
                              id: undefined as any,
                              client_id: values.client_id,
                              building_id: values.building_id,
                              type: values.type,
                              title: values.title,
                              description: values.description || null,
                              max_choices: (values.max_choices as any) ?? null,
                              allow_change_until_deadline: values.allow_change_until_deadline,
                              allow_abstain: values.allow_abstain,
                              allow_comments: values.allow_comments,
                              allow_anonymous: values.allow_anonymous,
                              rule: (values.rule as any) ?? null,
                              supermajority_percent: (values.supermajority_percent as any) ?? null,
                              threshold_percent: (values.threshold_percent as any) ?? null,
                              winners_count: (values.winners_count as any) ?? null,
                              score_aggregation: (values.score_aggregation as any) ?? null,
                              starts_at: values.starts_at ?? null,
                              ends_at: values.ends_at ?? null,
                              status: 'draft' as any,
                              created_at: undefined as any,
                              closed_at: null,
                              created_by: clientId
                         };
                         const { success, data, error } = await createPoll(pollInsert);
                         if (!success || !data) throw new Error(error || 'Failed to create poll');
                         const pollId = data.id;
                         for (const [i, r] of values.options.entries()) {
                              const row: PollOptionInsert = { poll_id: pollId, label: r.label, sort_order: r.sort_order || i + 1 } as any;
                              await createPollOption(row);
                         }
                         toast.success(t('common.actionSaveSuccess'));
                         router.push(`${paths.dashboard.polls.index}`);
                    } else {
                         const { client_id, building_id, activate_now, options: optVals, ...rest } = values as any;
                         const { success, error } = await updatePoll(poll!.id, rest);
                         if (!success) throw new Error(error || 'Failed to update poll');
                         const original = new Map((options || []).map(o => [o.id, o]));
                         const currentIds = new Set<string>();
                         for (const [i, r] of (optVals as OptRow[]).entries()) {
                              if (r.id && original.has(r.id)) {
                                   currentIds.add(r.id);
                                   const prev = original.get(r.id)!;
                                   if (prev.label !== r.label || prev.sort_order !== (r.sort_order || i + 1)) {
                                        await updatePollOption(r.id, { label: r.label, sort_order: r.sort_order || i + 1 });
                                   }
                              } else {
                                   await createPollOption({ poll_id: poll!.id, label: r.label, sort_order: r.sort_order || i + 1 } as any);
                              }
                         }
                         for (const [id] of original) {
                              if (!currentIds.has(id)) await deletePollOption(id);
                         }
                         toast.success(t('common.actionSaveSuccess'));
                    }
               } catch (e: any) {
                    toast.error(e.message || 'Error');
               } finally {
                    setSaving(false);
               }
          },
     });

     const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const fs = Array.from(e.target.files || []);
          setFiles(fs);
     };

     const uploadAttachments = async () => {
          if (!files.length) return;
          if (!isEdit && !poll?.id) {
               toast.error(t('common.actionSaveError') || 'Save poll first');
               return;
          }
          setUploading(true);
          try {
               const pollId = (poll?.id) as string;
               const { success, error } = await uploadPollImagesAndGetUrls(files, formik.values.client_id, pollId);
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
          if (!isEdit) return;
          setSaving(true);
          try {
               const { success, error } = await closePoll(poll!.id);
               if (!success) throw new Error(error || 'Failed to close poll');
               toast.success(t('polls.closed') || 'Poll closed');
          } catch (e: any) {
               toast.error(e.message || 'Error');
          } finally {
               setSaving(false);
          }
     };

     const canConfigureMaxChoices = formik.values.type === 'multiple_choice';

     // Integer-only input helpers for numeric-only fields
     const allowIntegerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
          const allowedKeys = [
               'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'
          ];
          if (
               allowedKeys.includes(e.key) ||
               // Allow: Ctrl/cmd+A/C/V/X
               ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x', 'A', 'C', 'V', 'X'].includes(e.key))
          ) {
               return;
          }
          // Block non-digits
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
                         <Typography variant="h4">{isEdit ? (t('polls.editTitle') || 'Edit Poll') : (t('polls.createTitle') || 'Create Poll')}</Typography>

                         <Card>
                              <CardHeader title={t('polls.details') || 'Details'} />
                              <Divider />
                              <CardContent>
                                   <Grid container spacing={2}>
                                        <Grid size={{ xs: 12 }}>
                                             <TextField fullWidth name="title" label={t('polls.title') || 'Title'} value={formik.values.title} onChange={formik.handleChange}
                                                  error={!!(formik.touched.title && formik.errors.title)} helperText={formik.touched.title && (formik.errors.title as any)} />
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                             <TextField fullWidth name="description" label={t('polls.description') || 'Description'} multiline minRows={3}
                                                  value={formik.values.description || ''} onChange={formik.handleChange} />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }} >
                                             <FormControl fullWidth>
                                                  <InputLabel>{t('polls.type') || 'Type'}</InputLabel>
                                                  <Select name="type" label={t('polls.type') || 'Type'} value={formik.values.type} onChange={formik.handleChange}>
                                                       <MenuItem value={'yes_no'}>Yes/No</MenuItem>
                                                       <MenuItem value={'single_choice'}>Single Choice</MenuItem>
                                                       <MenuItem value={'multiple_choice'}>Multiple Choice</MenuItem>
                                                       <MenuItem value={'ranked_choice'}>Ranked Choice</MenuItem>
                                                       <MenuItem value={'score'}>Score</MenuItem>
                                                  </Select>
                                             </FormControl>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }} >
                                             <FormControl fullWidth>
                                                  <InputLabel>{t('polls.building') || 'Building'}</InputLabel>
                                                  <Select name="building_id" label={t('polls.building') || 'Building'} value={formik.values.building_id} onChange={formik.handleChange}>
                                                       {buildingOptions.map(b => (
                                                            <MenuItem key={b.id} value={b.id}>
                                                                 {b.name || `${b.loc?.city || ''} ${b.loc?.street_address || ''}`}
                                                            </MenuItem>
                                                       ))}
                                                  </Select>
                                             </FormControl>
                                        </Grid>

                                        {canConfigureMaxChoices && (
                                             <Grid size={{ xs: 12, sm: 6 }} >
                                                  <TextField
                                                       type="text"
                                                       slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
                                                       onKeyDown={allowIntegerKeyDown}
                                                       fullWidth
                                                       name="max_choices"
                                                       label={t('polls.maxChoices') || 'Max choices'}
                                                       value={formik.values.max_choices ?? ''}
                                                       onChange={(e) => formik.setFieldValue('max_choices', coerceInt(e.target.value))}
                                                  />
                                             </Grid>
                                        )}

                                        <Grid size={{ xs: 12 }}>
                                             <Stack direction="row" spacing={2}>
                                                  <FormControlLabel control={<Switch checked={!!formik.values.allow_abstain} onChange={e => formik.setFieldValue('allow_abstain', e.target.checked)} />} label={t('polls.allowAbstain') || 'Allow abstain'} />
                                                  <FormControlLabel control={<Switch checked={!!formik.values.allow_comments} onChange={e => formik.setFieldValue('allow_comments', e.target.checked)} />} label={t('polls.allowComments') || 'Allow comments'} />
                                                  <FormControlLabel control={<Switch checked={!!formik.values.allow_anonymous} onChange={e => formik.setFieldValue('allow_anonymous', e.target.checked)} />} label={t('polls.allowAnonymous') || 'Allow anonymous'} />
                                                  <FormControlLabel control={<Switch checked={!!formik.values.allow_change_until_deadline} onChange={e => formik.setFieldValue('allow_change_until_deadline', e.target.checked)} />} label={t('polls.allowChangeUntilDeadline') || 'Allow change until deadline'} />
                                             </Stack>
                                        </Grid>

                                        <Grid size={{ xs: 12 }}>
                                             <Typography variant="subtitle2">{t('polls.advanced') || 'Advanced'}</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }} >
                                             <FormControl fullWidth>
                                                  <InputLabel>{t('polls.decisionRule') || 'Decision rule'}</InputLabel>
                                                  <Select name="rule" label={t('polls.decisionRule') || 'Decision rule'} value={(formik.values.rule || '') as any}
                                                       onChange={e => formik.setFieldValue('rule', (e.target.value || null) as any)}>
                                                       {decisionRules.map(r => (
                                                            <MenuItem key={r || 'empty'} value={r}>{r || '-'}</MenuItem>
                                                       ))}
                                                  </Select>
                                             </FormControl>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }} >
                                             <FormControl fullWidth>
                                                  <InputLabel>{t('polls.scoreAggregation') || 'Score aggregation'}</InputLabel>
                                                  <Select name="score_aggregation" label={t('polls.scoreAggregation') || 'Score aggregation'} value={(formik.values.score_aggregation || '') as any}
                                                       onChange={e => formik.setFieldValue('score_aggregation', (e.target.value || null) as any)}>
                                                       {scoreAggs.map(s => (
                                                            <MenuItem key={s || 'empty'} value={s}>{s || '-'}</MenuItem>
                                                       ))}
                                                  </Select>
                                             </FormControl>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }} >
                                             <TextField
                                                  label={t('polls.supermajorityPercent') || 'Supermajority %'}
                                                  fullWidth
                                                  type='number'
                                                  value={formik.values.supermajority_percent ?? ''}
                                                  slotProps={{
                                                       htmlInput: {
                                                            inputMode: 'numeric',     // brings up numeric keypad on mobile
                                                            pattern: '[0-9]*',     // hints allowed chars
                                                            max: 100,
                                                            min: 0,
                                                       }
                                                  }}
                                                  onChange={e => {
                                                       const val = e.target.value;
                                                       // Allow only digits
                                                       if (/^\d*$/.test(val)) {
                                                            formik.setFieldValue(
                                                                 'supermajority_percent',
                                                                 val === '' ? null : Number(val)
                                                            );
                                                       }
                                                  }}
                                                  onBlur={
                                                       (e: React.FocusEvent<HTMLInputElement>) => {
                                                            const val = formik.values.supermajority_percent;
                                                            if (val !== null && val !== undefined) {
                                                                 if (val < 0) {
                                                                      formik.setFieldValue('supermajority_percent', 0);
                                                                 } else if (val > 100) {
                                                                      formik.setFieldValue('supermajority_percent', 100);
                                                                 }
                                                            }
                                                       }
                                                  }
                                             />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }} >
                                             <TextField
                                                  label={t('polls.thresholdPercent') || 'Threshold %'}
                                                  fullWidth
                                                  type='number'
                                                  value={formik.values.threshold_percent ?? ''}
                                                  slotProps={{
                                                       htmlInput: {
                                                            inputMode: 'numeric',
                                                            pattern: '[0-9]*',
                                                            max: 100,
                                                            min: 0,
                                                       }
                                                  }}
                                                  onChange={e => {
                                                       const val = e.target.value;
                                                       if (/^\d*$/.test(val)) {
                                                            formik.setFieldValue(
                                                                 'threshold_percent',
                                                                 val === '' ? null : Number(val)
                                                            );
                                                       }
                                                  }}
                                                  onBlur={
                                                       (e: React.FocusEvent<HTMLInputElement>) => {
                                                            const val = formik.values.threshold_percent;
                                                            if (val !== null && val !== undefined) {
                                                                 if (val < 0) {
                                                                      formik.setFieldValue('threshold_percent', 0);
                                                                 } else if (val > 100) {
                                                                      formik.setFieldValue('threshold_percent', 100);
                                                                 }
                                                            }
                                                       }
                                                  }
                                             />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }} >
                                             <TextField
                                                  type="text"
                                                  slotProps={{
                                                       htmlInput: {
                                                            inputMode: 'numeric',
                                                            pattern: '[0-9]*',
                                                            max: 100,
                                                            min: 0,
                                                       }
                                                  }}
                                                  onKeyDown={allowIntegerKeyDown}
                                                  fullWidth
                                                  label={t('polls.winnersCount') || 'Winners count'}
                                                  value={formik.values.winners_count ?? ''}
                                                  onChange={e => formik.setFieldValue('winners_count', coerceInt(e.target.value))}
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
                                                       label={t('polls.startsAt') || 'Starts at'}
                                                       value={formik.values.starts_at ? dayjs(formik.values.starts_at) : null}
                                                       onChange={(newDate) => {
                                                            const current = formik.values.starts_at ? dayjs(formik.values.starts_at) : null;
                                                            const base = newDate || current;
                                                            const timeRef = current || newDate || null;
                                                            const composed = base && timeRef ? base.hour(timeRef.hour()).minute(timeRef.minute()).second(0).millisecond(0).format('YYYY-MM-DDTHH:mm:ss') : null;
                                                            formik.setFieldValue('starts_at', composed);
                                                       }}
                                                  />
                                                  <TimePicker
                                                       label={t('polls.startsAt') || 'Starts at'}
                                                       value={formik.values.starts_at ? dayjs(formik.values.starts_at) : null}
                                                       onChange={(newTime) => {
                                                            const current = formik.values.starts_at ? dayjs(formik.values.starts_at) : null;
                                                            const base = current || newTime;
                                                            const timeRef = newTime || current || null;
                                                            const composed = base && timeRef ? base.hour(timeRef.hour()).minute(timeRef.minute()).second(0).millisecond(0).format('YYYY-MM-DDTHH:mm:ss') : null;
                                                            formik.setFieldValue('starts_at', composed);
                                                       }}
                                                  />
                                             </Stack>
                                        </LocalizationProvider>

                                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                             <Stack direction="row" spacing={2}>
                                                  <DatePicker
                                                       label={t('polls.endsAt') || 'Ends at'}
                                                       value={formik.values.ends_at ? dayjs(formik.values.ends_at) : null}
                                                       onChange={(newDate) => {
                                                            const current = formik.values.ends_at ? dayjs(formik.values.ends_at) : null;
                                                            const base = newDate || current;
                                                            const timeRef = current || newDate || null;
                                                            const composed = base && timeRef ? base.hour(timeRef.hour()).minute(timeRef.minute()).second(0).millisecond(0).format('YYYY-MM-DDTHH:mm:ss') : null;
                                                            formik.setFieldValue('ends_at', composed);
                                                       }}
                                                  />
                                                  <TimePicker
                                                       label={t('polls.endsAt') || 'Ends at'}
                                                       value={formik.values.ends_at ? dayjs(formik.values.ends_at) : null}
                                                       onChange={(newTime) => {
                                                            const current = formik.values.ends_at ? dayjs(formik.values.ends_at) : null;
                                                            const base = current || newTime;
                                                            const timeRef = newTime || current || null;
                                                            const composed = base && timeRef ? base.hour(timeRef.hour()).minute(timeRef.minute()).second(0).millisecond(0).format('YYYY-MM-DDTHH:mm:ss') : null;
                                                            formik.setFieldValue('ends_at', composed);
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
                                        {formik.values.options.map((r, idx) => (
                                             <Stack key={r.label || idx} direction="row" spacing={1} alignItems="center">
                                                  <TextField size="small" label={t('polls.optionLabel') || 'Label'} value={r.label}
                                                       onChange={e => formik.setFieldValue('options', formik.values.options.map((x, i) => i === idx ? { ...x, label: e.target.value } : x))} />
                                                  <TextField
                                                       size="small"
                                                       type="text"
                                                       inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                       onKeyDown={allowIntegerKeyDown}
                                                       label={t('polls.sortOrder') || 'Order'}
                                                       value={r.sort_order}
                                                       onChange={e => {
                                                            const v = coerceInt(e.target.value) ?? (idx + 1);
                                                            formik.setFieldValue('options', formik.values.options.map((x, i) => i === idx ? { ...x, sort_order: v } : x))
                                                       }}
                                                  />
                                                  <Button color="error" variant="outlined" onClick={() => formik.setFieldValue('options', formik.values.options.filter((_, i) => i !== idx))}>{t('common.btnDelete')}</Button>
                                             </Stack>
                                        ))}
                                        <Button onClick={() => formik.setFieldValue('options', [...formik.values.options, { label: '', sort_order: (formik.values.options.length + 1) }])}>{t('polls.addOption') || 'Add option'}</Button>
                                   </Stack>
                              </CardContent>
                         </Card>

                         <Card>
                              <CardHeader title={t('polls.attachments') || 'Attachments'} />
                              <Divider />
                              <CardContent>
                                   <Stack spacing={2}>
                                        {!!attachmentsSigned.length && (
                                             <Stack spacing={1}>
                                                  <Typography variant="subtitle2">{t('polls.existingAttachments') || 'Existing attachments'}</Typography>
                                                  <Stack spacing={1}>
                                                       {attachmentsSigned.map((a, i) => (
                                                            <a key={i} href={a.url} target="_blank" rel="noreferrer">
                                                                 {a.name || a.url}
                                                            </a>
                                                       ))}
                                                  </Stack>
                                             </Stack>
                                        )}
                                        <input type="file" multiple onChange={handleFileChange} />
                                        <Button variant="outlined" onClick={uploadAttachments} disabled={!files.length} loading={uploading}>
                                             {t('common.btnUpload') || 'Upload'}
                                        </Button>
                                   </Stack>
                              </CardContent>
                         </Card>

                         <Stack direction="row" spacing={2} justifyContent="space-between" sx={{ mb: 2 }}>
                              <Button variant="outlined" onClick={() => router.back()}>{t('common.btnBack') || 'Back'}</Button>
                              <Typography>
                                   {JSON.stringify(formik.errors) /* For debugging purposes */}
                              </Typography>
                              <Button
                                   variant="contained"
                                   type="submit"
                                   loading={saving}
                                   disabled={formik.dirty === false || !formik.isValid}
                              >
                                   {t('common.btnSave')}
                              </Button>
                              {isEdit &&
                                   <Button
                                        variant="outlined"
                                        color="warning"
                                        onClick={handleClosePoll}
                                        loading={saving}>
                                        {t('polls.btnClosePoll') || 'Close Poll'}
                                   </Button>}
                         </Stack>
                    </Stack>
               </Container>
          </Box>
     );
}
