import type { ChangeEvent, FC } from 'react';
import { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles/createTheme';

import type { Order } from 'src/types/order';
import { PropertyList } from 'src/components/property-list';
import { PropertyListItem } from 'src/components/property-list-item';

const statusOptions: string[] = ['Canceled', 'Complete', 'Rejected'];

interface OrderSummaryProps {
  order: Order;
}

export const OrderSummary: FC<OrderSummaryProps> = (props) => {
  const { order, ...other } = props;
  const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));
  const [status, setStatus] = useState<string>(statusOptions[0]);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setStatus(event.target.value);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Handle save logic here
    } catch (error) {
      console.error('Error saving order:', error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const align = mdUp ? 'horizontal' : 'vertical';
  const created_at = format(order.created_at, 'dd/MM/yyyy HH:mm');

  return (
    <Card {...other}>
      <CardHeader title="Basic info" />
      <Divider />
      <PropertyList>
        <PropertyListItem
          align={align}
          label="Client"
        >
          <Typography variant="subtitle2">{order.client.name}</Typography>
          <Typography
            color="text.secondary"
            variant="body2"
          >
            {order.client.address_1}
          </Typography>
          <Typography
            color="text.secondary"
            variant="body2"
          >
            {order.client.city}
          </Typography>
          <Typography
            color="text.secondary"
            variant="body2"
          >
            {order.client.country}
          </Typography>
        </PropertyListItem>
        <Divider />
        <PropertyListItem
          align={align}
          label="ID"
          value={order.id}
        />
        <Divider />
        <PropertyListItem
          align={align}
          label="Invoice"
          value={order.number}
        />
        <Divider />
        <PropertyListItem
          align={align}
          label="Date"
          value={created_at}
        />
        <Divider />
        <PropertyListItem
          align={align}
          label="Promotion Code"
          value={order.promotionCode}
        />
        <Divider />
        <PropertyListItem
          align={align}
          label="Total Amount"
          value={`${order.currency}${order.totalAmount}`}
        />
        <Divider />
        <PropertyListItem
          align={align}
          label="Status"
        >
          <Stack
            alignItems={{
              xs: 'stretch',
              sm: 'center',
            }}
            direction={{
              xs: 'column',
              sm: 'row',
            }}
            spacing={1}
          >
            <TextField
              label="Status"
              margin="normal"
              name="status"
              onChange={handleChange}
              select
              SelectProps={{ native: true }}
              sx={{
                flexGrow: 1,
                minWidth: 150,
              }}
              value={status}
            >
              {statusOptions.map((option) => (
                <option
                  key={option}
                  value={option}
                >
                  {option}
                </option>
              ))}
            </TextField>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={isSaving}
              loading={isSaving}
            >
              Save
            </Button>
          </Stack>
        </PropertyListItem>
      </PropertyList>
    </Card>
  );
};

OrderSummary.propTypes = {
  // @ts-ignore
  order: PropTypes.object.isRequired,
};
