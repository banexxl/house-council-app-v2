import * as Yup from 'yup';

export interface Client {
  id?: string;
  created_at?: number;
  updated_at?: number;
  name?: string;
  email: string;
  phone?: string;
  address_1: string;
  contact_person: string;
  type: string;
  status: string;
  subscription_plan?: string | null;
  billing_information?: string | null;
  notes?: string;
  address_2?: string;
  mobile_phone?: string;
  avatar?: string;
  ////////
  balance?: number;
  has_active_subscription?: boolean;
  has_accepted_marketing?: boolean;
  is_potential?: boolean;
  is_returning?: boolean;
  is_verified?: boolean;
  total_spent?: number;
  total_orders?: number;
}

export type ClientStatus = {
  id: string;
  name: string;
  description: string;
}

export interface ClientType {
  id: string;
  name: string;
  description: string;
}

export interface ClientLog {
  id: string;
  created_at: number;
  description: string;
  ip: string;
  method: string;
  route: string;
  status: number;
}

export interface ClientEmail {
  id: string;
  description: string;
  created_at: number;
}

export interface ClientInvoice {
  id: string;
  issueDate: number;
  status: string;
  amount: number;
}

export const clientValidationSchema = (t: (key: string) => string) => {
  return Yup.object({
    name: Yup.string().max(255),
    contact_person: Yup.string().max(255).required(t('clients.clientContactPersonRequired')),
    email: Yup.string().email(t('clients.clientEmailMustBeValid')).max(255).required(t('clients.clientEmailRequired')),
    phone: Yup.string().max(15),
    mobile_phone: Yup.string().max(15).required(t('clients.clientMobilePhoneRequired')),
    address_1: Yup.string().max(255),
    address_2: Yup.string().max(255),
    type: Yup.string().max(255).required(t('clients.clientTypeRequired')),
    has_discount: Yup.bool(),
    is_verified: Yup.bool(),
    status: Yup.string().max(255).required(t('clients.clientStatusRequired')),
    subscription_plan: Yup.string().max(255),
    billing_information: Yup.string().max(255),
    notes: Yup.string().max(255),
    avatar: Yup.string().max(255),
    has_accepted_marketing: Yup.bool(),
    is_potential: Yup.bool(),
    is_returning: Yup.bool()
  })
}

// Add all iniitial values
export const clientInitialValues: Client = {
  name: '',
  email: '',
  address_1: '',
  contact_person: '',
  type: '',
  status: '',
  subscription_plan: null,
  billing_information: null,
  address_2: '',
  phone: '',
  mobile_phone: '',
  avatar: '',
  balance: 0,
  has_accepted_marketing: false,
  is_potential: false,
  is_returning: false,
  is_verified: false,
  total_spent: 0,
  total_orders: 0,
};
