import { getAllBuildingsFromClient, getBuildingById } from "src/app/actions/building/building-actions";
import { getApartmentById } from "src/app/actions/apartment/apartment-actions";
import { checkIfUserIsLoggedInAndReturnUserData } from "src/libs/supabase/server-auth";
import { Box, Container, Stack } from "@mui/material";
import { ApartmentFormHeader } from "src/sections/dashboard/apartments/apartment-new-header";
import { ApartmentCreateForm } from "./new-apartment";

export default async function Page({ params }: {
  params: Promise<{ apartmentid: string }>
}) {

  const { apartmentid } = await params;

  const userData = await checkIfUserIsLoggedInAndReturnUserData();

  const [buildingsRes, apartmentRes] = await Promise.all([
    getAllBuildingsFromClient(userData.client!.id!),
    apartmentid ? getApartmentById(apartmentid) : Promise.resolve({ success: true, data: undefined }),
  ]);

  const buildings = buildingsRes.success ? buildingsRes.data : undefined;
  const apartment = apartmentRes.success ? apartmentRes.data : undefined;

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <ApartmentFormHeader
            apartment={apartment}
          />
          <ApartmentCreateForm
            buildings={buildings!}
            apartmentData={apartment}
            userData={userData}
          />
        </Stack>
      </Container>
    </Box>
  );
}
