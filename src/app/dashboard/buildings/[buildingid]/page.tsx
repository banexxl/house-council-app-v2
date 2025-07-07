import { getBuildingById } from "src/app/actions/building/building-actions";
import { readAllEntities } from "src/app/actions/base-entity-actions";
import { BaseEntity } from "src/types/base-entity";
import { BuildingCreateForm } from "./new-building";
import { Box, Container, Stack } from "@mui/material";
import { BuildingFormHeader } from "src/sections/dashboard/buildings/building-new-header";
import { getAllAddedLocationsByClientId } from "src/app/actions/location/location-services";
import { getServerAuth } from "src/libs/supabase/server-auth";


export default async function Page({ params }: {
  params: Promise<{ buildingid: string }>
}) {

  const { buildingid } = await params

  const { client } = await getServerAuth();

  const [buildingData, locationData, userSession] = await Promise.all([
    getBuildingById(buildingid as string),
    getAllAddedLocationsByClientId(client?.id!),
    getServerAuth()
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
          <BuildingFormHeader building={buildingData.success ? buildingData.data : undefined} />
          <BuildingCreateForm
            buildingData={buildingData.success ? buildingData.data : undefined}
            userSession={userSession}
            locationData={locationData.success ? locationData.data ?? [] : []}
          />
        </Stack>
      </Container>
    </Box>
  );
};
