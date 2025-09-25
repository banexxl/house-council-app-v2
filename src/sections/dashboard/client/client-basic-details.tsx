'use client'

import type { FC } from 'react';
import PropTypes from 'prop-types';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardHeader from '@mui/material/CardHeader';

import { PropertyList } from 'src/components/property-list';
import { PropertyListItem } from 'src/components/property-list-item';
import { ImageUpload } from 'src/sections/dashboard/client/uplod-image';
import toast from 'react-hot-toast';

interface ClientBasicDetailsProps {
  name: string;
  address_1?: string;
  address_2?: string;
  email: string;
  isVerified: boolean;
  phone?: string;
}

export const ClientBasicDetails: FC<ClientBasicDetailsProps> = (props) => {
  const { name, address_1, address_2, email, isVerified, phone, ...other } = props;

  return (
    <Card {...other} sx={{ width: '100%' }}>
      <ImageUpload
        buttonDisabled={true}
        onUploadSuccess={() => toast.success('Image uploaded successfully')}
        userId={''}
        sx={{ mt: 2, ml: 2 }}
      />
      <CardHeader title="Basic Details" />
      <PropertyList>
        <PropertyListItem
          divider
          label="Name"
          value={name}
        />
        <PropertyListItem
          divider
          label="Email"
          value={email}
        />
        <PropertyListItem
          divider
          label="Phone"
          value={phone}
        />
        <PropertyListItem
          divider
          label="Address 1"
          value={address_1}
        />
        <PropertyListItem
          divider
          label="Address 2"
          value={address_2}
        />
      </PropertyList>
      <PropertyListItem
        divider
        label="Is Verified"
        value={isVerified ? 'Yes' : 'No'}
      />
      <CardActions>
        <Button
          color="inherit"
          size="small"
        >
          Reset Password
        </Button>
      </CardActions>
    </Card>
  );
};

ClientBasicDetails.propTypes = {
  address_1: PropTypes.string,
  address_2: PropTypes.string,
  email: PropTypes.string.isRequired,
  isVerified: PropTypes.bool.isRequired,
  phone: PropTypes.string,
};
