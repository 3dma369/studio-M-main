import { defineOpsConfig } from './empire-ops/config/schema';

export const tuStudioOpsConfig = defineOpsConfig({
  branding: {
    appName: 'TU Studio',
    appSlug: 'tu-studio',
    logoLetter: 'T',
    primaryColor: 'amber',
    contactEmail: 'hello@tangibleunion.com',
  },
  collections: {
    products: 'products',  // programs + merchandise
    orders: 'serviceOrders',
  },
  fieldMap: {
    productId: 'id',
    productName: 'name',
    productPrice: 'price',
    productImage: 'image',
    productStock: 'stock',
    orderId: 'id',
    orderStatus: 'status',
    orderTotal: 'total',
    orderItems: 'deliverables',
    orderCreatedAt: 'createdAt',
    orderCustomerName: 'clientName',
    orderCustomerEmail: 'clientEmail',
    orderCustomerPhone: 'clientPhone',
  },
  features: {
    editInventory: true,    // programs, services, merch
    manageOrders: true,     // service orders / client projects
    moderateCommunity: true,
    emailOnShip: true,
    trackNumbers: false,
  },
  currency: 'USD',
  emailTemplates: {
    shippedSubject: '🎨 Your TU Studio project {{orderId}} is ready!',
    shippedBody: 'Hi {{customerName}},\n\nYour project {{orderId}} has been delivered.\n\n— TU Studio',
  },
});
