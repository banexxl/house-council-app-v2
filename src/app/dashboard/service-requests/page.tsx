import { listIncidentReportsForViewer } from 'src/app/actions/incident/incident-report-actions';
import { Seo } from 'src/components/seo';
import { IncidentsClient } from './incidents-client';

const Page = async () => {

  const result = await listIncidentReportsForViewer();
  const incidents = result.success && Array.isArray(result.data) ? result.data : [];

  return <IncidentsClient incidents={incidents} />

};

export default Page;
