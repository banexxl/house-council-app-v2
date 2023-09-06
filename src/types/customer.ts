export interface Customer {
          _id: string;
          address1: string;
          address2?: string;
          avatar?: string;
          city?: string;
          country?: string;
          currency?: string;
          email: string;
          hasAcceptedMarketing?: boolean;
          name: string;
          secondName: string;
          phone?: string;
          state?: string;
          updatedAt?: number;
          zipCode?: string;
}

export interface CustomerLog {
          id: string;
          createdAt: number;
          description: string;
          ip: string;
          method: string;
          route: string;
          status: number;
}

export interface CustomerEmail {
          id: string;
          description: string;
          createdAt: number;
}

export interface CustomerInvoice {
          id: string;
          issueDate: number;
          status: string;
          amount: number;
}
