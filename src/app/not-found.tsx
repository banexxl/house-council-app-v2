import { NotFoundClient } from "src/sections/dashboard/not-found/not-found-client";
import DashboardClientLayout from "./dashboard/layout";

export default function NotFound() {
  return (
    <DashboardClientLayout>
      <NotFoundClient />
    </DashboardClientLayout>
  );
}