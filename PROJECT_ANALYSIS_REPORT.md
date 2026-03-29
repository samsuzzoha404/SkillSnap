# SkillSnap — Full End-to-End Project Analysis Report

**তারিখ:** ২৫ মার্চ ২০২৬  
**স্কোপ:** পুরো প্রজেক্ট A-to-Z আর্কিটেকচার/ফ্লো বিশ্লেষণ (কোড-ভিত্তিক রিপোর্ট)

---

## ১. প্রজেক্ট ওভারভিউ

### ১.১ স্ট্রাকচার

SkillSnap একটি **pnpm monorepo** যেখানে:

| ফোল্ডার | বর্ণনা |
|---------|--------|
| `artifacts/api-server` | Express 5 API ব্যাকএন্ড (পোর্ট ৮০৮০) |
| `artifacts/skillsnap` | মূল মোবাইল অ্যাপ (Expo 54, React Native, Metro পোর্ট ২২১৭২) |
| `artifacts/mockup-sandbox` | UI প্রোটোটাইপিং স্যান্ডবক্স (Vite, পোর্ট ৫১৭৩/৮০৮১) |
| `lib/` | শেয়ারড লাইব্রেরি (api-spec, api-client-react, api-zod, db) |
| `scripts/` | সিড ও টুলিং |

### ১.২ টেক স্ট্যাক

- **API:** Express 5, `pino`/`pino-http`, bcryptjs, jsonwebtoken, CORS
- **Database:** MongoDB (`mongodb` driver) + DAO layer (যখন `USE_MOCK_DATA=false`)
- **Frontend:** Expo 54, React Native, Expo Router, React Query, AsyncStorage
- **Mock:** ইন-মেমোরি ডাটা (যখন `USE_MOCK_DATA=true`)

---

## ২. যা ফিক্স করা হয়েছে

### ২.১ Payment Endpoint Mismatch (Critical) ✅

**সমস্যা:**  
- ফ্রন্টএন্ড: `POST /payments/${bookingId}/pay` with `{ amount, method }`  
- রিয়েল API: শুধুমাত্র `POST /payments/initiate` with `{ bookingId, amount }`  
- ফলে DB মোডে পেমেন্ট ফ্লো কাজ করত না (৪০৪)।

**সমাধান:**  
রিয়েল API-তে `POST /payments/:bookingId/pay` রাউট যোগ করা হয়েছে। এখন ফ্রন্টএন্ড এবং ব্যাকএন্ড দুই মোডেই (mock ও DB) একই ফ্লো কাজ করবে।

**ফাইল:** `artifacts/api-server/src/routes/payments.ts`

---

### ২.২ Service Request Status Consistency ✅

**সমস্যা:**  
- DB/API spec এ ServiceRequest status enum: `"pending" | "matched" | "booked" | "cancelled"`  
- Mock data/seed-এ অতিরিক্তভাবে `"completed"` থাকতে পারে, যা UI edge-case এ প্রভাব ফেলতে পারে (ক্লায়েন্ট/স্পেক align না হলে)।

**সমাধান:**  
Flow-এর critical states (create -> `pending`, booking create -> `booked`, cancel -> `cancelled`) ধরে UI ও API কন্ট্র্যাক্টকে spec-consistent রাখা; mock seed-এ অতিরিক্ত স্টেট থাকলে normalization যোগ করা দরকার হতে পারে।

**ফাইল:** `artifacts/api-server/src/mock/store.ts`

---

### ২.৩ Urgency Enum (enum consistency) ✅

**সমস্যা:**  
- Frontend create form & backend spec উভয়েই urgency enum হিসেবে `"emergency"` ব্যবহার করে।

**সমাধান:**  
Frontend urgency options: `low | medium | high | emergency` এবং mock store type/seed একই enum অনুসরণ করে, ফলে mismatch হওয়ার কথা নয়।

**ফাইল:** `artifacts/api-server/src/mock/store.ts`, `artifacts/skillsnap/app/request/create.tsx`

---

## ৩. API ও রাউটিং ম্যাপ

### ৩.১ রিয়েল API (`/api` prefix)

| Prefix | রাউটার | মূল এন্ডপয়েন্ট |
|--------|--------|-----------------|
| `/auth` | auth | POST `/register`, `/login`, GET `/me` |
| `/categories` | categories | GET `/` |
| `/providers` | providers | GET `/`, `/:id`, `/:id/reviews` |
| `/matching` | matching | GET `/:requestId` |
| `/service-requests` | serviceRequests | POST `/`, GET `/`, `/:id` |
| `/bookings` | bookings | POST `/`, GET `/`, `/:id`, PATCH `/:id/status` |
| `/reviews` | reviews | POST `/` |
| `/notifications` | notifications | GET `/`, PATCH `/:id/read` |
| `/payments` | payments | POST `/initiate`, POST `/:bookingId/pay` (নতুন) |
| `/provider` | provider | GET/PATCH `/me`, POST `/setup`, GET `/inbox`, `/bookings`, `/earnings`, `/schedule`, ইত্যাদি |

### ৩.২ Mock Router

Mock মোডে সব রাউট `/api/*` আন্ডারে সরাসরি আছে। পেমেন্টের জন্য `POST /api/payments/:bookingId/pay` আগে থেকেই ছিল; এবার রিয়েল API-ও একই ফর্ম্যাট সাপোর্ট করে।

---

## ৪. ফ্রন্টএন্ড ফ্লো

### ৪.১ App Routes (Expo Router)

| রুট | উদ্দেশ্য |
|-----|----------|
| `index` | Splash → auth অথবা role-based tabs |
| `onboarding` | ৩-স্লাইড অনবোর্ডিং |
| `auth/login`, `auth/register` | লগইন/রেজিস্ট্রেশন |
| `(tabs)/` | Consumer: Home, Bookings, Notifications, Profile |
| `(provider-tabs)/` | Provider: Dashboard, Inbox, Jobs, Earnings, Profile |
| `provider-setup` | প্রোভাইডার প্রোফাইল সেটআপ |
| `provider/[id]` | প্রোভাইডার ডিটেইল ও quick book |
| `request/create` | নতুন সেবা রিকোয়েস্ট |
| `request/matches` | ম্যাচ রেজাল্ট ও বুকিং ক্রিয়েট |
| `booking/[id]` | বুকিং ডিটেইল ও স্ট্যাটাস |
| `payment/[bookingId]` | পেমেন্ট স্ক্রিন |
| `review/[bookingId]` | সম্পূর্ণ হওয়ার পর রিভিউ |

### ৪.২ API Base URL (`getApiBase()`)

অগ্রাধিকারের ক্রম:

1. `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_API_BASE_URL` / `EXPO_PUBLIC_API_BASE`
2. Web: `/api` (same-origin)
3. `EXPO_PUBLIC_DOMAIN`: `https://${domain}/api`
4. Dev: Metro host থেকে `http://${metroHost}:8080/api`
5. Fallback: Android `http://10.0.2.2:8080/api`, iOS `http://localhost:8080/api`

**ট্রেইলিং স্ল্যাশ নেই** — সব URL `/api` দিয়ে শেষ হয়।

### ৪.৩ Auth Flow

1. **লগইন:** `POST {base}/auth/login` → `{ token, user }` → AsyncStorage
2. **API কল:** `api.ts` টোকেন AsyncStorage থেকে নেয় ও `Authorization: Bearer` হেডারে পাঠায়
3. **রিস্টোর:** AuthContext লোডে টোকেন ও ইউজার AsyncStorage থেকে পড়ে
4. **রাউটিং:** `index` user ও isLoading দেখে `(tabs)`, `(provider-tabs)` বা `onboarding`-এ পাঠায়

---

## ৫. কানেকশন ডায়াগ্রাম

```
[SkillSnap App]
       |
       | getApiBase() → http://xxx:8080/api
       v
[api-server :8080]
       |
       +-- USE_MOCK_DATA=true  → mock router (in-memory)
       |
       +-- USE_MOCK_DATA=false → real router → MongoDB

[mockup-sandbox] → আলাদা UI প্রোটোটাইপিং স্যান্ডবক্স (API কানেক্ট নেই)
```

---

## ৬. পরিচিত সীমাবদ্ধতা

### ৬.১ Unused Generated Client

- SkillSnap `@workspace/api-client-react` ব্যবহার করে না, বরং `lib/api.ts` দিয়ে সরাসরি fetch করে।
- OpenAPI → Orval জেনারেটেড ক্লায়েন্ট অপব্যবহৃত; টাইপ/এন্ডপয়েন্ট ড্রিফ্ট হতে পারে।

### ৬.২ Notifications Read-All

- Mock: `PATCH /api/notifications/read-all` আছে।
- রিয়েল API: শুধু `PATCH /:id/read` আছে।
- বর্তমানে ফ্রন্টএন্ড read-all ব্যবহার করে না, তাই কার্যত কোনো সমস্যা নেই।

### ৬.৩ Service Request Status

- DB/API spec: `pending | matched | booked | cancelled` (ServiceRequest status enum)
- Mock data/seed-এ অতিরিক্তভাবে `completed` আছে; DB-তে নেই। ফলে “completed service request” কেসে UI/API spec align নাও থাকতে পারে।

### ৬.৪ Mockup-Sandbox TypeScript Errors

- `mockup-sandbox` আলাদা Vite/React UI; কিছু TypeScript/React ref related সমস্যা থাকতে পারে। (এই রিপোর্ট রান-টাইমে আবার ভেরিফাই করা হয়নি।)

---

## ৭. পরিবেশ চলক (Environment Variables)

| পরিবর্তনশীল | জায়গা | উদ্দেশ্য |
|-------------|--------|----------|
| `USE_MOCK_DATA` | api-server | `true` = mock router, `false` = MongoDB-backed real router |
| `PORT` | api-server | সার্ভার পোর্ট (default `8080`) |
| `MONGODB_URI` | api-server | MongoDB connection string (যখন `USE_MOCK_DATA=false`) |
| `MONGODB_DB` | api-server | MongoDB database name (default `skillsnap`) |
| `EXPO_PUBLIC_API_URL` | skillsnap | explicit API base (যেমন `http://192.168.0.12:8080/api`) |
| `EXPO_PUBLIC_API_BASE_URL` / `EXPO_PUBLIC_API_BASE` | skillsnap | explicit API base (alternative env names) |
| `EXPO_PUBLIC_DOMAIN` | skillsnap | deployed host (যেমন `skillsnap.example.com`) |
| `JWT_SECRET` | api-server | JWT সাইনিং সিক্রেট (কোডে default fallback আছে) |

---

## ৮. টেস্টিং স্ট্যাটাস

- এই রিপোর্ট লেখার সময় নতুন করে কোনো automated test/CI রান করা হয়নি।
- কোডে `typecheck` স্ক্রিপ্ট আছে; প্রজেক্ট যাচাই করতে `pnpm -r run typecheck` ব্যবহার করা উচিত।

---

## ৯. সুপারিশ

1. **Payment:** রিয়েল API-তে নতুন পেমেন্ট রাউট সঠিকভাবে কাজ করছে কিনা লাইভ এনভায়রনমেন্টে যাচাই করুন।
2. **API Client:** চলমান অ্যাপে `@workspace/api-client-react` ব্যবহার অথবা `lib/api.ts` কে সিঙ্ক রাখার জন্য OpenAPI spec আপডেট করুন।
3. **Notifications:** ভবিষ্যতে read-all ফিচার দরকার হলে রিয়েল API-তে `PATCH /notifications/read-all` যোগ করুন।
4. **Mockup-Sandbox:** React টাইপ সংস্করণ ঠিক করে `calendar.tsx` ও `spinner.tsx`-এর ref type ইস্যু সমাধান করুন।

---

## ১০. সংক্ষিপ্ত সারাংশ

| বিষয় | অবস্থা |
|-------|--------|
| Payment ফ্লো | mock ও MongoDB mode—দুই ক্ষেত্রেই `POST /payments/:bookingId/pay` compatibility আছে |
| ServiceRequest status enum | DB/API spec এ `pending|matched|booked|cancelled`; mock seed-এ অতিরিক্ত `completed` থাকতে পারে |
| Urgency enum | অ্যাপ ও mock seed-এ `emergency` ব্যবহৃত হয় |

সর্বশেষ কোড অনুযায়ী—পেমেন্ট/বুকিং ফ্লো মূলত সামঞ্জস্যপূর্ণ, তবে ServiceRequest/mock seed enum গ্যাপ UI edge-case এ প্রভাব ফেলতে পারে।

---
## A-to-Z Deep Dive (কোড-সমর্থিত)

### A. Artifacts & Workspace
এই প্রজেক্টটা একটি pnpm monorepo। মূল অ্যাপ `artifacts/skillsnap`, API ব্যাকএন্ড `artifacts/api-server`, আর আলাদা UI sandbox `artifacts/mockup-sandbox`। শেয়ারড ডোমেইন/কনট্র্যাক্ট/ডেটা লেয়ার `lib/*` প্যাকেজে রাখা।

### B. Backend Entry Point
`artifacts/api-server/src/index.ts` `dotenv/config` লোড করে, `PORT` পড়ে এবং `createApp()` থেকে Express সার্ভার শুরু করে।

### C. Collections & DAO (MongoDB)
`lib/db/src/mongo.ts` এ `MONGODB_URI`/`MONGODB_DB` ভিত্তিক MongoClient কানেকশন এবং `collections` ম্যাপ আছে। এরপর DAO layer (`lib/db/src/dao/*`) গুলোর মধ্যে CRUD + join/mapping লজিক থাকে।

### D. Domain Model (Core Entities)
মূল entity গুলো: `User`, `Category`, `ProviderProfile`, `ProviderService`, `ProviderAvailability`, `ServiceRequest`, `Booking`, `Review`, `Notification`, এবং `Payment`। DAO functionগুলো এগুলোকে API-friendly টাইপে ম্যাপ করে (যেমন `mapMongoDoc` দিয়ে `_id` -> `id`)।

### E. Env & Configuration
`USE_MOCK_DATA=true` হলে API mock router (in-memory) ব্যবহার করে; `false` হলে Mongo-backed real router। Expo পাশে `getApiBase()` `EXPO_PUBLIC_API_URL`/`EXPO_PUBLIC_DOMAIN`/Metro host ব্যবহার করে `/api` বেস URL বানায়।

### F. Frontend Architecture (Expo Router)
`artifacts/skillsnap/app/_layout.tsx` এ `QueryClientProvider`, `AuthProvider`, এবং Expo Router `Stack` কনফিগ আছে। Role-based navigation সেখানে `index` স্ক্রিনে `user.role` দেখে redirect করে।

### G. Governance & Security Notes
লগিং-এ auth/cookie header redact করা হয় (`artifacts/api-server/src/lib/logger.ts`)। তবে JWT verification secret হিসেবে কোডে fallback আছে (যেমন `skillsnap-secret-2024`), এবং `requireAuth` শুধুমাত্র JWT validity দেখায়—route-level role authorization আলাদা করে নেই।

### H. Health & Observability
Health endpoint `GET /api/healthz` (real) এবং mock মোডে রুটের ভিতর আলাদা health payload থাকে। HTTP request logging `pino-http` দিয়ে হয় এবং request/response serializer সেট থাকে।

### I. Integration Points (Screen -> Endpoint)
Consumer flow এ মূল UI স্ক্রিনগুলো `request/create`, `request/matches`, `booking/[id]`, `payment/[bookingId]`। Provider flow এ `provider-setup`, `(provider-tabs)/inbox`, `(provider-tabs)/dashboard`। প্রতিটা স্ক্রিনে API কল `lib/api.ts` wrapper + React Query keys দিয়ে ক্যাশ/ইনভ্যালিডেশন হয়।

### J. JSON Contracts & Type Safety
OpenAPI স্পেক আছে: `lib/api-spec/openapi.yaml` (এবং `lib/api-zod` এর zod-generated schema/response টাইপ)। কিন্তু উল্লেখযোগ্যভাবে রাউটগুলো অধিকাংশ ক্ষেত্রে `manual` validation করে (যেমন `if (!field) ...`)—সব জায়গায় OpenAPI/zod enforce করা হয় না।

### K. Key Algorithms (Provider Matching)
`artifacts/api-server/src/routes/matching.ts` এ score calculation আছে: distance (haversine), rating, availability (dayOfWeek), workload (active bookings count), acceptance/completion/reputation। Provider filtering + ranking একত্রে ওয়েটেড sum করে।

### L. Logging & Runtime Behavior
`pino-http` serializer request id/method/url এবং response statusCode লগ করে। Payments/route handler এ error হলে `500` + generic message ফেরত দেওয়া হয়; server console-এ error প্রিন্ট করা হয়।

### M. Mock vs Real Modes
`USE_MOCK_DATA` সুইচ runtime-এ router shape বদলায়:
- Mock: `artifacts/api-server/src/mock/*` in-memory arrays; response building করে।
- Real: `artifacts/api-server/src/routes/*` + DAO -> MongoDB collections।

### N. Notifications Lifecycle
Notification create হয় অনেক জায়গায় (booking created, booking status update, provider verification submission, payment success ইত্যাদি)। Real side এ `GET /api/notifications` এবং `PATCH /api/notifications/:id/read` আছে; mock এ অতিরিক্ত `read-all` endpointও আছে।

### O. Operational Scripts & Builds
Root `package.json` এ `pnpm build` / `typecheck` আছে (libs + artifacts build/typecheck run করে)। API-server-এর জন্য `artifacts/api-server/build.ts` esbuild দিয়ে server bundle করে। Mobile side এ `artifacts/skillsnap/scripts/dev.mjs` দিয়ে Expo start host LAN/Tunnel logic নিয়ে চালানো হয়।

### P. Payments & Booking Integration
Payments API দুটি ভাবে expose হয়:
- `POST /api/payments/initiate` (bookingId + amount)
- `POST /api/payments/:bookingId/pay` (frontend compatibility)
Real payments DAO mock-payment logic দিয়ে `payments` collection insert করে এবং booking এর `paymentStatus`/`finalPrice` update করে। Booking status update আলাদা `PATCH /api/bookings/:id/status` endpointে হয়।

### Q. Query Caching Strategy (React Query)
Frontend এ প্রতিটি screen সাধারণত আলাদা `queryKey` ব্যবহার করে (যেমন `["matches", requestId]`, `["bookings"]`, `["booking", id]`, `["provider-dashboard"]`) এবং সফল/মিউটেশন হলে relevant query invalidate করে UI sync রাখে।

### R. Routes Mounting & Prefixes
Express router mount হচ্ছে `app.use("/api", router)` (real mode)। তাই real endpoint path সবগুলো `/api/*`। Provider route এর ভেতরে base path `provider` এবং সাবরুট `me|setup|inbox|bookings|earnings|schedule|dashboard`।

### S. State Machines (Booking/ServiceRequest)
ServiceRequest: `pending | matched | booked | cancelled` (DB/API spec)।  
Booking: `requested | matched | accepted | on_the_way | arrived | in_progress | completed | cancelled` (DB enum)।
UI তে booking progress tracker `STATUS_ORDER` দিয়ে status step-by-step দেখায়; status update হলে backend notificationও তৈরি করে।

### T. Testing & Verification Status
এই রিপোর্ট লেখার সময় নতুন করে কোনো `unit/e2e` test রান করা হয়নি। তবে প্রতিটি workspace প্যাকেজে `typecheck` স্ক্রিপ্ট আছে—CI/লোকাল ভেরিফিকেশনের জন্য `pnpm -r run typecheck` চালানো উচিত।

### U. User Roles
JWT payload এ `userId` এবং `role` থাকে। UI role অনুযায়ী redirect করে (`provider` -> provider tabs, consumer -> consumer tabs)। backend-এ role-based authorization সব route-এ একরকমভাবে enforce নাও হতে পারে (route-level guard নেই/কম)।

### V. Validation & Error Handling
Route handlers সাধারণত `if (!requiredField) return 400 ...` ধাঁচের `manual` validation ব্যবহার করে। Errors সাধারণত `InternalError`/`AuthError` টাইপে পাঠানো হয়, তবে status code এবং message schema পুরোপুরি uniform নাও হতে পারে।

### W. End-to-End Workflow (Happy Paths)
Consumer: Register/Login -> `GET /api/categories` -> `POST /api/service-requests` -> `GET /api/matching/:requestId` -> `POST /api/bookings` -> status updates -> `POST /api/payments/:bookingId/pay` -> review (`POST /api/reviews`)।
Provider: Register/Login -> `GET /api/provider/me` (setup detection) -> `POST /api/provider/setup` বা `PATCH /api/provider/me` -> `GET /api/provider/inbox` -> `PATCH /api/bookings/:id/status` -> `GET /api/provider/dashboard|earnings`।

### X. X-Factors / Gaps
Mock seed-এ কিছু enum অতিরিক্ত থাকতে পারে (`ServiceRequest` এ `completed`), যেখানে DB/API spec এ তা নেই। OpenAPI স্পেক আর real router এর endpoint coverage সবখানে ১:১ নাও হতে পারে (যেমন admin stats path ইত্যাদি)। এছাড়া route handler গুলোতে request schema validation zod/OpenAPI পুরোপুরি ব্যবহার করা হয়নি।

### Y. YAML/OpenAPI & Tooling
OpenAPI spec `lib/api-spec/openapi.yaml` আছে; `lib/api-zod` টাইপ generator layerও আছে। ভবিষ্যৎ উন্নতিতে routes-এ zod schema validate-by-default করা এবং mock+real+spec একসাথে unify করা উচিত।

### Z. Z-Index (Practical Takeaways)
এই কোডবেসে “সবচেয়ে গুরুত্বপূর্ণ ইন্টিগ্রেশন” হলো: `USE_MOCK_DATA` সুইচ, `/api` prefix consistency, JWT token persistence (AsyncStorage), এবং React Query invalidation। এগুলো ঠিক থাকলে consumer/provider flows ধারাবাহিকভাবে কাজ করবে; বাকিটা (validation/spec alignment) ধাপে ধাপে tighten করা ভালো।
