import type { FC } from 'react';
import PropTypes from 'prop-types';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardHeader from '@mui/material/CardHeader';

import { PropertyList } from 'src/components/property-list';
import { PropertyListItem } from 'src/components/property-list-item';

interface CustomerBasicDetailsProps {
          fullAddress?: string;
          email: string;
          isVerified: boolean;
          phone?: string;
}

export const CustomerBasicDetails: FC<CustomerBasicDetailsProps> = (props) => {
          const { fullAddress, email, isVerified, phone, ...other } = props;

          return (
                    <Card {...other}>
                              <CardHeader title="Basic Details" />
                              <PropertyList>
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
                                                  label="fullAddress"
                                                  value={fullAddress}
                                        />
                              </PropertyList>
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

CustomerBasicDetails.propTypes = {
          fullAddress: PropTypes.string,
          email: PropTypes.string.isRequired,
          isVerified: PropTypes.bool.isRequired,
          phone: PropTypes.string,
};
