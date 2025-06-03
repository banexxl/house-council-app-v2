'use server';

import { getBuildingById } from "src/app/actions/building/building-actions";
import Buildings from "./buildings";
import { useRouter } from "next/navigation";

const Page = async () => {

  return (
    <Buildings />
  );
};

export default Page;

