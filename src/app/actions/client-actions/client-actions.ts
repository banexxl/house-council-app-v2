'use server'

import { useTranslation } from "react-i18next";
import { supabase } from "src/libs/supabase/client"
import { Client } from "src/types/client"

export const saveClientAction = async (client: Client): Promise<{ success: boolean, data?: Client, error?: string }> => {
     const { id, ...clientData } = client;

     const { t } = useTranslation();
     // Save client
     const { data, error } = await supabase
          .from('tblClients')
          .insert(clientData);

     if (error) {
          let errorMessage;

          // Check for specific error codes
          switch (error.code) {
               case '23505': // Unique violation
                    errorMessage = t('errors.client.uniqueViolation')
                    break;
               case '23503': // Foreign key violation
                    errorMessage = t('errors.client.foreignKeyViolation');
                    break;
               case '23502': // Not null violation
                    errorMessage = t('errors.client.notNullViolation');
                    break;
               case '42804': // Data type mismatch
                    errorMessage = t('errors.client.dataTypeMismatch');
                    break;
               case '23514': // Check violation
                    errorMessage = t('errors.client.checkViolation');
                    break;
               default:
                    errorMessage = t('errors.client.unexpectedError') + error.message;
                    break;
          }

          return { success: false, error: errorMessage };
     }

     return { success: true, data: data ?? undefined };
}
