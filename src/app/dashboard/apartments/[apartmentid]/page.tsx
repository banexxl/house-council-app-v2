import { getAllBuildingsFromClient, getBuildingById, getAllBuildings } from "src/app/actions/building/building-actions";
import { getApartmentById } from "src/app/actions/apartment/apartment-actions";
import { checkIfUserExistsAndReturnDataAndSessionObject } from "src/libs/supabase/server-auth";
import { Box, Container, Stack } from "@mui/material";
import { ApartmentFormHeader } from "src/sections/dashboard/apartments/apartment-form-header";
import { ApartmentCreateForm } from "./new-apartment";
import { logout } from "src/app/auth/actions";
import { redirect } from "next/navigation";

export default async function Page({ params }: {
  params: Promise<{ apartmentid: string }>
}) {
  const { apartmentid } = await params;
  const { client, clientMember, tenant, admin, userData, error } = await checkIfUserExistsAndReturnDataAndSessionObject();
  if (!client && !tenant && !admin) {
    logout();
  }

  let buildings: any = undefined;
  let apartment: any = undefined;

  if (admin) {
    // For admin, fetch all buildings and the apartment by id
    const [buildingsRes, apartmentRes] = await Promise.all([
      getAllBuildings(),
      apartmentid ? getApartmentById(apartmentid) : Promise.resolve({ success: true, data: undefined }),
    ]);
    buildings = buildingsRes.success ? buildingsRes.data : undefined;
    apartment = apartmentRes.success ? apartmentRes.data : undefined;
  } else if (client) {
    // For client, fetch only their buildings and the apartment by id
    const [buildingsRes, apartmentRes] = await Promise.all([
      getAllBuildingsFromClient(client.id),
      apartmentid ? getApartmentById(apartmentid) : Promise.resolve({ success: true, data: undefined }),
    ]);
    buildings = buildingsRes.success ? buildingsRes.data : undefined;
    apartment = apartmentRes.success ? apartmentRes.data : undefined;
  } else if (tenant) {
    redirect('/dashboard/products');
  }

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <ApartmentFormHeader
            apartment={apartment}
          />
          <ApartmentCreateForm
            buildings={buildings}
            apartmentData={apartment}
            userData={{ client, clientMember, tenant, admin, userData, error }}
          />
        </Stack>
      </Container>
    </Box>
  );
}
