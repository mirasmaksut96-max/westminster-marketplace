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

**Auth flow:** `App.jsx` checks the Supabase session on mount. Unauthenticated users see `Auth.jsx` (login/register with email+password). Authenticated users see `Marketplace.jsx` with the session passed as a prop down to all child components.

**Navigation pattern:** `Marketplace.jsx` manages all view state via `useState` flags (`showPost`, `showMessages`, `showProfile`, `selectedListing`, `selectedSeller`). Feature screens (`PostListing`, `ListingDetail`, `Messages`, `Profile`, `SellerProfile`, `ReportListing`) are modal overlays rendered conditionally. Closing a modal calls `onClose()` which resets the flag; some also call `fetchListings()` to refresh.

**Supabase client:** Single shared instance exported from `src/supabaseClient.js`. The URL and publishable anon key are hardcoded there.

**Database tables used:**
- `listings` — `id, seller_id, category_id, title, description, price, condition, image_urls[], status`
- `profiles` — `id, full_name, role` (auto-populated from auth metadata on sign-up)
- `categories` — `id, name, slug` (pre-seeded; slugs match the `CATEGORIES` arrays in `Marketplace.jsx` and `PostListing.jsx`)
- `messages` — `id, listing_id, sender_id, receiver_id, content, sent_at, is_read`
- `saved_items` — `user_id, listing_id`
- `reports` — `reporter_id, listing_id, reason, details, status`
- `ratings` — `rated_user_id, score, comment, created_at` (used by `SellerProfile.jsx` to show reviews and average star rating)

**Storage:** Listing images upload to the `listing-images` Supabase Storage bucket. Public URLs are stored in `listings.image_urls[]`.

**Styling:** All styles are inline JS objects defined as a `const styles = { ... }` block at the bottom of each component file. There are no CSS modules or utility classes — extend the local `styles` object when adding UI to an existing component. Brand colour is `#4a1fb8`.

**Category handling:** Categories are stored in the DB and referenced by slug. `PostListing` looks up the category `id` by slug before inserting a listing. The slug lists in `Marketplace.jsx` (`CATEGORIES`) and `PostListing.jsx` (`CATEGORIES`) must stay in sync with the `categories` table in Supabase.

**`SellerProfile.jsx`** is a modal overlay showing a seller's active listings and ratings. It is opened from `ListingDetail` via `onViewSeller`, which sets `selectedSeller` in `Marketplace.jsx`. It receives `sellerId`, `sellerName`, `sellerRole`, `session`, `onClose`, and `onSelectListing` as props.

**`ReportListing.jsx`** is imported in `ListingDetail.jsx` and its toggle state (`showReport`) is wired, but the component is not yet rendered inside the JSX. Adding it requires rendering `<ReportListing>` conditionally on `showReport` inside `ListingDetail`.

**`viewMode`** in `Marketplace.jsx` toggles between `'active'` and `'sold'` listings for the current user's own items. It is a filter applied in `fetchListings`.

**Unread message count** is polled every 30 seconds via `setInterval` in `Marketplace.jsx` and displayed as a badge on the Messages button.
