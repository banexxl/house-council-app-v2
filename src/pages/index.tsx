import type { NextPage } from 'next';
import { useRouter } from 'next/router';

import { Seo } from 'src/components/seo';
import { usePageView } from 'src/hooks/use-page-view';
import { Layout } from 'src/layouts/dashboard';
import { paths } from 'src/paths';

const Page: NextPage = () => {

          usePageView();
          const router = useRouter()
          if (typeof window !== 'undefined') {
                    router.replace(paths.dashboard.index); // Replace '/new-route' with your desired destination
          }

          return (
                    <>
                              <Seo />
                              <main>
                              </main>
                    </>
          );
};

Page.getLayout = (page) => <Layout>{page}</Layout>;

export default Page;
