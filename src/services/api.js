import { supabase } from '../../lib/supabase';
import { TABLES } from '../../lib/schema';

// Helper para generar UUIDv4 de respaldo válido en navegadores y node
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper para generar dirección simulada USDT en red TRC20/BEP20
export function generateUsdtAddress(network = 'TRC20') {
  const prefix = network === 'TRC20' ? 'T' : '0x';
  const chars = '0123456789abcdefABCDEF';
  let addr = prefix;
  const len = network === 'TRC20' ? 33 : 40;
  for (let i = 0; i < len; i++) {
    addr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return addr;
}

// Helper para generar hash de contrato legal firmado en SHA256 simulado
export function generateContractHash(assetId, userId, amount) {
  const str = `HOLD3R-CONTRACT-${assetId}-${userId}-${amount}-${Date.now()}`;
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += Math.floor(Math.random() * 16).toString(16);
  }
  return '0x' + hash;
}

// ----------------------------------------------------
// AUTH & PROFILES & WALLETS
// ----------------------------------------------------

export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

// Helper para obtener la URL de redirección oficial de forma dinámica
export function getRedirectUrl() {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return 'https://hold3r.vercel.app';
}

export async function signUpUser({ email, password, fullName, documentId }) {
  // Determinar rol automáticamente según el correo electrónico
  const cleanEmail = (email || '').trim().toLowerCase();
  const assignedRole = cleanEmail === 'hold3rvenezuela@gmail.com' ? 'admin' : 'investor';

  // 1. Crear usuario en auth.users enviando metadatos exactos y la URL de redirección oficial
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getRedirectUrl(),
      data: {
        full_name: fullName,
        document_id: documentId,
        role: assignedRole
      }
    }
  });

  if (authError) throw authError;

  const user = authData.user;
  if (!user) throw new Error('No se pudo registrar el usuario en Supabase Auth.');

  // 2. Obtener el perfil creado automáticamente por el trigger de Supabase DB
  let profile = await getUserProfile(user.id);

  // Si el trigger no creó el perfil aún (o RLS/Trigger no activo), realizamos upsert de respaldo
  if (!profile) {
    const profilePayload = {
      id: user.id,
      full_name: fullName,
      document_id: documentId,
      role: assignedRole,
      created_at: new Date().toISOString()
    };

    try {
      const { data: createdProfile, error: profileError } = await supabase
        .from(TABLES.PROFILES)
        .upsert(profilePayload, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (!profileError && createdProfile) {
        profile = createdProfile;
      }
    } catch (err) {
      console.warn('Fallback al crear perfil manualmente:', err.message);
    }

    if (!profile) {
      profile = profilePayload;
    }
  }

  // 3. Obtener o verificar la wallet del usuario
  let wallet = await getUserWallet(user.id);

  return {
    user,
    profile,
    wallet
  };
}

export async function signInUser({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from(TABLES.PROFILES)
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error al obtener perfil:', error);
  }
  return data;
}

export async function getUserWallet(userId) {
  const { data, error } = await supabase
    .from(TABLES.WALLETS)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error al obtener wallet:', error);
  }

  // Si no tiene wallet por alguna razón, se la creamos automáticamente
  if (!data && userId) {
    const newWallet = {
      user_id: userId,
      usdt_address: generateUsdtAddress('TRC20'),
      network: 'TRC20',
      balance: 1500.00,
      updated_at: new Date().toISOString()
    };
    const { data: created } = await supabase
      .from(TABLES.WALLETS)
      .insert(newWallet)
      .select()
      .single();
    return created || newWallet;
  }

  return data;
}

export async function depositFunds(walletId, currentBalance, amountUsdt) {
  const newBalance = Number(currentBalance) + Number(amountUsdt);

  // Si es wallet demo local sin id en BD, devolvemos wallet actualizada
  if (!walletId) {
    return { balance: newBalance, usdt_address: generateUsdtAddress('TRC20'), network: 'TRC20' };
  }

  const { data, error } = await supabase
    .from(TABLES.WALLETS)
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', walletId)
    .select()
    .single();

  if (error) {
    console.warn('Actualización local de wallet:', error.message);
    return { id: walletId, balance: newBalance };
  }
  return data;
}

// ----------------------------------------------------
// ASSETS
// ----------------------------------------------------

export async function fetchAssets() {
  const { data, error } = await supabase
    .from(TABLES.ASSETS)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Helper para subir imágenes a Supabase Storage con fallback a Data URL
export async function uploadAssetImage(file) {
  if (!file) return null;

  try {
    const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `asset-images/${fileName}`;

    // Intentar subida a Supabase Storage (bucket 'assets')
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (!uploadError && uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    } else {
      console.warn('Aviso al subir foto a Supabase Storage (usando fallback Data URL):', uploadError?.message);
    }
  } catch (err) {
    console.warn('Excepción en Supabase Storage (usando fallback Data URL):', err.message);
  }

  // Fallback seguro a Data URL (base64) para compatibilidad total en móviles/dev
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

// Helper para subir múltiples fotos en lote a Supabase Storage (hasta 20 imágenes)
export async function uploadMultipleAssetImages(files) {
  if (!files || files.length === 0) return [];
  const fileArray = Array.from(files).slice(0, 20); // Máximo 20 fotos
  const uploadedUrls = [];

  for (const file of fileArray) {
    try {
      const url = await uploadAssetImage(file);
      if (url) {
        uploadedUrls.push(url);
      }
    } catch (err) {
      console.warn('Aviso en subida múltiple:', err);
    }
  }

  return uploadedUrls;
}

export async function createAsset(assetData) {
  const payload = {
    title: assetData.title,
    category: assetData.category,
    description: assetData.description,
    total_valuation: Number(assetData.total_valuation),
    funded_amount: Number(assetData.funded_amount || 0),
    status: assetData.status || 'funding',
    legal_contract_url: assetData.legal_contract_url || 'https://hold3r.io/contracts/legal_spec.pdf',
    images: (assetData.images && assetData.images.length > 0 && assetData.images[0].trim()) 
      ? assetData.images 
      : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80'],
    created_at: new Date().toISOString()
  };

  const dbPayload = { ...payload };
  if (assetData.min_investment) dbPayload.min_investment = Number(assetData.min_investment);
  if (assetData.max_investment) dbPayload.max_investment = Number(assetData.max_investment);
  if (assetData.metadata && Object.keys(assetData.metadata).length > 0) dbPayload.metadata = assetData.metadata;
  if (assetData.num_holders) dbPayload.num_holders = Number(assetData.num_holders);
  if (assetData.ratings && Object.keys(assetData.ratings).length > 0) dbPayload.ratings = assetData.ratings;

  let { data, error } = await supabase
    .from(TABLES.ASSETS)
    .insert(dbPayload)
    .select()
    .single();

  // Si falla por columna inexistente (min_investment), reintentar sin columnas opcionales
  if (error && (error.code === 'PGRST204' || error.message?.includes('column') || error.message?.includes('min_investment'))) {
    console.warn('Reintentando inserción sin columnas opcionales en Supabase:', error.message);
    const retryRes = await supabase
      .from(TABLES.ASSETS)
      .insert(payload)
      .select()
      .single();

    data = retryRes.data;
    error = retryRes.error;
  }

  if (error) {
    console.error('Error al insertar activo en Supabase:', error);
    throw new Error(`Error de Supabase (${error.code || 'RLS'}): ${error.message || 'Transacción rechazada por la base de datos.'}`);
  }

  return {
    ...data,
    min_investment: assetData.min_investment ? Number(assetData.min_investment) : (data?.min_investment || 10),
    max_investment: assetData.max_investment ? Number(assetData.max_investment) : (data?.max_investment || null)
  };
}

export async function deleteAsset(assetId) {
  if (!assetId) throw new Error('ID de activo no válido.');

  // Verificar sesión activa antes de intentar DELETE (evita silenciar error RLS)
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('No estás autenticado. Inicia sesión como administrador para eliminar activos.');
  }

  // Verificar rol admin en profiles
  const { data: profile, error: profileError } = await supabase
    .from(TABLES.PROFILES)
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('No se pudo verificar tu perfil de administrador.');
  }

  if (profile.role !== 'admin') {
    throw new Error(`Acceso denegado: tu rol es "${profile.role}". Solo los administradores pueden eliminar activos.`);
  }

  const { data, error } = await supabase
    .from(TABLES.ASSETS)
    .delete()
    .eq('id', assetId)
    .select();

  if (error) {
    console.error('Error al eliminar activo en Supabase:', error);
    throw new Error(`Error de Supabase al eliminar (${error.code || 'RLS'}): ${error.message}`);
  }

  // Si data es vacío, el activo no existía o la política RLS rechazó silenciosamente
  if (!data || data.length === 0) {
    throw new Error('El activo no pudo ser eliminado. Verifica que exista y que las políticas RLS estén configuradas correctamente en Supabase.');
  }

  return data;
}

export async function updateAssetStatus(assetId, status) {
  const { data, error } = await supabase
    .from(TABLES.ASSETS)
    .update({ status })
    .eq('id', assetId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ----------------------------------------------------
// ASSET SHARES (INVESTMENTS)
// ----------------------------------------------------

export async function fetchUserShares(userId) {
  const { data, error } = await supabase
    .from(TABLES.ASSET_SHARES)
    .select(`
      *,
      asset:assets(*)
    `)
    .eq('user_id', userId)
    .order('purchased_at', { ascending: false });

  if (error && error.code !== 'PGRST116') {
    console.warn('Error al obtener shares:', error.message);
  }
  return data || [];
}

export async function investInAsset({ userId, wallet, asset, investmentUsdt }) {
  const amountUsdt = Number(investmentUsdt);
  const totalValuation = Number(asset.total_valuation);
  const currentFunded = Number(asset.funded_amount);

  if (amountUsdt <= 0) {
    throw new Error('El monto a invertir debe ser mayor a 0 USDT');
  }

  if (Number(wallet.balance) < amountUsdt) {
    throw new Error('Saldo insuficiente en tu billetera USDT');
  }

  if (currentFunded + amountUsdt > totalValuation) {
    throw new Error(`El monto excede la meta de fondeo restante ($${(totalValuation - currentFunded).toLocaleString()} USDT)`);
  }

  // Porcentaje de participación que representa esta inversión sobre el 100% de la valoración total
  const sharesPercentage = (amountUsdt / totalValuation) * 100;

  // Asegurar que userId sea un UUID válido
  const validUserId = (userId && userId.length === 36) ? userId : '11111111-1111-4111-8111-111111111111';

  // Asegurar que asset.id sea un UUID válido
  const validAssetId = (asset.id && asset.id.length === 36) ? asset.id : generateUUID();

  // 1. Insertar compra en public.asset_shares
  const sharePayload = {
    asset_id: validAssetId,
    user_id: validUserId,
    shares_percentage: sharesPercentage,
    amount_invested_usdt: amountUsdt,
    signed_contract_hash: generateContractHash(validAssetId, validUserId, amountUsdt),
    purchased_at: new Date().toISOString()
  };

  let shareData = null;
  try {
    const { data, error } = await supabase
      .from(TABLES.ASSET_SHARES)
      .insert(sharePayload)
      .select()
      .single();

    if (error) {
      console.warn('Aviso al guardar en Supabase asset_shares:', error.message);
      shareData = { id: generateUUID(), ...sharePayload, asset: asset };
    } else {
      shareData = data;
    }
  } catch (err) {
    console.warn('Fallback local de share insert:', err.message);
    shareData = { id: generateUUID(), ...sharePayload, asset: asset };
  }

  // 2. Actualizar funded_amount y status en public.assets
  const newFundedAmount = currentFunded + amountUsdt;
  const newStatus = newFundedAmount >= totalValuation ? 'active_rent' : asset.status;

  try {
    await supabase
      .from(TABLES.ASSETS)
      .update({ funded_amount: newFundedAmount, status: newStatus })
      .eq('id', validAssetId);
  } catch (err) {
    console.warn('Actualización local de activo:', err.message);
  }

  // 3. Descontar saldo de la wallet en public.wallets
  const newBalance = Number(wallet.balance) - amountUsdt;
  if (wallet.id) {
    try {
      await supabase
        .from(TABLES.WALLETS)
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', wallet.id);
    } catch (err) {
      console.warn('Actualización local de wallet:', err.message);
    }
  }
  wallet.balance = newBalance;

  return shareData;
}

// ----------------------------------------------------
// PROPOSALS & VOTES (GOBERNANZA)
// ----------------------------------------------------

export async function fetchProposals() {
  const { data, error } = await supabase
    .from(TABLES.PROPOSALS)
    .select(`
      *,
      asset:assets(*),
      votes:votes(*)
    `)
    .order('created_at', { ascending: false });

  if (error) console.warn('Aviso de lectura de propuestas:', error.message);
  return data || [];
}

export async function createProposal({ assetId, title, description }) {
  const validAssetId = (assetId && assetId.length === 36) ? assetId : generateUUID();
  const payload = {
    asset_id: validAssetId,
    title,
    description,
    status: 'active',
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from(TABLES.PROPOSALS)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function castVote({ proposalId, userId, voteChoice, weight = 1.0 }) {
  const validProposalId = (proposalId && proposalId.length === 36) ? proposalId : generateUUID();
  const validUserId = (userId && userId.length === 36) ? userId : '11111111-1111-4111-8111-111111111111';

  const payload = {
    proposal_id: validProposalId,
    user_id: validUserId,
    vote: voteChoice, // 'yes' | 'no'
    weight: weight
  };

  const { data, error } = await supabase
    .from(TABLES.VOTES)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ----------------------------------------------------
// RESERVAS TEMPORALES & LISTA DE ESPERA (15 MINUTOS - SUPABASE PERSISTENTE)
// ----------------------------------------------------

const activeReservationsMap = new Map();
const waitlistEntries = [];

export async function reserveAssetSlot({ assetId, userId, amountUsdt }) {
  const now = Date.now();
  const durationMs = 15 * 60 * 1000; // 15 minutos exactos
  const expiresAtIso = new Date(now + durationMs).toISOString();
  const validUserId = (userId && userId.length === 36) ? userId : '11111111-1111-4111-8111-111111111111';
  const validAssetId = (assetId && assetId.length === 36) ? assetId : generateUUID();

  const payload = {
    asset_id: validAssetId,
    user_id: validUserId,
    amount_usdt: Number(amountUsdt),
    expires_at: expiresAtIso,
    created_at: new Date(now).toISOString()
  };

  const key = `${assetId}_${userId}`;
  const localRes = {
    id: generateUUID(),
    assetId,
    userId,
    amountUsdt: Number(amountUsdt),
    reservedAt: now,
    expiresAt: now + durationMs
  };

  try {
    const { data, error } = await supabase
      .from(TABLES.ASSET_RESERVATIONS)
      .insert(payload)
      .select()
      .single();

    if (!error && data) {
      localRes.id = data.id;
    } else {
      console.warn('Aviso de reserva en Supabase (usando fallback local):', error?.message);
    }
  } catch (err) {
    console.warn('Excepción de reserva en Supabase:', err.message);
  }

  activeReservationsMap.set(key, localRes);
  return localRes;
}

export async function fetchActiveReservationsSumForAsset(assetId) {
  let totalReservedSum = 0;
  const nowIso = new Date().toISOString();

  // 1. Sumar en Supabase
  try {
    const { data, error } = await supabase
      .from(TABLES.ASSET_RESERVATIONS)
      .select('amount_usdt')
      .eq('asset_id', assetId)
      .gt('expires_at', nowIso);

    if (!error && data && data.length > 0) {
      totalReservedSum = data.reduce((acc, row) => acc + Number(row.amount_usdt || 0), 0);
      return totalReservedSum;
    }
  } catch (err) {
    // Fallback a mapa local
  }

  // 2. Sumar en mapa local
  const now = Date.now();
  for (const [k, res] of activeReservationsMap.entries()) {
    if (res.assetId === assetId && res.expiresAt > now) {
      totalReservedSum += res.amountUsdt;
    }
  }

  return totalReservedSum;
}

export function getActiveReservation(assetId, userId) {
  if (!assetId || !userId) return null;
  const key = `${assetId}_${userId}`;
  const res = activeReservationsMap.get(key);

  if (res) {
    if (res.expiresAt > Date.now()) {
      return res;
    } else {
      activeReservationsMap.delete(key);
    }
  }
  return null;
}

export async function releaseAssetReservation(assetId, userId) {
  const key = `${assetId}_${userId}`;
  activeReservationsMap.delete(key);

  if (assetId && userId) {
    try {
      await supabase
        .from(TABLES.ASSET_RESERVATIONS)
        .delete()
        .eq('asset_id', assetId)
        .eq('user_id', userId);
    } catch (err) {
      // Ignorar fallback
    }
  }
}

export async function joinAssetWaitlist({ assetId, userId, documentId, email }) {
  const payload = {
    asset_id: assetId,
    user_id: (userId && userId.length === 36) ? userId : null,
    document_id: documentId || 'N/A',
    email: email || 'usuario@hold3r.io',
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from(TABLES.ASSET_WAITLIST)
      .insert(payload)
      .select()
      .single();

    if (!error && data) return data;
  } catch (err) {
    console.warn('Aviso al guardar en lista de espera Supabase:', err.message);
  }

  const entry = {
    id: generateUUID(),
    ...payload
  };
  waitlistEntries.push(entry);
  return entry;
}

// ----------------------------------------------------
// DEMO SEED DATA (UUIDs estrictos y válidos)
// ----------------------------------------------------

export const DEMO_ASSETS = [
  {
    id: 'a1111111-1111-4111-8111-111111111111',
    title: 'Apartamento de Lujo en Altamira, Caracas',
    category: 'real_estate',
    description: '📍 Ubicación: Caracas, VE | 📐 Área: 180 m² | 🏢 Tipo: Residencial / Comercial\n\nPropiedad residencial amueblada en la zona financiera de Altamira. Genera renta mensual en divisa libre mediante alquiler corporativo a ejecutivos multilaterales.',
    total_valuation: 120000.00,
    funded_amount: 84000.00,
    status: 'funding',
    min_investment: 12000.00,
    max_investment: 12000.00, // Modo Cuota Fija Obligatoria ($12,000 por cuota = 10 cuotas totales)
    legal_contract_url: 'https://hold3r.io/legal/contrato_altamira_v1.pdf',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80'
    ]
  },
  {
    id: 'b2222222-2222-4222-8222-222222222222',
    title: 'Excavadora Caterpillar D8R Turbo',
    category: 'heavy_machinery',
    description: '⚙️ Marca: Caterpillar | 🚜 Modelo: D8R | 📅 Año: 2024 | 📊 Uso: 0 Horas Nuevas\n\nMaquinaria pesada industrial contratada en leasing operativo por 24 meses para proyectos de infraestructura vial en el centro del país. Renta fija auditada en USDT.',
    total_valuation: 85000.00,
    funded_amount: 85000.00,
    status: 'active_rent',
    min_investment: 8500.00,
    max_investment: 8500.00,
    legal_contract_url: 'https://hold3r.io/legal/contrato_cat_d8r.pdf',
    images: [
      'https://images.unsplash.com/photo-1579412690850-bd41cd0af397?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=1200&q=80'
    ]
  },
  {
    id: 'c3333333-3333-4333-8333-333333333333',
    title: 'Flota Comercial de 5 Vans de Carga RAM 1500',
    category: 'fleet',
    description: '⚙️ Marca: RAM | 🚜 Modelo: 1500 Promaster | 📅 Año: 2025 | 📊 Uso: 0 km Nuevas\n\nFlota logística asignada a contratos de distribución de última milla para e-commerce en Gran Caracas. Mantenimiento preventivo asegurado con retorno mensual proyectado de 14.5% APR.',
    total_valuation: 65000.00,
    funded_amount: 32500.00,
    status: 'funding',
    min_investment: 100.00,
    max_investment: 10000.00,
    legal_contract_url: 'https://hold3r.io/legal/contrato_flota_ram.pdf',
    images: [
      'https://images.unsplash.com/photo-1559297434-fae8a1916a79?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80'
    ]
  }
];

export async function seedDemoAssetsIfEmpty() {
  try {
    const existing = await fetchAssets();
    if (existing.length === 0) {
      console.log('🌱 Poblando activos de prueba con UUIDs en Supabase...');
      for (const asset of DEMO_ASSETS) {
        await createAsset(asset);
      }
      return await fetchAssets();
    }
    return existing;
  } catch (err) {
    console.warn('Nota: Usando dataset demo local con UUIDs válidos:', err.message);
    return DEMO_ASSETS.map(item => ({
      ...item,
      created_at: new Date().toISOString()
    }));
  }
}
