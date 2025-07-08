'use client'

import Layout from "./dashboard/layout";

export default function GlobalError({ error }: { error: Error }) {

     return (
          <Layout>
               <div style={{ padding: 40 }}>
                    <h2>Something went wrong</h2>
                    <p>{error.message}</p>
                    {/* <button onClick={() => router.push('/')}>Try again</button> */}
               </div>
          </Layout>
     )
}