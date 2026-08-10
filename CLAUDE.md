# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite HMR)
npm run build     # Production build
npm run lint      # ESLint
npm run preview   # Preview production build locally
```

There are no tests.

## Architecture

React + Vite SPA backed entirely by Supabase (auth, database, storage). No routing library — all navigation is state-driven inside `Marketplace.jsx`.

**Auth flow:** `App.jsx` checks the Supabase session on mount. Unauthenticated users see `Auth.jsx` (login/register with email+password; registration is restricted to `@westminster.ac.uk` addresses). Authenticated users see `Marketplace.jsx` with the session passed as a prop down to all child components.

**Navigation pattern:** `Marketplace.jsx` manages all view state via `useState` flags (`showPost`, `showMessages`, `showProfile`, `selectedListing`, `selectedSeller`, `showContactAdmin`, `showAdminDashboard`). Feature screens (`PostListing`, `ListingDetail`, `Messages`, `Profile`, `SellerProfile`, `ReportListing`, `ContactSeller`, `ContactAdmin`, `AdminDashboard`) are modal overlays rendered conditionally. Closing a modal calls `onClose()` which resets the flag; some also call `fetchListings()` to refresh.

**Supabase client:** Single shared instance exported from `src/supabaseClient.js`. The URL and publishable anon key are hardcoded there.

**Database tables used:**
- `listings` — `id, seller_id, category_id, title, description, price, condition, image_urls[], status, listing_type, expires_at, pickup_location, brand, item_size, views, locked_buyer_id`
- `profiles` — `id, full_name, role` (auto-populated from auth metadata on sign-up)
- `categories` — `id, name, slug` (pre-seeded; slugs match the `CATEGORIES` arrays in `Marketplace.jsx` and `PostListing.jsx`)
- `messages` — `id, listing_id, sender_id, receiver_id, content, sent_at, is_read` (`listing_id` is nullable — `null` marks an admin-support thread rather than a listing conversation)
- `saved_items` — `user_id, listing_id`
- `reports` — `reporter_id, listing_id, reason, details, status`
- `ratings` — `rated_user_id, score, comment, created_at` (used by `SellerProfile.jsx` to show reviews and average star rating)

**Database functions:** `increment_listing_views(listing_id)` — called from `ListingDetail` to increment `listings.views`, skipped for the owner's own views. `mark_messages_read(p_receiver_id)` — called from `Messages.jsx` on mount to mark all of the current user's received messages as read.

**Storage:** Listing images upload to the `listing-images` Supabase Storage bucket. Public URLs are stored in `listings.image_urls[]`.

**Styling:** All styles are inline JS objects defined as a `const styles = { ... }` block at the bottom of each component file. There are no CSS modules or utility classes — extend the local `styles` object when adding UI to an existing component. Brand colour is `#4a1fb8` (used in `ListingDetail`); `Marketplace.jsx` uses dark purple `#1a0844` / `#3d0c1e` with gold `#c9a84c` accents.

**Category handling:** Categories are stored in the DB and referenced by slug. `PostListing` looks up the category `id` by slug before inserting a listing. The slug lists in `Marketplace.jsx` (`CATEGORIES`) and `PostListing.jsx` (`CATEGORIES`) must stay in sync with the `categories` table in Supabase.

**Listing types:** `listing_type` is either `'sell'` (default/null) or `'wanted'`. Wanted ads display differently (blue badge, budget label instead of price). New listings expire after 30 days (`expires_at`).

**`PostListing.jsx`** handles both create and edit modes. When an `editListing` prop is passed it pre-populates fields and issues an `update` instead of `insert`. It also contains a `PROHIBITED_ITEMS` keyword blocklist that prevents posting before submission.

**`viewMode`** in `Marketplace.jsx` has three values: `'active'` (sell listings), `'wanted'` (wanted ads), and `'sold'` (sold/pending listings). It is a filter applied in `fetchListings`.

**`SellerProfile.jsx`** is a modal overlay showing a seller's active listings and ratings. It is opened from `ListingDetail` via `onViewSeller`, which sets `selectedSeller` in `Marketplace.jsx`. It receives `sellerId`, `sellerName`, `sellerRole`, `session`, `onClose`, and `onSelectListing` as props.

**`ReportListing.jsx`** is imported and rendered in `ListingDetail.jsx` — it mounts conditionally on `showReport` inside the overlay, outside the main modal div.

**`ContactSeller.jsx`** is the shared "message seller" / "make an offer" modal opened from `ListingDetail`; the `initialMode` prop (`'message'` or `'offer'`) picks the starting tab. Both flows just insert a row into `messages`.

**Admin access:** there is no `profiles.role`-based admin flag — `ADMIN_ID` exported from `ContactAdmin.jsx` is a hardcoded Supabase user UUID. `Marketplace.jsx` compares `session.user.id` to it to show the "Admin" nav button (badged with the pending `reports` count) and to gate `AdminDashboard`. Non-admin users instead see a "Contact Admin" footer button (`ContactAdmin.jsx`) that inserts a `messages` row with `listing_id: null` and `receiver_id: ADMIN_ID`; `Messages.jsx` branches its queries and realtime subscription filter on whether `listing_id` is null to keep these admin-support threads separate from listing conversations.

**`AdminDashboard.jsx`** lists all `reports` (joined with `listings` and `profiles`), filterable by pending/resolved/all. From here a report can be marked resolved, or its listing removed (`listings.status` set to `'removed'`).

**Deal locking:** accepting an offer in `Messages.jsx` sets `listings.locked_buyer_id` and `status: 'sold'` directly (no separate `'pending'` state is ever written). `ListingDetail`'s "pending deal" / "offer accepted" banners key off `locked_buyer_id` together with `status === 'pending'`, so they only apply to legacy data — `Messages.jsx`'s own `isDealLocked` check treats both `'pending'` and `'sold'` as locked.

**Unread message count** is polled every 30 seconds via `setInterval` in `Marketplace.jsx` and displayed as a badge on the Messages button.

**Filtering and pagination** in `Marketplace.jsx` are entirely server-side. `fetchListings(pageNum, replace, savedItemsOverride)` builds one Supabase query applying category, viewMode, search, price range, condition, posted-within, photos-only, saved-only, pickup-location, and sort, then paginates via `.range()` with `PAGE_SIZE = 24` and `{ count: 'exact' }`. Free-text/numeric inputs (`search`, `minPrice`, `maxPrice`, `locationFilter`) are debounced 350ms each via a local `useDebouncedValue` hook before being included in the query; click-driven filters (category, condition, posted-within, photos-only, saved-only, sort, viewMode) apply immediately. A `requestIdRef` counter guards against stale out-of-order responses when filters change faster than requests resolve. "Load More" appends the next page (`fetchListings(page + 1, false)`); any filter/sort/category/viewMode change resets to page 0 and replaces results.
