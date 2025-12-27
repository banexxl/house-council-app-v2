export const paths = {
  index: '/',
  checkout: '/checkout',
  contact: '/contact',
  auth: {
    login: '/auth/login',
    error: '/auth/error',
    callback: '/auth/callback',
  },
  dashboard: {
    index: '/dashboard',
    account: '/dashboard/account',
    analytics: '/dashboard/analytics',
    announcements: {
      index: '/dashboard/announcements',
      tenant: '/dashboard/announcements/tenant',
    },
    apartments: {
      index: '/dashboard/apartments',
      new: '/dashboard/apartments/new',
    },
    blank: '/dashboard/blank',
    buildings: {
      index: '/dashboard/buildings',
      new: '/dashboard/buildings/new',
    },
    features: {
      index: '/dashboard/features',
    },
    locations: {
      index: '/dashboard/locations',
      new: '/dashboard/locations/new',
    },
    serviceRequests: {
      index: '/dashboard/service-requests',
      details: '/dashboard/service-requests/:requestId',
      create: '/dashboard/service-requests/create',
    },
    calendar: '/dashboard/calendar',
    crypto: '/dashboard/crypto',
    clients: {
      index: '/dashboard/clients',
      details: '/dashboard/clients/',
      new: '/dashboard/clients/new',
      billingInformation: {
        index: '/dashboard/clients/billing-information',
        new: '/dashboard/clients/billing-information/new',
        details: '/dashboard/clients/billing-information/',
      },
      clientSettings: {
        index: '/dashboard/clients/client-settings',
        new: '/dashboard/clients/client-settings/new',
      }
    },
    ecommerce: '/dashboard/ecommerce',
    fileManager: '/dashboard/file-manager',
    invoices: {
      index: '/dashboard/invoices',
      details: '/dashboard/invoices/:orderId',
    },
    jobs: {
      index: '/dashboard/jobs',
      create: '/dashboard/jobs/create',
      companies: {
        details: '/dashboard/jobs/companies/:companyId',
      },
    },
    kanban: '/dashboard/kanban',
    logistics: {
      index: '/dashboard/logistics',
      fleet: '/dashboard/logistics/fleet',
    },
    mail: '/dashboard/mail',
    orders: {
      index: '/dashboard/orders',
      details: '/dashboard/orders/:orderId',
    },
    products: {
      index: '/dashboard/products',
      create: '/dashboard/products/create',
    },
    polls: {
      index: '/dashboard/polls',
      create: '/dashboard/polls/create',
      voting: '/dashboard/polls/voting',
    },
    social: {
      index: '/dashboard/social',
      profile: '/dashboard/social/profile',
      feed: '/dashboard/social/feed',
    },
    subscriptions: {
      index: '/dashboard/subscriptions',
      new: '/dashboard/subscriptions/new',
      subscription: '/dashboard/subscriptions/',
    },
    tenants: {
      index: '/dashboard/tenants',
      new: '/dashboard/tenants/new',
    }
  },
  docs: 'https://nest-link.app/docs',
};
