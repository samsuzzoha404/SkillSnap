import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import {
  collections,
  createProviderProfile,
  createServicesForProvider,
  createUser,
  findProviderProfileByUserId,
  findUserByEmail,
  getCollection,
  listActiveCategories,
  upsertAvailabilitySlots,
  updateProviderProfile,
} from "@workspace/db";

async function seed() {
  console.log("Seeding SkillSnap database (MongoDB)...");

  const categories = [
    { name: "Electrical", icon: "zap", description: "Wiring, installations, repairs, and electrical work" },
    { name: "Plumbing", icon: "droplet", description: "Pipe repairs, installations, and water systems" },
    { name: "Cleaning", icon: "wind", description: "Home, office, and deep cleaning services" },
    { name: "Automotive", icon: "truck", description: "Car repairs, servicing, and maintenance" },
    { name: "Air Conditioning", icon: "thermometer", description: "AC installation, servicing, and repairs" },
    { name: "Carpentry", icon: "tool", description: "Furniture assembly, woodwork, and repairs" },
    { name: "Painting", icon: "layers", description: "Interior and exterior painting services" },
    { name: "Security", icon: "shield", description: "CCTV installation and security systems" },
  ];

  const providersPerCategory = 10;

  // Base locations (lat/lng) used to generate 80 distinct provider addresses.
  // (Derived from the previous hardcoded providerData set.)
  const addressPool: Array<{ address: string; lat: number; lng: number }> = [
    { address: "Ampang, Kuala Lumpur", lat: 3.1569, lng: 101.7123 },
    { address: "Petaling Jaya, Selangor", lat: 3.0889, lng: 101.6783 },
    { address: "KLCC, Kuala Lumpur", lat: 3.1390, lng: 101.6869 },
    { address: "Subang Jaya, Selangor", lat: 3.0686, lng: 101.5985 },
    { address: "Cheras, Kuala Lumpur", lat: 3.1478, lng: 101.7289 },
    { address: "Bangsar, Kuala Lumpur", lat: 3.1234, lng: 101.6543 },
    { address: "Sri Petaling, KL", lat: 3.0980, lng: 101.7456 },
    { address: "Mont Kiara, Kuala Lumpur", lat: 3.1650, lng: 101.6234 },
    { address: "Kepong, Kuala Lumpur", lat: 3.2010, lng: 101.6890 },
    { address: "Desa Petaling, KL", lat: 3.1120, lng: 101.6720 },
    { address: "Puchong, Selangor", lat: 3.0765, lng: 101.7234 },
    { address: "Sunway, Selangor", lat: 3.0456, lng: 101.6543 },
  ];

  const serviceDefaults: Record<string, { basePrice: number; priceType: "hourly" | "fixed" }> = {
    Electrical: { basePrice: 80, priceType: "hourly" },
    Plumbing: { basePrice: 70, priceType: "hourly" },
    Cleaning: { basePrice: 120, priceType: "fixed" },
    Automotive: { basePrice: 100, priceType: "hourly" },
    "Air Conditioning": { basePrice: 150, priceType: "fixed" },
    Carpentry: { basePrice: 90, priceType: "hourly" },
    Painting: { basePrice: 200, priceType: "fixed" },
    Security: { basePrice: 300, priceType: "fixed" },
  };

  // Deterministic PRNG so seed re-runs generate the same provider set.
  function fnv1aHash(input: string): number {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed: number): () => number {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function getDeterministicRng(seed: string): () => number {
    return mulberry32(fnv1aHash(seed));
  }

  function categoryKey(name: string): string {
    return name.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]+/g, "");
  }

  const businessPrefix: Record<string, string> = {
    Electrical: "Volt",
    Plumbing: "Pipe",
    Cleaning: "CleanSpark",
    Automotive: "AutoFix",
    "Air Conditioning": "CoolBreeze",
    Carpentry: "WoodCraft",
    Painting: "PaintPerfect",
    Security: "SafeGuard",
  };

  const categoriesColl = await getCollection<any>(collections.categories);
  const existingCategories = await listActiveCategories();
  const categoryIdByName = new Map(existingCategories.map((c) => [c.name, c.id]));

  let createdCategories = 0;
  for (const c of categories) {
    if (categoryIdByName.has(c.name)) continue;

    const id = randomUUID();
    await categoriesColl.insertOne({
      _id: id,
      name: c.name,
      icon: c.icon,
      description: c.description,
      isActive: true,
    });
    categoryIdByName.set(c.name, id);
    createdCategories++;
  }

  console.log(`Created ${createdCategories} categories`);

  const demoPassword = await bcrypt.hash("password123", 10);

  const consumerEmail = "consumer@skillsnap.my";
  const consumer = await findUserByEmail(consumerEmail);
  if (!consumer) {
    await createUser({
      fullName: "Ahmad Razif",
      email: consumerEmail,
      passwordHash: demoPassword,
      phone: "+60123456789",
      role: "consumer",
    });
    console.log("Created demo consumer");
  }

  const adminEmail = "admin@skillsnap.my";
  if (!(await findUserByEmail(adminEmail))) {
    await createUser({
      fullName: "SkillSnap Admin",
      email: adminEmail,
      passwordHash: demoPassword,
      phone: null,
      role: "admin",
    });
    console.log("Created demo admin");
  }

  for (const [categoryIndex, category] of categories.entries()) {
    const categoryId = categoryIdByName.get(category.name);
    if (!categoryId) continue;

    const serviceDefault = serviceDefaults[category.name];
    const basePrice = serviceDefault?.basePrice ?? 80;
    const priceType = serviceDefault?.priceType ?? "hourly";

    for (let i = 0; i < providersPerCategory; i++) {
      const seedKey = `${category.name}:${i}`;
      const rng = getDeterministicRng(seedKey);

      const addressBase = addressPool[(categoryIndex * providersPerCategory + i) % addressPool.length]!;

      // Keep address readable but still "different" across providers.
      const unitNo = 1 + Math.floor(rng() * 300);
      const address = `${addressBase.address} (Unit ${unitNo})`;

      // Small lat/lng jitter for variety while staying near the base location.
      const latJitter = (rng() - 0.5) * 0.04; // about +/- 0.02 degrees
      const lngJitter = (rng() - 0.5) * 0.06; // about +/- 0.03 degrees

      const yearsExperience = 3 + Math.floor(rng() * 12); // 3..14
      const avgRating = Math.min(5, +(4.3 + rng() * 0.7).toFixed(1));
      const totalJobs = 60 + Math.floor(rng() * 500);
      const completionRate = Math.round(85 + rng() * 14); // 85..99
      const acceptanceRate = Math.round(75 + rng() * 20); // 75..95
      const reputationScore = avgRating * 18 + rng() * 10;
      const serviceRadiusKm = Math.round(12 + rng() * 30); // 12..42

      const providerEmail = `${categoryKey(category.name)}.${i + 1}@skillsnap.my`;
      let providerUser = await findUserByEmail(providerEmail);
      if (!providerUser) {
        const prefix = businessPrefix[category.name] ?? category.name;
        const fullName = `${prefix} Expert ${i + 1}`;
        const businessName = `${prefix} ${category.name} Works ${i + 1}`;

        providerUser = await createUser({
          fullName,
          email: providerEmail,
          passwordHash: demoPassword,
          phone: `+601${Math.floor(10000000 + rng() * 89999999)}`,
          role: "provider",
        });

        // Create profile with initial location/business; stats will be updated below.
        const bio = `${yearsExperience}+ years ${category.name.toLowerCase()} specialist. Reliable, on-time service across the Klang Valley.`;
        const profile = await createProviderProfile({
          userId: providerUser.id,
          businessName,
          bio,
          yearsExperience,
          verificationStatus: "verified",
          serviceRadiusKm,
          latitude: +(addressBase.lat + latJitter).toFixed(6),
          longitude: +(addressBase.lng + lngJitter).toFixed(6),
          address,
        });

        await createServicesForProvider({
          providerId: profile.id,
          services: [
            {
              categoryId,
              basePrice,
              priceType,
              isActive: true,
            },
          ],
        });

        await upsertAvailabilitySlots(
          profile.id,
          Array.from({ length: 5 }, (_, dayOffset) => ({
            dayOfWeek: dayOffset + 1,
            startTime: "09:00",
            endTime: "18:00",
            isAvailable: true,
          })),
        );

        // Update stats once profile exists.
        await updateProviderProfile(profile.id, {
          avgRating,
          completionRate,
          acceptanceRate,
          totalJobs,
          reputationScore,
        } as any);
        continue;
      }

      let providerProfile = await findProviderProfileByUserId(providerUser.id);
      if (!providerProfile) {
        const bio = `${yearsExperience}+ years ${category.name.toLowerCase()} specialist. Reliable, on-time service across the Klang Valley.`;
        providerProfile = await createProviderProfile({
          userId: providerUser.id,
          businessName: `${businessPrefix[category.name] ?? category.name} ${category.name} Works ${i + 1}`,
          bio,
          yearsExperience,
          verificationStatus: "verified",
          serviceRadiusKm,
          latitude: +(addressBase.lat + latJitter).toFixed(6),
          longitude: +(addressBase.lng + lngJitter).toFixed(6),
          address,
        });
      }

      // Always refresh profile fields + stats so repeated runs keep data consistent.
      await updateProviderProfile(providerProfile.id, {
        businessName: `${businessPrefix[category.name] ?? category.name} ${category.name} Works ${i + 1}`,
        bio: `${yearsExperience}+ years ${category.name.toLowerCase()} specialist. Reliable, on-time service across the Klang Valley.`,
        yearsExperience,
        verificationStatus: "verified",
        serviceRadiusKm,
        latitude: +(addressBase.lat + latJitter).toFixed(6),
        longitude: +(addressBase.lng + lngJitter).toFixed(6),
        address,
        avgRating,
        completionRate,
        acceptanceRate,
        totalJobs,
        reputationScore,
      } as any);

      await createServicesForProvider({
        providerId: providerProfile.id,
        services: [
          {
            categoryId,
            basePrice,
            priceType,
            isActive: true,
          },
        ],
      });

      await upsertAvailabilitySlots(
        providerProfile.id,
        Array.from({ length: 5 }, (_, dayOffset) => ({
          dayOfWeek: dayOffset + 1,
          startTime: "09:00",
          endTime: "18:00",
          isAvailable: true,
        })),
      );
    }
  }

  // Verification: count only the providers generated by this deterministic seeding run.
  const expectedProviderCount = categories.length * providersPerCategory;
  const expectedProviderEmails: string[] = [];
  for (const category of categories) {
    for (let i = 0; i < providersPerCategory; i++) {
      expectedProviderEmails.push(`${categoryKey(category.name)}.${i + 1}@skillsnap.my`);
    }
  }

  const usersColl = await getCollection<any>(collections.users);
  const providerUsers = await usersColl.find({ email: { $in: expectedProviderEmails } }).toArray();
  const providerUserIds = providerUsers.map((u: any) => String(u._id));

  const providerProfilesColl = await getCollection<any>(collections.provider_profiles);
  const providerProfilesForSeed = await providerProfilesColl
    .find({ userId: { $in: providerUserIds } })
    .toArray();
  const providerIds = providerProfilesForSeed.map((p: any) => String(p._id));

  const providerServicesColl = await getCollection<any>(collections.provider_services);
  const providerServicesCount = await providerServicesColl.countDocuments({ providerId: { $in: providerIds } });

  console.log(
    `Seed verification: expected provider_profiles=${expectedProviderCount}, actual=${providerProfilesForSeed.length}; expected provider_services=${expectedProviderCount}, actual=${providerServicesCount}`,
  );

  console.log(`Seed complete!`);
  console.log("\nDemo accounts:");
  console.log("  Consumer: consumer@skillsnap.my / password123");
  console.log("  Provider: electrical.1@skillsnap.my / password123");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
