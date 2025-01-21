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
     styled,
     Tooltip,
} from "@mui/material"
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined"
import { uploadFile } from "src/app/actions/client-actions/client-image-actions"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"

const VisuallyHiddenInput = styled("input")`
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  bottom: 0;
  left: 0;
  white-space: nowrap;
  width: 1px;
`

type AvatarUploadProps = {
     buttonDisabled: boolean
     onUploadSuccess: (url: string) => void
     folderName: string
}

export type AvatarUploadRef = {
     clearImage: () => void
}

export const AvatarUpload = forwardRef<AvatarUploadRef, AvatarUploadProps>(
     ({ buttonDisabled, onUploadSuccess, folderName }, ref) => {
          const [avatarUrl, setAvatarUrl] = useState<string>("")
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
                         formData.append("folderName", folderName)

                         const imageUploadResponse = await uploadFile(formData)

                         if (imageUploadResponse.success && imageUploadResponse.awsUrl) {
                              setAvatarUrl(imageUploadResponse.awsUrl)
                              toast.success("Image uploaded successfully")
                              onUploadSuccess(imageUploadResponse.awsUrl)
                         } else {
                              toast.error(imageUploadResponse.message || "Failed to upload image")
                              onUploadSuccess("")
                         }
                    }
               } catch (error) {
                    console.error("Error uploading image:", error)
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
                    }}
               >
                    <Tooltip title={t("clients.fillMandatoryFieldsFirst")}>
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
                    </Tooltip>
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
                              sx={{ mt: 1 }}
                              onClick={() => fileInputRef.current?.click()}
                              disabled={buttonDisabled || loading}
                         >
                              {loading ? "Uploading..." : "Select"}
                         </Button>
                         <VisuallyHiddenInput
                              ref={fileInputRef}
                              type="file"
                              accept="image/png, image/jpeg"
                              onChange={handleFileSelect}
                         />
                    </Box>
               </Box>
          )
     }
)

AvatarUpload.displayName = "AvatarUpload"
