export type ItemType = 'file' | 'folder';

export interface Item {
          _id: string;
          author?: {
                    avatar?: string;
                    name?: string;
          };
          createdDateTime?: number | null;
          extension?: string;
          isFavorite?: boolean;
          isPublic?: boolean;
          items?: Item[];
          itemsCount?: number;
          name: string;
          shared?: {
                    avatar?: string;
                    name?: string;
          }[];
          size: number;
          tags?: string[];
          type: ItemType;
          updatedAt?: number | null;
}
