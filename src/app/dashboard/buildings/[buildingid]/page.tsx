import { getBuildingById } from "src/app/actions/building/building-actions";
import { BuildingCreateForm } from "./new-building";
import { Box, Container, Stack } from "@mui/material";
import { getAllNotOcupiedLocationsAddedByClient } from "src/app/actions/location/location-services";
import { getViewer } from "src/libs/supabase/server-auth";
import { redirect } from "next/navigation";

export default async function Page({ params }: {
  params: Promise<{ buildingid: string }>
}) {

  const { buildingid } = await params

  const { admin, customer, tenant, userData, error } = await getViewer();
  const customerId = customer ? customer.id : null;
  if (!admin && !customer && !tenant) {
    redirect('/auth/login');
  }

  if (tenant) {
    redirect('/dashboard/social/profile');
  }

  const [buildingData, locationData] = await Promise.all([
    getBuildingById(buildingid as string),
    getAllNotOcupiedLocationsAddedByClient(customerId!)
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
          <BuildingCreateForm
            buildingData={buildingData.success ? buildingData.data : undefined}
            userData={{ customer, tenant, admin, userData, error }}
            locationData={locationData.success ? locationData.data ?? [] : []}
          />
        </Stack>
      </Container>
    </Box>
  );
};
