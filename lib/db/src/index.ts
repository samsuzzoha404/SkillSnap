export { collections, getMongoClient, getMongoDb, getCollection } from "./mongo";

// DAO exports (MongoDB-based) - export functions only to avoid type-name collisions with schema exports
export {
  createUser,
  findUserByEmail,
  findUserById,
  countUsers,
} from "./dao/usersDao";

export { findCategoryById, listActiveCategories } from "./dao/categoriesDao";

export {
  findProviderProfileByUserId,
  findProviderProfileById,
  createProviderProfile,
  updateProviderProfile,
  listVerifiedProviderProfilesWithUserSummary,
  countProviders,
  countProvidersByVerificationStatus,
} from "./dao/providerProfilesDao";

export { listServicesByProviderIdWithCategories, createServicesForProvider } from "./dao/providerServicesDao";

export { listAvailabilityByProviderId, upsertAvailabilitySlots } from "./dao/providerAvailabilityDao";

export {
  createServiceRequest,
  updateServiceRequestStatus,
  findServiceRequestById,
  listRequestsByConsumerIdWithCategory,
  findRequestByIdWithCategory,
} from "./dao/serviceRequestsDao";

export {
  createBooking,
  listBookingsByConsumerId,
  listBookingsByProviderId,
  getBookingDetails,
  findBookingById,
  updateBookingStatus,
  listProviderBookingsJoin,
  countBookings,
  countBookingsByProviderId,
  countBookingsByStatus,
  updateBookingPayment,
} from "./dao/bookingsDao";

export {
  createReview,
  recalculateAndUpdateProviderAvgRating,
  listReviewsByProviderIdWithConsumerName,
} from "./dao/reviewsDao";

export {
  createNotification,
  listNotificationsByUserId,
  markNotificationAsRead,
} from "./dao/notificationsDao";

export {
  processMockPaymentAndUpdateBooking,
  sumPaidPaymentsAmount,
} from "./dao/paymentsDao";
