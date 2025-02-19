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
import { useTranslation } from "react-i18next"

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
     const { t } = useTranslation()

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
               name: "tblClientStatuses",
               displayName: 'clients.clientStatusesTableName',
               data: clientStatuses
          },
          {
               name: "tblClientTypes",
               displayName: 'clients.clientTypesTableName',
               data: clientTypes
          },
          {
               name: "tblClientPaymentMethods",
               displayName: 'clients.clientPaymentMethodsTableName',
               data: clientPaymentMethods
          },
          {
               name: "tblClientBillingInformationStatuses",
               displayName: 'clients.clientBillingInformationStatusesTableName',
               data: clientBillingInformationStatuses,
          },
     ]

     const handleTableChange = (event: SelectChangeEvent<string>) => {
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

     const handlePropertyNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          if (editingRow) {
               setEditingRow({
                    ...editingRow,
                    name: e.target.textContent ? e.target.textContent : "",
               })
          }
     }

     const handlePropertyDescriptionInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          if (editingRow) {
               setEditingRow({
                    ...editingRow,
                    description: e.target.textContent ? e.target.textContent : "",
               })
          }
     }

     const currentTable = tables.find((table) => table.name === selectedTable)

     return (
          <Card >
               <CardHeader title={t('clients.clientComponentSettings')} />
               <CardContent>
                    <Select value={selectedTable} onChange={(e: any) => handleTableChange(e)} fullWidth sx={{ mb: 2 }} >
                         {tables.map((table) => (
                              <MenuItem key={table.name} value={table.name}>
                                   {t(table.displayName)}
                              </MenuItem>
                         ))}
                    </Select>
                    {currentTable && (
                         <TableContainer component={Paper}>
                              <Table>
                                   <TableHead>
                                        <TableRow>
                                             <TableCell>{t('common.lblName')}</TableCell>
                                             <TableCell>{t('common.lblDescription')}</TableCell>
                                             <TableCell align="center">{t('common.lblActions')}</TableCell>
                                        </TableRow>
                                   </TableHead>
                                   <TableBody>
                                        {currentTable.data
                                             .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
                                             .map((row: BaseEntity) => (
                                                  <TableRow key={row.id} ref={editingRow && editingRow.id === row.id ? editRowRef : null}>
                                                       <TableCell>
                                                            <div
                                                                 contentEditable={!!editingRow && editingRow.id === row.id}
                                                                 onInput={(e: any) => handlePropertyNameInputChange(e)}
                                                                 suppressContentEditableWarning={true}
                                                                 style={{
                                                                      width: "100%",
                                                                      minHeight: "1.5em",
                                                                      padding: "4px",
                                                                      border: editingRow && editingRow.id === row.id ? "1px solid #ccc" : "none",
                                                                      borderRadius: "4px",
                                                                      outline: "none",
                                                                 }}
                                                            >
                                                                 {row.name}
                                                            </div>
                                                       </TableCell>
                                                       <TableCell>
                                                            <div
                                                                 contentEditable={!!editingRow && editingRow.id === row.id}
                                                                 onInput={(e: any) => handlePropertyDescriptionInputChange(e)}
                                                                 suppressContentEditableWarning={true}
                                                                 style={{
                                                                      width: "100%",
                                                                      minHeight: "1.5em",
                                                                      padding: "4px",
                                                                      border: editingRow && editingRow.id === row.id ? "1px solid #ccc" : "none",
                                                                      borderRadius: "4px",
                                                                      outline: "none",
                                                                 }}
                                                            >
                                                                 {row.description}
                                                            </div>
                                                       </TableCell>
                                                       <TableCell align="right">
                                                            {editingRow && editingRow.id === row.id ? (
                                                                 <Button onClick={handleSave}>{t('common.btnSave')}</Button>
                                                            ) : (
                                                                 <Button onClick={() => handleEdit(row)}>{t('common.btnEdit')}</Button>
                                                            )}
                                                            <Button onClick={() => handleDelete(row.id!)}>{t('common.btnDelete')}</Button>
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

