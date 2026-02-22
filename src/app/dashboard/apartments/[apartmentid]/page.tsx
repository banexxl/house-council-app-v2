import { getAllBuildingsFromClient, getAllBuildings } from "src/app/actions/building/building-actions";
import { getApartmentById } from "src/app/actions/apartment/apartment-actions";
import { getViewer } from "src/libs/supabase/server-auth";
import { Box, Card, Container, Stack } from "@mui/material";
import { ApartmentCreateForm } from "./new-apartment";
import { redirect } from "next/navigation";
import { paths } from "src/paths";

export default async function Page({ params }: {
  params: Promise<{ apartmentid: string }>
}) {
  const { apartmentid } = await params;
  const { customer, tenant, admin, userData, error } = await getViewer();
  const customerId = customer ? customer.id : null;
  if (!customer && !tenant && !admin) {
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
  } else if (customer) {
    // For client, fetch only their buildings and the apartment by id
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
    <Container maxWidth="xl">
      <Card sx={{ p: 2 }}>
        <ApartmentCreateForm
          buildings={buildings}
          apartmentData={apartment}
          userData={{ customer, tenant, admin, userData, error }}
        />
      </Card>
    </Container>
  );
}
