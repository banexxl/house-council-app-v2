'use server'

import { Box, Container, Stack } from "@mui/material"
import { redirect } from "next/navigation";
import { createEntity, deleteEntity, updateEntity, readAllEntities } from "src/app/actions/base-entity-actions"
import { TABLES } from "src/libs/supabase/tables";
import { getViewer } from "src/libs/supabase/server-auth";
import GenericTableEditor from "src/sections/dashboard/client/client-components/client-components"
import { BaseEntity, FeatureExtension } from "src/types/base-entity";

export default async function TableEditorPage() {

     const { customer, tenant, admin } = await getViewer();
     if (!client && !clientMember && !tenant && !admin) {
          redirect('/auth/login');
     }

     if (tenant) {
          redirect('/dashboard/social/profile');
     }

     if (client || clientMember) {
          redirect('/dashboard/account');
     }

     const [
          readFeaturesData,
     ] = await Promise.all([
          readAllEntities<BaseEntity>(TABLES.FEATURES),
     ]);


     return (
          <Box
               component="main"
               sx={{
                    flexGrow: 1,
                    py: 8,
               }}
          >
               <Container maxWidth="lg">
                    <Stack spacing={4}>
                         <GenericTableEditor
                              features={readFeaturesData as (BaseEntity & FeatureExtension)[]}
                              updateEntity={updateEntity}
                              deleteEntity={deleteEntity}
                              createEntity={createEntity}
                         />
                    </Stack>
               </Container>
          </Box>
     )
}

