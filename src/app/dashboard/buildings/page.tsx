'use server';

import { getAllBuildingsFromClient, getAllBuildings } from "src/app/actions/building/building-actions";
import Buildings from "./buildings";
import { getViewer } from "src/libs/supabase/server-auth";
import { redirect } from "next/navigation";
import { Building } from "src/types/building";
import { Card, Container } from "@mui/material";


export default async function Page() {

  let buildings: Building[] = [];
  const { customer, tenant, admin } = await getViewer();
  if (!customer && !tenant && !admin) {
    redirect('/auth/login');
  }

  if (admin) {
    const { success, data } = await getAllBuildings();
    buildings = success ? data! : [];
  } else if (customer) {
    const { success, data } = await getAllBuildingsFromClient(customer.id);
    buildings = success ? data! : [];
  } else if (tenant) {
    buildings = [];
  }

  return (
    <Container maxWidth="xl">
      <Card sx={{ p: 2 }}>
        <Buildings clientBuildings={buildings} />
      </Card>
    </Container>
  );
}

