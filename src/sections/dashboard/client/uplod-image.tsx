"use client"

import {
     useState,
     useRef,
     useEffect,
     type ChangeEvent,
     forwardRef,
     useImperativeHandle,
} from "react"
import {
     Avatar,
     Box,
     Button,
     Typography,
     CircularProgress,
} from "@mui/material"
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"
import { uploadEntityFiles } from "src/libs/supabase/sb-storage"
import { useSignedUrl } from "src/hooks/use-signed-urls"
import { SignedAvatar } from "src/components/signed-avatar"

type ImageUploadProps = {
     buttonDisabled: boolean
     onUploadSuccess: (url: string) => void
     userId: string | null | undefined
     initialValue?: string
     sx?: any
}

export type ImageUploadRef = {
     clearImage: () => void
}

export const ImageUpload = forwardRef<ImageUploadRef, ImageUploadProps>(
     ({ buttonDisabled, onUploadSuccess, userId, initialValue, sx }, ref) => {

          const [storedRef, setStoredRef] = useState<string | null>(initialValue ?? null)
          const { url, loading: isLoading } = useSignedUrl(
               storedRef ? storedRef.split('::')[0] : '',
               storedRef ? storedRef.split('::')[1] ?? '' : '',
               { ttlSeconds: 60 * 30, refreshSkewSeconds: 20 }
          );
          const [avatarUrl, setAvatarUrl] = useState<string>(initialValue || "")
          const [loading, setLoading] = useState(false)
          const fileInputRef = useRef<HTMLInputElement>(null)
          const { t } = useTranslation()

          // Update avatar URL when signed URL is loaded
          useEffect(() => {
               if (url) {
                    setAvatarUrl(url);
               }
          }, [url]);


          // Expose clearImage method to the parent
          useImperativeHandle(ref, () => ({
               clearImage: () => {
                    setAvatarUrl("");
                    setStoredRef(null);
               },
          }))

          const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
               const selectedFile = event.target.files?.[0]
               if (!selectedFile) {
                    return
               }

               setLoading(true)

               const fileExtension = selectedFile.name.split(".").pop() || ""
               const title = selectedFile.name.split(".")[0]

               try {
                    const reader = new FileReader()
                    reader.readAsDataURL(selectedFile)

                    reader.onloadend = async () => {
                         if (!userId) {
                              toast.error('Client must be saved before uploading an image');
                              setLoading(false);
                              return;
                         }

                         const uploadResult = await uploadEntityFiles({
                              entity: 'client-image',
                              entityId: userId,
                              files: [selectedFile],
                              clientId: userId,
                         });

                         if (uploadResult.success && uploadResult.records && uploadResult.records[0]) {
                              const record = uploadResult.records[0] as any;
                              const bucket = record.storage_bucket as string;
                              const path = record.storage_path as string;
                              const refKey = `${bucket}::${path}`;
                              setStoredRef(refKey);
                              onUploadSuccess(refKey);
                              toast.success("Image uploaded successfully");
                         } else {
                              toast.error(uploadResult.error || "Failed to upload image");
                              onUploadSuccess("");
                         }
                    }
               } catch (error) {
                    toast.error("Failed to upload image")
                    onUploadSuccess("")
               } finally {
                    setLoading(false)
               }
          }

          return (
               <Box
                    sx={{
                         display: "flex",
                         alignItems: "flex-start",
                         gap: 1,
                         mb: 2,
                         ...sx,
                    }}
               >
                    {/* <Tooltip title={t("clients.clientSaveClientFirst")}> */}
                    <Box
                         sx={{
                              position: "relative",
                              width: 150,
                              height: 150,
                         }}
                    >
                         <SignedAvatar
                              sx={{
                                   width: "100%",
                                   height: "100%",
                                   bgcolor: "grey.100",
                                   border: "1px dashed",
                                   borderColor: "grey.300",
                              }}
                              value={avatarUrl}
                         >
                              {loading ? (
                                   <CircularProgress size={40} />
                              ) : (
                                   <CameraAltOutlinedIcon sx={{ fontSize: 40, color: "grey.500" }} />
                              )}
                         </SignedAvatar>
                    </Box>
                    {/* </Tooltip> */}
                    <Box
                         sx={{
                              display: "flex",
                              flexDirection: "column",
                              mt: 2,
                         }}
                    >
                         <Typography variant="h6" sx={{ mt: 1 }}>
                              Avatar
                         </Typography>
                         <Typography variant="body2" color="text.secondary">
                              {t('common.imageUploadRequirements')}
                         </Typography>
                         <Button
                              variant="outlined"
                              component="label"
                              size="small"
                              sx={{
                                   mt: 1,
                                   width: '100px',
                              }}
                              onClick={() => fileInputRef.current?.click()}
                              disabled={buttonDisabled || loading}
                         >
                              {loading ? "Uploading..." : "Select"}
                         </Button>
                         <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/png, image/jpeg"
                              onChange={handleFileSelect}
                              style={{
                                   display: "none",
                                   clip: 'rect(0 0 0 0)',
                                   clipPath: 'inset(50%)',
                                   height: '1px',
                                   overflow: 'hidden',
                                   position: 'absolute',
                                   bottom: 0,
                                   left: 0,
                                   whiteSpace: 'nowrap',
                                   width: '1px',
                              }}
                         />
                    </Box>
               </Box>
          )
     }
)

ImageUpload.displayName = "ImageUpload"
