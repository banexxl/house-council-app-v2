import { getProfileIdOrTenantId } from 'src/app/actions/social/profile-actions';
import { ProfilePageContent } from '../page';

const Page = async ({ params }: { params: Promise<{ profileId: string }> }) => {

  const { profileId } = await params

  let fetchedProfileId
  const { data, error } = await getProfileIdOrTenantId(profileId);

  if (error || !data) {
    fetchedProfileId = null
  }

  return <ProfilePageContent profileId={data?.id} />;
};

export default Page;
