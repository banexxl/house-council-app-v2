'use client';

import { useEffect, useState } from "react";
import {
     Box,
     Button,
     Card,
     CardContent,
     Container,
     Stack,
     Table,
     TableBody,
     TableCell,
     TableContainer,
     TableHead,
     TableRow,
     TextField,
     Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { createEntity, deleteEntity, updateEntity } from "src/app/actions/base-entity-actions";
import { PopupModal } from "src/components/modal-dialog";
import { useDialog } from "src/hooks/use-dialog";
import { TABLES } from "src/libs/supabase/tables";
import { BaseEntity, FeatureExtension } from "src/types/base-entity";

type FeatureRow = BaseEntity & Partial<FeatureExtension>;

interface FeaturesProps {
     features: FeatureRow[];
}

interface DeleteDialogData {
     id: string;
}

const sortByName = (items: FeatureRow[]) => [...items].sort((a, b) => a.name.localeCompare(b.name));

const Features = ({ features }: FeaturesProps) => {
     const { t } = useTranslation();
     const [rows, setRows] = useState<FeatureRow[]>(() => sortByName(features || []));
     const [editingId, setEditingId] = useState<string | null>(null);
     const [draft, setDraft] = useState<{ name: string; description: string }>({ name: "", description: "" });
     const [savingId, setSavingId] = useState<string | null>(null);
     const [deletingId, setDeletingId] = useState<string | null>(null);
     const deleteDialog = useDialog<DeleteDialogData>();

     useEffect(() => {
          setRows(sortByName(features || []));
     }, [features]);

     const setDraftField = (field: "name" | "description", value: string) => {
          setDraft((prev) => ({ ...prev, [field]: value }));
     };

     const startEdit = (row?: FeatureRow) => {
          setEditingId(row?.id ?? "new");
          setDraft({
               name: row?.name ?? "",
               description: row?.description ?? "",
          });
     };

     const cancelEdit = () => {
          setEditingId(null);
          setDraft({ name: "", description: "" });
          setSavingId(null);
     };

     const resolveErrorKey = (error: any, fallback: string) => {
          const key = typeof error === "string" ? error : error?.message;
          switch (key) {
               case "clients.clientSettingsNoTableError":
               case "clients.clientSettingsNoEntityError":
               case "clients.clientSettingsNoNameError":
               case "clients.clientSettingsAlreadyExists":
                    return key;
               default:
                    return fallback;
          }
     };

     const handleSave = async () => {
          if (!editingId) return;
          if (!draft.name.trim()) {
               toast.error(t("clients.clientSettingsNoNameError"));
               return;
          }

          const payload = {
               name: draft.name.trim(),
               description: draft.description.trim(),
          };

          setSavingId(editingId);

          try {
               if (editingId === "new") {
                    const { success, createdEntity, error } = await createEntity<FeatureRow>(TABLES.FEATURES, payload as FeatureRow);
                    if (success && createdEntity) {
                         setRows((prev) => sortByName([...prev, createdEntity]));
                         toast.success(t("common.actionCreateSuccess"));
                         cancelEdit();
                    } else {
                         toast.error(t(resolveErrorKey(error, "clients.clientSettingsNewError")));
                    }
               } else {
                    const { success, updatedEntity, error } = await updateEntity<FeatureRow>(TABLES.FEATURES, editingId, payload);
                    if (success && updatedEntity) {
                         setRows((prev) =>
                              sortByName(
                                   prev.map((row) => (row.id === editingId ? { ...row, ...updatedEntity } : row)),
                              ),
                         );
                         toast.success(t("common.actionUpdateSuccess"));
                         cancelEdit();
                    } else {
                         toast.error(t(resolveErrorKey(error, "common.actionUpdateError")));
                    }
               }
          } catch (error) {
               toast.error(t(resolveErrorKey(error, editingId === "new" ? "clients.clientSettingsNewError" : "common.actionUpdateError")));
          } finally {
               setSavingId(null);
          }
     };

     const handleDelete = async (id: string) => {
          if (!id) {
               deleteDialog.handleClose();
               return;
          }
          deleteDialog.handleClose();
          setDeletingId(id);
          try {
               const { success } = await deleteEntity(TABLES.FEATURES, id);
               if (success) {
                    setRows((prev) => prev.filter((row) => row.id !== id));
                    if (editingId === id) {
                         cancelEdit();
                    }
                    toast.success(t("common.actionDeleteSuccess"));
               } else {
                    toast.error(t("common.actionDeleteError"));
               }
          } catch (error) {
               toast.error(t("common.actionDeleteError"));
          } finally {
               setDeletingId(null);
          }
     };

     return (
          <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
               <Container maxWidth="lg">
                    <Stack spacing={3}>
                         <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Box>
                                   <Typography variant="h4">{t("clients.featuresTableName")}</Typography>
                              </Box>
                              <Button
                                   variant="contained"
                                   onClick={() => startEdit()}
                                   disabled={!!editingId || !!savingId}
                              >
                                   {t("common.btnAdd")}
                              </Button>
                         </Stack>

                         <Card>
                              <CardContent>
                                   <TableContainer>
                                        <Table>
                                             <TableHead>
                                                  <TableRow>
                                                       <TableCell>{t("common.lblName")}</TableCell>
                                                       <TableCell>{t("common.lblDescription")}</TableCell>
                                                       <TableCell align="right">{t("common.lblActions")}</TableCell>
                                                  </TableRow>
                                             </TableHead>
                                             <TableBody>
                                                  {editingId === "new" && (
                                                       <TableRow key="new">
                                                            <TableCell sx={{ width: "30%" }}>
                                                                 <TextField
                                                                      size="small"
                                                                      fullWidth
                                                                      value={draft.name}
                                                                      onChange={(e) => setDraftField("name", e.target.value)}
                                                                      autoFocus
                                                                 />
                                                            </TableCell>
                                                            <TableCell>
                                                                 <TextField
                                                                      size="small"
                                                                      fullWidth
                                                                      multiline
                                                                      minRows={1}
                                                                      maxRows={4}
                                                                      value={draft.description}
                                                                      onChange={(e) => setDraftField("description", e.target.value)}
                                                                 />
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                 <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                                      <Button
                                                                           variant="contained"
                                                                           size="small"
                                                                           onClick={handleSave}
                                                                           disabled={savingId === "new"}
                                                                      >
                                                                           {savingId === "new" ? t("common.lblWorking") : t("common.btnSave")}
                                                                      </Button>
                                                                      <Button
                                                                           variant="text"
                                                                           size="small"
                                                                           onClick={cancelEdit}
                                                                           disabled={savingId === "new"}
                                                                      >
                                                                           {t("common.btnCancel")}
                                                                      </Button>
                                                                 </Stack>
                                                            </TableCell>
                                                       </TableRow>
                                                  )}

                                                  {rows.map((row) => {
                                                       const isEditing = editingId === row.id;
                                                       return (
                                                            <TableRow key={row.id}>
                                                                 <TableCell
                                                                      onClick={() => !isEditing && !savingId && startEdit(row)}
                                                                      sx={{ cursor: isEditing ? "default" : "pointer", width: "30%" }}
                                                                 >
                                                                      {isEditing ? (
                                                                           <TextField
                                                                                size="small"
                                                                                fullWidth
                                                                                value={draft.name}
                                                                                onChange={(e) => setDraftField("name", e.target.value)}
                                                                                autoFocus
                                                                           />
                                                                      ) : (
                                                                           row.name
                                                                      )}
                                                                 </TableCell>
                                                                 <TableCell
                                                                      onClick={() => !isEditing && !savingId && startEdit(row)}
                                                                      sx={{ cursor: isEditing ? "default" : "pointer" }}
                                                                 >
                                                                      {isEditing ? (
                                                                           <TextField
                                                                                size="small"
                                                                                fullWidth
                                                                                multiline
                                                                                minRows={1}
                                                                                maxRows={4}
                                                                                value={draft.description}
                                                                                onChange={(e) => setDraftField("description", e.target.value)}
                                                                           />
                                                                      ) : (
                                                                           row.description || "-"
                                                                      )}
                                                                 </TableCell>
                                                                 <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                                                      {isEditing ? (
                                                                           <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                                                <Button
                                                                                     variant="contained"
                                                                                     size="small"
                                                                                     onClick={handleSave}
                                                                                     disabled={!!savingId}
                                                                                >
                                                                                     {savingId === row.id ? t("common.lblWorking") : t("common.btnSave")}
                                                                                </Button>
                                                                                <Button
                                                                                     variant="text"
                                                                                     size="small"
                                                                                     onClick={cancelEdit}
                                                                                     disabled={!!savingId}
                                                                                >
                                                                                     {t("common.btnCancel")}
                                                                                </Button>
                                                                           </Stack>
                                                                      ) : (
                                                                           <Button
                                                                                color="error"
                                                                                variant="outlined"
                                                                                size="small"
                                                                                onClick={() => deleteDialog.handleOpen({ id: row.id || "" })}
                                                                                disabled={(deletingId !== null && deletingId !== row.id) || !!savingId}
                                                                           >
                                                                                {deletingId === row.id ? t("common.lblWorking") : t("common.btnDelete")}
                                                                           </Button>
                                                                      )}
                                                                 </TableCell>
                                                            </TableRow>
                                                       );
                                                  })}

                                                  {rows.length === 0 && editingId !== "new" && (
                                                       <TableRow>
                                                            <TableCell colSpan={3}>
                                                                 <Typography align="center" color="text.secondary">
                                                                      {t("account.billing.noFeatures")}
                                                                 </Typography>
                                                            </TableCell>
                                                       </TableRow>
                                                  )}
                                             </TableBody>
                                        </Table>
                                   </TableContainer>
                              </CardContent>
                         </Card>
                    </Stack>
               </Container>

               <PopupModal
                    isOpen={deleteDialog.open}
                    onClose={deleteDialog.handleClose}
                    onConfirm={() => handleDelete(deleteDialog.data?.id || "")}
                    title={t("warning.deleteWarningTitle")}
                    type="confirmation"
                    confirmText={t("common.btnDelete")}
                    cancelText={t("common.btnClose")}
                    loading={!!deletingId}
               >
                    {t("warning.deleteWarningMessage")}
               </PopupModal>
          </Box>
     );
};

export default Features;
