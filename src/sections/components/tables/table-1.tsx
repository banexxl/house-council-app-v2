import type { FC } from 'react';
import { format, subDays, subHours, subMinutes, subSeconds } from 'date-fns';
import numeral from 'numeral';
import DotsHorizontalIcon from '@untitled-ui/icons-react/build/esm/DotsHorizontal';
import ChevronRightIcon from '@untitled-ui/icons-react/build/esm/ChevronRight';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import SvgIcon from '@mui/material/SvgIcon';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { Scrollbar } from 'src/components/scrollbar';
import type { SeverityPillColor } from 'src/components/severity-pill';
import { SeverityPill } from 'src/components/severity-pill';

type OrderStatus = 'complete' | 'pending' | 'rejected';

interface Order {
  id: string;
  created_at: number;
  client: {
    email: string;
    name: string;
  };
  currency: string;
  items: number;
  number: string;
  status: OrderStatus;
  totalAmount: number;
}

const now = new Date();

const orders: Order[] = [
  {
    id: '5eff2548979e396cb4b000ba',
    created_at: subMinutes(subSeconds(now, 10), 7).getTime(),
    client: {
      email: 'ekaterina@devias.io',
      name: 'Ekaterina Tankova',
    },
    currency: '$',
    items: 7,
    number: 'DEV-1042',
    status: 'pending',
    totalAmount: 524.0,
  },
  {
    id: '5eff254e46b753a166e7d7af',
    created_at: subHours(subMinutes(subSeconds(now, 50), 12), 2).getTime(),
    client: {
      email: 'carson.darrin@devias.io',
      name: 'Carson Darrin',
    },
    currency: '$',
    items: 8,
    number: 'DEV-1041',
    status: 'complete',
    totalAmount: 693.0,
  },
  {
    id: '5eff2553e1c551e2e28a9205',
    created_at: subHours(subMinutes(subSeconds(now, 12), 39), 5).getTime(),
    client: {
      email: 'fran.perez@devias.io',
      name: 'Fran Perez',
    },
    currency: '$',
    items: 4,
    number: 'DEV-1040',
    status: 'rejected',
    totalAmount: 215.0,
  },
  {
    id: '5eff25590f3e28f013c39a0e',
    created_at: subHours(subMinutes(subSeconds(now, 21), 46), 5).getTime(),
    client: {
      email: 'anje.keiser@devias.io',
      name: 'Jie Yan Song',
    },
    currency: '$',
    items: 1,
    number: 'DEV-1039',
    status: 'pending',
    totalAmount: 25.0,
  },
  {
    id: '5eff255f57499089243805d8',
    created_at: subHours(subMinutes(subSeconds(now, 54), 19), 8).getTime(),
    client: {
      name: 'Clarke Gillebert',
      email: 'clarke.gillebert@devias.io',
    },
    currency: '$',
    items: 5,
    number: 'DEV-1038',
    status: 'complete',
    totalAmount: 535.0,
  },
  {
    id: '5eff25658d416fc5adb96a3a',
    created_at: subDays(subMinutes(subSeconds(now, 12), 45), 1).getTime(),
    client: {
      email: 'nasimiyu.danai@devias.io',
      name: 'Nasimiyu Danai',
    },
    currency: '$',
    items: 2,
    number: 'DEV-1037',
    status: 'complete',
    totalAmount: 56.0,
  },
];

const labelColors: Record<OrderStatus, SeverityPillColor> = {
  complete: 'success',
  pending: 'warning',
  rejected: 'error',
};

export const Table1: FC = () => (
  <Box
    sx={{
      backgroundColor: (theme) => (theme.palette.mode === 'dark' ? 'neutral.800' : 'neutral.100'),
      p: 3,
    }}
  >
    <Card>
      <CardHeader
        action={
          <IconButton>
            <SvgIcon>
              <DotsHorizontalIcon />
            </SvgIcon>
          </IconButton>
        }
        title="Latest Orders"
      />
      <Divider />
      <Scrollbar>
        <Table sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow>
              <TableCell sortDirection="desc">
                <Tooltip
                  enterDelay={300}
                  title="Sort"
                >
                  <TableSortLabel
                    active
                    direction="desc"
                  >
                    Number
                  </TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => {
              const totalAmount = numeral(order.totalAmount).format(`${order.currency}0,0.00`);
              const statusColor = labelColors[order.status];
              const created_at = format(order.created_at, 'dd MMM, yyyy HH:mm:ss');

              return (
                <TableRow
                  hover
                  key={order.id}
                >
                  <TableCell>
                    <Typography variant="subtitle2">{order.number}</Typography>
                  </TableCell>
                  <TableCell>{order.client.name}</TableCell>
                  <TableCell>{order.items}</TableCell>
                  <TableCell>{totalAmount}</TableCell>
                  <TableCell>
                    <SeverityPill color={statusColor}>{order.status}</SeverityPill>
                  </TableCell>
                  <TableCell align="right">{created_at}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Scrollbar>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          p: 2,
        }}
      >
        <Button
          color="inherit"
          endIcon={
            <SvgIcon>
              <ChevronRightIcon />
            </SvgIcon>
          }
          size="small"
        >
          See All
        </Button>
      </Box>
    </Card>
  </Box>
);
