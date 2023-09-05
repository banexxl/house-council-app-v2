import type { NextPage } from 'next';

import { Seo } from 'src/components/seo';
import { usePageView } from 'src/hooks/use-page-view';
import { Layout } from 'src/layouts/dashboard';

const Page: NextPage = () => {

          usePageView();

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
