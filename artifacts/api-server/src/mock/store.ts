import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env["JWT_SECRET"] || "skillsnap-secret-2024";

export interface MockUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "consumer" | "provider" | "admin";
  avatarUrl: string | null;
  isActive: boolean;
  passwordHash: string;
  createdAt: string;
}

export interface MockCategory {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  isActive: boolean;
}

export interface MockProviderProfile {
  id: string;
  userId: string;
  businessName: string;
  bio: string;
  yearsExperience: number;
  avgRating: number;
  totalJobs: number;
  completionRate: number;
  acceptanceRate: number;
  serviceRadiusKm: number;
  verificationStatus: "pending" | "verified" | "rejected";
  address: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MockProviderService {
  id: string;
  providerId: string;
  categoryId: string;
  basePrice: number;
  priceType: "hourly" | "fixed";
  isActive: boolean;
}

export interface MockAvailability {
  id: string;
  providerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface MockServiceRequest {
  id: string;
  consumerId: string;
  categoryId: string;
  title: string;
  description: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  urgency: "low" | "medium" | "high" | "emergency";
  preferredDate: string;
  preferredTime: string;
  status: "pending" | "matched" | "booked" | "completed" | "cancelled";
  budget: number | null;
  createdAt: string;
}

export interface MockBooking {
  id: string;
  serviceRequestId: string;
  consumerId: string;
  providerId: string;
  status: "requested" | "accepted" | "on_the_way" | "arrived" | "in_progress" | "completed" | "cancelled";
  scheduledAt: string;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  finalPrice: number | null;
  paymentStatus: "pending" | "paid" | "refunded";
  notes: string | null;
  createdAt: string;
}

export interface MockReview {
  id: string;
  bookingId: string;
  consumerId: string;
  providerId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface MockNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

const pw = bcrypt.hashSync("password123", 10);

export const users: MockUser[] = [
  {
    id: "usr_consumer_001",
    fullName: "Ahmad Razif bin Hassan",
    email: "consumer@skillsnap.my",
    phone: "+60 12-345 6789",
    role: "consumer",
    avatarUrl: null,
    isActive: true,
    passwordHash: pw,
    createdAt: "2025-01-15T08:00:00.000Z",
  },
  {
    id: "usr_provider_001",
    fullName: "Tan Wei Ming",
    email: "tan.wei.ming@skillsnap.my",
    phone: "+60 16-789 0123",
    role: "provider",
    avatarUrl: null,
    isActive: true,
    passwordHash: pw,
    createdAt: "2025-01-10T08:00:00.000Z",
  },
  {
    id: "usr_provider_002",
    fullName: "Siti Nurhaliza bte Aziz",
    email: "siti.aziz@skillsnap.my",
    phone: "+60 17-234 5678",
    role: "provider",
    avatarUrl: null,
    isActive: true,
    passwordHash: pw,
    createdAt: "2025-01-12T08:00:00.000Z",
  },
  {
    id: "usr_provider_003",
    fullName: "Rajesh Kumar Pillai",
    email: "rajesh.kumar@skillsnap.my",
    phone: "+60 11-345 6789",
    role: "provider",
    avatarUrl: null,
    isActive: true,
    passwordHash: pw,
    createdAt: "2025-01-08T08:00:00.000Z",
  },
  {
    id: "usr_provider_pending",
    fullName: "Lee Chong Wei",
    email: "lee.pending@skillsnap.my",
    phone: "+60 14-567 8901",
    role: "provider",
    avatarUrl: null,
    isActive: true,
    passwordHash: pw,
    createdAt: "2025-02-01T08:00:00.000Z",
  },
  {
    id: "usr_consumer_002",
    fullName: "Nurul Ain bte Ibrahim",
    email: "nurul.ain@skillsnap.my",
    phone: "+60 13-456 7890",
    role: "consumer",
    avatarUrl: null,
    isActive: true,
    passwordHash: pw,
    createdAt: "2025-01-20T08:00:00.000Z",
  },
  {
    id: "usr_provider_004",
    fullName: "Ahmad Firdaus bin Malik",
    email: "firdaus.malik@skillsnap.my",
    phone: "+60 19-876 5432",
    role: "provider",
    avatarUrl: null,
    isActive: true,
    passwordHash: pw,
    createdAt: "2025-02-05T08:00:00.000Z",
  },
  {
    id: "usr_provider_005",
    fullName: "Priya Krishnamurthy",
    email: "priya.k@skillsnap.my",
    phone: "+60 12-987 6543",
    role: "provider",
    avatarUrl: null,
    isActive: true,
    passwordHash: pw,
    createdAt: "2025-02-10T08:00:00.000Z",
  },
  {
    id: "usr_provider_006",
    fullName: "Lim Boon Heng",
    email: "lim.boon@skillsnap.my",
    phone: "+60 16-543 2109",
    role: "provider",
    avatarUrl: null,
    isActive: true,
    passwordHash: pw,
    createdAt: "2025-01-25T08:00:00.000Z",
  },
  {
    id: "usr_admin_001",
    fullName: "SkillSnap Admin",
    email: "admin@skillsnap.my",
    phone: "",
    role: "admin",
    avatarUrl: null,
    isActive: true,
    passwordHash: pw,
    createdAt: "2025-01-01T08:00:00.000Z",
  },
];

export const categories: MockCategory[] = [
  { id: "cat_electrical", name: "Electrical", description: "Wiring, installations, repairs and electrical maintenance", iconUrl: null, isActive: true },
  { id: "cat_plumbing", name: "Plumbing", description: "Pipe repairs, drain clearing, water heater installation", iconUrl: null, isActive: true },
  { id: "cat_cleaning", name: "Cleaning", description: "Deep cleaning, regular maintenance and sanitization services", iconUrl: null, isActive: true },
  { id: "cat_aircon", name: "Air Conditioning", description: "AC installation, servicing, repair and gas top-up", iconUrl: null, isActive: true },
  { id: "cat_carpentry", name: "Carpentry", description: "Furniture assembly, custom woodwork and renovations", iconUrl: null, isActive: true },
  { id: "cat_painting", name: "Painting", description: "Interior and exterior painting, waterproofing", iconUrl: null, isActive: true },
  { id: "cat_security", name: "Security", description: "CCTV installation, alarm systems, access control", iconUrl: null, isActive: true },
  { id: "cat_automotive", name: "Automotive", description: "Mobile mechanics, battery change, tyre services", iconUrl: null, isActive: true },
];

export const providerProfiles: MockProviderProfile[] = [
  {
    id: "prov_001",
    userId: "usr_provider_001",
    businessName: "TW Electrical Works",
    bio: "Certified electrician with 8+ years of experience in residential and commercial electrical works across Klang Valley. Specialising in wiring upgrades, fault detection and energy-efficient installations.",
    yearsExperience: 8,
    avgRating: 4.8,
    totalJobs: 214,
    completionRate: 97,
    acceptanceRate: 89,
    serviceRadiusKm: 20,
    verificationStatus: "verified",
    address: "Taman Desa, Kuala Lumpur",
    latitude: 3.1009,
    longitude: 101.6809,
    createdAt: "2025-01-10T08:00:00.000Z",
    updatedAt: "2025-03-01T08:00:00.000Z",
  },
  {
    id: "prov_002",
    userId: "usr_provider_002",
    businessName: "Siti Clean Pro",
    bio: "Professional cleaning specialist with eco-friendly products. Expert in post-renovation cleaning, deep cleaning and regular maintenance for homes and offices. Fully insured team.",
    yearsExperience: 5,
    avgRating: 4.9,
    totalJobs: 381,
    completionRate: 99,
    acceptanceRate: 92,
    serviceRadiusKm: 25,
    verificationStatus: "verified",
    address: "Cheras, Kuala Lumpur",
    latitude: 3.0828,
    longitude: 101.7459,
    createdAt: "2025-01-12T08:00:00.000Z",
    updatedAt: "2025-03-05T08:00:00.000Z",
  },
  {
    id: "prov_003",
    userId: "usr_provider_003",
    businessName: "RK Plumbing & Sanitary",
    bio: "Licensed plumber covering all aspects of residential and commercial plumbing. 24/7 emergency call-outs available. Experienced with all major pipe brands and water systems in Malaysia.",
    yearsExperience: 12,
    avgRating: 4.7,
    totalJobs: 527,
    completionRate: 95,
    acceptanceRate: 78,
    serviceRadiusKm: 30,
    verificationStatus: "verified",
    address: "Ampang, Selangor",
    latitude: 3.1483,
    longitude: 101.7564,
    createdAt: "2025-01-08T08:00:00.000Z",
    updatedAt: "2025-02-28T08:00:00.000Z",
  },
  {
    id: "prov_pending",
    userId: "usr_provider_pending",
    businessName: "LCW Aircon Services",
    bio: "Specialising in air conditioning services including installation, servicing and gas refill. Based in KL city centre.",
    yearsExperience: 3,
    avgRating: 0,
    totalJobs: 0,
    completionRate: 0,
    acceptanceRate: 0,
    serviceRadiusKm: 15,
    verificationStatus: "pending",
    address: "KLCC, Kuala Lumpur",
    latitude: 3.1579,
    longitude: 101.7116,
    createdAt: "2025-02-01T08:00:00.000Z",
    updatedAt: "2025-02-01T08:00:00.000Z",
  },
  {
    id: "prov_004",
    userId: "usr_provider_004",
    businessName: "Firdaus Multi-Trade",
    bio: "Versatile handyman with expertise across electrical, plumbing, carpentry and painting. 10+ years making homes better across KL and Petaling Jaya. Fast turnaround and honest pricing guaranteed.",
    yearsExperience: 10,
    avgRating: 4.6,
    totalJobs: 312,
    completionRate: 94,
    acceptanceRate: 85,
    serviceRadiusKm: 22,
    verificationStatus: "verified",
    address: "Petaling Jaya, Selangor",
    latitude: 3.1073,
    longitude: 101.6067,
    createdAt: "2025-02-05T08:00:00.000Z",
    updatedAt: "2025-03-10T08:00:00.000Z",
  },
  {
    id: "prov_005",
    userId: "usr_provider_005",
    businessName: "Priya Cool & Paint",
    bio: "Your one-stop specialist for air conditioning servicing, repair and new installations, plus quality interior and exterior painting. Serving the Klang Valley with pride for 7 years.",
    yearsExperience: 7,
    avgRating: 4.8,
    totalJobs: 178,
    completionRate: 98,
    acceptanceRate: 91,
    serviceRadiusKm: 18,
    verificationStatus: "verified",
    address: "Sri Petaling, Kuala Lumpur",
    latitude: 3.0766,
    longitude: 101.6936,
    createdAt: "2025-02-10T08:00:00.000Z",
    updatedAt: "2025-03-15T08:00:00.000Z",
  },
  {
    id: "prov_006",
    userId: "usr_provider_006",
    businessName: "BH Security & Auto",
    bio: "Expert in CCTV installation, alarm systems and access control. Also offering mobile automotive services including battery replacement, tyre change and basic diagnostics. Fully licensed and insured.",
    yearsExperience: 9,
    avgRating: 4.7,
    totalJobs: 245,
    completionRate: 96,
    acceptanceRate: 82,
    serviceRadiusKm: 35,
    verificationStatus: "verified",
    address: "Kepong, Kuala Lumpur",
    latitude: 3.2040,
    longitude: 101.6370,
    createdAt: "2025-01-25T08:00:00.000Z",
    updatedAt: "2025-03-08T08:00:00.000Z",
  },
];

export const providerServices: MockProviderService[] = [
  { id: "svc_001", providerId: "prov_001", categoryId: "cat_electrical", basePrice: 120, priceType: "hourly", isActive: true },
  { id: "svc_002", providerId: "prov_002", categoryId: "cat_cleaning", basePrice: 280, priceType: "fixed", isActive: true },
  { id: "svc_003", providerId: "prov_002", categoryId: "cat_carpentry", basePrice: 200, priceType: "hourly", isActive: true },
  { id: "svc_004", providerId: "prov_003", categoryId: "cat_plumbing", basePrice: 100, priceType: "hourly", isActive: true },
  { id: "svc_005", providerId: "prov_004", categoryId: "cat_electrical", basePrice: 110, priceType: "hourly", isActive: true },
  { id: "svc_006", providerId: "prov_004", categoryId: "cat_plumbing", basePrice: 95, priceType: "hourly", isActive: true },
  { id: "svc_007", providerId: "prov_004", categoryId: "cat_carpentry", basePrice: 150, priceType: "hourly", isActive: true },
  { id: "svc_008", providerId: "prov_004", categoryId: "cat_painting", basePrice: 320, priceType: "fixed", isActive: true },
  { id: "svc_009", providerId: "prov_005", categoryId: "cat_aircon", basePrice: 180, priceType: "fixed", isActive: true },
  { id: "svc_010", providerId: "prov_005", categoryId: "cat_painting", basePrice: 280, priceType: "fixed", isActive: true },
  { id: "svc_011", providerId: "prov_006", categoryId: "cat_security", basePrice: 350, priceType: "fixed", isActive: true },
  { id: "svc_012", providerId: "prov_006", categoryId: "cat_automotive", basePrice: 80, priceType: "fixed", isActive: true },
];

export const providerAvailability: MockAvailability[] = [
  ...([1, 2, 3, 4, 5].map(d => ({ id: `avail_001_${d}`, providerId: "prov_001", dayOfWeek: d, startTime: "09:00", endTime: "18:00", isAvailable: true }))),
  { id: "avail_001_6", providerId: "prov_001", dayOfWeek: 6, startTime: "09:00", endTime: "13:00", isAvailable: true },
  { id: "avail_001_0", providerId: "prov_001", dayOfWeek: 0, startTime: "09:00", endTime: "18:00", isAvailable: false },
  ...([1, 2, 3, 4, 5, 6].map(d => ({ id: `avail_002_${d}`, providerId: "prov_002", dayOfWeek: d, startTime: "08:00", endTime: "20:00", isAvailable: true }))),
  { id: "avail_002_0", providerId: "prov_002", dayOfWeek: 0, startTime: "08:00", endTime: "20:00", isAvailable: false },
  ...([0, 1, 2, 3, 4, 5, 6].map(d => ({ id: `avail_003_${d}`, providerId: "prov_003", dayOfWeek: d, startTime: "07:00", endTime: "22:00", isAvailable: true }))),
  ...([1, 2, 3, 4, 5].map(d => ({ id: `avail_004_${d}`, providerId: "prov_004", dayOfWeek: d, startTime: "08:00", endTime: "19:00", isAvailable: true }))),
  { id: "avail_004_6", providerId: "prov_004", dayOfWeek: 6, startTime: "09:00", endTime: "15:00", isAvailable: true },
  { id: "avail_004_0", providerId: "prov_004", dayOfWeek: 0, startTime: "08:00", endTime: "19:00", isAvailable: false },
  ...([0, 1, 2, 3, 4, 5, 6].map(d => ({ id: `avail_005_${d}`, providerId: "prov_005", dayOfWeek: d, startTime: "09:00", endTime: "18:00", isAvailable: true }))),
  ...([1, 2, 3, 4, 5].map(d => ({ id: `avail_006_${d}`, providerId: "prov_006", dayOfWeek: d, startTime: "08:00", endTime: "20:00", isAvailable: true }))),
  ...([0, 6].map(d => ({ id: `avail_006_${d}`, providerId: "prov_006", dayOfWeek: d, startTime: "10:00", endTime: "17:00", isAvailable: true }))),
];

const tomorrow = new Date(Date.now() + 86400000).toISOString();
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();
const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
const twoMonthsAgo = new Date(Date.now() - 60 * 86400000).toISOString();
const today = new Date().toISOString();

export const serviceRequests: MockServiceRequest[] = [
  {
    id: "req_001",
    consumerId: "usr_consumer_001",
    categoryId: "cat_electrical",
    title: "Faulty Power Points in Living Room",
    description: "Three power points in the living room are not working. Suspected circuit breaker issue or wiring fault. Need urgent assessment.",
    address: "Unit 12-3, Residensi Harmoni, Jalan Cheras, Kuala Lumpur",
    latitude: 3.0942,
    longitude: 101.7248,
    urgency: "high",
    preferredDate: tomorrow.slice(0, 10),
    preferredTime: "10:00",
    status: "booked",
    budget: 200,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "req_002",
    consumerId: "usr_consumer_001",
    categoryId: "cat_cleaning",
    title: "Post-Renovation Deep Cleaning",
    description: "3-bedroom apartment post-renovation. Heavy dust, paint residue and debris throughout. Need thorough deep clean before moving in.",
    address: "Unit 8-2, Vista Residences, Taman Midah, Kuala Lumpur",
    latitude: 3.0997,
    longitude: 101.7321,
    urgency: "medium",
    preferredDate: nextWeek.slice(0, 10),
    preferredTime: "09:00",
    status: "pending",
    budget: 450,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "req_003",
    consumerId: "usr_consumer_001",
    categoryId: "cat_plumbing",
    title: "Kitchen Sink Drain Blocked",
    description: "Kitchen sink drainage is completely blocked. Water standing. Need immediate unblocking and pipe inspection.",
    address: "No 22, Jalan Kerinchi, Bangsar South, Kuala Lumpur",
    latitude: 3.1128,
    longitude: 101.6742,
    urgency: "emergency",
    preferredDate: yesterday.slice(0, 10),
    preferredTime: "14:00",
    status: "completed",
    budget: 150,
    createdAt: twoWeeksAgo,
  },
];

export const bookings: MockBooking[] = [
  {
    id: "bkg_001",
    serviceRequestId: "req_001",
    consumerId: "usr_consumer_001",
    providerId: "prov_001",
    status: "in_progress",
    scheduledAt: today,
    acceptedAt: new Date(Date.now() - 3600000).toISOString(),
    startedAt: new Date(Date.now() - 1800000).toISOString(),
    completedAt: null,
    cancelledAt: null,
    finalPrice: null,
    paymentStatus: "pending",
    notes: null,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "bkg_002",
    serviceRequestId: "req_003",
    consumerId: "usr_consumer_001",
    providerId: "prov_003",
    status: "completed",
    scheduledAt: twoWeeksAgo,
    acceptedAt: new Date(new Date(twoWeeksAgo).getTime() + 3600000).toISOString(),
    startedAt: new Date(new Date(twoWeeksAgo).getTime() + 7200000).toISOString(),
    completedAt: new Date(new Date(twoWeeksAgo).getTime() + 14400000).toISOString(),
    cancelledAt: null,
    finalPrice: 180,
    paymentStatus: "paid",
    notes: "Cleared blockage, replaced P-trap. All good now.",
    createdAt: new Date(new Date(twoWeeksAgo).getTime() - 86400000).toISOString(),
  },
  {
    id: "bkg_003",
    serviceRequestId: "req_001",
    consumerId: "usr_consumer_002",
    providerId: "prov_001",
    status: "requested",
    scheduledAt: nextWeek,
    acceptedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    finalPrice: null,
    paymentStatus: "pending",
    notes: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "bkg_004",
    serviceRequestId: "req_002",
    consumerId: "usr_consumer_001",
    providerId: "prov_002",
    status: "accepted",
    scheduledAt: nextWeek,
    acceptedAt: new Date(Date.now() - 7200000).toISOString(),
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    finalPrice: null,
    paymentStatus: "pending",
    notes: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "bkg_hist_001",
    serviceRequestId: "req_003",
    consumerId: "usr_consumer_001",
    providerId: "prov_002",
    status: "completed",
    scheduledAt: monthAgo,
    acceptedAt: new Date(new Date(monthAgo).getTime() + 3600000).toISOString(),
    startedAt: new Date(new Date(monthAgo).getTime() + 7200000).toISOString(),
    completedAt: new Date(new Date(monthAgo).getTime() + 18000000).toISOString(),
    cancelledAt: null,
    finalPrice: 320,
    paymentStatus: "paid",
    notes: null,
    createdAt: new Date(new Date(monthAgo).getTime() - 86400000).toISOString(),
  },
  {
    id: "bkg_hist_002",
    serviceRequestId: "req_003",
    consumerId: "usr_consumer_001",
    providerId: "prov_001",
    status: "completed",
    scheduledAt: twoMonthsAgo,
    acceptedAt: new Date(new Date(twoMonthsAgo).getTime() + 3600000).toISOString(),
    startedAt: new Date(new Date(twoMonthsAgo).getTime() + 7200000).toISOString(),
    completedAt: new Date(new Date(twoMonthsAgo).getTime() + 10800000).toISOString(),
    cancelledAt: null,
    finalPrice: 240,
    paymentStatus: "paid",
    notes: null,
    createdAt: new Date(new Date(twoMonthsAgo).getTime() - 86400000).toISOString(),
  },
];

export const reviews: MockReview[] = [
  {
    id: "rev_001",
    bookingId: "bkg_002",
    consumerId: "usr_consumer_001",
    providerId: "prov_003",
    rating: 5,
    comment: "Rajesh was professional and quick. Fixed my drain in under an hour and explained what went wrong. Highly recommended!",
    createdAt: new Date(new Date(twoWeeksAgo).getTime() + 86400000).toISOString(),
  },
  {
    id: "rev_002",
    bookingId: "bkg_hist_001",
    consumerId: "usr_consumer_001",
    providerId: "prov_002",
    rating: 5,
    comment: "Siti's team was amazing! The apartment was spotless after the deep clean. Worth every ringgit.",
    createdAt: new Date(new Date(monthAgo).getTime() + 86400000).toISOString(),
  },
  {
    id: "rev_003",
    bookingId: "bkg_hist_002",
    consumerId: "usr_consumer_001",
    providerId: "prov_001",
    rating: 4,
    comment: "Good work on the wiring. Arrived on time and finished neatly. Minor issue with cable management but otherwise excellent.",
    createdAt: new Date(new Date(twoMonthsAgo).getTime() + 86400000).toISOString(),
  },
];

export const notifications: MockNotification[] = [
  {
    id: "notif_001",
    userId: "usr_consumer_001",
    type: "booking_status",
    title: "Provider On The Way",
    body: "Tan Wei Ming from TW Electrical Works is heading to your location. ETA: 15 minutes.",
    isRead: false,
    createdAt: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: "notif_002",
    userId: "usr_consumer_001",
    type: "booking_accepted",
    title: "Booking Confirmed",
    body: "Siti Clean Pro has accepted your cleaning request for next week.",
    isRead: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "notif_003",
    userId: "usr_consumer_001",
    type: "match_found",
    title: "Great News! Providers Found",
    body: "We found 3 verified providers matching your cleaning request. Tap to view matches.",
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "notif_004",
    userId: "usr_consumer_001",
    type: "payment_success",
    title: "Payment Confirmed",
    body: "Your payment of MYR 180.00 for plumbing service has been processed. Receipt available.",
    isRead: true,
    createdAt: new Date(Date.now() - 13 * 86400000).toISOString(),
  },
  {
    id: "notif_005",
    userId: "usr_provider_001",
    type: "new_request",
    title: "New Job Request",
    body: "You have a new service request for electrical work in Cheras. Tap to view details.",
    isRead: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "notif_006",
    userId: "usr_provider_001",
    type: "payment_received",
    title: "Payment Received",
    body: "You've received MYR 240.00 for your completed electrical job.",
    isRead: true,
    createdAt: new Date(twoMonthsAgo).toISOString(),
  },
];

export function makeToken(userId: string, role: string) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
  } catch {
    return null;
  }
}

export function uid() {
  return "mock_" + Math.random().toString(36).slice(2, 11) + "_" + Date.now().toString(36);
}

export function toPublicUser(u: MockUser) {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    role: u.role,
    avatarUrl: u.avatarUrl,
    isActive: u.isActive,
    createdAt: u.createdAt,
  };
}

export function getProviderWithDetails(profile: MockProviderProfile) {
  const user = users.find(u => u.id === profile.userId)!;
  const services = providerServices.filter(s => s.providerId === profile.id);
  const primaryService = services[0];
  const serviceCategories = services.map(s => categories.find(c => c.id === s.categoryId)).filter(Boolean);
  return {
    id: profile.id,
    userId: profile.userId,
    businessName: profile.businessName,
    bio: profile.bio,
    yearsExperience: profile.yearsExperience,
    avgRating: profile.avgRating,
    totalJobs: profile.totalJobs,
    completionRate: profile.completionRate,
    acceptanceRate: profile.acceptanceRate,
    serviceRadiusKm: profile.serviceRadiusKm,
    verificationStatus: profile.verificationStatus,
    categories: serviceCategories,
    basePrice: primaryService?.basePrice || 80,
    priceType: primaryService?.priceType || "hourly",
    avatarUrl: user?.avatarUrl || null,
    distance: +(Math.random() * 8 + 0.5).toFixed(1),
  };
}
