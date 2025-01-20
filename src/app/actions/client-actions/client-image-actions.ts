'use server'

import aws from 'aws-sdk';
import { s3 } from 'src/utils/aws/s3';

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB in bytes

function extractInfoFromUrl(url: string) {
     let splitUrl = url.split('.com/')[1].split('?')[0];
     let key = splitUrl.replace(/%20/g, " ");
     return key;
}

export async function uploadFile(formData: FormData): Promise<{ success: boolean, message: string, awsUrl?: string }> {
     console.log('formData', formData);

     const file = formData.get('file') as string;
     const title = formData.get('title') as string;
     const extension = formData.get('extension') as string;
     const fileName = formData.get('fileName') as string;

     if (!file || !title || !extension) {
          throw new Error('Missing file, title, or extension');
     }

     if (file.length > MAX_FILE_SIZE) {
          return { success: false, message: 'File size limit exceeded' };
     }

     // Determine the content type based on the file extension
     let contentType: string;
     const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif'];

     if (imageExtensions.includes(extension.toLowerCase())) {
          contentType = `image/${extension}`;
     } else {
          return { success: false, message: 'Invalid file type' };
     }

     const base64Prefix = 'data:image/png;base64,';

     const decodedFile = Buffer.from(file.replace(base64Prefix, ''), 'base64');

     // Adjust key to desired structure
     const key = `Clients/Images/Logos/${title}}/${fileName.split('.')[0]}.${extension}`;

     const params: aws.S3.PutObjectRequest = {
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Key: key,
          Body: decodedFile,
          ACL: 'public-read',
          ContentType: contentType,
     };

     try {
          const uploadedFile = await s3.upload(params).promise();
          console.log('uploadedFile', uploadedFile);

          return { success: true, message: 'File uploaded successfully', awsUrl: uploadedFile.Location };
     } catch (error) {
          return { success: false, message: 'Failed to upload file: ' + error };
     }
}

export async function deleteFile(formData: FormData) {
     const awsUrl = formData.get('awsUrl') as string;

     if (!awsUrl) {
          throw new Error('Missing key');
     }

     const key = extractInfoFromUrl(awsUrl);

     const params: aws.S3.DeleteObjectRequest = {
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Key: key
     };

     try {
          await s3.deleteObject(params).promise();
          return { success: true, message: 'Image deleted successfully' };
     } catch (error) {
          console.error('Error deleting image:', error);
          throw new Error('Failed to delete image from S3');
     }
}

