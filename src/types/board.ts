export interface Attachment {
          _id: string;
          type: 'image' | 'file';
          url: string;
}

export interface CheckItem {
          _id: string;
          name: string;
          state: 'incomplete' | 'complete';
}

export interface Checklist {
          _id: string;
          checkItems: CheckItem[];
          name: string;
}

export interface Comment {
          _id: string;
          authorId: string;
          createdAt: number;
          message: string;
}

export interface Task {
          _id: string;
          assigneesIds: string[];
          attachments: Attachment[];
          authorId: string;
          checklists: Checklist[];
          columnId: string;
          comments: Comment[];
          description: string | null;
          due: number | null;
          isSubscribed: boolean;
          labels: string[];
          name: string;
}

export interface Column {
          _id: string;
          taskIds: string[];
          name: string;
}

export interface Member {
          _id: string;
          avatar: string | null;
          firstName: string;
          secondName: string;
          email: string;
}

export interface Board {
          _id: string;
          // members: Member[];
          columns: Column[];
          tasks: Task[];
}
