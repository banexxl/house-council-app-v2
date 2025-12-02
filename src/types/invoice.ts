export interface Currency {
  id: string
  created_at?: string;
  updated_at?: string;
  code: string;
  number: number;
  name: string;
}

interface InvoiceClient {
  address?: string;
  company?: string;
  email: string;
  name: string;
  taxId?: string;
}

interface InvoiceItem {
  id: string;
  currency: string;
  description: string;
  quantity: number;
  totalAmount: number;
  unitAmount: number;
}

export type InvoiceStatus = 'processing' | 'failed' | 'succeeded' | 'pending' | 'refunded' | 'cancelled';

export const invoiceStatusTokenMap: Record<InvoiceStatus, string> = {
  processing: 'invoice.status.processing',
  failed: 'invoice.status.failed',
  succeeded: 'invoice.status.succeeded',
  pending: 'invoice.status.pending',
  refunded: 'invoice.status.refunded',
  cancelled: 'invoice.status.cancelled',
};



export interface Invoice {
  id: string;
  currency: Currency;
  client: InvoiceClient;
  dueDate?: number;
  issueDate?: number;
  items?: InvoiceItem[];
  number: string;
  status: InvoiceStatus;
  subtotalAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
}
