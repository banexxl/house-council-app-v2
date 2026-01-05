"use client";

import { useDialog } from 'src/hooks/use-dialog';
import ArrowLeftIcon from '@untitled-ui/icons-react/build/esm/ArrowLeft';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/components/router-link';
import { Seo } from 'src/components/seo';
import { paths } from 'src/paths';
// import { InvoicePdfDialog } from 'src/sections/dashboard/invoice/invoice-pdf-dialog';
// import { InvoicePdfDocument } from 'src/sections/dashboard/invoice/invoice-pdf-document';
// import { InvoicePreview } from 'src/sections/dashboard/invoice/invoice-preview';
import type { PolarOrder } from 'src/types/polar-order-types';
// import { getInitials } from 'src/utils/get-initials';

interface InvoiceDetailClientProps {
     invoice?: PolarOrder | null;
}

export const InvoiceDetailClient = ({ invoice }: InvoiceDetailClientProps) => {
     const dialog = useDialog();

     // TODO: When invoice fetching is implemented, render invoice data here.

     return (
          <>
               <Seo title="Dashboard: Invoice Details" />
               <Box
                    component="main"
                    sx={{
                         flexGrow: 1,
                         py: 8,
                    }}
               >
                    <Container maxWidth="lg">
                         <Stack
                              divider={<Divider />}
                              spacing={4}
                         >
                              <Stack spacing={4}>
                                   <div>
                                        <Link
                                             color="text.primary"
                                             component={RouterLink}
                                             href={paths.dashboard.invoices.index}
                                             sx={{
                                                  alignItems: 'center',
                                                  display: 'inline-flex',
                                             }}
                                             underline="hover"
                                        >
                                             <SvgIcon sx={{ mr: 1 }}>
                                                  <ArrowLeftIcon />
                                             </SvgIcon>
                                             <Typography variant="subtitle2">Invoices</Typography>
                                        </Link>
                                   </div>
                                   <Stack
                                        alignItems="flex-start"
                                        direction="row"
                                        justifyContent="space-between"
                                        spacing={4}
                                   >
                                        <Stack
                                             alignItems="center"
                                             direction="row"
                                             spacing={2}
                                        >
                                             <Avatar
                                                  sx={{
                                                       height: 42,
                                                       width: 42,
                                                  }}
                                             >
                                                  {/* {invoice && getInitials(invoice.customer.name)} */}
                                             </Avatar>
                                             <div>
                                                  {/* <Typography variant="h4">{invoice?.invoice_number}</Typography> */}
                                                  <Typography
                                                       color="text.secondary"
                                                       variant="body2"
                                                  >
                                                       {/* {invoice?.customer.name} */}
                                                  </Typography>
                                             </div>
                                        </Stack>
                                        <Stack
                                             alignItems="center"
                                             direction="row"
                                             spacing={2}
                                        >
                                             <Button
                                                  color="inherit"
                                                  onClick={dialog.handleOpen}
                                             >
                                                  Preview
                                             </Button>
                                             {/* <PDFDownloadLink
                    document={<InvoicePdfDocument invoice={invoice} />}
                    fileName="invoice"
                    style={{ textDecoration: 'none' }}
                  >
                    <Button
                      color="primary"
                      variant="contained"
                    >
                      Download
                    </Button>
                  </PDFDownloadLink> */}
                                        </Stack>
                                   </Stack>
                              </Stack>
                              {/* <InvoicePreview invoice={invoice} /> */}
                         </Stack>
                    </Container>
               </Box>
               {/* <InvoicePdfDialog
        invoice={invoice}
        onClose={dialog.handleClose}
        open={dialog.open}
      /> */}
          </>
     );
};

export default InvoiceDetailClient;
