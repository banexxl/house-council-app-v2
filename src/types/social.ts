export type ConnectionStatus = 'connected' | 'not_connected' | 'pending' | 'rejected';

export interface Connection {
          _id: string;
          avatar: string;
          commonConnections: number;
          name: string;
          status: ConnectionStatus;
}

export interface Profile {
          _id: string;
          avatar: string;
          bio: string;
          connectedStatus: string;
          cover: string;
          currentCity: string;
          currentJobCompany: string;
          currentJobTitle: string;
          email: string;
          name: string;
          originCity: string;
          previousJobCompany: string;
          previousJobTitle: string;
          profileProgress: number;
          quote: string;
}

export interface Comment {
          _id: string;
          author: {
                    _id: string;
                    avatar: string;
                    name: string;
          };
          createdDateTime: number;
          message: string;
}

export interface Post {
          _id: string;
          author: {
                    _id: string;
                    avatar: string;
                    name: string;
          };
          comments: Comment[];
          createdDateTime: number;
          isLiked: boolean;
          likes: number;
          media?: string;
          message: string;
}
