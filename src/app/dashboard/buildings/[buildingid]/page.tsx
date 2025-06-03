import { getBuildingById } from "src/app/actions/building/building-actions";
import { readAllEntities } from "src/app/actions/base-entity-actions";
import { NextPage } from 'next';
import { BaseEntity } from "src/types/base-entity";
import { BuildingCreateForm } from "./new-building";
import { Box, Container, Stack } from "@mui/material";
import { BuildingFormHeader } from "src/sections/dashboard/buildings/building-new-header";
import { unauthorized } from "next/navigation";
import { getAllAddedLocations } from "src/app/actions/location/location-services";
import { getServerAuth } from "src/libs/supabase/server-auth";


export default async function Page({ params }: {
  params: Promise<{ buildingid: string }>
}) {

  const { buildingid } = await params

  const [buildingData, buildingStatuses, locationData, userSession] = await Promise.all([
    getBuildingById(buildingid as string),
    readAllEntities<BaseEntity>("tblBuildingStatuses"),
    getAllAddedLocations(),
    getServerAuth()
  ]);

  if (!userSession.client || !userSession.session) {
    unauthorized()
  }

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
            buildingData={buildingData}
            buildingStatuses={buildingStatuses}
            userSession={userSession}
            locationData={locationData.success ? locationData.data ?? [] : []}
          />
        </Stack>
      </Container>
    </Box>
  );
};
