export const paths = {
  index: '/',
  checkout: '/checkout',
  contact: '/contact',
  pricing: '/pricing',
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
    blank: '/dashboard/blank',
    buildings: {
      index: '/dashboard/buildings',
      building: '/dashboard/buildings/:buildingId',
      add: '/dashboard/buildings/add',
    },
    locations: {
      index: '/dashboard/locations',
      location: '/dashboard/locations/:locationId',
      add: '/dashboard/locations/add',
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
        add: '/dashboard/clients/billing-information/add',
        details: '/dashboard/clients/billing-information/',
      },
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
    tenants: {
      index: '/dashboard/tenants',
      tenant: '/dashboard/tenants/:tenantId',
      new: '/dashboard/tenants/new',
    }
  },
  docs: 'https://material-kit-pro-react-docs.devias.io',
  notAuthorized: '/errors/401',
  notFound: '/errors/404',
  serverError: '/errors/500',
};
