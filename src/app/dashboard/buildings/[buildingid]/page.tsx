import { getBuildingById } from "src/app/actions/building/building-actions";
import { readAllEntities } from "src/app/actions/base-entity-actions";
import { BaseEntity } from "src/types/base-entity";
import { BuildingCreateForm } from "./new-building";
import { Box, Container, Stack } from "@mui/material";
import { BuildingFormHeader } from "src/sections/dashboard/buildings/building-new-header";
import { getAllAddedLocationsByClientId } from "src/app/actions/location/location-services";
import { checkIfUserIsLoggedInAndReturnUserData } from "src/libs/supabase/server-auth";


export default async function Page({ params }: {
  params: Promise<{ buildingid: string }>
}) {

  const { buildingid } = await params

  const userData = await checkIfUserIsLoggedInAndReturnUserData();

  const [buildingData, locationData] = await Promise.all([
    getBuildingById(buildingid as string),
    getAllAddedLocationsByClientId(userData.client?.id!)
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
            userData={userData}
            locationData={locationData.success ? locationData.data ?? [] : []}
          />
        </Stack>
      </Container>
    </Box>
  );
};
