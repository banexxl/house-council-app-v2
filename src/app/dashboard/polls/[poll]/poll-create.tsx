'use client';

import { pollSchemaTranslationTokens } from 'src/types/poll';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SelectChangeEvent } from '@mui/material/Select';
import { useTranslation } from 'react-i18next';
import { useFormik, getIn } from 'formik';
import dynamic from 'next/dynamic';
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
     Paper,
     TableContainer,
     LinearProgress,
     Rating,
     CircularProgress,
} from '@mui/material';
import Image from 'next/image';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Building } from 'src/types/building';
import {
     Poll,
     PollOption,
     PollStatus,
     PollVote,
     voteStatusLabel,
     DECISION_RULE_TRANSLATIONS,
     SCORE_AGG_TRANSLATIONS,
     buildPollValidationSchema,
     pollInitialValues,
} from 'src/types/poll';
import { closePoll, createOrUpdatePoll, getPollById, reorderPolls, updatePollStatus as updatePollStatusAction } from 'src/app/actions/poll/poll-actions';
import { createPollOption, updatePollOption, deletePollOption } from 'src/app/actions/poll/poll-option-actions';
import { getPollResults } from 'src/app/actions/poll/votes/voting-actions';
import { FileDropzone, type File as DropFile } from 'src/components/file-dropzone';
import { paths } from 'src/paths';
import { DatePicker, TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import log from 'src/utils/logger';
import { SortableOptionsList } from 'src/components/drag-and-drop';
import type { DBStoredImage } from 'src/components/file-dropzone';
import { EntityFormHeader } from 'src/components/entity-form-header';
import { removeAllEntityFiles, removeEntityFile, uploadEntityFiles } from 'src/libs/supabase/sb-storage';
import { PopupModal } from 'src/components/modal-dialog';

// Dynamic import for ApexCharts to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

type Props = {
     clientId: string;
     buildings: Building[];
     poll?: Poll | null;
     votes?: PollVote[] | null;
};

type PollLifecycleActionArgs = {
     action: (pollId: string) => Promise<{ success: boolean; error?: string | null | undefined }>;
     successMessage: string;
     errorMessage: string;
};

export default function PollCreate({
     clientId,
     buildings,
     poll,
     votes = [],
}: Props) {
     const { t, i18n } = useTranslation();
     const router = useRouter();
     const [saving, setSaving] = useState(false);
     const [uploadProgress, setUploadProgress] = useState<number | undefined>(undefined);
     const [infoOpen, setInfoOpen] = useState(false);
     const [submitInfoOpen, setSubmitInfoOpen] = useState(false);
     const [activateConfirmOpen, setActivateConfirmOpen] = useState(false);
     const [scheduleConfirmOpen, setScheduleConfirmOpen] = useState(false);
     const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
     const [isHeaderNavigating, setIsHeaderNavigating] = useState(false);
     const [isHeaderNavigatingToCreate, setIsHeaderNavigatingToCreate] = useState(false);
     const [attachments, setAttachments] = useState<DBStoredImage[]>(() => {
          return ((poll?.attachments ?? []) as unknown as DBStoredImage[]) || [];
     });
     const [pollResults, setPollResults] = useState<any>(null);
     const [loadingResults, setLoadingResults] = useState(false);

     useEffect(() => {
          setAttachments(((poll?.attachments ?? []) as unknown as DBStoredImage[]) || []);
     }, [poll?.attachments]);

     // Load poll results when poll is present
     useEffect(() => {
          const loadPollResults = async () => {
               if (!poll?.id) {
                    setPollResults(null);
                    return;
               }

               setLoadingResults(true);
               try {
                    const results = await getPollResults(poll.id);
                    if (results.success && results.data) {
                         setPollResults(results.data);
                    } else {
                         setPollResults(null);
                    }
               } catch (error) {
                    console.error('Failed to load poll results:', error);
                    setPollResults(null);
               } finally {
                    setLoadingResults(false);
               }
          };

          loadPollResults();
     }, [poll?.id]);


     const updatePollStatus = useCallback(
          async (status: PollStatus, messages?: { success?: string; error?: string }) => {
               if (!poll?.id || poll.status === status) return;
               setSaving(true);
               const fallbackLabel = status.charAt(0).toUpperCase() + status.slice(1);
               const statusLabel = t(`polls.status.${status}` as any, { defaultValue: fallbackLabel });
               const successMessage = messages?.success ?? `${statusLabel} status applied`;
               const errorMessage = messages?.error ?? `Failed to set status ${statusLabel}`;
               try {
                    const { success, error } = await updatePollStatusAction(poll.id, status, i18n.language);
                    if (!success) throw new Error(error || errorMessage);
                    toast.success(successMessage);
                    router.refresh();
               } catch (e: any) {
                    toast.error(e?.message || errorMessage);
               } finally {
                    setSaving(false);
               }
          },
          [poll, router, t, i18n.language]
     );

     const handlePublishPoll = useCallback(async () => {
          await updatePollStatus('active', {
               success: t('polls.actionPublishSuccess', { defaultValue: 'Poll published' }),
               error: t('polls.actionPublishError', { defaultValue: 'Failed to publish poll' }),
          });
          setActivateConfirmOpen(false);
     }, [updatePollStatus, t]);

     const handleReturnToDraft = useCallback(async () => {
          await updatePollStatus('draft', {
               success: t('polls.returnedToDraft', { defaultValue: 'Poll moved back to draft' }),
               error: t('polls.returnToDraftError', { defaultValue: 'Failed to move poll to draft' }),
          });
     }, [updatePollStatus, t]);

     const handleSchedulePoll = useCallback(async () => {
          await updatePollStatus('scheduled');
          setScheduleConfirmOpen(false);
     }, [updatePollStatus]);

     const handleArchivePoll = useCallback(async () => {
          await updatePollStatus('archived');
     }, [updatePollStatus]);

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

     const defaultStartAt = useMemo(
          () => dayjs().add(2, 'hour').second(0).millisecond(0).format('YYYY-MM-DDTHH:mm:ss'),
          []
     );

     const formik = useFormik<Poll>({
          // Prevent large lists like attachments/votes from being part of the form state
          initialValues: poll
               ? { ...poll }
               : { ...pollInitialValues, client_id: clientId, starts_at: defaultStartAt },
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

     const markFieldTouched = useCallback(
          (field: string) => {
               formik.setFieldTouched(field, true, false);
          },
          [formik]
     );

     const handleFieldChange = useCallback(
          (event: React.ChangeEvent<any> | SelectChangeEvent<unknown>, _child?: React.ReactNode) => {
               const name = (event.target as { name?: string })?.name;
               if (name) {
                    markFieldTouched(name);
               }
               formik.handleChange(event as any);
          },
          [formik, markFieldTouched]
     );

     const setFieldValueAndTouch = useCallback(
          <ValueType,>(field: string, value: ValueType, shouldValidate?: boolean) => {
               markFieldTouched(field);
               return formik.setFieldValue(field, value, shouldValidate);
          },
          [formik, markFieldTouched]
     );

     // Ensure poll options edits do not toggle main form dirty state
     const setOptionsAndClearDirty = async (newOptions: any[]) => {
          // Update options value and immediately reset Formik with same values
          // so that formik.dirty remains false for option-only edits.
          setFieldValueAndTouch('options', newOptions, false);
          formik.resetForm({
               values: { ...formik.values, options: newOptions },
               touched: formik.touched,
               errors: formik.errors,
          });
          // Re-run validation to reflect new options (e.g., min count, uniqueness, winners <= options)
          await formik.validateForm();
     };

     const isFormLocked = formik.isSubmitting || (!!poll && poll.status !== 'draft');

     const startsAtIsFutureOrToday = useMemo(() => {
          const raw = formik.values.starts_at;
          if (!raw) return true;
          const start = dayjs(raw);
          if (!start.isValid()) return true;
          const now = dayjs();
          return start.isSame(now, 'day') || start.isAfter(now, 'day');
     }, [formik.values.starts_at]);

     const hasErrors = useMemo(() => Object.keys(formik.errors).length > 0, [formik.errors]);

     const hasAtLeastOneOption = useMemo(
          () => (Array.isArray((formik.values as any)?.options) ? (formik.values as any).options.length : (poll?.options?.length ?? 0)) > 0,
          [formik.values, poll?.options]
     );

     const publishDisabled =
          saving || formik.isSubmitting || hasErrors || !startsAtIsFutureOrToday || !hasAtLeastOneOption;

     // Revalidate when options list changes to keep constraints in sync
     useEffect(() => {
          // Validate the whole form to catch cross-field rules involving options
          formik.validateForm();
          // Alternatively, to validate only options: formik.validateField('options');
          // We choose validateForm because rules like winners <= options may live elsewhere
     }, [formik.values.options]);
     const statusControlsDisabled = !poll?.id || saving || formik.isSubmitting || formik.dirty;

     const canTransitionToStatus = useCallback(
          (status: PollStatus) => {
               if (!poll?.id) return false;
               const current = poll.status as PollStatus | undefined;
               if (!current || current === status) return false;

               // Decide allowed targets based on current status
               switch (current) {
                    case 'archived':
                         // Archived is terminal; no further transitions
                         return false;
                    case 'closed':
                         // From Closed, only Archive is allowed
                         return status === 'archived';
                    case 'active':
                         // From Active: can only Close, or move back to Draft
                         if (status === 'closed') return true;
                         return false;
                    case 'scheduled':
                         // From Scheduled: can go to Draft or Activate (publish)
                         if (status === 'draft') return true;
                         if (status === 'active') return !publishDisabled;
                         return false;
                    case 'draft':
                         // From Draft: can Schedule (needs options) or Activate (publish)
                         if (status === 'scheduled') return hasAtLeastOneOption;
                         if (status === 'active') return !publishDisabled;
                         return false;
                    default:
                         return false;
               }
          },
          [poll?.id, poll?.status, publishDisabled, hasAtLeastOneOption]
     );

     const availableStatuses = useMemo(() => {
          if (!poll?.id) return [] as PollStatus[];
          const current = poll.status as PollStatus;
          switch (current) {
               case 'draft':
                    // Show actions user expects from Draft
                    return ['scheduled', 'active'] as PollStatus[];
               case 'scheduled':
                    // From Scheduled, allow moving back to Draft or Activating
                    return ['draft', 'active'] as PollStatus[];
               case 'active':
                    // From Active, show Close and (optionally) Draft backtrack
                    return ['closed'] as PollStatus[];
               case 'closed':
                    // From Closed, only Archive is visible
                    return ['archived'] as PollStatus[];
               case 'archived':
               default:
                    return [] as PollStatus[];
          }
     }, [poll?.id, poll?.status]);

     const getDisableReason = useCallback((status: PollStatus): string => {
          if (statusControlsDisabled) {
               if (saving || formik.isSubmitting) return t('polls.disableReason.saving', { defaultValue: 'Please wait, saving in progress' });
               if (formik.dirty) return t('polls.disableReason.unsaved', { defaultValue: 'Please save your changes first' });
               if (!poll?.id) return t('polls.disableReason.noPoll', { defaultValue: 'Poll must be saved first' });
          }

          // Check specific reasons for schedule/activate buttons first
          if (status === 'scheduled' || status === 'active') {
               const reasons = [];
               if (hasErrors) reasons.push(t('polls.disableReason.hasErrors', { defaultValue: 'Form has validation errors' }));
               if (!hasAtLeastOneOption) {
                    const optionCount = Array.isArray((formik.values as any)?.options) ? (formik.values as any).options.length : (poll?.options?.length ?? 0);
                    reasons.push(t('polls.disableReason.noOptions', {
                         defaultValue: optionCount === 0 ? 'Please add poll options in the Options section below' : 'At least one poll option is required'
                    }));
               }
               if (status === 'active' && !startsAtIsFutureOrToday) reasons.push(t('polls.disableReason.pastDate', { defaultValue: 'Start date must be today or in the future' }));
               if (reasons.length > 0) return reasons.join('. ');
          }

          // Only check general transition rules if no specific reasons were found
          if (!canTransitionToStatus(status)) {
               return t('polls.disableReason.invalidTransition', { defaultValue: 'This status transition is not allowed' });
          }

          return '';
     }, [statusControlsDisabled, saving, formik.isSubmitting, formik.dirty, poll?.id, canTransitionToStatus, hasErrors, hasAtLeastOneOption, startsAtIsFutureOrToday, t]); const handleFilesDropWithUrls = async (newFiles: DropFile[]) => {
          if (isFormLocked) return;
          if (!poll?.id) {
               toast.error(t('common.actionSaveError') || 'Save poll first');
               return;
          }
          if (!newFiles.length) return;

          let fakeProgress = 0;
          setUploadProgress(0);
          const interval = setInterval(() => {
               fakeProgress += 5;
               if (fakeProgress <= 99) setUploadProgress(fakeProgress);
          }, 300);

          try {
               const res = await uploadEntityFiles({
                    entity: 'poll-attachment',
                    entityId: poll.id,
                    files: newFiles as unknown as globalThis.File[],
                    clientId,
               });
               clearInterval(interval);
               setUploadProgress(100);
               setTimeout(() => setUploadProgress(undefined), 700);
               if (!res.success || !res.records?.length) {
                    throw new Error(res.error || t('common.actionUploadError') || 'Upload failed');
               }

               const newAttachments = res.records as unknown as DBStoredImage[];
               setAttachments((prev) => {
                    const merged = [...prev, ...newAttachments];
                    setFieldValueAndTouch('attachments', merged, false);
                    return merged;
               });
               toast.success(t('common.actionUploadSuccess') || 'Uploaded');
          } catch (e: any) {
               clearInterval(interval);
               setUploadProgress(undefined);
               toast.error(e?.message || t('common.actionUploadError') || 'Upload error');
          }
     };

     const handleFileRemove = async (image: DBStoredImage) => {
          if (isFormLocked) return;
          if (!poll?.id) return;
          try {
               const result = await removeEntityFile({
                    entity: 'poll-attachment',
                    entityId: poll.id,
                    storagePathOrUrl: image.storage_path,
               });

               if (!result.success) {
                    toast.error(result.error || t('common.actionDeleteError') || 'Delete failed');
                    return;
               }
               setAttachments((prev) => {
                    const filtered = prev.filter((att) => att.id !== image.id);
                    setFieldValueAndTouch('attachments', filtered, false);
                    return filtered;
               });
               toast.success(t('common.actionDeleteSuccess') || 'Deleted');
          } catch (e: any) {
               toast.error(e?.message || t('common.actionDeleteError') || 'Delete failed');
          }
     };

     const handleFileRemoveAll = async () => {
          if (isFormLocked) return;
          if (!poll?.id) return;
          try {
               const res = await removeAllEntityFiles({
                    entity: 'poll-attachment',
                    entityId: poll.id,
               });
               if (!res.success) {
                    toast.error(res.error || t('common.actionDeleteError') || 'Delete failed');
                    return;
               }
               setAttachments(() => {
                    setFieldValueAndTouch('attachments', [], false);
                    return [];
               });
               toast.success(t('common.actionDeleteSuccess') || 'Deleted');
          } catch (e: any) {
               toast.error(e?.message || t('common.actionDeleteError') || 'Delete failed');
          }
     };

     const handleLifecycleAction = useCallback(
          async ({ action, successMessage, errorMessage }: PollLifecycleActionArgs) => {
               if (!poll?.id) return;
               setSaving(true);
               try {
                    const { success, error } = await action(poll.id);
                    if (!success) throw new Error(error || errorMessage);
                    toast.success(successMessage);
                    router.refresh();
               } catch (e: any) {
                    toast.error(e?.message || errorMessage);
               } finally {
                    setSaving(false);
               }
          },
          [poll?.id, router]
     );

     const handleClosePoll = useCallback(async () => {
          await handleLifecycleAction({
               action: closePoll,
               successMessage: t('polls.closed', { defaultValue: 'Poll closed' }),
               errorMessage: t('polls.closeError', { defaultValue: 'Failed to close poll' }),
          });
          setCloseConfirmOpen(false);
     }, [handleLifecycleAction, t]);

     const handleStatusClick = useCallback(
          async (status: PollStatus) => {
               if (!poll?.id || saving || !canTransitionToStatus(status)) return;
               switch (status) {
                    case 'draft':
                         await handleReturnToDraft();
                         break;
                    case 'scheduled':
                         setScheduleConfirmOpen(true);
                         break;
                    case 'active':
                         // Reopen from closed is disabled; only allow publish from draft/scheduled
                         setActivateConfirmOpen(true);
                         break;
                    case 'closed':
                         if (poll.status === 'active') {
                              setCloseConfirmOpen(true);
                         } else {
                              await updatePollStatus('closed');
                         }
                         break;
                    case 'archived':
                         await handleArchivePoll();
                         break;
                    default:
                         break;
               }
          },
          [
               poll?.id,
               poll?.status,
               saving,
               canTransitionToStatus,
               handleReturnToDraft,
               handleSchedulePoll,
               handlePublishPoll,
               handleLifecycleAction,
               handleArchivePoll,
               handleClosePoll,
               updatePollStatus,
               t,
          ]
     );

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

     const renderResultsChart = () => {
          if (!pollResults || !poll) return null;

          const { poll: resultPoll, statistics } = pollResults;

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
          if (!pollResults || !poll) return null;

          const { poll: resultPoll, statistics } = pollResults;

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
          <Box component="main" sx={{ flexGrow: 1, py: 6 }}>
               <Container maxWidth="xl">
                    <Stack spacing={3} component="form" onSubmit={formik.handleSubmit}>
                         <EntityFormHeader
                              backHref={paths.dashboard.polls.index}
                              backLabel={t('polls.listTitle') || 'Polls'}
                              title={poll ? (t('polls.editTitle') || 'Edit Poll') + ': ' + (poll.title || '') : (t('polls.createTitle') || 'Create Poll')}
                              breadcrumbs={[
                              { title: t('nav.adminDashboard'), href: paths.dashboard.index },
                              { title: t('polls.listTitle') || 'Polls', href: paths.dashboard.polls.index },
                               { title: poll ? (t('polls.editTitle') || 'Edit Poll') : (t('polls.createTitle') || 'Create Poll') }
                              ]}
                              actionComponent={
                                   poll?.id ? (
                                        <Stack direction="row" spacing={1}>
                                             <Button
                                                  variant="contained"
                                                  href={paths.dashboard.polls.index}
                                                  onClick={() => setIsHeaderNavigating(true)}
                                                  disabled={isHeaderNavigating || isHeaderNavigatingToCreate}
                                                  startIcon={isHeaderNavigating ? <CircularProgress size={16} color="inherit" /> : undefined}
                                             >
                                                  {t('polls.listTitle') || 'Polls'}
                                             </Button>
                                             <Button
                                                  variant="outlined"
                                                  href={paths.dashboard.polls.create}
                                                  onClick={() => setIsHeaderNavigatingToCreate(true)}
                                                  disabled={isHeaderNavigating || isHeaderNavigatingToCreate}
                                                  startIcon={isHeaderNavigatingToCreate ? <CircularProgress size={16} color="inherit" /> : undefined}
                                             >
                                                  {t('polls.createTitle') || 'Create Poll'}
                                             </Button>
                                        </Stack>
                                   ) : (
                                        <Button
                                             variant="contained"
                                             href={paths.dashboard.polls.index}
                                             onClick={() => setIsHeaderNavigating(true)}
                                             disabled={isHeaderNavigating}
                                             startIcon={isHeaderNavigating ? <CircularProgress size={16} color="inherit" /> : undefined}
                                        >
                                             {t('polls.listTitle') || 'Polls'}
                                        </Button>
                                   )
                              }
                         />

                         {/* Two-column layout */}
                         <Grid container spacing={2} >
                              <Grid size={{ xs: 12, md: 7 }}>
                                   <Card >
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                             <CardHeader title={t('polls.details') || 'Details'} />
                                             {/* Poll status pill */}
                                             {poll?.status && (
                                                  <Box sx={{ mr: 4, mt: 2 }}>
                                                       <Typography
                                                            variant="caption"
                                                            sx={{
                                                                 px: 1.5,
                                                                 py: 0.5,
                                                                 borderRadius: 12,
                                                                 backgroundColor:
                                                                      poll.status === 'draft'
                                                                           ? 'warning.light'
                                                                           : poll.status === 'active'
                                                                                ? 'success.light'
                                                                                : poll.status === 'closed'
                                                                                     ? 'grey.300'
                                                                                     : 'grey.100',
                                                                 color:
                                                                      poll.status === 'draft'
                                                                           ? 'warning.dark'
                                                                           : poll.status === 'active'
                                                                                ? 'success.dark'
                                                                                : poll.status === 'closed'
                                                                                     ? 'text.secondary'
                                                                                     : 'text.primary',
                                                                 fontWeight: 500,
                                                                 display: 'inline-block',
                                                            }}
                                                       >
                                                            {t(`polls.status.${poll.status}`) || poll.status}
                                                       </Typography>
                                                  </Box>
                                             )}
                                        </Box>
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
                                                            onChange={handleFieldChange}
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
                                                            onChange={handleFieldChange}
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
                                                                 onChange={handleFieldChange}
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
                                                                 value={formik.values.building_id || ''}
                                                                 onChange={handleFieldChange}
                                                                 onBlur={() => formik.setFieldTouched('building_id', true)}
                                                            >
                                                                 {buildingOptions.map((b) => (
                                                                      <MenuItem key={b.id} value={b.id}>
                                                                           {b.name || `${b.loc?.city || ''}, ${b.loc?.street_address || ''} ${b.loc?.street_number}`}
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
                                                                 onChange={(e) => {
                                                                      setFieldValueAndTouch('max_choices', coerceInt(e.target.value));
                                                                 }}
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
                                                                                onChange={(e) => {
                                                                                     setFieldValueAndTouch('allow_abstain', e.target.checked);
                                                                                }}
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
                                                                                onChange={(e) => {
                                                                                     setFieldValueAndTouch('allow_comments', e.target.checked);
                                                                                }}
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
                                                                                onChange={(e) => {
                                                                                     setFieldValueAndTouch('allow_anonymous', e.target.checked);
                                                                                }}
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
                                                                                onChange={(e) => {
                                                                                     setFieldValueAndTouch(
                                                                                          'allow_change_until_deadline',
                                                                                          e.target.checked
                                                                                     );
                                                                                }}
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
                                                                 onChange={(e) =>
                                                                      setFieldValueAndTouch('rule', (e.target.value || null) as any)
                                                                 }
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
                                                                      setFieldValueAndTouch(
                                                                           'score_aggregation',
                                                                           (e.target.value || null) as any
                                                                      )
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
                                                                 setFieldValueAndTouch(
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
                                                                 setFieldValueAndTouch(
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
                                                                 setFieldValueAndTouch(
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
                                                                      setFieldValueAndTouch('starts_at', composed, false);
                                                                      formik.validateField('starts_at');
                                                                      if (formik.values.ends_at) formik.validateField('ends_at');
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
                                                                      setFieldValueAndTouch('starts_at', composed, false);
                                                                      formik.validateField('starts_at');
                                                                      if (formik.values.ends_at) formik.validateField('ends_at');
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
                                                                      setFieldValueAndTouch('ends_at', composed, false);
                                                                      formik.validateField('ends_at');
                                                                      if (formik.values.starts_at) formik.validateField('starts_at');
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
                                                                      setFieldValueAndTouch('ends_at', composed, false);
                                                                      formik.validateField('ends_at');
                                                                      if (formik.values.starts_at) formik.validateField('starts_at');
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
                                                                 disabled={isFormLocked}
                                                                 onDrop={handleFilesDropWithUrls}
                                                                 uploadProgress={uploadProgress}
                                                                 images={attachments}
                                                                 onRemoveImage={isFormLocked ? undefined : handleFileRemove}
                                                                 onRemoveAll={isFormLocked ? undefined : handleFileRemoveAll}
                                                            />
                                                       </Stack>
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
                                                                                     setFieldValueAndTouch('options', normalized, false);
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
                                   )
                              }
                         </Grid>

                         {/* Poll Results moved after the grid so they appear last on mobile */}
                         {poll && (
                              <Card>
                                   <CardHeader
                                        title={t('polls.results') || 'Results'}
                                        action={
                                             loadingResults && (
                                                  <CircularProgress size={20} />
                                             )
                                        }
                                   />
                                   <Divider />
                                   <CardContent>
                                        {loadingResults ? (
                                             <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                                  <CircularProgress />
                                             </Box>
                                        ) : pollResults && pollResults.statistics ? (
                                             <Stack spacing={3}>
                                                  {/* Statistics Summary */}
                                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                                       <Paper sx={{ p: 2, minWidth: 120 }}>
                                                            <Typography variant="h6" color="primary">
                                                                 {pollResults.statistics.total_votes}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                 Total Votes
                                                            </Typography>
                                                       </Paper>
                                                       <Paper sx={{ p: 2, minWidth: 120 }}>
                                                            <Typography variant="h6" color="primary">
                                                                 {pollResults.statistics.eligible_voters}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                 Eligible Voters
                                                            </Typography>
                                                       </Paper>
                                                       <Paper sx={{ p: 2, minWidth: 120 }}>
                                                            <Typography variant="h6" color="primary">
                                                                 {pollResults.statistics.participation_rate}%
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                 Participation
                                                            </Typography>
                                                       </Paper>
                                                       <Paper sx={{ p: 2, minWidth: 120 }}>
                                                            <Typography variant="h6" color="primary">
                                                                 {pollResults.statistics.abstentions}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                 Abstentions
                                                            </Typography>
                                                       </Paper>
                                                  </Box>

                                                  {/* Charts */}
                                                  {renderResultsChart()}

                                                  {/* Tables */}
                                                  {renderResultsTable()}
                                             </Stack>
                                        ) : (
                                             <Typography variant="body2" color="text.secondary">
                                                  {t('polls.noResultsAvailable') || 'No results available yet'}
                                             </Typography>
                                        )}
                                   </CardContent>
                              </Card>
                         )}
                         {/* Action buttons and status changers */}
                         <Stack
                              direction={{ xs: 'column', sm: 'row' }}
                              spacing={2}
                              justifyContent="flex-start"
                              alignItems={{ xs: 'stretch', sm: 'center' }}
                              sx={{ mb: 2 }}
                         >
                              <Box sx={{ mt: 0.5 }}>
                                   <Tooltip title={t('polls.help.openInfo') || 'More info'}>
                                        <IconButton size="small" onClick={() => setSubmitInfoOpen(true)}>
                                             <InfoOutlinedIcon fontSize="small" />
                                        </IconButton>
                                   </Tooltip>
                              </Box>

                              <Button
                                   variant="outlined"
                                   onClick={() => router.push(paths.dashboard.polls.index)}
                                   sx={{
                                        width: { xs: '100%', sm: 'auto' },
                                   }}
                              >
                                   {t('common.btnBack') || 'Back'}
                              </Button>

                              <Tooltip
                                   title={
                                        <Box>
                                             {!formik.isValid && poll?.status !== 'archived' && poll?.status !== 'closed' && (
                                                  <Box>
                                                       <Typography variant="subtitle2" color="error">
                                                            {t('common.formInvalid') || 'Form is invalid:'}
                                                       </Typography>
                                                       <List dense>
                                                            {Object.entries(formik.errors).map(([key, err]) => {
                                                                 const schemaToken = pollSchemaTranslationTokens[key];
                                                                 const label = schemaToken ? t(schemaToken) : key;
                                                                 return (
                                                                      <ListItem key={key}>
                                                                           <ListItemText
                                                                                primary={`${typeof err === 'string' ? err : JSON.stringify(err)}`}
                                                                                slotProps={{ primary: { variant: 'caption', color: 'error' } }}
                                                                           />
                                                                      </ListItem>
                                                                 );
                                                            })}
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
                                   disableHoverListener={formik.isValid && formik.dirty && !formik.isSubmitting && !isFormLocked}
                              >
                                   <Box
                                        component="span"
                                        sx={{
                                             width: { xs: '100%', sm: 'auto' }, // make tooltip child stretch on mobile
                                        }}
                                   >
                                        <Button
                                             variant="contained"
                                             type="submit"
                                             loading={saving}
                                             disabled={isFormLocked || !formik.dirty || !formik.isValid}
                                             fullWidth
                                             sx={{
                                                  width: { xs: '100%', sm: 'auto' },
                                             }}
                                        >
                                             {t('common.btnSave')}
                                        </Button>
                                   </Box>
                              </Tooltip>

                              {poll?.id && availableStatuses.length > 0 && (
                                   <Box
                                        sx={{
                                             ml: { xs: 0, sm: 1 },
                                             mt: { xs: 2, sm: 0 },
                                             display: 'grid',
                                             gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(2, minmax(0, 1fr))' },
                                             gap: 1,
                                             width: { xs: '100%', sm: 'auto' },
                                        }}
                                   >
                                        {availableStatuses.map((status) => {
                                             const fallbackLabel = status.charAt(0).toUpperCase() + status.slice(1);
                                             const statusLabel = t(`polls.status.actions.${status}`, { defaultValue: fallbackLabel });
                                             const isDisabled =
                                                  statusControlsDisabled ||
                                                  !canTransitionToStatus(status) ||
                                                  ((status === 'scheduled' || status === 'active') && (hasErrors || !hasAtLeastOneOption));
                                             const disableReason = isDisabled ? getDisableReason(status) : '';

                                             const button = (
                                                  <Button
                                                       key={status}
                                                       variant="outlined"
                                                       color="primary"
                                                       disabled={isDisabled}
                                                       onClick={() => handleStatusClick(status)}
                                                       fullWidth
                                                  >
                                                       {statusLabel}
                                                  </Button>
                                             );

                                             if ((status === 'scheduled' || status === 'active') && isDisabled && disableReason) {
                                                  return (
                                                       <Tooltip key={status} title={disableReason} placement="top">
                                                            <span>{button}</span>
                                                       </Tooltip>
                                                  );
                                             }

                                             return button;
                                        })}
                                   </Box>
                              )}
                         </Stack>


                         {/* Show error list below buttons on mobile */}
                         <Grid sx={{ display: { xs: 'block', md: 'none' }, mt: 2 }}>
                              {(!formik.isValid || !formik.dirty || formik.isSubmitting) && (
                                   <Box>
                                        {!formik.isValid && (
                                             <Box>
                                                  <Typography variant="subtitle2" color="error">
                                                       {t('common.formInvalid') || 'Form is invalid:'}
                                                  </Typography>
                                                  <List dense>
                                                       {Object.entries(formik.errors).map(([key, err]) => {
                                                            const schemaToken = pollSchemaTranslationTokens[key];
                                                            const label = schemaToken ? t(schemaToken) : key;
                                                            return (
                                                                 <ListItem key={key}>
                                                                      <ListItemText
                                                                           primary={`${label}: ${typeof err === 'string' ? err : JSON.stringify(err)}`}
                                                                           slotProps={{ primary: { variant: 'caption', color: 'error' } }}
                                                                      />
                                                                 </ListItem>
                                                            );
                                                       })}
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
                              )}
                         </Grid>

                    </Stack>
               </Container>

               {/* Submission info dialog (image only) */}
               <Dialog
                    open={submitInfoOpen}
                    onClose={() => setSubmitInfoOpen(false)}
                    maxWidth={false}
                    fullWidth
                    slotProps={{
                         paper: {
                              sx: {
                                   // Centered by default; ensure generous canvas for the image
                                   width: { xs: '97vw', md: '70vw' },
                                   maxWidth: 1600,
                                   height: { xs: '90vh', md: '50vh' },
                              },
                         },
                    }}
               >
                    <DialogTitle>{t('polls.help.submissionStateTransitions') || 'Submitting a poll'}</DialogTitle>
                    <DialogContent dividers sx={{ pt: 0 }}>
                         {/* Mobile (vertical) */}
                         <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                              <Image
                                   src="/assets/polls/poll_transitions_vertical.png"
                                   alt="Poll state image"
                                   width={800}
                                   height={1400}
                                   style={{
                                        width: '100%',
                                        height: 'auto',
                                        borderRadius: 4,
                                        display: 'block',
                                        maxHeight: 'calc(95vh - 96px)'
                                   }}
                                   priority
                              />
                         </Box>
                         {/* Desktop / tablet (horizontal) */}
                         <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                              <Image
                                   src="/assets/polls/poll_transitions_horizontal.png"
                                   alt="Poll state image"
                                   width={1600}
                                   height={1100}
                                   style={{
                                        width: '100%',
                                        height: 'auto',
                                        borderRadius: 4,
                                        display: 'block',
                                        maxHeight: 'calc(95vh - 96px)'
                                   }}
                                   priority
                              />
                         </Box>
                    </DialogContent>
                    <DialogActions>
                         <Button onClick={() => setSubmitInfoOpen(false)}>{t('common.btnClose') || 'Close'}</Button>
                    </DialogActions>
               </Dialog>

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

               {/* Activate Poll Confirmation Dialog */}
               <PopupModal
                    isOpen={activateConfirmOpen}
                    onClose={() => setActivateConfirmOpen(false)}
                    onConfirm={handlePublishPoll}
                    title={t('polls.confirmActivate.title', { defaultValue: 'Activate Poll' })}
                    type="confirmation"
                    confirmText={t('polls.confirmActivate.confirm', { defaultValue: 'Activate Now' })}
                    cancelText={t('common.btnCancel', { defaultValue: 'Cancel' })}
               >
                    <Typography>
                         {t('polls.confirmActivate.message', {
                              defaultValue: 'Are you sure you want to activate this poll? When activated, all clients will be immediately notified and can start voting. The scheduled date/time will be ignored.'
                         })}
                    </Typography>
               </PopupModal>

               {/* Schedule Poll Confirmation Dialog */}
               <PopupModal
                    isOpen={scheduleConfirmOpen}
                    onClose={() => setScheduleConfirmOpen(false)}
                    onConfirm={handleSchedulePoll}
                    title={t('polls.confirmSchedule.title', { defaultValue: 'Schedule Poll' })}
                    type="confirmation"
                    confirmText={t('polls.confirmSchedule.confirm', { defaultValue: 'Schedule' })}
                    cancelText={t('common.btnCancel', { defaultValue: 'Cancel' })}
               >
                    <Typography>
                         {t('polls.confirmSchedule.message', {
                              defaultValue: 'This poll will be scheduled and automatically activated at the specified start date and time. Clients will be notified when the poll becomes active.'
                         })}
                    </Typography>
               </PopupModal>

               {/* Close Poll Confirmation Dialog */}
               <PopupModal
                    isOpen={closeConfirmOpen}
                    onClose={() => setCloseConfirmOpen(false)}
                    onConfirm={handleClosePoll}
                    title={t('polls.confirmClose.title', { defaultValue: 'Close Poll' })}
                    type="confirmation"
                    confirmText={t('polls.confirmClose.confirm', { defaultValue: 'Close Poll' })}
                    cancelText={t('common.btnCancel', { defaultValue: 'Cancel' })}
               >
                    <Typography>
                         {t('polls.confirmClose.message', {
                              defaultValue: 'Are you sure you want to close this poll? A closed poll cannot be reopened, and the poll vote results will be final.'
                         })}
                    </Typography>
               </PopupModal>
          </Box >
     );
}
