interface OrderCustomer {
          fullAddress?: string;
          avatar?: string;
          email: string;
          name: string;
}

export interface OrderItem {
          _id: string;
          billingCycle: 'daily' | 'weekly' | 'monthly' | 'yearly';
          currency: string;
          name: string;
          quantity: number;
          unitAmount: number;
}

export interface OrderLog {
          _id: string;
          createdDateTime: number;
          message: string;
}

export type OrderStatus = 'canceled' | 'complete' | 'pending' | 'rejected';

export interface Order {
          _id: string;
          coupon?: string | null;
          createdDateTime: number;
          currency?: string;
          customer: OrderCustomer;
          items?: OrderItem[];
          logs?: OrderLog[];
          number?: string;
          paymentMethod: string;
          promotionCode?: string;
          status: OrderStatus;
          totalAmount?: number;
}
