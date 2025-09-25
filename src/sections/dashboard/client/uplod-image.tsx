"use client"

import {
     useState,
     useRef,
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
import { uploadClientImagesAndGetUrls } from "src/libs/supabase/sb-storage"

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
          const [avatarUrl, setAvatarUrl] = useState<string>(initialValue !== undefined && initialValue !== "" ? initialValue : "")
          const [loading, setLoading] = useState(false)
          const fileInputRef = useRef<HTMLInputElement>(null)
          const { t } = useTranslation()


          // Expose clearImage method to the parent
          useImperativeHandle(ref, () => ({
               clearImage: () => setAvatarUrl(""),
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
                         const base64Data = reader.result
                         const formData = new FormData()
                         formData.append("file", base64Data as string)
                         formData.append("title", title)
                         formData.append("extension", fileExtension)
                         formData.append("fileName", selectedFile.name)
                         // Provide the client id (preferred) to server action so storage path = clients/<userId>/logos/<file>
                         if (!userId) {
                              toast.error('Client must be saved before uploading an image');
                              setLoading(false);
                              return;
                         }
                         const { success, urls, error: imageUploadResponse } = await uploadClientImagesAndGetUrls([selectedFile], userId);

                         if (success && urls && urls[0]) {
                              const firstUrl = urls[0];
                              setAvatarUrl(firstUrl);
                              toast.success("Image uploaded successfully");
                              onUploadSuccess(firstUrl);
                         } else {
                              toast.error(imageUploadResponse || "Failed to upload image");
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
                         <Avatar
                              sx={{
                                   width: "100%",
                                   height: "100%",
                                   bgcolor: "grey.100",
                                   border: "1px dashed",
                                   borderColor: "grey.300",
                              }}
                              src={avatarUrl}
                         >
                              {loading ? (
                                   <CircularProgress size={40} />
                              ) : (
                                   <CameraAltOutlinedIcon sx={{ fontSize: 40, color: "grey.500" }} />
                              )}
                         </Avatar>
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
                              Min 400×400px, PNG or JPEG
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
