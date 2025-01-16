import * as Yup from 'yup';

export interface Client {
  id?: string;
  createdAt?: number;
  updatedAt?: number;
  name?: string;
  email: string;
  phone?: string;
  address1: string;
  contact_person: string;
  type: string;
  status: string;
  subscription_plan?: string;
  billing_information?: string;
  notes?: string;
  address2?: string;
  mobilePhone?: string;
  avatar?: string;
  ////////
  balance?: number;
  hasAcceptedMarketing?: boolean;
  hasDiscount?: boolean;
  isPotential?: boolean;
  isReturning?: boolean;
  isVerified?: boolean;
  totalSpent?: number;
  totalOrders?: number;
}

export interface ClientType {
  id: string;
  name: string;
  description: string;
}

export interface ClientLog {
  id: string;
  createdAt: number;
  description: string;
  ip: string;
  method: string;
  route: string;
  status: number;
}

export interface ClientEmail {
  id: string;
  description: string;
  createdAt: number;
}

export interface ClientInvoice {
  id: string;
  issueDate: number;
  status: string;
  amount: number;
}

export const clientInitialState: Client = {
  email: '',
  name: '',
  contact_person: '',
  type: '',
  status: '',
  address1: ''
};

export const clientValidationSchema = (t: (key: string) => string) => {
  return Yup.object({
    name: Yup.string().max(255),
    contact_person: Yup.string().max(255).required(t('clients.clientContactPersonRequired')),
    email: Yup.string().email(t('clients.clientEmailMustBeValid')).max(255).required(t('clients.clientEmailRequired')),
    phone: Yup.string().max(15),
    mobile_phone: Yup.string().max(15).required(t('clients.clientMobilePhoneRequired')),
    address1: Yup.string().max(255).required(t('clients.cliendAddressRequired')),
    address2: Yup.string().max(255),
    client_type: Yup.string().max(255).required(t('clients.clientTypeRequired')),
    has_discount: Yup.bool(),
    is_verified: Yup.bool(),
    status: Yup.string().max(255).required(t('clients.clientStatusRequired')),
    subscription_plan: Yup.string().max(255).required(t('clients.clientSubscriptionPlanRequired')),
    billing_information: Yup.string().max(255).required(t('clients.clientBillingInformationRequired')),
    notes: Yup.string().max(255),
    avatar: Yup.string().max(255),
    has_accepted_marketing: Yup.bool(),
    is_potential: Yup.bool(),
    is_returning: Yup.bool()
  })
}
