import { getViewer } from 'src/libs/supabase/server-auth';
import { ClientFileManagerPage } from './client-page';
import { redirect } from 'next/navigation';
import { Card, Container } from '@mui/material';

const Page = async () => {

  const { customer, tenant, admin, userData } = await getViewer();

  if (!customer && !tenant && !admin) {
    redirect('/auth/login');
  }

  const userId = userData?.id ?? '';

  return (
    <Container maxWidth="xl">
      <Card sx={{ p: 2 }}>
        <ClientFileManagerPage userId={userId} />
      </Card>
    </Container>
  )
};

export default Page;
