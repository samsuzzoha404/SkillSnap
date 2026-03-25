# SkillSnap — Full End-to-End Project Analysis Report

**তারিখ:** ২১ মার্চ ২০২৫  
**স্কোপ:** পুরো প্রজেক্ট এন্ড-টু-এন্ড বিশ্লেষণ এবং বাগ ফিক্স

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

- **API:** Express 5, pino, bcryptjs, jsonwebtoken, CORS
- **Database:** PostgreSQL + Drizzle ORM (যখন `USE_MOCK_DATA=false`)
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

### ২.২ Service Request Status (open vs pending) ✅

**সমস্যা:**  
- Mock: নতুন রিকোয়েস্টে `status: "open"`  
- DB schema: `"pending" | "matched" | "booked" | "cancelled"`  
- ফলে mock ও DB রেসপন্সে status ভিন্ন ছিল।

**সমাধান:**  
Mock store ও mockRouter-এ `"open"` কে `"pending"` দিয়ে প্রতিস্থাপন করা হয়েছে।

**ফাইল:** `artifacts/api-server/src/mock/store.ts`, `artifacts/api-server/src/mock/mockRouter.ts`

---

### ২.৩ Urgency Enum (urgent vs emergency) ✅

**সমস্যা:**  
- Mock: `urgency: "urgent"`  
- DB ও API spec: `"emergency"`  
- ফ্রন্টএন্ড create form: `"emergency"` ব্যবহার করে।  
- ফলে mock seed ডাটায় ভুল enum ছিল।

**সমাধান:**  
Mock store-এ `"urgent"` কে `"emergency"` দিয়ে প্রতিস্থাপন করা হয়েছে।

**ফাইল:** `artifacts/api-server/src/mock/store.ts`

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
       +-- USE_MOCK_DATA=false → real router → PostgreSQL

[mockup-sandbox] → আলাদা, কোনো API কানেক্ট করা নেই
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

- DB: `pending | matched | booked | cancelled` (status enum)
- Mock অতিরিক্তভাবে `completed` ব্যবহার করে; DB-তে এই স্ট্যাটাস নেই। ভবিষ্যতে DB schema আপডেট করার প্রয়োজন হতে পারে।

### ৬.৪ Mockup-Sandbox TypeScript Errors

- `calendar.tsx` এবং `spinner.tsx`-এ React ref টাইপের সংঘাত আছে (@types/react সংস্করণের কারণে)।
- এই ত্রুটিগুলো আগে থেকেই ছিল, এই সেশনের ফিক্সের সাথে সম্পর্কিত না।

---

## ৭. পরিবেশ চলক (Environment Variables)

| পরিবর্তনশীল | জায়গা | উদ্দেশ্য |
|-------------|--------|----------|
| `USE_MOCK_DATA` | api-server | `true` = mock, `false` = DB |
| `PORT` | api-server | সার্ভার পোর্ট (default ৮০৮০) |
| `EXPO_PUBLIC_API_URL` | skillsnap | সম্পূর্ণ API base (যেমন `http://192.168.0.12:8080/api`) |
| `EXPO_PUBLIC_DOMAIN` | skillsnap | প্রোড হোস্ট (যেমন `skillsnap.example.com`) |
| `JWT_SECRET` | api-server | JWT সাইনিং সিক্রেট |

---

## ৮. টেস্টিং স্ট্যাটাস

- **api-server:** typecheck passed
- **skillsnap:** typecheck passed
- **mockup-sandbox:** typecheck failed (pre-existing React ref type issues)

---

## ৯. সুপারিশ

1. **Payment:** রিয়েল API-তে নতুন পেমেন্ট রাউট সঠিকভাবে কাজ করছে কিনা লাইভ এনভায়রনমেন্টে যাচাই করুন।
2. **API Client:** চলমান অ্যাপে `@workspace/api-client-react` ব্যবহার অথবা `lib/api.ts` কে সিঙ্ক রাখার জন্য OpenAPI spec আপডেট করুন।
3. **Notifications:** ভবিষ্যতে read-all ফিচার দরকার হলে রিয়েল API-তে `PATCH /notifications/read-all` যোগ করুন।
4. **Mockup-Sandbox:** React টাইপ সংস্করণ ঠিক করে `calendar.tsx` ও `spinner.tsx`-এর ref type ইস্যু সমাধান করুন।

---

## ১০. সংক্ষিপ্ত সারাংশ

| বিষয় | আগে | পরে |
|-------|-----|-----|
| Payment (DB mode) | ৪০৪, কাজ করত না | ঠিক আছে |
| Service request status (mock) | `open` | `pending` (DB-সঙ্গতিপূর্ণ) |
| Urgency (mock seed) | `urgent` | `emergency` (API/DB সঙ্গতিপূর্ণ) |

এই ফিক্সগুলো দিয়ে mock ও DB মোড উভয়েই আরও সঙ্গতিপূর্ণ এবং পেমেন্ট ফ্লো সঠিকভাবে কাজ করার কথা।
