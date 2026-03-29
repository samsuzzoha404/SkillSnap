/**
 * Smoke test: health, public categories, admin/consumer/provider JWT paths.
 * Requires API running (default from API_VERIFY_BASE_URL or production Render URL) and seeded DB (pnpm --filter @workspace/scripts seed).
 * Run with: tsx --import ./src/loadEnv.ts ./src/verifyApi.ts
 */

const base =
  (
    process.env.API_VERIFY_BASE_URL || "https://skillsnap-ushm.onrender.com/api"
  ).replace(/\/+$/, "");

async function login(email: string, password: string): Promise<string> {
  const loginRes = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) {
    const t = await loginRes.text();
    throw new Error(`POST /auth/login (${email}) → ${loginRes.status} ${t}`);
  }
  const loginJson = (await loginRes.json()) as { token?: string };
  const token = loginJson.token;
  if (!token) throw new Error(`POST /auth/login (${email}): no token in body`);
  return token;
}

async function getMe(token: string): Promise<{ role?: string }> {
  const meRes = await fetch(`${base}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meRes.ok) throw new Error(`GET /auth/me → ${meRes.status}`);
  return (await meRes.json()) as { role?: string };
}

async function main() {
  const errors: string[] = [];

  const r1 = await fetch(`${base}/healthz`);
  if (!r1.ok) errors.push(`GET /healthz → ${r1.status}`);
  else console.log("OK GET /healthz");

  const catRes = await fetch(`${base}/categories`);
  if (!catRes.ok) {
    const t = await catRes.text();
    errors.push(`GET /categories → ${catRes.status} ${t}`);
  } else {
    const cats = (await catRes.json()) as unknown[];
    console.log("OK GET /categories count=%s", Array.isArray(cats) ? cats.length : "?");
  }

  // Admin
  try {
    const adminToken = await login("admin@skillsnap.my", "password123");
    console.log("OK POST /auth/login (admin)");
    const adminMe = await getMe(adminToken);
    console.log("OK GET /auth/me role=%s", adminMe.role);
    if (adminMe.role !== "admin") errors.push(`GET /auth/me: expected role admin, got ${adminMe.role}`);

    const statsRes = await fetch(`${base}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!statsRes.ok) {
      const t = await statsRes.text();
      errors.push(`GET /admin/stats → ${statsRes.status} ${t}`);
    } else {
      const stats = (await statsRes.json()) as Record<string, unknown>;
      console.log("OK GET /admin/stats keys:", Object.keys(stats).slice(0, 6).join(", "), "...");
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  // Consumer
  try {
    const consumerToken = await login("consumer@skillsnap.my", "password123");
    console.log("OK POST /auth/login (consumer)");
    const cMe = await getMe(consumerToken);
    console.log("OK GET /auth/me role=%s", cMe.role);
    if (cMe.role !== "consumer") errors.push(`GET /auth/me: expected role consumer, got ${cMe.role}`);

    const bookingsRes = await fetch(`${base}/bookings`, {
      headers: { Authorization: `Bearer ${consumerToken}` },
    });
    if (!bookingsRes.ok) {
      const t = await bookingsRes.text();
      errors.push(`GET /bookings (consumer) → ${bookingsRes.status} ${t}`);
    } else {
      console.log("OK GET /bookings (consumer)");
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  // Provider (seeded)
  try {
    const providerToken = await login("electrical.1@skillsnap.my", "password123");
    console.log("OK POST /auth/login (provider)");
    const pMe = await getMe(providerToken);
    console.log("OK GET /auth/me role=%s", pMe.role);
    if (pMe.role !== "provider") errors.push(`GET /auth/me: expected role provider, got ${pMe.role}`);

    const dashRes = await fetch(`${base}/provider/dashboard`, {
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    if (!dashRes.ok) {
      const t = await dashRes.text();
      errors.push(`GET /provider/dashboard → ${dashRes.status} ${t}`);
    } else {
      console.log("OK GET /provider/dashboard");
    }

    const provMeRes = await fetch(`${base}/provider/me`, {
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    if (!provMeRes.ok) {
      const t = await provMeRes.text();
      errors.push(`GET /provider/me → ${provMeRes.status} ${t}`);
    } else {
      console.log("OK GET /provider/me");
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  if (errors.length) {
    console.error("Verification failed:");
    for (const e of errors) console.error(" -", e);
    process.exit(1);
  }
  console.log("All API smoke checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
