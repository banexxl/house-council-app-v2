'use client'

import type React from "react"
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material"
import { Field } from "formik"

export interface ClientSelect {
     id: string
     name: string
}

interface ClientSelectProps {
     clients: ClientSelect[]
}

const ClientSelect: React.FC<ClientSelectProps> = ({ clients }) => {
     return (
          <FormControl fullWidth margin="normal">
               <InputLabel id="client-select-label">ClientSelect</InputLabel>
               <Field as={Select} labelId="client-select-label" id="client-select" name="clientId" label="ClientSelect">
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

