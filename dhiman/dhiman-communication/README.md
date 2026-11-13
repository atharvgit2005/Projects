# Modern Mobile Center

Production-grade single-vendor mobile shop web application built with Next.js App Router, TypeScript, Tailwind CSS, MongoDB, Mongoose, JWT auth, Zod validation, and a dark premium storefront plus admin dashboard.

## Core capabilities

- Single-shop storefront for one business owner, not a marketplace
- JWT authentication with `owner`, `admin`, and `customer` roles
- Owner-only role promotion for staff/admin access
- Product catalog for mobiles, accessories, audio products, second-hand stock, and upcoming launches
- Wishlist, compare, cart, inquiry, and sell/exchange flows
- Admin dashboard for products, categories, brands, requests, users, and settings
- MongoDB-backed APIs and seed/bootstrap scripts
- Dynamic discount filtering based on real catalog data, with backend validation for invalid ranges and product discount bounds

## Tech stack

- Next.js `16.2.2`
- React `19.2.4`
- Tailwind CSS `4`
- MongoDB with Mongoose
- JWT via `jose`
- Password hashing via `bcryptjs`
- Forms with `react-hook-form` + `zod`

## Environment variables

Create `.env.local` from `.env.example` and configure:

```env
MONGODB_URI=
JWT_SECRET=
NEXT_PUBLIC_APP_NAME=Modern Mobile Center
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SHOP_PHONE=
NEXT_PUBLIC_SHOP_EMAIL=
NEXT_PUBLIC_SHOP_ADDRESS=
NEXT_PUBLIC_GOOGLE_MAPS_LINK=
OWNER_EMAIL=
OWNER_BOOTSTRAP_CODE=
OWNER_PASSWORD=
YOUTUBE_EMBED_ALLOWED=true
```

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` and set:
   - `MONGODB_URI` to your MongoDB connection string
   - `JWT_SECRET` to a long random secret
   - public shop details for phone, email, address, and maps link
   - `OWNER_EMAIL` and `OWNER_BOOTSTRAP_CODE` for owner bootstrap
   - optionally `OWNER_PASSWORD` if you want the seed script to create the owner automatically

3. Seed the database:

```bash
npm run seed
```

4. Bootstrap the owner account if it was not created during seed:

```bash
npm run bootstrap:owner -- --email "owner@example.com" --password "StrongPass123!" --code "your-bootstrap-code"
```

5. Run the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Authentication behavior

- Public signup always creates `customer`
- Only the owner can promote users to `admin`
- Only one owner account is allowed
- Owner bootstrap works only when the submitted email matches `OWNER_EMAIL`
- JWT session is stored in an HTTP-only cookie

## Main routes

### Public

- `/`
- `/shop`
- `/shop/[slug]`
- `/categories/[slug]`
- `/compare`
- `/wishlist`
- `/cart`
- `/login`
- `/signup`
- `/profile`
- `/sell-or-exchange`
- `/upcoming`
- `/second-hand`
- `/contact`

### Admin

- `/admin`
- `/admin/products`
- `/admin/products/new`
- `/admin/products/[id]/edit`
- `/admin/categories`
- `/admin/brands`
- `/admin/orders-or-inquiries`
- `/admin/exchange-requests`
- `/admin/users`
- `/admin/settings`

## API endpoints

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/bootstrap-owner`
- `GET/PATCH /api/profile`
- `GET/POST /api/products`
- `GET/PATCH/DELETE /api/products/[id]`
- `GET/POST /api/categories`
- `PATCH/DELETE /api/categories/[id]`
- `GET/POST /api/brands`
- `PATCH/DELETE /api/brands/[id]`
- `GET/POST /api/wishlist`
- `DELETE /api/wishlist/[productId]`
- `GET/POST /api/compare`
- `DELETE /api/compare/[productId]`
- `GET/POST/DELETE /api/cart`
- `PATCH/DELETE /api/cart/[productId]`
- `GET/POST /api/inquiries`
- `PATCH /api/inquiries/[id]`
- `GET/POST /api/sell-exchange`
- `PATCH /api/sell-exchange/[id]`
- `GET/PUT /api/settings`
- `GET /api/users`
- `PATCH /api/users/[id]/role`
- `GET /api/dashboard/stats`

## Seed data included

- Categories: mobiles, headphones, earbuds, cables, accessories, second-hand
- Brands: Samsung, Apple, OnePlus, Xiaomi, Realme, JBL, Anker, Nothing, Spigen
- Products:
  - New flagship and midrange mobiles
  - Upcoming launch sample
  - Headphones, earbuds, cables, accessories
  - Second-hand devices

## Project structure

```text
.
├── .env.example
├── middleware.ts
├── next.config.ts
├── package.json
├── scripts
│   ├── bootstrap-owner.ts
│   └── seed.ts
└── src
    ├── app
    ├── components
    ├── lib
    ├── models
    ├── providers
    ├── schemas
    ├── services
    └── types
```

## Production build

```bash
npm run build
npm run start
```

## Future payment integration points

- Cart and inquiry flow is already separated from checkout logic
- Add a `Payment` model and payment status fields to inquiry/order records
- Introduce payment provider webhooks and a dedicated checkout route
- Keep product pricing and stock validation server-side before payment capture
