'use client'

import type React from "react"
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material"
import { Field } from "formik"

export interface Client {
     id: string
     name: string
}

interface ClientSelectProps {
     clients: Client[]
}

const ClientSelect: React.FC<ClientSelectProps> = ({ clients }) => {
     return (
          <FormControl fullWidth margin="normal">
               <InputLabel id="client-select-label">Client</InputLabel>
               <Field as={Select} labelId="client-select-label" id="client-select" name="clientId" label="Client">
                    {clients.map((client) => (
                         <MenuItem key={client.id} value={client.id}>
                              {client.name}
                         </MenuItem>
                    ))}
               </Field>
          </FormControl>
     )
}

export default ClientSelect

