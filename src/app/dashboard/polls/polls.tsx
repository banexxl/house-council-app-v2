'use client';

import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PlusIcon from '@untitled-ui/icons-react/build/esm/Plus';
import {
  Box,
  Breadcrumbs,
  Button,
  Card,
  Container,
  Link,
  Stack,
  SvgIcon,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { BreadcrumbsSeparator } from 'src/components/breadcrumbs-separator';
import { RouterLink } from 'src/components/router-link';
import { paths } from 'src/paths';
import { GenericTable } from 'src/components/generic-table';
import toast from 'react-hot-toast';

import { type Poll, pollTypeLabel, pollStatusLabel } from 'src/types/poll';
import { type Building } from 'src/types/building';
import { deletePoll } from 'src/app/actions/poll/polls';

interface PollsProps {
  polls: Poll[];
  buildings?: Building[];
}

const Polls = ({ polls, buildings = [] }: PollsProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ search?: string; status?: string }>({});

  const buildingById = useMemo(() => {
    const m = new Map<string, Building>();
    buildings.forEach(b => m.set((b as any).id, b));
    return m;
  }, [buildings]);

  const filtered = useMemo(() => {
    const search = filters.search?.toLowerCase().trim();
    const status = filters.status?.trim();
    return polls.filter(p => {
      if (status && p.status !== status) return false;
      if (search) {
        const hay = `${p.title || ''} ${p.description || ''}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }, [polls, filters]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      setDeletingId(id);
      const res = await deletePoll(id);
      if (res.success) {
        toast.success(t('common.actionDeleteSuccess'));
        router.refresh();
      } else {
        toast.error(res.error || t('common.actionDeleteError'));
      }
    } catch (e: any) {
      toast.error(e?.message || t('common.actionDeleteError'));
    } finally {
      setDeletingId(null);
    }
  }, [t, router]);

  // Helper to format ISO date string to readable format
  const formatDate = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZoneName: 'short',
    });
  };

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth="xl">
        <Stack spacing={4}>
          <Stack direction="row" justifyContent="space-between" spacing={4}>
            <Stack spacing={1}>
              <Typography variant="h4">{t('polls.listTitle') || 'Polls'}</Typography>
              <Breadcrumbs separator={<BreadcrumbsSeparator />}>
                <Link color="text.primary" component={RouterLink} href={paths.dashboard.index} variant="subtitle2">
                  {t('nav.adminDashboard')}
                </Link>
                <Typography color="text.secondary" variant="subtitle2">
                  {t('polls.listTitle') || 'Polls'}
                </Typography>
              </Breadcrumbs>
            </Stack>
            <Button
              sx={{ height: 40 }}
              component={RouterLink}
              href={paths.dashboard.polls.create}
              startIcon={<SvgIcon><PlusIcon /></SvgIcon>}
              variant="contained"
            >
              {t('common.btnCreate')}
            </Button>
          </Stack>

          <Card>
            <GenericTable<Poll>
              items={filtered}
              baseUrl="/dashboard/polls"
              columns={[
                { key: 'title', label: t('polls.title') || 'Title' },
                {
                  key: 'type',
                  label: t('polls.type') || 'Type',
                  render: (_v, p) => pollTypeLabel(t, p.type),
                },
                {
                  key: 'status',
                  label: t('polls.status') || 'Status',
                  render: (_v, p) => pollStatusLabel(t, p.status),
                },
                {
                  key: 'building_id',
                  label: t('polls.building') || 'Building',
                  render: (_v, p) => {
                    const b = buildingById.get(p.building_id);
                    const loc = (b as any)?.building_location;
                    if (!loc) return p.building_id;
                    const city = loc?.city || '';
                    const street = `${loc?.street_address || ''} ${loc?.street_number || ''}`.trim();
                    return `${city}${street ? ' / ' + street : ''}`;
                  }
                },
                {
                  key: 'starts_at',
                  label: t('polls.startsAt') || 'Starts',
                  render: (v) => typeof v === 'string' ? formatDate(v) : (v == null ? '/' : formatDate(String(v))),
                },
                {
                  key: 'ends_at',
                  label: t('polls.endsAt') || 'Ends',
                  render: (v) => typeof v === 'string' ? formatDate(v) : (v == null ? '/' : formatDate(String(v))),
                },
              ]}
              rowActions={[
                (poll, openDialog) => (
                  <Button
                    color="error"
                    variant="outlined"
                    size="small"
                    loading={deletingId === poll.id}
                    disabled={!!deletingId}
                    onClick={() => openDialog({
                      id: poll.id,
                      title: t('warning.deleteWarningTitle'),
                      message: t('warning.deleteWarningMessage'),
                      confirmText: t('common.btnDelete'),
                      cancelText: t('common.btnClose'),
                      onConfirm: () => handleDelete(poll.id)
                    })}
                  >
                    {t('common.btnDelete')}
                  </Button>
                )
              ]}
            />
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};

export default Polls;
