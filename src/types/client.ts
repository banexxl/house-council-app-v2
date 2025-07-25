import * as Yup from 'yup';

export const clientTypeMapping = {
  agency: 'clients.lblClientTypeAgency',
  business: 'clients.lblClientTypeBusiness',
  enterprise: 'clients.lblClientTypeEnterprise',
  government: 'clients.lblClientTypeGovernment',
  individual: 'clients.lblClientTypeIndividual',
}

export const clientStatusMapping = {
  active: 'clients.lblClientStatusActive',
  inactive: 'clients.lblClientStatusInactive',
  pending_activation: 'clients.lblClientStatusPendingActivation',
  suspended: 'clients.lblClientStatusSuspended',
  trial: 'clients.lblClientStatusTrial',
  archived: 'clients.lblClientStatusArchived',
  vip: 'clients.lblClientStatusVIP',
};


export interface Client {
  id: string;
  user_id: string;
  created_at?: Date;
  updated_at?: Date;
  name: string;
  email: string;
  phone?: string;
  address_1: string;
  contact_person: string;
  client_type: string;
  client_status: string;
  notes?: string;
  address_2?: string;
  mobile_phone?: string;
  avatar?: string;
  ////////
  has_accepted_marketing?: boolean;
  has_accepted_terms_and_conditions?: boolean;
  has_accepted_privacy_policy?: boolean;
  is_potential?: boolean;
  is_returning?: boolean;
  is_verified?: boolean;
}

export interface ClientLog {
  id: string;
  created_at: Date;
  description: string;
  ip: string;
  method: string;
  route: string;
  status: number;
}

export interface ClientEmail {
  id: string;
  description: string;
  created_at: Date;
}

export interface ClientInvoice {
  id: string;
  issueDate: number;
  status: string;
  amount: number;
}

export const clientValidationSchema = (t: (key: string) => string): Yup.ObjectSchema<any> => {
  return Yup.object({
    name: Yup.string().max(255).required(t('clients.clientNameRequired')),
    contact_person: Yup.string().max(255).required(t('clients.clientContactPersonRequired')),
    email: Yup.string().email(t('clients.clientEmailMustBeValid')).max(255).required(t('clients.clientEmailRequired')),
    phone: Yup.string().max(15),
    mobile_phone: Yup.string().max(15).required(t('clients.clientMobilePhoneRequired')),
    address_1: Yup.string().max(255),
    address_2: Yup.string().max(255),
    client_type: Yup.string().max(255).required(t('clients.clientTypeRequired')),
    has_discount: Yup.bool(),
    is_verified: Yup.bool(),
    client_status: Yup.string().max(255).required(t('clients.clientStatusRequired')),
    subscription_plan: Yup.string().max(255).nullable(),
    billing_information: Yup.string().max(255).nullable(),
    notes: Yup.string().max(255),
    avatar: Yup.string().max(255),
    has_accepted_marketing: Yup.bool(),
    has_accepted_terms_and_conditions: Yup.bool(),
    has_accepted_privacy_policy: Yup.bool(),
    is_potential: Yup.bool(),
    is_returning: Yup.bool()
  })
}

// Add all iniitial values
export const clientInitialValues: Client = {
  id: '',
  user_id: '',
  name: '',
  email: '',
  address_1: '',
  contact_person: '',
  client_type: '',
  client_status: '',
  address_2: '',
  phone: '',
  mobile_phone: '',
  avatar: '',
  has_accepted_marketing: false,
  has_accepted_terms_and_conditions: false,
  has_accepted_privacy_policy: false,
  is_potential: false,
  is_returning: false,
  is_verified: false,
};


