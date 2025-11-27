import { Seo } from 'src/components/seo';
import { IncidentCreateClient } from './incident-create-client';

const Page = () => {
  return (
    <>
      <Seo title="Incidents: Report new incident" />
      <IncidentCreateClient />
    </>
  );
};

export default Page;
