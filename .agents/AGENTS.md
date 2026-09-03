# Guidelines for HOLD3R Project

## Database Schema (Supabase)

All queries, forms, mutations, and components generated in this project MUST strictly follow the exact schema definition below:

### `public.profiles`
- `id`: `uuid` (Primary Key, references `auth.users`)
- `full_name`: `text`
- `document_id`: `text` (Cédula/RIF)
- `role`: `'admin' | 'investor'`
- `created_at`: `timestamptz`

### `public.wallets`
- `id`: `uuid` (Primary Key)
- `user_id`: `uuid` (Foreign Key -> `profiles.id`)
- `usdt_address`: `text`
- `network`: `'TRC20' | 'BEP20'`
- `balance`: `numeric`
- `updated_at`: `timestamptz`

### `public.assets`
- `id`: `uuid` (Primary Key)
- `title`: `text`
- `category`: `'real_estate' | 'heavy_machinery' | 'fleet'`
- `description`: `text`
- `total_valuation`: `numeric`
- `funded_amount`: `numeric`
- `status`: `'funding' | 'active_rent' | 'sold'`
- `legal_contract_url`: `text`
- `images`: `jsonb`
- `created_at`: `timestamptz`

### `public.asset_shares`
- `id`: `uuid` (Primary Key)
- `asset_id`: `uuid` (Foreign Key -> `assets.id`)
- `user_id`: `uuid` (Foreign Key -> `profiles.id`)
- `shares_percentage`: `numeric`
- `amount_invested_usdt`: `numeric`
- `signed_contract_hash`: `text`
- `purchased_at`: `timestamptz`

### `public.proposals`
- `id`: `uuid` (Primary Key)
- `asset_id`: `uuid` (Foreign Key -> `assets.id`)
- `title`: `text`
- `description`: `text`
- `status`: `'active' | 'approved' | 'rejected'`
- `created_at`: `timestamptz`

### `public.votes`
- `id`: `uuid` (Primary Key)
- `proposal_id`: `uuid` (Foreign Key -> `proposals.id`)
- `user_id`: `uuid` (Foreign Key -> `profiles.id`)
- `vote`: `'yes' | 'no'`
- `weight`: `numeric`

## Security & Row Level Security (RLS)
- RLS policies are active on Supabase.
- Client queries must handle authentication correctly (`supabase.auth.getUser()`, session tokens, user-context headers) to comply with RLS.
