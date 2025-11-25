export type ItemType = 'file' | 'folder';

export interface Item {
  id: string;
  author?: {
    avatar?: string;
    name?: string;
  };
  bucket?: string;
  created_at?: number | null;
  extension?: string;
  isFavorite?: boolean;
  isPublic?: boolean;
  items?: Item[];
  itemsCount?: number;
  last_accessed_at?: number | null;
  name: string;
  path?: string;
  fullPath?: string;
  shared?: {
    avatar?: string;
    name?: string;
  }[];
  size: number;
  tags?: string[];
  type: ItemType;
  updated_at?: number | null;
}
