# Social Post Feature - Setup Guide

## Overview
This document outlines the implementation of the tenant social post CRUD operations with support for images and documents.

## Database Tables Required

Add the following environment variables to your `.env.local` file:

```env
# Tenant Post Tables
NEXT_PUBLIC_SUPABASE_TBL_TENANT_POST_IMAGES=tblTenantPostImages
NEXT_PUBLIC_SUPABASE_TBL_TENANT_POST_DOCUMENTS=tblTenantPostDocuments
```

## Database Schema

### Table: tblTenantPostImages
```sql
CREATE TABLE "tblTenantPostImages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "post_id" UUID NOT NULL REFERENCES "tblTenantPosts"("id") ON DELETE CASCADE,
  "storage_bucket" TEXT NOT NULL,
  "storage_path" TEXT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("post_id", "storage_bucket", "storage_path")
);

-- Add index for faster lookups
CREATE INDEX idx_tenant_post_images_post_id ON "tblTenantPostImages"("post_id");
```

### Table: tblTenantPostDocuments
```sql
CREATE TABLE "tblTenantPostDocuments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "post_id" UUID NOT NULL REFERENCES "tblTenantPosts"("id") ON DELETE CASCADE,
  "storage_bucket" TEXT NOT NULL,
  "storage_path" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "mime_type" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("post_id", "storage_bucket", "storage_path")
);

-- Add index for faster lookups
CREATE INDEX idx_tenant_post_documents_post_id ON "tblTenantPostDocuments"("post_id");
```

### Database Function for Like Increment
```sql
-- Function to increment post likes count
CREATE OR REPLACE FUNCTION increment_post_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE "tblTenantPosts"
  SET likes_count = likes_count + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;
```

## Storage Structure

Files are stored in the Supabase storage bucket with the following paths:

- **Images**: `clients/{userId}/posts/{postId}/images/{filename}`
- **Documents**: `clients/{userId}/posts/{postId}/docs/{filename}`

## Features Implemented

### 1. Post CRUD Operations
- ✅ Create tenant post with content
- ✅ Read posts (all or by building)
- ✅ Read single post by ID
- ✅ Update post content
- ✅ Delete post (with cascade delete of attachments, likes, comments)

### 2. File Upload Operations
- ✅ Upload multiple images to a post
- ✅ Upload multiple documents to a post (PDF, DOC, DOCX, XLS, XLSX, TXT, PPT, PPTX)
- ✅ Remove individual attachments
- ✅ Automatic signed URL generation for secure access

### 3. Like Operations
- ✅ Toggle like/unlike on posts
- ✅ Automatic like count increment/decrement
- ✅ Check if current user liked a post

### 4. Authorization
- ✅ Verify post ownership before update/delete
- ✅ Verify post ownership before attachment operations
- ✅ Automatic tenant ID resolution from authenticated user

### 5. Data Enrichment
- ✅ Include author information (name, avatar)
- ✅ Include signed URLs for images
- ✅ Include signed URLs for documents with metadata
- ✅ Include like status for current user

## Server Actions API

### Available Actions

```typescript
// Create a new post
createTenantPost(payload: CreateTenantPostPayload)

// Get all posts (optionally filtered by building)
getTenantPosts(buildingId?: string)

// Get a single post by ID
getTenantPostById(postId: string)

// Update a post
updateTenantPost(postId: string, payload: UpdateTenantPostPayload)

// Delete a post
deleteTenantPost(postId: string)

// Upload images to a post
uploadPostImages(postId: string, files: File[])

// Upload documents to a post
uploadPostDocuments(postId: string, files: File[])

// Remove an attachment
removePostAttachment(postId: string, storagePathOrUrl: string, type: 'image' | 'document')

// Toggle like on a post
togglePostLike(postId: string)
```

## Component Integration

### SocialPostAdd Component

The `SocialPostAdd` component has been updated with:

- ✅ Text content input
- ✅ Image file selection and preview
- ✅ Document file selection and preview
- ✅ File removal before posting
- ✅ Automatic upload after post creation
- ✅ Toast notifications for success/error
- ✅ Form reset after successful post
- ✅ Callback for post creation events

### Usage Example

```tsx
import { SocialPostAdd } from 'src/sections/dashboard/social/social-post-add';

<SocialPostAdd
  user={currentUserProfile}
  buildingId={optionalBuildingId}
  onPostCreated={() => {
    // Refresh posts list
    refetchPosts();
  }}
/>
```

## Security Considerations

1. **Authentication Required**: All operations require authenticated user
2. **Ownership Verification**: Update/delete operations verify post ownership
3. **File Validation**: 
   - Images must have `image/*` MIME type
   - Documents limited to specific extensions
   - Maximum file size: 15MB for documents
4. **Signed URLs**: All storage URLs are signed with 1-hour TTL
5. **SQL Injection Protection**: Using parameterized queries via Supabase client

## Next Steps

To complete the social feed:

1. Create a feed display component to show posts
2. Implement comment CRUD operations
3. Add real-time updates using Supabase subscriptions
4. Add notification system for likes and comments
5. Implement post editing UI
6. Add image lightbox/viewer
7. Add document preview functionality

## Testing Checklist

- [ ] Create post with text only
- [ ] Create post with images
- [ ] Create post with documents
- [ ] Create post with mixed attachments
- [ ] Update post content
- [ ] Delete post
- [ ] Like/unlike post
- [ ] Upload additional images to existing post
- [ ] Remove attachments from post
- [ ] Verify authorization (can't edit others' posts)
- [ ] Verify file type validation
- [ ] Verify signed URLs are generated correctly
