import { ProfilePageContent } from '../page';

const Page = async ({ params }: { params: Promise<{ profileId: string }> }) => {

  const { profileId } = await params

  return <ProfilePageContent profileId={profileId} />;
};

export default Page;
