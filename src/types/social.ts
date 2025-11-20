// Tenant Profile Types
export interface TenantProfile {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  email?: string;
  date_of_birth?: string;
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
}

export interface UpdateTenantProfilePayload {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  date_of_birth?: string;
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
}

export interface TenantPostImage {
  id: string;
  post_id: string;
  storage_bucket: string;
  storage_path: string;
  created_at?: string;
  updated_at?: string;
}

// Tenant Post Types
export interface TenantPost {
  id: string;
  tenant_id: string;
  content_text: string;
  building_id?: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  // Enriched fields for UI (calculated dynamically)
  images?: TenantPostImage[];
  documents?: { url: string; name: string; mime?: string }[];
  likes_count?: number;
  comments_count?: number;
}

export interface CreateTenantPostPayload {
  tenant_id: string;
  content_text: string;
  building_id: string;
}

export interface UpdateTenantPostPayload {
  content_text?: string;
  is_archived?: boolean;
}

// Tenant Post Like Types
export interface TenantPostLike {
  id: string;
  post_id: string;
  tenant_id: string;
  emoji: string;
  created_at: string;
}

export interface EmojiReaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

export interface CreateTenantPostLikePayload {
  post_id: string;
  emoji: string;
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
  reactions?: EmojiReaction[];
  userReaction?: string; // The emoji the current user reacted with
}

export interface TenantPostCommentWithAuthor extends TenantPostComment {
  author: TenantProfile
}

export const COVER_IMAGES = [
  '/assets/covers/abstract-1-4x3-large.png',
  '/assets/covers/abstract-2-4x3-large.png',
  '/assets/covers/business-1-4x3-large.png',
  '/assets/covers/business-2-4x3-large.png',
  '/assets/covers/minimal-1-4x3-large.png',
  '/assets/covers/minimal-2-4x3-large.png',
  '/assets/covers/abstract-1-4x4-large.png',
  '/assets/covers/abstract-2-4x4-large.png',
  '/assets/covers/business-1-4x4-large.png',
  '/assets/covers/business-2-4x4-large.png',
  '/assets/covers/minimal-1-4x4-large.png',
  '/assets/covers/minimal-2-4x4-large.png',
];

export const AVATAR_IMAGES = [
  '/assets/avatars/avatar-alcides-antonio.png',
  '/assets/avatars/avatar-anika-visser.png',
  '/assets/avatars/avatar-cao-yu.png',
  '/assets/avatars/avatar-carson-darrin.png',
  '/assets/avatars/avatar-chinasa-neo.png',
  '/assets/avatars/avatar-fran-perez.png',
  '/assets/avatars/avatar-iulia-albu.png',
  '/assets/avatars/avatar-jane-rotanson.png',
  '/assets/avatars/avatar-jie-yan-song.png',
  '/assets/avatars/avatar-marcus-finn.png',
  '/assets/avatars/avatar-miron-vitold.png',
  '/assets/avatars/avatar-nasimiyu-danai.png',
  '/assets/avatars/avatar-neha-punita.png',
  '/assets/avatars/avatar-omar-darboe.png',
  '/assets/avatars/avatar-penjani-inyene.png',
  '/assets/avatars/avatar-seo-hyeon-ji.png',
  '/assets/avatars/avatar-siegbert-gottfried.png',
];
