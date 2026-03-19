import { db } from "@workspace/db";
import {
  categoriesTable,
  usersTable,
  providerProfilesTable,
  providerServicesTable,
  providerAvailabilityTable,
} from "@workspace/db/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding SkillSnap database...");

  const categories = await db
    .insert(categoriesTable)
    .values([
      { name: "Electrical", icon: "zap", description: "Wiring, installations, repairs, and electrical work" },
      { name: "Plumbing", icon: "droplet", description: "Pipe repairs, installations, and water systems" },
      { name: "Cleaning", icon: "wind", description: "Home, office, and deep cleaning services" },
      { name: "Automotive", icon: "truck", description: "Car repairs, servicing, and maintenance" },
      { name: "Air Conditioning", icon: "thermometer", description: "AC installation, servicing, and repairs" },
      { name: "Carpentry", icon: "tool", description: "Furniture assembly, woodwork, and repairs" },
      { name: "Painting", icon: "layers", description: "Interior and exterior painting services" },
      { name: "Security", icon: "shield", description: "CCTV installation and security systems" },
    ])
    .onConflictDoNothing()
    .returning();

  console.log(`Created ${categories.length} categories`);

  const demoPassword = await bcrypt.hash("password123", 10);

  const consumerUser = await db
    .insert(usersTable)
    .values({
      fullName: "Ahmad Razif",
      email: "consumer@skillsnap.my",
      passwordHash: demoPassword,
      phone: "+60123456789",
      role: "consumer",
    })
    .onConflictDoNothing()
    .returning();

  console.log("Created demo consumer");

  const providerData = [
    { name: "Tan Wei Ming", business: "WeiFix Electrical", bio: "10+ years electrical specialist in KL. Licensed with SIRIM certification. Specializes in residential wiring and industrial setups.", years: 11, category: "Electrical", price: 80, priceType: "hourly" as const, lat: 3.1569, lng: 101.7123, address: "Ampang, Kuala Lumpur", rating: 4.8, jobs: 234, radius: 15 },
    { name: "Ravi Shankar", business: "RaviPlumb Pro", bio: "Expert plumber serving Klang Valley since 2010. Specializes in emergency repairs, pipe installations, and bathroom renovations.", years: 14, category: "Plumbing", price: 70, priceType: "hourly" as const, lat: 3.0889, lng: 101.6783, address: "Petaling Jaya, Selangor", rating: 4.7, jobs: 189, radius: 20 },
    { name: "Siti Nurhaliza Bt Ahmad", business: "CleanSparkle KL", bio: "Professional home cleaning specialist. My team provides thorough, eco-friendly cleaning for homes and offices across Kuala Lumpur.", years: 6, category: "Cleaning", price: 120, priceType: "fixed" as const, lat: 3.1390, lng: 101.6869, address: "KLCC, Kuala Lumpur", rating: 4.9, jobs: 412, radius: 25 },
    { name: "Kenny Loh", business: "KL AutoFix", bio: "Certified mechanic with 12 years experience. Specialized in Japanese and European cars. Honest pricing, quality parts.", years: 12, category: "Automotive", price: 100, priceType: "hourly" as const, lat: 3.0686, lng: 101.5985, address: "Subang Jaya, Selangor", rating: 4.6, jobs: 156, radius: 18 },
    { name: "Ahmad Fauzi", business: "CoolBreeze AC Services", bio: "Panasonic & Daikin certified technician. AC cleaning, gas top-up, installation and full service packages at competitive prices.", years: 8, category: "Air Conditioning", price: 150, priceType: "fixed" as const, lat: 3.1478, lng: 101.7289, address: "Cheras, Kuala Lumpur", rating: 4.7, jobs: 298, radius: 22 },
    { name: "Raj Krishnan", business: "Raj Carpentry Works", bio: "Master carpenter specializing in custom furniture, wardrobe installation, and home renovation woodwork. Quality craftsmanship guaranteed.", years: 15, category: "Carpentry", price: 90, priceType: "hourly" as const, lat: 3.1234, lng: 101.6543, address: "Bangsar, Kuala Lumpur", rating: 4.8, jobs: 201, radius: 15 },
    { name: "Lim Chee Keong", business: "PaintPerfect Solutions", bio: "Interior and exterior painting expert. Using premium Nippon Paint products. Clean work, on-time delivery, and competitive rates.", years: 9, category: "Painting", price: 200, priceType: "fixed" as const, lat: 3.0980, lng: 101.7456, address: "Sri Petaling, KL", rating: 4.5, jobs: 143, radius: 20 },
    { name: "Zulkifli Hassan", business: "SafeGuard Security", bio: "CCTV and alarm system specialist. Bosch and Hikvision certified installer. Providing peace of mind to homes and businesses since 2015.", years: 9, category: "Security", price: 300, priceType: "fixed" as const, lat: 3.1650, lng: 101.6234, address: "Mont Kiara, Kuala Lumpur", rating: 4.8, jobs: 87, radius: 30 },
    { name: "Michael Chan", business: "TechElec Solutions", bio: "Specialized in smart home wiring, EV charger installation, and solar panel electrical work. Future-ready electrical solutions.", years: 7, category: "Electrical", price: 100, priceType: "hourly" as const, lat: 3.2010, lng: 101.6890, address: "Kepong, Kuala Lumpur", rating: 4.6, jobs: 178, radius: 18 },
    { name: "Nurul Ain Binti Ramli", business: "SparkleHome Cleaning", bio: "Trained professional cleaner with attention to detail. Flexible scheduling, brings own eco-certified cleaning supplies.", years: 4, category: "Cleaning", price: 100, priceType: "fixed" as const, lat: 3.1120, lng: 101.6720, address: "Desa Petaling, KL", rating: 4.9, jobs: 267, radius: 20 },
    { name: "David Wong", business: "PipeMaster Plumbing", bio: "Emergency plumbing specialist available 24/7. Expert in pipe leaks, water heater installation, and bathroom renovation.", years: 10, category: "Plumbing", price: 85, priceType: "hourly" as const, lat: 3.0765, lng: 101.7234, address: "Puchong, Selangor", rating: 4.7, jobs: 321, radius: 25 },
    { name: "Harish Kumar", business: "AirCool Pro KL", bio: "10 years AC servicing experience. All brands serviced. Chemical wash, gas top-up, and installation with 3-month warranty.", years: 10, category: "Air Conditioning", price: 130, priceType: "fixed" as const, lat: 3.0456, lng: 101.6543, address: "Sunway, Selangor", rating: 4.6, jobs: 445, radius: 28 },
  ];

  for (const p of providerData) {
    const categoryRow = categories.find((c) => c.name === p.category);
    if (!categoryRow) continue;

    const [providerUser] = await db
      .insert(usersTable)
      .values({
        fullName: p.name,
        email: `${p.name.toLowerCase().replace(/\s+/g, ".")}@skillsnap.my`,
        passwordHash: demoPassword,
        phone: `+601${Math.floor(10000000 + Math.random() * 89999999)}`,
        role: "provider",
      })
      .onConflictDoNothing()
      .returning();

    if (!providerUser) continue;

    const [providerProfile] = await db
      .insert(providerProfilesTable)
      .values({
        userId: providerUser.id,
        businessName: p.business,
        bio: p.bio,
        yearsExperience: p.years,
        verificationStatus: "verified",
        serviceRadiusKm: p.radius,
        avgRating: p.rating,
        completionRate: 85 + Math.random() * 14,
        acceptanceRate: 80 + Math.random() * 18,
        totalJobs: p.jobs,
        reputationScore: p.rating * 18 + Math.random() * 10,
        latitude: p.lat,
        longitude: p.lng,
        address: p.address,
      })
      .onConflictDoNothing()
      .returning();

    if (!providerProfile) continue;

    await db
      .insert(providerServicesTable)
      .values({
        providerId: providerProfile.id,
        categoryId: categoryRow.id,
        basePrice: p.price,
        priceType: p.priceType,
        isActive: true,
      })
      .onConflictDoNothing();

    for (let day = 1; day <= 5; day++) {
      await db
        .insert(providerAvailabilityTable)
        .values({
          providerId: providerProfile.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "18:00",
          isAvailable: true,
        })
        .onConflictDoNothing();
    }
  }

  console.log(`Created ${providerData.length} providers with services and availability`);
  console.log("Seed complete!");
  console.log("\nDemo accounts:");
  console.log("  Consumer: consumer@skillsnap.my / password123");
  console.log("  Provider: tan.wei.ming@skillsnap.my / password123");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
