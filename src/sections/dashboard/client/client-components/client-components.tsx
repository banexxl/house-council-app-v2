"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import {
     Select,
     MenuItem,
     TableContainer,
     Table,
     TableHead,
     TableBody,
     TableRow,
     TableCell,
     TextField,
     Button,
     Paper,
     Box,
     Typography,
     Card,
     CardHeader,
     CardContent,
     SelectChangeEvent,
} from "@mui/material"
import { BaseEntity } from "src/app/actions/base-entity-services"

interface GenericTableEditorProps {
     clientStatuses: BaseEntity[]
     clientTypes: BaseEntity[]
     clientPaymentMethods: BaseEntity[]
     clientBillingInformationStatuses: BaseEntity[]
     updateEntity: <T extends BaseEntity>(
          table: string,
          id: string,
          entity: Partial<T>,
     ) => Promise<{ success: boolean; updatedEntity?: T; error?: any }>
     deleteEntity: <T extends BaseEntity>(
          table: string,
          id: string,
          entity: Partial<T>,
     ) => Promise<{ success: boolean; updatedEntity?: T; error?: any }>
}

const GenericTableEditor: React.FC<GenericTableEditorProps> = ({
     clientStatuses,
     clientTypes,
     clientPaymentMethods,
     clientBillingInformationStatuses,
     updateEntity,
     deleteEntity,
}) => {
     const [selectedTable, setSelectedTable] = useState<string>("")
     const [editingRow, setEditingRow] = useState<BaseEntity | null>(null)
     const editRowRef = useRef<HTMLTableRowElement>(null)

     useEffect(() => {
          function handleClickOutside(event: MouseEvent) {
               if (editRowRef.current && !editRowRef.current.contains(event.target as Node)) {
                    setEditingRow(null)
               }
          }

          document.addEventListener("mousedown", handleClickOutside)
          return () => {
               document.removeEventListener("mousedown", handleClickOutside)
          }
     }, [])

     const tables = [
          {
               name: "clientStatuses",
               displayName: "Client Statuses",
               data: clientStatuses
          },
          {
               name: "clientTypes",
               displayName: "Client Types",
               data: clientTypes
          },
          {
               name: "clientPaymentMethods",
               displayName: "Client Payment Methods",
               data: clientPaymentMethods
          },
          {
               name: "clientBillingInformationStatuses",
               displayName: "Billing Information Statuses",
               data: clientBillingInformationStatuses,
          },
     ]

     const handleTableChange = (event: SelectChangeEvent<string>) => {
          console.log('handleTableChange', event.target.value);

          setSelectedTable(event.target.value as string)
          setEditingRow(null)
     }

     const handleEdit = (row: BaseEntity) => {
          setEditingRow(row)
     }

     const handleSave = async () => {
          if (editingRow && selectedTable) {
               try {
                    const result = await updateEntity(selectedTable, editingRow.id!, {
                         name: editingRow.name,
                         description: editingRow.description,
                    })
                    if (result.success) {
                         setEditingRow(null)
                    } else {
                         console.error("Failed to update row:", result.error)
                    }
               } catch (error) {
                    console.error("Error updating row:", error)
               }
          }
     }

     const handleDelete = async (id: string) => {
          if (selectedTable) {
               try {
                    await deleteEntity(selectedTable, id!, {})
               } catch (error) {
                    console.error("Failed to delete row:", error)
               }
          }
     }

     const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          console.log(e.target.name, e.target.value);

          if (editingRow) {
               setEditingRow({
                    ...editingRow,
                    [e.target.name]: e.target.value,
               })
          }
     }

     const currentTable = tables.find((table) => table.name === selectedTable)

     return (
          <Card >
               <CardHeader title="Generic Table Editor" />
               <CardContent>
                    <Select value={selectedTable} onChange={handleTableChange} fullWidth sx={{ mb: 2 }} renderValue={() => (
                         <Typography variant="body2" color="text.secondary">
                              {tables.find((table) => table.name === selectedTable)?.displayName}
                         </Typography>
                    )}>
                         {tables.map((table) => (
                              <MenuItem key={table.name} value={table.name}>
                                   {table.displayName}
                              </MenuItem>
                         ))}
                    </Select>
                    {currentTable && (
                         <TableContainer component={Paper}>
                              <Table>
                                   <TableHead>
                                        <TableRow>
                                             <TableCell>Name</TableCell>
                                             <TableCell>Description</TableCell>
                                             <TableCell>Actions</TableCell>
                                        </TableRow>
                                   </TableHead>
                                   <TableBody>
                                        {currentTable.data.map((row) => (
                                             <TableRow key={row.id} ref={editingRow && editingRow.id === row.id ? editRowRef : null}>
                                                  <TableCell>
                                                       {editingRow && editingRow.id === row.id ? (
                                                            <TextField sx={{ width: '100%' }} name="name" value={editingRow.name} onChange={handleInputChange} />
                                                       ) : (
                                                            row.name
                                                       )}
                                                  </TableCell>
                                                  <TableCell>
                                                       {editingRow && editingRow.id === row.id ? (
                                                            <TextField sx={{ width: '100%' }} name="description" value={editingRow.description} onChange={handleInputChange} />
                                                       ) : (
                                                            row.description
                                                       )}
                                                  </TableCell>
                                                  <TableCell>
                                                       {editingRow && editingRow.id === row.id ? (
                                                            <Button onClick={handleSave}>Save</Button>
                                                       ) : (
                                                            <Button onClick={() => handleEdit(row)}>Edit</Button>
                                                       )}
                                                       <Button onClick={() => handleDelete(row.id!)}>Delete</Button>
                                                  </TableCell>
                                             </TableRow>
                                        ))}
                                   </TableBody>
                              </Table>
                         </TableContainer>
                    )}
               </CardContent>
          </Card>
     )
}

export default GenericTableEditor

