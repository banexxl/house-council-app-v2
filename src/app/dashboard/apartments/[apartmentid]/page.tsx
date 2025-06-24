import { getAllBuildingsFromClient, getBuildingById } from "src/app/actions/building/building-actions";
import { getApartmentById } from "src/app/actions/apartment/apartment-actions";
import { getServerAuth } from "src/libs/supabase/server-auth";
import { unauthorized } from "next/navigation";
import { Box, Container, Stack } from "@mui/material";
import { ApartmentFormHeader } from "src/sections/dashboard/apartments/apartment-new-header";
import { ApartmentCreateForm } from "./new-apartment";

interface PageProps {
  params: {
    apartmentid?: string; // dynamic segment if editing
  };
}

export default async function Page({ params }: PageProps) {

  const { apartmentid } = await params;

  const userSession = await getServerAuth();
  if (!userSession.client || !userSession.session) unauthorized();

  const [buildingsRes, apartmentRes] = await Promise.all([
    getAllBuildingsFromClient(userSession.client!.id!),
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
            userSession={userSession}
          />
        </Stack>
      </Container>
    </Box>
  );
}
