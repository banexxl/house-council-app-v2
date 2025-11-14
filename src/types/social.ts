// Tenant Profile Types
export interface TenantProfile {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  bio?: string;
  avatar_url?: string;
  cover_image_url?: string;
  current_city?: string;
  current_job_title?: string;
  current_job_company?: string;
  previous_job_title?: string;
  previous_job_company?: string;
  origin_city?: string;
  quote?: string;
  profile_progress?: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTenantProfilePayload {
  first_name: string;
  last_name: string;
  phone_number?: string;
  bio?: string;
  avatar_url?: string;
  cover_image_url?: string;
  current_city?: string;
  current_job_title?: string;
  current_job_company?: string;
  previous_job_title?: string;
  previous_job_company?: string;
  origin_city?: string;
  quote?: string;
  is_public?: boolean;
}

export interface UpdateTenantProfilePayload {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  bio?: string;
  avatar_url?: string;
  cover_image_url?: string;
  current_city?: string;
  current_job_title?: string;
  current_job_company?: string;
  previous_job_title?: string;
  previous_job_company?: string;
  origin_city?: string;
  quote?: string;
  is_public?: boolean;
}

// Tenant Post Types
export interface TenantPost {
  id: string;
  tenant_id: string;
  content_text: string;
  image_url?: string;
  likes_count: number;
  comments_count: number;
  is_public: boolean;
  building_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTenantPostPayload {
  content_text: string;
  image_url?: string;
  is_public?: boolean;
  building_id?: string;
}

export interface UpdateTenantPostPayload {
  content_text?: string;
  image_url?: string;
  is_public?: boolean;
}

// Tenant Post Like Types
export interface TenantPostLike {
  id: string;
  post_id: string;
  tenant_id: string;
  created_at: string;
}

export interface CreateTenantPostLikePayload {
  post_id: string;
}

// Tenant Post Comment Types
export interface TenantPostComment {
  id: string;
  post_id: string;
  tenant_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTenantPostCommentPayload {
  post_id: string;
  comment_text: string;
}

export interface UpdateTenantPostCommentPayload {
  comment_text: string;
}

// Extended types with related data for UI consumption
export interface TenantPostWithAuthor extends TenantPost {
  author: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  is_liked?: boolean;
}

export interface TenantPostCommentWithAuthor extends TenantPostComment {
  author: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}
