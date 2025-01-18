import type { FC } from 'react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import type { Order } from 'src/types/order';

const statusOptions = [
  {
    label: 'Canceled',
    value: 'canceled',
  },
  {
    label: 'Complete',
    value: 'complete',
  },
  {
    label: 'Pending',
    value: 'pending',
  },
  {
    label: 'Rejected',
    value: 'rejected',
  },
];

interface OrderEditProps {
  onCancel?: () => void;
  onSave?: () => void;
  order: Order;
}

export const OrderEdit: FC<OrderEditProps> = (props) => {
  const { onCancel, onSave, order } = props;

  const created_at = format(order.created_at, 'dd/MM/yyyy HH:mm');

  return (
    <Stack spacing={6}>
      <Stack spacing={3}>
        <Typography variant="h6">Details</Typography>
        <Stack spacing={3}>
          <TextField
            disabled
            fullWidth
            label="ID"
            name="id"
            value={order.id}
          />
          <TextField
            disabled
            fullWidth
            label="Number"
            name="number"
            value={order.number}
          />
          <TextField
            disabled
            fullWidth
            label="Client name"
            name="customer_name"
            value={order.client.name}
          />
          <TextField
            disabled
            fullWidth
            label="Date"
            name="date"
            value={created_at}
          />
          <TextField
            fullWidth
            label="Address"
            name="address"
            value={order.client.address1}
          />
          <TextField
            fullWidth
            label="Country"
            name="country"
            value={order.client.country}
          />
          <TextField
            fullWidth
            label="State/Region"
            name="state_region"
            value={order.client.city}
          />
          <TextField
            fullWidth
            label="Total Amount"
            name="amount"
            value={order.totalAmount}
          />
          <TextField
            fullWidth
            label="Status"
            name="status"
            select
            SelectProps={{ native: true }}
            value={order.status}
          >
            {statusOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </TextField>
        </Stack>
        <Stack
          alignItems="center"
          direction="row"
          flexWrap="wrap"
          spacing={2}
        >
          <Button
            color="primary"
            onClick={onSave}
            size="small"
            variant="contained"
          >
            Save changes
          </Button>
          <Button
            color="inherit"
            onClick={onCancel}
            size="small"
          >
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
};

OrderEdit.propTypes = {
  onCancel: PropTypes.func,
  onSave: PropTypes.func,
  // @ts-ignore
  order: PropTypes.object,
};
