import { notFound } from 'next/navigation';

import { getIncidentReportById } from 'src/app/actions/incident/incident-report-actions';
import { Seo } from 'src/components/seo';
import { IncidentDetailsClient } from './incident-details-client';

interface PageProps {
  params: Promise<{ requestId: string }>;
}

const Page = async ({ params }: PageProps) => {
  const resolvedParams = await params;
  const incidentId = resolvedParams?.requestId;

  if (!incidentId) {
    notFound();
  }

  const { success, data } = await getIncidentReportById(incidentId);

  if (!success || !data) {
    notFound();
  }

  return (
    <>
      <Seo title={`Incident: ${data.title}`} />
      <IncidentDetailsClient incident={data} />
    </>
  );
};

export default Page;
