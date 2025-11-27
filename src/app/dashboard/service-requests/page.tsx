import { listIncidentReports } from 'src/app/actions/incident/incident-report-actions';
import { Seo } from 'src/components/seo';
import { IncidentsClient } from './incidents-client';

const Page = async () => {
  const result = await listIncidentReports();
  const incidents = result.success && Array.isArray(result.data) ? result.data : [];

  return (
    <>
      <Seo title="Incidents: Reports" />
      <IncidentsClient incidents={incidents} />
    </>
  );
};

export default Page;
