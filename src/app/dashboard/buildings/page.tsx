'use server';

import { getBuildingById } from "src/app/actions/building/building-actions";
import Buildings from "./buildings";
import { useRouter } from "next/navigation";

interface PageProps {
  params: {
    id: string;
  };
}
const Page = async ({ params }: PageProps) => {


  const { success } = await getBuildingById(params.id as string)

  return (
    <Buildings />
  );
};

export default Page;

