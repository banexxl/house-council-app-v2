import { getAllBuildingsFromClient, getBuildingById, getAllBuildings } from "src/app/actions/building/building-actions";
import { getApartmentById } from "src/app/actions/apartment/apartment-actions";
import { getViewer } from "src/libs/supabase/server-auth";
import { Box, Container, Stack } from "@mui/material";
import { ApartmentCreateForm } from "./new-apartment";
import { logout } from "src/app/auth/actions";
import { redirect } from "next/navigation";
import { resolveClientFromClientOrMember } from "src/app/actions/client/client-members";
import { paths } from "src/paths";

export default async function Page({ params }: {
  params: Promise<{ apartmentid: string }>
}) {
  const { apartmentid } = await params;
  const { customer, tenant, admin, userData, error } = await getViewer();
  const customerId = client ? client.id : clientMember ? clientMember.customerId : null;
  if (!client && !clientMember && !tenant && !admin) {
    redirect(paths.auth.login);
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
      getAllBuildingsFromClient(customerId!),
      apartmentid ? getApartmentById(apartmentid) : Promise.resolve({ success: true, data: undefined }),
    ]);
    buildings = buildingsRes.success ? buildingsRes.data : undefined;
    apartment = apartmentRes.success ? apartmentRes.data : undefined;
  } else if (clientMember) {
    // For client, fetch only their buildings and the apartment by id
    const { success, data } = await resolveClientFromClientOrMember(customerId!);
    if (!success || !data) {
      redirect('/dashboard/apartments');
    }
    const [buildingsRes, apartmentRes] = await Promise.all([
      getAllBuildingsFromClient(customerId!),
      apartmentid ? getApartmentById(apartmentid) : Promise.resolve({ success: true, data: undefined }),
    ]);
    buildings = buildingsRes.success ? buildingsRes.data : undefined;
    apartment = apartmentRes.success ? apartmentRes.data : undefined;
  } else if (tenant) {
    redirect('/dashboard/social/profile');
  }

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
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
