'use server'

import ArrowLeftIcon from '@untitled-ui/icons-react/build/esm/ArrowLeft';
import ChevronDownIcon from '@untitled-ui/icons-react/build/esm/ChevronDown';
import Edit02Icon from '@untitled-ui/icons-react/build/esm/Edit02';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Unstable_Grid2';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/components/router-link';
import { Seo } from 'src/components/seo';

import { paths } from 'src/paths';
import { ClientBasicDetails } from 'src/sections/dashboard/client/client-basic-details';
import { ClientDataManagement } from 'src/sections/dashboard/client/client-data-management';
import { ClientEmailsSummary } from 'src/sections/dashboard/client/client-emails-summary';
import { ClientInvoices } from 'src/sections/dashboard/client/client-invoices';
import { ClientPayment } from 'src/sections/dashboard/client/client-payment';
import { ClientLogs } from 'src/sections/dashboard/client/client-logs';
import type { Client } from 'src/types/client';
import { ClientInvoice, ClientLog } from 'src/types/client';
import { getInitials } from 'src/utils/get-initials';
import { ClientDetailsHeader } from 'src/sections/dashboard/client/client-details-header';
import { getClientByIdAction } from 'src/app/actions/client-actions/client-actions';

const tabs = [
  { label: 'Details', value: 'details' },
  { label: 'Invoices', value: 'invoices' },
  { label: 'Logs', value: 'logs' },
];

// const useInvoices = (): ClientInvoice[] => {

//   const [invoices, setInvoices] = useState<ClientInvoice[]>([]);

//   const handleInvoicesGet = useCallback(async () => {
//     try {
//       const response = await clientsApi.getInvoices();

//     
//         setInvoices(response);
//       }
//     } catch (err) {
//       console.error(err);
//     }
//   }, []);

//   useEffect(
//     () => {
//       handleInvoicesGet();
//     },
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//     []
//   );

//   return invoices;
// };

// const useLogs = (): ClientLog[] => {

//   const [logs, setLogs] = useState<ClientLog[]>([]);

//   const handleLogsGet = useCallback(async () => {
//     try {
//       const response = await clientsApi.getLogs();

//     
//         setLogs(response);
//       }
//     } catch (err) {
//       console.error(err);
//     }
//   }, []);

//   useEffect(
//     () => {
//       handleLogsGet();
//     },
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//     []
//   );

//   return logs;
// };

const Page = async ({ params }: any) => {
  const { clientid } = await params

  const { getClientByIdActionSuccess, getClientByIdActionData, getClientByIdActionError } = await getClientByIdAction(clientid) // Add 'await' here

  // const invoices = useInvoices();
  // const logs = useLogs();

  // if (!client) {
  //   return null;
  // }

  // const handleLogoChange = async (event: any) => {
  //   console.log(event.target.files)
  //   const selectedFile = event.target.files[0];

  //   if (!selectedFile) {
  //     return;
  //   }

  //   setLoading(true);

  //   // Extract file extension
  //   const fileExtension = selectedFile.name.split('.')[1]

  //   // Assuming you have a title for the image
  //   const title = selectedFile.name.split('.')[0]

  //   try {
  //     const reader = new FileReader();
  //     reader.readAsDataURL(selectedFile);
  //     reader.onloadend = async () => {
  //       const base64Data = reader.result;
  //       const formData = new FormData();
  //       formData.append('file', base64Data as string);
  //       formData.append('title', title);
  //       formData.append('extension', fileExtension);
  //       formData.append('fileName', selectedFile.name);

  //       const imageUploadResponse = await uploadFile(formData)
  //       console.log(imageUploadResponse)
  //       if (imageUploadResponse.success) {
  //         formik.setFieldValue('logo', imageUploadResponse.awsUrl)
  //         toast.success('Image uploaded successfully')
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Error uploading image:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <>
      <Seo title="Dashboard: Client Details" />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8,
        }}
      >
        <Container maxWidth="xl">
          <Stack spacing={4}>
            <ClientDetailsHeader />
            <Grid
              container
              spacing={4}
            >
              <Grid
                xs={12}
                lg={4}
              >

                {
                  getClientByIdActionSuccess === true ?
                    <ClientBasicDetails
                      address_1={getClientByIdActionData?.address_1}
                      address_2={getClientByIdActionData?.address_2}
                      email={getClientByIdActionData!.email}
                      isVerified={!!getClientByIdActionData?.is_verified}
                      phone={getClientByIdActionData?.phone}
                    />
                    :
                    <Typography variant="h1">{getClientByIdActionError}</Typography>
                }
              </Grid>
              <Grid
                xs={12}
                lg={8}
              >
                <Stack spacing={4}>
                  <ClientPayment />
                  <ClientEmailsSummary />
                  <ClientDataManagement />
                </Stack>
              </Grid>
            </Grid>


            {/* {currentTab === 'invoices' && <ClientInvoices invoices={invoices} />}
            {currentTab === 'logs' && <ClientLogs logs={logs} />} */}
          </Stack>
        </Container>
      </Box>
    </>
  );
};

export default Page;
