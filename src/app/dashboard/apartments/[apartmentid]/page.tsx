import { getAllBuildingsFromClient, getBuildingById, getAllBuildings } from "src/app/actions/building/building-actions";
import { getApartmentById } from "src/app/actions/apartment/apartment-actions";
import { getViewer } from "src/libs/supabase/server-auth";
import { Box, Container, Stack } from "@mui/material";
import { ApartmentFormHeader } from "src/sections/dashboard/apartments/apartment-form-header";
import { ApartmentCreateForm } from "./new-apartment";
import { logout } from "src/app/auth/actions";
import { redirect } from "next/navigation";
import { readClientOrClientIDFromClientMemberID } from "src/app/actions/client/client-members";

export default async function Page({ params }: {
  params: Promise<{ apartmentid: string }>
}) {
  const { apartmentid } = await params;
  const { client, clientMember, tenant, admin, userData, error } = await getViewer();
  const client_id = client ? client.id : clientMember ? clientMember.client_id : null;
  if (!client && !clientMember && !tenant && !admin) {
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
      getAllBuildingsFromClient(client_id!),
      apartmentid ? getApartmentById(apartmentid) : Promise.resolve({ success: true, data: undefined }),
    ]);
    buildings = buildingsRes.success ? buildingsRes.data : undefined;
    apartment = apartmentRes.success ? apartmentRes.data : undefined;
  } else if (clientMember) {
    // For client, fetch only their buildings and the apartment by id
    const { success, data } = await readClientOrClientIDFromClientMemberID(client_id!);
    if (!success || !data) {
      redirect('/dashboard/apartments');
    }
    const [buildingsRes, apartmentRes] = await Promise.all([
      getAllBuildingsFromClient(typeof data === 'string' ? data : data?.id!),
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
