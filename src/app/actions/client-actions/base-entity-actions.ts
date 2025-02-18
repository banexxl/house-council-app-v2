"use server"

import { revalidatePath } from "next/cache"
import { supabase } from "src/libs/supabase/client"
import { BaseEntity } from "../base-entity-services"

export const updateEntity = async (tableName: string, updatedData: BaseEntity) => {

     const { error } = await supabase
          .from(tableName)
          .update({ name: updatedData.name, description: updatedData.description })
          .eq("id", updatedData.id)

     if (error) throw new Error(`Failed to update ${tableName}: ${error.message}`)

     revalidatePath("/dashboard/clients/client-components")
}

export async function deleteEntity(tableName: string, id: string) {

     const { error } = await supabase.from(tableName).delete().eq("id", id)

     if (error) throw new Error(`Failed to delete from ${tableName}: ${error.message}`)

     revalidatePath("/dashboard/clients/client-components")
}

