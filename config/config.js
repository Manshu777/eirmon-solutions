export const config = {
  BASE_URL: 'https://neeri.sloton.app',

  // API endpoints
  API_ENDPOINTS: {
    CSRF_COOKIE: '/sanctum/csrf-cookie',
    LOGIN: '/api/login',
    LOGOUT: '/api/logout',
    BOOKINGS: {
      CHECK_AVAILABILITY: '/api/bookings/check-availability',
      PAY: '/api/bookings/pay',
      PAYMENT_SUCCESS: '/api/bookings/payment/success',
      PAYMENT_CANCEL: '/api/bookings/payment/cancel',
      STORE: '/api/bookings',
      STORE_BY_ADMIN: '/api/bookings/admin',
    },
    CHECK_SLOT_AVAILABILITY: '/api/bookings/check-availability',
    ///bookings/admin
     LOCALDATA: {
      HOMEPAGE: '/api/localdata/homepage',
      DASHBOARD: '/api/localdata/dashboard',
      ANALYTICS: '/api/localdata/analytics',

      //analytics
      STORE: '/api/localdata/store',
      VIEW: '/api/localdata/view',

      SEARCH: '/api/localdata/coussearch', 

      BOOK: '/api/localdata/book',
      AVAILABLE_STAFF: '/api/localdata/available-staff/{date}/{startTime}/{endTime}',
      BOOKING_VIEW: '/api/localdata/booking-view',
      UPDATE_STATUS: '/api/localdata/update-status',
      EXPIRY_TABLE: '/api/localdata/expiry-table',
      STORE_CUSTOMER: '/api/localdata/customers',
      STORE_BOOKING: '/api/bookings/admin'

    },
    USERS: {
      INDEX: '/api/users',
      STORE: '/api/users',
      SHOW: '/api/users/{id}',
      UPDATE: '/api/users/{id}',
      DESTROY: '/api/users/{id}',
       SEARCH: '/api/users/search',
    },
    OFFERS: {
      INDEX: '/api/offers',
      STORE: '/api/offers',
      SHOW: '/api/offers/{id}',
      UPDATE: '/api/offers/{id}',
      DESTROY: '/api/offers/{id}',
      SEND: '/api/offers/{id}/send',
    },
    LEAVES: {
      INDEX: '/api/leaves',
      STORE: '/api/leaves',
      SHOW: '/api/leaves/{id}',
      UPDATE: '/api/leaves/{id}',
      DESTROY: '/api/leaves/{id}',
    },
    SALON_TIMES: {
      INDEX: '/api/salon-times',
      STORE: '/api/salon-times',
      SHOW: '/api/salon-times/{id}',
      UPDATE: '/api/salon-times/{id}',
      DESTROY: '/api/salon-times/{id}',
    },
    SERVICES: {
      INDEX: '/api/services',
      STORE: '/api/services',
      SEARCH: '/api/services/search',
      SHOW: '/api/services/{id}',
      UPDATE: '/api/services/{id}',
      DESTROY: '/api/services/{id}',
      forbooking: '/api/services/forbooking',
    },
  },

  // AsyncStorage keys
  STORAGE_KEYS: {
    AUTH_TOKEN: 'authToken',
  },
};