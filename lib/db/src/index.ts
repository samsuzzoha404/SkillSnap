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
  findProviderProfilesByIds,
  createProviderProfile,
  updateProviderProfile,
  listVerifiedProviderProfilesWithUserSummary,
  countProviders,
  countProvidersByVerificationStatus,
} from "./dao/providerProfilesDao";
export type { VerificationStatus } from "./dao/providerProfilesDao";

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
export type { Booking, BookingStatus } from "./dao/bookingsDao";

export {
  createReview,
  findReviewByBookingId,
  recalculateAndUpdateProviderAvgRating,
  listReviewsByConsumerId,
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
  listPaymentsByConsumerId,
} from "./dao/paymentsDao";

export {
  avgPlatformProviderRating,
  bookingsAndRevenueByMonth,
  listCategoryStats,
  listUsersPaginated,
  listAllProviderProfilesWithUser,
  listAllBookingsAdmin,
  listPaymentsAdmin,
  platformCompletionRate,
} from "./dao/adminDao";
export type {
  MonthPoint,
  CategoryStatRow,
  AdminProviderRow,
  AdminBookingRow,
  AdminPaymentRow,
} from "./dao/adminDao";
