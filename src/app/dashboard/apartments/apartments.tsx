'use client';

import { useCallback, useState } from 'react';
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

import { BreadcrumbsSeparator } from 'src/components/breadcrumbs-separator';
import { RouterLink } from 'src/components/router-link';
import { paths } from 'src/paths';
import { useTranslation } from 'react-i18next';
import {
  apartmentStatusMap,
  apartmentTypeMap,
  type Apartment,
} from 'src/types/apartment';
import { GenericTable } from 'src/components/generic-table';
import { deleteApartment } from 'src/app/actions/apartment/apartment-actions';
import { toast } from 'react-hot-toast';


interface ApartmentsProps {
  apartments: Apartment[];
}

const Apartments = ({ apartments }: ApartmentsProps) => {
  const { t } = useTranslation();
  const [addApartmentLoading, setAddApartmentLoading] = useState(false);

  const handleDelete = useCallback(async (apartmentId: string) => {
    const deleteApartmentResponse = await deleteApartment(apartmentId);
    if (deleteApartmentResponse.success) {
      toast.success(t('common.actionDeleteSuccess'));
    } else {
      toast.error(t('common.actionDeleteError'));
    }
  }, [t]);

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth="xl">
        <Stack spacing={4}>
          <Stack direction="row" justifyContent="space-between" spacing={4}>
            <Stack spacing={1}>
              <Typography variant="h4">{t('apartments.apartmentList')}</Typography>
              <Breadcrumbs separator={<BreadcrumbsSeparator />}>
                <Link
                  color="text.primary"
                  component={RouterLink}
                  href={paths.dashboard.index}
                  variant="subtitle2"
                >
                  {t('nav.adminDashboard')}
                </Link>
                <Typography color="text.secondary" variant="subtitle2">
                  {t('apartments.apartmentList')}
                </Typography>
              </Breadcrumbs>
            </Stack>
            <Button
              sx={{ height: 40 }}
              component={RouterLink}
              href={paths.dashboard.apartments.new}
              onClick={() => setAddApartmentLoading(true)}
              startIcon={
                <SvgIcon>
                  <PlusIcon />
                </SvgIcon>
              }
              variant="contained"
              loading={addApartmentLoading}
            >
              {t('common.btnCreate')}
            </Button>
          </Stack>

          <Card>
            <GenericTable<Apartment>
              items={apartments}
              baseUrl="/dashboard/apartments"
              columns={[
                { key: 'cover_image', label: t('apartments.lblCoverImage') },
                { key: 'apartment_number', label: t('apartments.lblApartmentNumber') },
                { key: 'floor', label: t('apartments.lblFloor') },
                {
                  key: 'apartment_type',
                  label: t('apartments.lblType'),
                  render: (value) => t(apartmentTypeMap[value as keyof typeof apartmentTypeMap])
                },
                {
                  key: 'apartment_status',
                  label: t('apartments.lblRentalStatus'),
                  render: (value) => t(apartmentStatusMap[value as keyof typeof apartmentStatusMap])
                },
                {
                  key: 'square_meters',
                  label: t('apartments.lblSizeM2')
                }
              ]}
              rowActions={[
                (apartment, openActionDialog) => (
                  <Button
                    color="error"
                    variant="outlined"
                    size="small"
                    onClick={() => openActionDialog({
                      id: apartment.id,
                      title: t('warning.deleteWarningTitle'),
                      message: t('warning.deleteWarningMessage'),
                      confirmText: t('common.btnDelete'),
                      cancelText: t('common.btnClose'),
                      onConfirm: () => handleDelete(apartment.id)
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

export default Apartments;
