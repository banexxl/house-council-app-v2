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
     Button,
     Paper,
     Card,
     CardHeader,
     CardContent,
     type SelectChangeEvent,
     Box,
} from "@mui/material"
import type { BaseEntity } from "src/app/actions/base-entity-actions"
import { useTranslation } from "react-i18next"
import { useDialog } from "src/hooks/use-dialog"
import { PopupModal } from "src/components/modal-dialog"
import toast from "react-hot-toast"

interface GenericTableEditorProps {
     clientStatuses: BaseEntity[]
     clientTypes: BaseEntity[]
     clientPaymentMethods: BaseEntity[]
     clientBillingInformationStatuses: BaseEntity[]
     invoiceStatuses: BaseEntity[]
     subscriptionPlanStatuses: BaseEntity[]
     features: BaseEntity[] & { base_price_per_month: number }[]
     buildingStatuses: BaseEntity[]
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
     createEntity: <T extends BaseEntity>(
          table: string,
          entity: T,
     ) => Promise<{ success: boolean; createdEntity?: T; error?: any }>
}

interface DeleteEntityData {
     entityId: string;
}

const GenericTableEditor: React.FC<GenericTableEditorProps> = ({
     clientStatuses,
     clientTypes,
     clientPaymentMethods,
     clientBillingInformationStatuses,
     invoiceStatuses,
     subscriptionPlanStatuses,
     features,
     buildingStatuses,
     updateEntity,
     deleteEntity,
     createEntity,
}) => {
     const [selectedTable, setSelectedTable] = useState<string>("")
     const [editingRow, setEditingRow] = useState<BaseEntity | null>(null)
     const [newRow, setNewRow] = useState<BaseEntity | null>(null)
     const editRowRef = useRef<HTMLTableRowElement>(null)
     const deleteDialog = useDialog<DeleteEntityData>()
     const { t } = useTranslation()

     useEffect(() => {
          function handleClickOutside(event: MouseEvent) {
               if (editRowRef.current && !editRowRef.current.contains(event.target as Node)) {
                    setEditingRow(null)
                    setNewRow(null)
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
               displayName: "clients.clientStatusesTableName",
               data: clientStatuses,
          },
          {
               name: "tblClientTypes",
               displayName: "clients.clientTypesTableName",
               data: clientTypes,
          },
          {
               name: "tblClientPaymentMethods",
               displayName: "clients.clientPaymentMethodsTableName",
               data: clientPaymentMethods,
          },
          {
               name: "tblClientBillingInformationStatuses",
               displayName: "clients.clientBillingInformationStatusesTableName",
               data: clientBillingInformationStatuses,
          },
          {
               name: "tblInvoiceStatuses",
               displayName: "clients.invoiceStatusesTableName",
               data: invoiceStatuses,
          },
          {
               name: "tblSubscriptionPlanStatuses",
               displayName: "subscriptionPlans.subscriptionPlanStatusesTableName",
               data: subscriptionPlanStatuses,
          },
          {
               name: "tblFeatures",
               displayName: "clients.featuresTableName",
               data: features,
          },
          {
               name: "tblBuildingStatuses",
               displayName: "clients.buildingStatusesTableName",
               data: buildingStatuses,
          },
     ]

     const handleTableChange = (event: SelectChangeEvent<string>) => {
          setSelectedTable(event.target.value as string)
          setEditingRow(null)
          setNewRow(null)
     }

     const handleEdit = (row: BaseEntity) => {
          setEditingRow(row)
          setNewRow(null)
     }

     const handleSave = async () => {
          if (editingRow && selectedTable) {
               try {
                    const result = await updateEntity(selectedTable, editingRow.id!, {
                         name: editingRow.name || "",
                         description: editingRow.description || "",
                    })
                    if (result.success) {
                         setEditingRow(null)
                         toast.success(t('clients.clientSettingsSaveSuccess'))
                    } else {
                         result.error == 'clients.clientSettingsNoTableError' ? toast.error(t('clients.clientSettingsNoTableError'))
                              : result.error == 'clients.clientSettingsNoEntityError' ? toast.error(t('clients.clientSettingsNoEntityError'))
                                   : result.error == 'clients.clientSettingsNoNameError' ? toast.error(t('clients.clientSettingsNoNameError'))
                                        : result.error == 'clients.clientSettingsAlreadyExists' ? toast.error(t('clients.clientSettingsAlreadyExists'))
                                             : toast.error(t('clients.clientSettingsNewError'))
                    }
               } catch (error) {
                    toast.error(t('clients.clientSettingsSaveError'))
               }
          }
     }

     const handleDelete = async (id: string) => {
          deleteDialog.handleClose()
          if (selectedTable) {
               try {
                    const { success } = await deleteEntity(selectedTable, id!, {})
                    if (success) {
                         toast.success(t('clients.clientSettingsDeleteSuccess'))
                    } else {
                         toast.error(t('clients.clientSettingsDeleteError'))
                    }
               } catch (error) {
                    toast.error(t('clients.clientSettingsDeleteError'))
               }
          }
     }

     const handlePropertyNameInputChange = (e: React.ChangeEvent<HTMLInputElement>, isNewRow = false) => {
          if (isNewRow && newRow) {
               setNewRow({
                    ...newRow,
                    name: e.target.textContent ? e.target.textContent : "",
               })
          } else if (editingRow) {
               setEditingRow({
                    ...editingRow,
                    name: e.target.textContent ? e.target.textContent : "",
               })
          }
     }

     const handlePropertyDescriptionInputChange = (e: React.ChangeEvent<HTMLInputElement>, isNewRow = false) => {
          if (isNewRow && newRow) {
               setNewRow({
                    ...newRow,
                    description: e.target.textContent ? e.target.textContent : "",
               })
          } else if (editingRow) {
               setEditingRow({
                    ...editingRow,
                    description: e.target.textContent ? e.target.textContent : "",
               })
          }
     }

     const handleAddRow = () => {
          setNewRow({ id: "", name: "", description: "" })
          setEditingRow(null)
     }

     const handleSaveNewRow = async () => {
          if (newRow && selectedTable) {
               try {
                    const result = await createEntity(selectedTable, {
                         name: newRow.name || "",
                         description: newRow.description || "",
                    })
                    if (result.success) {
                         setNewRow(null)
                         toast.success(t('clients.clientSettingsNewSuccess'))
                    } else {
                         result.error == 'clients.clientSettingsNoTableError' ? toast.error(t('clients.clientSettingsNoTableError'))
                              : result.error == 'clients.clientSettingsNoEntityError' ? toast.error(t('clients.clientSettingsNoEntityError'))
                                   : result.error == 'clients.clientSettingsNoNameError' ? toast.error(t('clients.clientSettingsNoNameError'))
                                        : result.error == 'clients.clientSettingsAlreadyExists' ? toast.error(t('clients.clientSettingsAlreadyExists'))
                                             : toast.error(t('clients.clientSettingsNewError'))
                    }
               } catch (error) {
                    toast.error(t('clients.clientSettingsNewError'))
               }
          }
     }

     const handleCancelNewRow = () => {
          setNewRow(null)
     }

     const currentTable = tables.find((table) => table.name === selectedTable)

     return (
          <Card>
               <CardHeader subheader={t("clients.clientComponentSettingsShortDescription")} title={t("clients.clientComponentSettings")} titleTypographyProps={{ variant: "h5" }} />
               <CardContent>
                    <Select value={selectedTable} onChange={(e: any) => handleTableChange(e)} fullWidth sx={{ mb: 2 }}>
                         {tables.map((table) => (
                              <MenuItem key={table.name} value={table.name}>
                                   {t(table.displayName)}
                              </MenuItem>
                         ))}
                    </Select>
                    {currentTable && !newRow && (
                         <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <Button onClick={handleAddRow} sx={{}}>
                                   {t("common.btnAdd")}
                              </Button>
                         </Box>
                    )}
                    {currentTable && (
                         <TableContainer component={Paper}>
                              <Table>
                                   <TableHead>
                                        <TableRow>
                                             <TableCell>{t("common.lblName")}</TableCell>
                                             <TableCell>{t("common.lblDescription")}</TableCell>
                                             <TableCell align="center">{t("common.lblActions")}</TableCell>
                                        </TableRow>
                                   </TableHead>
                                   <TableBody>
                                        {newRow && (
                                             <TableRow ref={editRowRef}>
                                                  <TableCell>
                                                       <div
                                                            contentEditable={true}
                                                            onInput={(e: any) => handlePropertyNameInputChange(e, true)}
                                                            suppressContentEditableWarning={true}
                                                            style={{
                                                                 width: "100%",
                                                                 minHeight: "1.5em",
                                                                 padding: "4px",
                                                                 border: "1px solid #ccc",
                                                                 borderRadius: "4px",
                                                                 outline: "none",
                                                            }}
                                                       />
                                                  </TableCell>
                                                  <TableCell>
                                                       <div
                                                            contentEditable={true}
                                                            onInput={(e: any) => handlePropertyDescriptionInputChange(e, true)}
                                                            suppressContentEditableWarning={true}
                                                            style={{
                                                                 width: "100%",
                                                                 minHeight: "1.5em",
                                                                 padding: "4px",
                                                                 border: "1px solid #ccc",
                                                                 borderRadius: "4px",
                                                                 outline: "none",
                                                            }}
                                                       />
                                                  </TableCell>
                                                  <TableCell align="right">
                                                       <Button onClick={handleSaveNewRow}>{t("common.btnSave")}</Button>
                                                       <Button onClick={handleCancelNewRow}>{t("common.btnCancel")}</Button>
                                                  </TableCell>
                                             </TableRow>
                                        )}
                                        {currentTable.data
                                             .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))
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
                                                                 <Button onClick={handleSave}>{t("common.btnSave")}</Button>
                                                            ) : (
                                                                 <Button onClick={() => handleEdit(row)}>{t("common.btnEdit")}</Button>
                                                            )}
                                                            <Button onClick={() =>
                                                                 deleteDialog.handleOpen({
                                                                      entityId: row.id || "",
                                                                 })}
                                                            >
                                                                 {t("common.btnDelete")}
                                                            </Button>
                                                       </TableCell>
                                                  </TableRow>
                                             ))}
                                   </TableBody>
                              </Table>
                         </TableContainer>
                    )}
               </CardContent>
               <PopupModal
                    isOpen={deleteDialog.open}
                    onClose={deleteDialog.handleClose}
                    onConfirm={() => handleDelete(deleteDialog.data?.entityId || "")}
                    title={t("clients.clientSettingsDeleteWarning")}
                    type="confirmation"
               />
          </Card>
     )
}

export default GenericTableEditor

