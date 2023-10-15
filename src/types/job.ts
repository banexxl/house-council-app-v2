export interface Member {
          _id: string;
          avatar?: string;
          name: string;
          role: string;
          skills?: string[];
}

export interface Job {
          _id: string;
          city?: string;
          country?: string;
          currency: string;
          isRemote?: boolean;
          publishedAt: number;
          salaryMax: string;
          salaryMin: string;
          title: string;
}

export interface Review {
          _id: string;
          author: string;
          avatar?: string;
          createdAt: number;
          description?: string;
          rating: number;
          title: string;
}

export interface Activity {
          _id: string;
          addedJob?: string;
          addedMember?: string;
          author: string;
          avatar?: string;
          createdAt: number;
          createdCompany?: string;
          type: 'new_job' | 'new_team_member' | 'created';
}

export interface Asset {
          _id: string;
          extension: string;
          fileName: string;
          size: string;
          url: string;
}

export interface Company {
          _id: string;
          activities?: Activity[];
          assets?: Asset[];
          averageRating: number;
          description?: string;
          employees: string;
          founders?: Member[];
          images?: string[];
          isVerified: boolean;
          jobs: Job[];
          locations?: string[];
          logo?: string;
          members?: Member[];
          name: string;
          reviews?: Review[];
          shortDescription: string;
          website?: string;
}
