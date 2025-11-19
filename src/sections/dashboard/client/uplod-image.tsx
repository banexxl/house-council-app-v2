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

const buildStoredRefKey = (value?: string | null) => {
     if (!value) return null;
     if (value.includes("::")) return value;
     const match = value.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?]+)/);
     if (!match) return null;
     const [, bucket, encodedPath] = match;
     let path = encodedPath;
     try {
          path = decodeURIComponent(encodedPath);
     } catch {
          path = encodedPath;
     }
     return `${bucket}::${path}`;
};

export const ImageUpload = forwardRef<ImageUploadRef, ImageUploadProps>(
     ({ buttonDisabled, onUploadSuccess, userId, initialValue, sx }, ref) => {
          const initialStoredRef = buildStoredRefKey(initialValue);
          const [storedRef, setStoredRef] = useState<string | null>(initialStoredRef)
          const { url, loading: isLoading } = useSignedUrl(
               storedRef ? storedRef.split('::')[0] : '',
               storedRef ? storedRef.split('::')[1] ?? '' : '',
               { ttlSeconds: 60 * 30, refreshSkewSeconds: 20 }
          );
          const [avatarUrl, setAvatarUrl] = useState<string>(initialStoredRef ? "" : (initialValue || ""))
          const [loading, setLoading] = useState(false)
          const fileInputRef = useRef<HTMLInputElement>(null)
          const { t } = useTranslation()

          // Sync internal refs when parent provides a new initial value
          useEffect(() => {
               if (!initialValue) {
                    setStoredRef(null);
                    setAvatarUrl("");
                    return;
               }
               const refKey = buildStoredRefKey(initialValue);
               if (refKey) {
                    setStoredRef(refKey);
               } else {
                    setStoredRef(null);
                    setAvatarUrl(initialValue);
               }
          }, [initialValue]);

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

               if (!userId) {
                    toast.error('Client must be saved before uploading an image');
                    event.target.value = '';
                    return;
               }

               setLoading(true)
               const reader = new FileReader()
               reader.onload = () => {
                    if (typeof reader.result === 'string') {
                         setAvatarUrl(reader.result)
                    }
               }
               reader.readAsDataURL(selectedFile)

               try {
                    const uploadResult = await uploadEntityFiles({
                         entity: 'client-image',
                         entityId: userId,
                         files: [selectedFile],
                         clientId: userId,
                    });

                    if (uploadResult.success) {
                         const signedUrl = uploadResult.signedUrls?.[0] || "";
                         if (signedUrl) {
                              setAvatarUrl(signedUrl);
                              const refKey = buildStoredRefKey(signedUrl);
                              if (refKey) setStoredRef(refKey);
                         } else if (uploadResult.records?.length) {
                              const record = uploadResult.records[0] as { storage_bucket?: string; storage_path?: string };
                              if (record?.storage_bucket && record?.storage_path) {
                                   setStoredRef(`${record.storage_bucket}::${record.storage_path}`);
                              }
                         }
                         onUploadSuccess(signedUrl);
                         toast.success("Image uploaded successfully");
                    } else {
                         toast.error(uploadResult.error || "Failed to upload image");
                         onUploadSuccess("");
                    }
               } catch (error) {
                    toast.error("Failed to upload image")
                    onUploadSuccess("")
               } finally {
                    setLoading(false)
                    if (fileInputRef.current) {
                         fileInputRef.current.value = ''
                    }
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
