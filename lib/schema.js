/**
 * Definición y constantes del esquema de Base de Datos Supabase para HOLD3R.
 */

export const TABLES = {
  PROFILES: 'profiles',
  WALLETS: 'wallets',
  ASSETS: 'assets',
  ASSET_SHARES: 'asset_shares',
  ASSET_RESERVATIONS: 'asset_reservations',
  ASSET_WAITLIST: 'asset_waitlist',
  PROPOSALS: 'proposals',
  VOTES: 'votes',
};

export const ROLES = {
  ADMIN: 'admin',
  INVESTOR: 'investor',
};

export const NETWORKS = {
  TRC20: 'TRC20',
  BEP20: 'BEP20',
};

export const ASSET_CATEGORIES = {
  REAL_ESTATE: 'real_estate',
  HEAVY_MACHINERY: 'heavy_machinery',
  FLEET: 'fleet',
};

export const CATEGORY_LABELS = {
  real_estate: 'Bienes Raíces',
  heavy_machinery: 'Maquinaria Pesada',
  fleet: 'Vehículos',
};

export const ASSET_STATUS = {
  FUNDING: 'funding',
  ACTIVE_RENT: 'active_rent',
  SOLD: 'sold',
};

export const PROPOSAL_STATUS = {
  ACTIVE: 'active',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const VOTE_OPTIONS = {
  YES: 'yes',
  NO: 'no',
};
