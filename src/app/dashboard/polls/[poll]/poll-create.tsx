'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
     Link,
     MenuItem,
     Select,
     Stack,
     SvgIcon,
     Switch,
     TextField,
     Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import { Building } from 'src/types/building';
import { Poll, PollInsert, PollOption, PollOptionInsert, PollType, ScoreAgg, DecisionRule, PollAttachment, buildPollValidationSchema, NewPollForm } from 'src/types/poll';
import { createPoll, updatePoll, closePoll } from 'src/app/actions/poll/polls';
import { createPollOption, updatePollOption, deletePollOption } from 'src/app/actions/poll/poll-options';
import { uploadPollImagesAndGetUrls } from 'src/app/actions/poll/poll-attachments';
import { paths } from 'src/paths';
import { RouterLink } from 'src/components/router-link';

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

     const [form, setForm] = useState<PollInsert>(() => ({
          id: poll?.id,
          client_id: poll?.client_id || clientId,
          building_id: poll?.building_id || (buildings[0]?.id as any) || '',
          type: poll?.type || 'yes_no',
          title: poll?.title || '',
          description: (poll?.description as any) || '',
          max_choices: poll?.max_choices ?? null,
          allow_change_until_deadline: poll?.allow_change_until_deadline ?? false,
          allow_abstain: poll?.allow_abstain ?? true,
          allow_comments: poll?.allow_comments ?? true,
          allow_anonymous: poll?.allow_anonymous ?? false,
          rule: poll?.rule ?? null,
          supermajority_percent: poll?.supermajority_percent ?? null,
          threshold_percent: poll?.threshold_percent ?? null,
          winners_count: poll?.winners_count ?? null,
          score_aggregation: poll?.score_aggregation ?? null,
          starts_at: poll?.starts_at ?? null,
          ends_at: poll?.ends_at ?? null,
          status: poll?.status ?? 'draft',
          created_at: poll?.created_at,
          closed_at: poll?.closed_at ?? null,
     } as any));

     const [optRows, setOptRows] = useState<OptRow[]>(() => {
          const rows = (options ?? [])
               .map(o => ({ id: o.id, label: o.label, sort_order: o.sort_order }))
               .sort((a, b) => a.sort_order - b.sort_order);
          if (!rows.length && form.type === 'yes_no') {
               return [
                    { label: t('common.lblYes') || 'Yes', sort_order: 1 },
                    { label: t('common.lblNo') || 'No', sort_order: 2 },
               ];
          }
          return rows;
     });

     const buildingOptions = useMemo(() => buildings.map(b => ({ id: (b as any).id, name: (b as any).name, loc: (b as any).building_location })), [buildings]);

     const onChange = (patch: Partial<PollInsert>) => setForm(f => ({ ...f, ...patch }));

     const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const fs = Array.from(e.target.files || []);
          setFiles(fs);
     };

     const canConfigureMaxChoices = form.type === 'multiple_choice';
     const needRule = form.type !== 'ranked_choice' && form.type !== 'yes_no' && form.type !== 'single_choice' ? true : false;

     const save = async () => {
          setSaving(true);
          try {
               // Validate using Yup schema
               const validationData: NewPollForm = {
                    client_id: form.client_id,
                    building_id: form.building_id,
                    type: form.type,
                    title: form.title,
                    description: form.description || '',
                    allow_change_until_deadline: !!form.allow_change_until_deadline,
                    allow_abstain: !!form.allow_abstain,
                    allow_comments: !!form.allow_comments,
                    allow_anonymous: !!form.allow_anonymous,
                    options: optRows.map((o, i) => ({ label: o.label, sort_order: o.sort_order || i + 1 })),
                    max_choices: form.max_choices ?? undefined,
                    rule: (form.rule ?? undefined) as any,
                    supermajority_percent: form.supermajority_percent ?? undefined,
                    threshold_percent: form.threshold_percent ?? undefined,
                    winners_count: form.winners_count ?? undefined,
                    score_aggregation: (form.score_aggregation ?? undefined) as any,
                    starts_at: form.starts_at ?? undefined,
                    ends_at: form.ends_at ?? undefined,
                    activate_now: false,
               };
               await buildPollValidationSchema(t).validate(validationData, { abortEarly: true });
               if (!isEdit) {
                    const { success, data, error } = await createPoll(form);
                    if (!success || !data) throw new Error(error || 'Failed to create poll');
                    const pollId = data.id;
                    // Save options
                    for (const [i, r] of optRows.entries()) {
                         const row: PollOptionInsert = { poll_id: pollId, label: r.label, sort_order: r.sort_order || i + 1 } as any;
                         await createPollOption(row);
                    }
                    toast.success(t('common.actionSaveSuccess'));
                    router.push(`${paths.dashboard.polls.index}`);
               } else {
                    const { id, client_id, building_id, created_at, closed_at, ...updatePayload } = form as any;
                    const { success, error } = await updatePoll(poll!.id, updatePayload);
                    if (!success) throw new Error(error || 'Failed to update poll');
                    // Diff options: create new, update existing, delete removed
                    const original = new Map((options || []).map(o => [o.id, o]));
                    const currentIds = new Set<string>();
                    for (const [i, r] of optRows.entries()) {
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
     };

     const uploadAttachments = async () => {
          if (!files.length) return;
          if (!isEdit && !form.id) {
               toast.error(t('common.actionSaveError') || 'Save poll first');
               return;
          }
          setUploading(true);
          try {
               const pollId = (poll?.id || (form as any).id) as string;
               const { success, error } = await uploadPollImagesAndGetUrls(files, form.client_id, pollId);
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

     return (
          <Box component="main" sx={{ flexGrow: 1, mb: 2 }}>
               <Container maxWidth="lg">
                    <Stack spacing={3}>
                         <Box>
                              <Link
                                   color="text.primary"
                                   component={RouterLink}
                                   href={paths.dashboard.tenants.index}
                                   sx={{
                                        alignItems: 'center',
                                        display: 'inline-flex',
                                   }}
                                   underline="hover"
                              >
                                   <SvgIcon sx={{ mr: 1 }}>
                                        <ArrowBackIcon />
                                   </SvgIcon>
                                   <Typography variant="subtitle2">{t('polls.listTitle')}</Typography>
                              </Link>
                         </Box>
                         <Typography variant="h4">{isEdit ? (t('polls.editTitle') || 'Edit Poll') : (t('polls.createTitle') || 'Create Poll')}</Typography>

                         <Card>
                              <CardHeader title={t('polls.details') || 'Details'} />
                              <Divider />
                              <CardContent>
                                   <Grid container spacing={2}>
                                        <Grid size={{ xs: 12 }}>
                                             <TextField fullWidth label={t('polls.title') || 'Title'} value={form.title}
                                                  onChange={e => onChange({ title: e.target.value })} />
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                             <TextField fullWidth label={t('polls.description') || 'Description'} multiline minRows={3}
                                                  value={form.description || ''} onChange={e => onChange({ description: e.target.value })} />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                             <FormControl fullWidth>
                                                  <InputLabel>{t('polls.type') || 'Type'}</InputLabel>
                                                  <Select label={t('polls.type') || 'Type'} value={form.type}
                                                       onChange={e => onChange({ type: e.target.value as PollType })}>
                                                       <MenuItem value={'yes_no'}>Yes/No</MenuItem>
                                                       <MenuItem value={'single_choice'}>Single Choice</MenuItem>
                                                       <MenuItem value={'multiple_choice'}>Multiple Choice</MenuItem>
                                                       <MenuItem value={'ranked_choice'}>Ranked Choice</MenuItem>
                                                       <MenuItem value={'score'}>Score</MenuItem>
                                                  </Select>
                                             </FormControl>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                             <FormControl fullWidth>
                                                  <InputLabel>{t('polls.building') || 'Building'}</InputLabel>
                                                  <Select label={t('polls.building') || 'Building'} value={form.building_id}
                                                       onChange={e => onChange({ building_id: e.target.value as string })}>
                                                       {buildingOptions.map(b => (
                                                            <MenuItem key={b.id} value={b.id}>
                                                                 {b.name || `${b.loc?.city || ''} ${b.loc?.street_address || ''}`}
                                                            </MenuItem>
                                                       ))}
                                                  </Select>
                                             </FormControl>
                                        </Grid>

                                        {canConfigureMaxChoices && (
                                             <Grid size={{ xs: 12, sm: 6 }}>
                                                  <TextField type="number" fullWidth label={t('polls.maxChoices') || 'Max choices'}
                                                       value={form.max_choices ?? ''}
                                                       onChange={e => onChange({ max_choices: e.target.value === '' ? null : Number(e.target.value) })}
                                                  />
                                             </Grid>
                                        )}

                                        <Grid size={{ xs: 12 }}>
                                             <Stack direction="row" spacing={2}>
                                                  <FormControlLabel control={<Switch checked={!!form.allow_abstain} onChange={e => onChange({ allow_abstain: e.target.checked })} />} label={t('polls.allowAbstain') || 'Allow abstain'} />
                                                  <FormControlLabel control={<Switch checked={!!form.allow_comments} onChange={e => onChange({ allow_comments: e.target.checked })} />} label={t('polls.allowComments') || 'Allow comments'} />
                                                  <FormControlLabel control={<Switch checked={!!form.allow_anonymous} onChange={e => onChange({ allow_anonymous: e.target.checked })} />} label={t('polls.allowAnonymous') || 'Allow anonymous'} />
                                                  <FormControlLabel control={<Switch checked={!!form.allow_change_until_deadline} onChange={e => onChange({ allow_change_until_deadline: e.target.checked })} />} label={t('polls.allowChangeUntilDeadline') || 'Allow change until deadline'} />
                                             </Stack>
                                        </Grid>

                                        {/* Advanced config */}
                                        <Grid size={{ xs: 12 }}>
                                             <Typography variant="subtitle2">{t('polls.advanced') || 'Advanced'}</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                             <FormControl fullWidth>
                                                  <InputLabel>{t('polls.decisionRule') || 'Decision rule'}</InputLabel>
                                                  <Select label={t('polls.decisionRule') || 'Decision rule'} value={(form.rule || '') as any}
                                                       onChange={e => onChange({ rule: (e.target.value || null) as any })}>
                                                       {decisionRules.map(r => (
                                                            <MenuItem key={r || 'empty'} value={r}>{r || '-'}</MenuItem>
                                                       ))}
                                                  </Select>
                                             </FormControl>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                             <FormControl fullWidth>
                                                  <InputLabel>{t('polls.scoreAggregation') || 'Score aggregation'}</InputLabel>
                                                  <Select label={t('polls.scoreAggregation') || 'Score aggregation'} value={(form.score_aggregation || '') as any}
                                                       onChange={e => onChange({ score_aggregation: (e.target.value || null) as any })}>
                                                       {scoreAggs.map(s => (
                                                            <MenuItem key={s || 'empty'} value={s}>{s || '-'}</MenuItem>
                                                       ))}
                                                  </Select>
                                             </FormControl>
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 4 }}>
                                             <TextField type="number" fullWidth label={t('polls.supermajorityPercent') || 'Supermajority %'}
                                                  value={form.supermajority_percent ?? ''}
                                                  onChange={e => onChange({ supermajority_percent: e.target.value === '' ? null : Number(e.target.value) })}
                                             />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 4 }}>
                                             <TextField type="number" fullWidth label={t('polls.thresholdPercent') || 'Threshold %'}
                                                  value={form.threshold_percent ?? ''}
                                                  onChange={e => onChange({ threshold_percent: e.target.value === '' ? null : Number(e.target.value) })}
                                             />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 4 }}>
                                             <TextField type="number" fullWidth label={t('polls.winnersCount') || 'Winners count'}
                                                  value={form.winners_count ?? ''}
                                                  onChange={e => onChange({ winners_count: e.target.value === '' ? null : Number(e.target.value) })}
                                             />
                                        </Grid>

                                        <Grid size={{ xs: 12, sm: 6 }}>
                                             <TextField type="datetime-local" fullWidth label={t('polls.startsAt') || 'Starts at'}
                                                  value={(form.starts_at || '').replace('Z', '')}
                                                  onChange={e => onChange({ starts_at: e.target.value || null })}
                                             />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                             <TextField type="datetime-local" fullWidth label={t('polls.endsAt') || 'Ends at'}
                                                  value={(form.ends_at || '').replace('Z', '')}
                                                  onChange={e => onChange({ ends_at: e.target.value || null })}
                                             />
                                        </Grid>
                                   </Grid>
                              </CardContent>
                         </Card>

                         {/* Options */}
                         <Card>
                              <CardHeader title={t('polls.options') || 'Options'} />
                              <Divider />
                              <CardContent>
                                   <Stack spacing={1}>
                                        {optRows.map((r, idx) => (
                                             <Stack key={r.id || idx} direction="row" spacing={1} alignItems="center">
                                                  <TextField size="small" label={t('polls.optionLabel') || 'Label'} value={r.label}
                                                       onChange={e => setOptRows(rows => rows.map((x, i) => i === idx ? { ...x, label: e.target.value } : x))} />
                                                  <TextField size="small" type="number" label={t('polls.sortOrder') || 'Order'} value={r.sort_order}
                                                       onChange={e => setOptRows(rows => rows.map((x, i) => i === idx ? { ...x, sort_order: Number(e.target.value || i + 1) } : x))} />
                                                  <Button color="error" variant="outlined" onClick={() => setOptRows(rows => rows.filter((_, i) => i !== idx))}>{t('common.btnDelete')}</Button>
                                             </Stack>
                                        ))}
                                        <Button onClick={() => setOptRows(rows => [...rows, { label: '', sort_order: rows.length + 1 }])}>{t('polls.addOption') || 'Add option'}</Button>
                                   </Stack>
                              </CardContent>
                         </Card>

                         {/* Attachments */}
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
                              <Button variant="contained" onClick={save} loading={saving}>{t('common.btnSave')}</Button>
                              {isEdit && <Button variant="outlined" color="warning" onClick={handleClosePoll} loading={saving}>{t('polls.btnClosePoll') || 'Close Poll'}</Button>}
                         </Stack>
                    </Stack>
               </Container>
          </Box>
     );
}
