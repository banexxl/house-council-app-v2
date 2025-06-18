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
    academy: {
      index: '/dashboard/academy',
      courseDetails: '/dashboard/academy/courses/:courseId',
    },
    account: '/dashboard/account',
    analytics: '/dashboard/analytics',
    apartments: {
      index: '/dashboard/apartments',
      new: '/dashboard/apartments/new',
    },
    blank: '/dashboard/blank',
    buildings: {
      index: '/dashboard/buildings',
      new: '/dashboard/buildings/new',
    },
    locations: {
      index: '/dashboard/locations',
      new: '/dashboard/locations/new',
    },
    blog: {
      index: '/dashboard/blog',
      postDetails: '/dashboard/blog/:postId',
      postCreate: '/dashboard/blog/create',
    },
    calendar: '/dashboard/calendar',
    chat: '/dashboard/chat',
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
      tenant: '/dashboard/tenants/:tenantId',
      new: '/dashboard/tenants/new',
    }
  },
  docs: 'https://v0-house-council-site.vercel.app/docs',
};
