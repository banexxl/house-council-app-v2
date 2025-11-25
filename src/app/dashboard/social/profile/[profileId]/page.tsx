import { getProfileIdOrTenantId } from 'src/app/actions/social/profile-actions';
import { ProfilePageContent } from '../page';

const Page = async ({ params }: { params: Promise<{ profileId: string }> }) => {

  const { profileId } = await params
  const { data, error } = await getProfileIdOrTenantId(profileId);
  return <ProfilePageContent profileId={data?.id} />;
};

export default Page;
