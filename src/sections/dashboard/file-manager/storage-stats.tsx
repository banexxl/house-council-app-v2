'use client';

import { useEffect, useMemo, useState, type FC } from 'react';
import type { ApexOptions } from 'apexcharts';
import Lightning01Icon from '@untitled-ui/icons-react/build/esm/Lightning01';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { Chart } from 'src/components/chart';
import { FileIcon } from 'src/components/file-icon';
import { bytesToSize } from 'src/utils/bytes-to-size';
import { useTranslation } from 'react-i18next';
import { tokens } from 'src/locales/tokens';

const UPGRADE_THRESHOLD_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const PAGE_SIZE = 100;
const NORMALIZE_PREFIX_PATTERN = /^(clients|users)\/[^/]+\/?/;

const useChartOptions = (usage: string): ApexOptions => {
  const theme = useTheme();

  return {
    chart: {
      background: 'transparent',
      redrawOnParentResize: false,
      redrawOnWindowResize: false,
    },
    colors: [theme.palette.primary.main],
    fill: {
      opacity: 1,
      type: 'solid',
    },
    grid: {
      padding: {
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
      },
    },
    labels: [usage],
    plotOptions: {
      radialBar: {
        dataLabels: {
          name: {
            color: theme.palette.text.primary,
            fontSize: '24px',
            fontWeight: 500,
            show: true,
            offsetY: -15,
          },
          value: {
            show: false,
          },
        },
        endAngle: 90,
        hollow: {
          size: '60%',
        },
        startAngle: -90,
        track: {
          background:
            theme.palette.mode === 'dark'
              ? theme.palette.primary.dark
              : theme.palette.primary.light,
          strokeWidth: '100%',
        },
      },
    },
    states: {
      active: {
        filter: {
          type: 'none',
        },
      },
      hover: {
        filter: {
          type: 'none',
        },
      },
    },
    stroke: {
      lineCap: 'round',
    },
    theme: {
      mode: theme.palette.mode,
    },
  };
};

type ChartSeries = number[];

interface StorageStatsProps {
  userId: string;
}

interface StorageObject {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
}

interface ExtensionTotals {
  extension: string | null;
  label: string;
  itemsCount: number;
  size: number;
}

export const StorageStats: FC<StorageStatsProps> = ({ userId }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalsByExt, setTotalsByExt] = useState<Record<string, { size: number; count: number }>>({});
  const [totalSize, setTotalSize] = useState(0);

  useEffect(() => {
    let active = true;

    const normalizePrefix = (value: string): string => {
      return value.replace(NORMALIZE_PREFIX_PATTERN, '').replace(/^\/+|\/+$/g, '');
    };

    const listFolder = async (prefix: string): Promise<StorageObject[]> => {
      const items: StorageObject[] = [];
      let offset = 0;
      const normalizedPrefix = normalizePrefix(prefix);

      while (true) {
        const params = new URLSearchParams();
        if (normalizedPrefix) params.set('prefix', normalizedPrefix);
        params.set('limit', PAGE_SIZE.toString());
        params.set('offset', offset.toString());
        const res = await fetch(`/api/storage/objects?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('Failed to load storage objects');
        }
        const data = await res.json();
        const pageItems = Array.isArray(data?.items) ? (data.items as StorageObject[]) : [];
        items.push(...pageItems);
        if (pageItems.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }

      return items;
    };

    const loadUsage = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!userId) {
          setTotalSize(0);
          setTotalsByExt({});
          setLoading(false);
          return;
        }

        const queue: string[] = [''];
        const visited = new Set<string>();
        let aggregateSize = 0;
        const extTotals: Record<string, { size: number; count: number }> = {};

        while (queue.length) {
          const prefix = queue.pop() ?? '';
          if (visited.has(prefix)) continue;
          visited.add(prefix);

          const items = await listFolder(prefix);
          for (const item of items) {
            if (item.type === 'folder') {
              const nextPrefix = normalizePrefix(item.path);
              if (!visited.has(nextPrefix)) {
                queue.push(nextPrefix);
              }
              continue;
            }
            const size = Number(item.size) || 0;
            aggregateSize += size;
            const extMatch = item.name?.split('.').pop();
            const ext = extMatch && extMatch !== item.name ? extMatch.toLowerCase() : null;
            const key = ext ?? 'other';
            const prev = extTotals[key] ?? { size: 0, count: 0 };
            extTotals[key] = {
              size: prev.size + size,
              count: prev.count + 1,
            };
          }
        }

        if (!active) return;
        setTotalSize(aggregateSize);
        setTotalsByExt(extTotals);
      } catch (err) {
        console.error(err);
        if (!active) return;
        setError('Unable to load storage stats');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadUsage();

    return () => {
      active = false;
    };
  }, [userId]);

  const rawUsagePercentage = totalSize ? (totalSize / UPGRADE_THRESHOLD_BYTES) * 100 : 0;
  const displayUsagePercentage = Math.round(rawUsagePercentage);
  const currentUsageLabel = bytesToSize(totalSize);
  const chartOptions = useChartOptions(currentUsageLabel);
  const chartSeries: ChartSeries = [Math.min(displayUsagePercentage, 100)];
  const thresholdLabel = bytesToSize(UPGRADE_THRESHOLD_BYTES);
  const statusText =
    displayUsagePercentage >= 90 ? t(tokens.fileManager.storage.nearLimit) : t(tokens.fileManager.storage.subheader);

  const totals: ExtensionTotals[] = useMemo(() => {
    return Object.entries(totalsByExt)
      .map(([key, value]) => ({
        extension: key === 'other' ? null : key,
        label: key === 'other' ? 'Other' : key.toUpperCase(),
        itemsCount: value.count,
        size: value.size,
      }))
      .sort((a, b) => b.size - a.size);
  }, [totalsByExt]);

  return (
    <Card>
      <CardHeader
        title={t(tokens.fileManager.storage.title)}
        subheader={t(tokens.fileManager.storage.subheader)}
      />
      <Box sx={{ position: 'relative' }}>
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            <Typography color="text.secondary" variant="body2">
              Calculating usage...
            </Typography>
          </Box>
        )}
        <Box sx={{ filter: loading ? 'blur(3px)' : 'none', transition: 'filter 120ms ease' }}>
          <CardContent>
            <Stack alignItems="center">
              <Box
                sx={{
                  height: 260,
                  mt: '-48px',
                  mb: '-100px',
                }}
              >
                <Chart
                  width={260}
                  height={260}
                  options={chartOptions}
                  series={chartSeries}
                  type="radialBar"
                />
              </Box>
              <Typography
                variant="h6"
                sx={{ mb: 1 }}
              >
                {statusText}
              </Typography>
              <Typography
                color="text.secondary"
                variant="body2"
              >
                {t(tokens.fileManager.storage.usage, { percentage: displayUsagePercentage })}
              </Typography>
              <Typography
                color="text.secondary"
                variant="body2"
                sx={{ mt: 0.5 }}
              >
                {currentUsageLabel} / {thresholdLabel}
              </Typography>
              {error && !loading && (
                <Typography
                  color="error.main"
                  variant="caption"
                  sx={{ mt: 1 }}
                >
                  {error}
                </Typography>
              )}
            </Stack>
            <List
              disablePadding
              sx={{ mt: 2 }}
            >
              {!totals.length && !loading ? (
                <ListItem disableGutters>
                  <ListItemText
                    primary={
                      <Typography
                        color="text.secondary"
                        variant="body2"
                      >
                        {t(tokens.fileManager.emptyState)}
                      </Typography>
                    }
                  />
                </ListItem>
              ) : (
                totals.map((total) => {
                  const size = bytesToSize(total.size);

                  return (
                    <ListItem
                      disableGutters
                      key={total.extension ?? 'other'}
                    >
                      <ListItemIcon>
                        <Box sx={{ color: 'primary.main' }}>
                          <FileIcon extension={total.extension} />
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="caption">{total.label}</Typography>}
                        secondary={
                          <Typography
                            color="text.secondary"
                            variant="body2"
                          >
                            {t(tokens.fileManager.folderSummary, {
                              size,
                              count: total.itemsCount,
                            })}
                          </Typography>
                        }
                      />
                    </ListItem>
                  );
                })
              )}
            </List>
          </CardContent>
          <Divider />
          <CardActions sx={{ justifyContent: 'flex-end' }}>
            <Button
              endIcon={
                <SvgIcon fontSize="small">
                  <Lightning01Icon />
                </SvgIcon>
              }
              size="small"
              variant="contained"
            >
              {t(tokens.fileManager.storage.upgrade)}
            </Button>
          </CardActions>
        </Box>
      </Box>
    </Card>
  );
};
