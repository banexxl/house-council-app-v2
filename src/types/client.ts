import * as Yup from 'yup';

export interface Client {
  id: string;
  address1?: string;
  address2?: string;
  avatar?: string;
  balance?: number;
  city?: string;
  country?: string;
  currency?: string;
  email: string;
  hasAcceptedMarketing?: boolean;
  hasDiscount?: boolean;
  isProspect?: boolean;
  isReturning?: boolean;
  isVerified?: boolean;
  name: string;
  phone?: string;
  state?: string;
  totalSpent?: number;
  totalOrders?: number;
  updatedAt?: number;
  vatRate?: number;
  zipCode?: string;
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
  id: '',
  email: '',
  name: '',
};

export const clientValidationSchema = (t: (key: string) => string) => {
  return Yup.object({
    name: Yup.string().max(255).required(t('clients.clientNameRequired')),
    email: Yup.string().email(t('clients.clientEmailMustBeValid')).max(255).required(t('clients.clientEmailRequired')),
    address1: Yup.string().max(255).required(t('clients.cliendAddressRequired')),
    address2: Yup.string().max(255),
    phone: Yup.string().max(15),
    mobilePhone: Yup.string().max(15).required(t('clients.clientMobilePhoneRequired')),
    city: Yup.string().max(255).required(t('clients.clientCityRequired')),
    postalCode: Yup.string().max(255),
    state: Yup.string().max(255),
    country: Yup.string().max(255).required(t('clients.clientCountryRequired')),
    hasDiscount: Yup.bool(),
    isVerified: Yup.bool(),
  })
}
