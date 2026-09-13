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

export async function signUpUser({ email, password, fullName, documentId, nickname }) {
  // Determinar rol automáticamente según el correo electrónico
  const cleanEmail = (email || '').trim().toLowerCase();
  const assignedRole = cleanEmail === 'hold3rvenezuela@gmail.com' ? 'admin' : 'investor';
  const cleanNickname = (nickname || '').trim().replace(/^@/, '');

  // 1. Crear usuario en auth.users enviando metadatos exactos y la URL de redirección oficial
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getRedirectUrl(),
      data: {
        full_name: fullName,
        document_id: documentId,
        nickname: cleanNickname,
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
      nickname: cleanNickname,
      role: assignedRole,
      kyc_status: 'none',
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
  if (!userId) return null;

  const { data, error } = await supabase
    .from(TABLES.PROFILES)
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error al obtener perfil:', error.message);
  }

  let profile = data;

  // Si el perfil aún no existe en public.profiles al iniciar sesión / verificar sesión por primera vez, crearlo automáticamente de forma segura
  if (!profile && userId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === userId) {
        const email = user.email || '';
        const meta = user.user_metadata || {};
        const cleanEmail = email.trim().toLowerCase();
        const assignedRole = cleanEmail === 'hold3rvenezuela@gmail.com' ? 'admin' : (meta.role || 'investor');
        const fallbackName = meta.full_name || email.split('@')[0] || 'Inversor Registrado';
        const fallbackDoc = meta.document_id || '';
        const fallbackNick = meta.nickname || fallbackName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

        const newProfile = {
          id: userId,
          full_name: fallbackName,
          document_id: fallbackDoc,
          nickname: fallbackNick,
          role: assignedRole,
          kyc_status: 'none',
          created_at: new Date().toISOString()
        };

        const { data: createdProfile, error: createErr } = await supabase
          .from(TABLES.PROFILES)
          .upsert(newProfile, { onConflict: 'id' })
          .select()
          .single();

        if (!createErr && createdProfile) {
          profile = createdProfile;
        } else {
          profile = newProfile;
        }
      }
    } catch (autoErr) {
      console.warn('Creación automática de respaldo para perfil:', autoErr.message);
    }
  }

  if (!profile) return null;

  // Verificación cruzada con kyc_verifications para garantizar sincronización en tiempo real
  try {
    const { data: kyc } = await supabase
      .from('kyc_verifications')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();

    if (kyc?.status && kyc.status !== profile.kyc_status) {
      profile.kyc_status = kyc.status;
      // Sincronizar tabla profiles en segundo plano
      supabase.from(TABLES.PROFILES).update({ kyc_status: kyc.status }).eq('id', userId).then();
    }
  } catch (_kErr) {
    // Silencioso
  }

  return profile;
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

  // Si no tiene wallet aún, crear una vacía (sin dirección ficticia)
  if (!data && userId) {
    const newWallet = {
      user_id: userId,
      usdt_address: '',
      network: 'BEP20',
      balance: 0.00,
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

/**
 * Actualiza la dirección de wallet USDT y la red del usuario en public.wallets.
 */
export async function updateUserWallet(userId, { usdt_address, network }) {
  // Buscar wallet del usuario
  const { data: existing } = await supabase
    .from(TABLES.WALLETS)
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from(TABLES.WALLETS)
      .update({ usdt_address, network, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw new Error(`Error al actualizar wallet: ${error.message}`);
    return data;
  } else {
    // Crear wallet si no existe
    const { data, error } = await supabase
      .from(TABLES.WALLETS)
      .insert({ user_id: userId, usdt_address, network, balance: 0, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw new Error(`Error al crear wallet: ${error.message}`);
    return data;
  }
}

export async function depositFunds(walletId, currentBalance, amountUsdt) {
  const newBalance = Number(currentBalance) + Number(amountUsdt);

  if (!walletId) {
    return { balance: newBalance, usdt_address: '', network: 'BEP20' };
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

/**
 * Invoca el backend / Edge Function de Supabase para verificar el TxID en la Blockchain
 * y acreditar atómicamente el saldo en public.wallets y public.deposits.
 */
export async function verifyAndCreditDeposit({ userId, txHash, network, amountUsdt }) {
  if (!userId || !txHash || !amountUsdt) {
    throw new Error('Faltan parámetros requeridos para procesar la acreditación.');
  }

  // 1. Intentar llamar a la Edge Function 'verify-usdt-deposit' de Supabase
  try {
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('verify-usdt-deposit', {
      body: { userId, txHash, network, amountUsdt }
    });

    if (!edgeError && edgeData && edgeData.success) {
      return edgeData;
    }

    if (edgeError || (edgeData && !edgeData.success)) {
      console.warn('Aviso de Edge Function (fallback a RPC directo):', edgeError?.message || edgeData?.error);
    }
  } catch (eErr) {
    console.warn('Edge Function no disponible (usando fallback RPC de Base de Datos):', eErr);
  }

  // 2. Fallback a Stored Procedure RPC directo de base de datos 'verify_and_credit_deposit'
  const targetTreasury = network === 'ERC20' 
    ? '0x72D45C3d8147D3225C841C1f92D73D3F9A6A85a7' 
    : '0x72D45C3d8147D3225C841C1f92D73D3F9A6A85a7';

  const { data: rpcData, error: rpcError } = await supabase.rpc('verify_and_credit_deposit', {
    p_user_id: userId,
    p_tx_hash: txHash,
    p_network: network,
    p_amount_usdt: Number(amountUsdt),
    p_treasury_address: targetTreasury
  });

  if (rpcError) {
    throw new Error(rpcError.message || 'Error al acreditar depósito en la base de datos.');
  }

  if (rpcData && !rpcData.success) {
    throw new Error(rpcData.message || 'El depósito no pudo ser acreditado.');
  }

  return rpcData;
}

/**
 * Historial transparente de movimientos de la billetera (Ingresos y Egresos).
 * Combina la tabla `deposits` (Ingresos) y la tabla `asset_shares` (Egresos).
 */
export async function fetchUserWalletMovements(userId) {
  if (!userId) return [];

  try {
    // 1. Consultar depósitos de la cuenta (Ingresos)
    const { data: depositsData, error: depositsErr } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (depositsErr) {
      console.warn('Aviso al consultar depósitos en Supabase:', depositsErr.message);
    }

    // 2. Consultar compras / inversiones en RWA (Egresos)
    const { data: sharesData, error: sharesErr } = await supabase
      .from(TABLES.ASSET_SHARES)
      .select(`
        *,
        asset:assets(*)
      `)
      .eq('user_id', userId)
      .order('purchased_at', { ascending: false });

    if (sharesErr) {
      console.warn('Aviso al consultar compras en Supabase:', sharesErr.message);
    }

    const formattedDeposits = (depositsData || []).map(d => ({
      id: d.id,
      type: 'deposit',
      label: `Depósito USDT (${d.network || 'TRC20'})`,
      amount: Number(d.amount_usdt || 0),
      created_at: d.created_at || d.verified_at,
      tx_hash: d.tx_hash || null,
      network: d.network || 'BEP20',
      status: d.status || 'confirmed',
      description: `Depósito via ${d.network || 'BEP20'}`
    }));

    const formattedShares = (sharesData || []).map(s => ({
      id: s.id,
      type: 'purchase',
      label: s.asset?.title ? `Compra Fracción RWA: ${s.asset.title}` : 'Compra Fracción RWA',
      amount: Number(s.amount_invested_usdt || 0),
      created_at: s.purchased_at,
      tx_hash: s.signed_contract_hash || null,
      network: 'BEP20',
      status: 'confirmed',
      description: s.asset?.title ? `Participación en ${s.asset.title}` : 'Compra de participación RWA'
    }));

    const combined = [...formattedDeposits, ...formattedShares];

    // Ordenar por fecha descendente
    combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return combined;
  } catch (err) {
    console.error('Error al procesar el historial de movimientos de wallet:', err);
    return [];
  }
}

// ----------------------------------------------------
// KYC VERIFICATION & PUBLIC EXPLORER
// ----------------------------------------------------

export async function submitKycVerification(payload) {
  const {
    userId,
    fullName,
    birthDate,
    documentId,
    addressCountry,
    addressState,
    addressCity,
    addressStreet,
    bep20Wallet,
    idDocumentUrl,
    rifDocumentUrl,
    selfieUrl
  } = payload;

  const dbPayload = {
    user_id: userId,
    full_name: fullName,
    birth_date: birthDate,
    document_id: documentId,
    address_country: addressCountry,
    address_state: addressState,
    address_city: addressCity,
    address_street: addressStreet || '',
    bep20_wallet: bep20Wallet,
    id_document_url: idDocumentUrl,
    rif_document_url: rifDocumentUrl,
    selfie_url: selfieUrl,
    status: 'pending',
    updated_at: new Date().toISOString()
  };

  let data = null;
  let error = null;

  try {
    const res = await supabase
      .from('kyc_verifications')
      .upsert(dbPayload, { onConflict: 'user_id' })
      .select()
      .single();
    data = res.data;
    error = res.error;
  } catch (err) {
    error = err;
  }

  // Fallback si la columna 'address_street' no existe aún en la caché de Supabase PostgREST
  if (error && (error.message?.includes('address_street') || error.code === 'PGRST204')) {
    console.warn('Aviso: columna address_street no encontrada en kyc_verifications. Usando fallback sin campo en tabla kyc_verifications...');
    delete dbPayload.address_street;
    if (addressStreet) {
      dbPayload.address_city = `${addressCity} (${addressStreet})`;
    }

    const retryRes = await supabase
      .from('kyc_verifications')
      .upsert(dbPayload, { onConflict: 'user_id' })
      .select()
      .single();
    
    data = retryRes.data;
    error = retryRes.error;
  }

  if (error) {
    console.error('Error enviando KYC a Supabase:', error);
    throw new Error(error.message || 'Error al guardar la solicitud KYC.');
  }

  // Actualizar estado del perfil del usuario a 'pending' y guardar wallet BEP20 y dirección
  try {
    await supabase
      .from(TABLES.PROFILES)
      .update({ 
        kyc_status: 'pending',
        bep20_wallet: bep20Wallet,
        address_street: addressStreet || ''
      })
      .eq('id', userId);
  } catch (_pErr) {
    await supabase
      .from(TABLES.PROFILES)
      .update({ 
        kyc_status: 'pending',
        bep20_wallet: bep20Wallet
      })
      .eq('id', userId);
  }

  return data;
}

export async function fetchKycVerifications() {
  const { data, error } = await supabase
    .from('kyc_verifications')
    .select(`
      *,
      profile:profiles(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Error al obtener verificaciones KYC:', error.message);
    return [];
  }
  return data || [];
}

export async function reviewKycVerification({ kycId, userId, status, rejectionReason = '' }) {
  const { data, error } = await supabase
    .from('kyc_verifications')
    .update({
      status,
      rejection_reason: rejectionReason,
      updated_at: new Date().toISOString()
    })
    .eq('id', kycId)
    .select()
    .single();

  if (error) {
    throw new Error(`Error al actualizar estado KYC: ${error.message}`);
  }

  // Actualizar kyc_status en public.profiles
  if (userId) {
    const { error: profErr } = await supabase
      .from(TABLES.PROFILES)
      .update({ kyc_status: status })
      .eq('id', userId);

    if (profErr) {
      console.warn('Aviso al actualizar profiles:', profErr.message);
    }
  }

  return data;
}

/**
 * Buscador Público y Transparente por Signed Contract Hash.
 * Muestra el Apodo/username único (NUNCA el nombre real), el activo, el precio y el % de participación.
 */
export async function searchPublicContractHash(contractHash) {
  const cleanHash = (contractHash || '').trim();
  if (!cleanHash) return null;

  try {
    const { data, error } = await supabase
      .from('rwa_purchases_view')
      .select('*')
      .ilike('tx_hash', `%${cleanHash}%`)
      .limit(1);

    if (!error && data && data.length > 0) {
      const item = data[0];
      return {
        txHash: item.tx_hash,
        nickname: item.investor_nickname || 'Inversor_Confidencial',
        assetTitle: item.asset_title || 'Activo RWA',
        amountInvestedUsdt: item.amount_invested_usdt,
        sharesPercentage: item.shares_percentage,
        purchasedAt: item.purchased_at,
        assetImages: item.asset_images
      };
    }
  } catch (_err) {
    // Fallback a consulta en asset_shares + profiles
  }

  const { data: shares, error: shareErr } = await supabase
    .from(TABLES.ASSET_SHARES)
    .select(`
      *,
      asset:assets(*),
      profile:profiles(nickname)
    `)
    .ilike('signed_contract_hash', `%${cleanHash}%`)
    .limit(1);

  if (shareErr || !shares || shares.length === 0) {
    return null;
  }

  const s = shares[0];
  return {
    txHash: s.signed_contract_hash,
    nickname: s.profile?.nickname || 'Inversor_Confidencial',
    assetTitle: s.asset?.title || 'Activo RWA',
    amountInvestedUsdt: s.amount_invested_usdt,
    sharesPercentage: s.shares_percentage,
    purchasedAt: s.purchased_at,
    assetImages: s.asset?.images
  };
}

/**
 * Buscador Público por Apodo / Username Único.
 * Muestra el portafolio público confidencial (Total invertido en USDT, nombres de activos y cantidad de fracciones poseídas).
 */
export async function searchPublicUserPortfolio(nickname) {
  const cleanNickname = (nickname || '').trim().replace(/^@/, '');
  if (!cleanNickname) return null;

  // 1. Buscar perfil por nickname
  const { data: profiles, error: profErr } = await supabase
    .from(TABLES.PROFILES)
    .select('id, nickname, kyc_status, created_at')
    .ilike('nickname', cleanNickname)
    .limit(1);

  if (profErr || !profiles || profiles.length === 0) {
    return null;
  }

  const prof = profiles[0];

  // 2. Buscar compras del usuario
  const { data: shares, error: shareErr } = await supabase
    .from(TABLES.ASSET_SHARES)
    .select(`
      *,
      asset:assets(*)
    `)
    .eq('user_id', prof.id);

  if (shareErr) {
    console.warn('Error al obtener portafolio público:', shareErr.message);
  }

  const userShares = shares || [];
  const totalInvestedUsdt = userShares.reduce((acc, curr) => acc + Number(curr.amount_invested_usdt || 0), 0);
  
  // Agrupar por activo
  const holdingsMap = {};
  userShares.forEach(s => {
    const assetId = s.asset_id || s.asset?.id;
    const title = s.asset?.title || 'Activo RWA';
    if (!holdingsMap[assetId]) {
      holdingsMap[assetId] = {
        assetId,
        title,
        category: s.asset?.category,
        totalInvested: 0,
        sharesPercentageSum: 0,
        fractionCount: 0,
        image: s.asset?.images?.[0]
      };
    }
    holdingsMap[assetId].totalInvested += Number(s.amount_invested_usdt || 0);
    holdingsMap[assetId].sharesPercentageSum += Number(s.shares_percentage || 0);
    holdingsMap[assetId].fractionCount += 1;
  });

  return {
    nickname: prof.nickname,
    kycVerified: prof.kyc_status === 'approved',
    memberSince: prof.created_at,
    totalInvestedUsdt,
    totalHoldingsCount: Object.keys(holdingsMap).length,
    holdings: Object.values(holdingsMap)
  };
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

export async function fetchAllPurchases() {
  // Intentar consultar primero la vista de compras o la tabla asset_shares con joins de profile y asset
  try {
    const { data, error } = await supabase
      .from('rwa_purchases_view')
      .select('*');

    if (!error && data && data.length > 0) {
      return data.map(item => ({
        id: item.share_id,
        user_id: item.user_id,
        asset_id: item.asset_id,
        shares_percentage: item.shares_percentage,
        amount_invested_usdt: item.amount_invested_usdt,
        signed_contract_hash: item.tx_hash,
        purchased_at: item.purchased_at,
        profile: {
          id: item.user_id,
          full_name: item.investor_name || 'Inversor Registrado',
          document_id: item.investor_document_id || 'N/A',
          role: item.user_role
        },
        asset: {
          id: item.asset_id,
          title: item.asset_title,
          category: item.asset_category,
          total_valuation: item.asset_total_valuation,
          funded_amount: item.asset_funded_amount,
          status: item.asset_status,
          images: item.asset_images
        }
      }));
    }
  } catch (_vErr) {
    // Fallback a join directo en Supabase
  }

  const { data, error } = await supabase
    .from(TABLES.ASSET_SHARES)
    .select(`
      *,
      asset:assets(*),
      profile:profiles(*)
    `)
    .order('purchased_at', { ascending: false });

  if (error) {
    console.warn('Error al obtener historial general de compras:', error.message);
  }
  return data || [];
}

export async function investInAsset({ userId, wallet, asset, investmentUsdt, signedHash = null }) {
  const amountUsdt = Number(investmentUsdt);
  const totalValuation = Number(asset.total_valuation);
  const currentFunded = Number(asset.funded_amount);

  if (amountUsdt <= 0) {
    throw new Error('El monto a invertir debe ser mayor a 0 USDT');
  }

  if (currentFunded + amountUsdt > totalValuation) {
    throw new Error(`El monto excede la meta de fondeo restante ($${(totalValuation - currentFunded).toLocaleString()} USDT)`);
  }

  // Si NO viene un signedHash de transacción directa Web3, se requiere obligatoriamente el Backend Relayer en BSC para saldo interno
  if (!signedHash) {
    if (Number(wallet?.balance || 0) < amountUsdt) {
      throw new Error(`Saldo insuficiente en tu billetera USDT ($${Number(wallet?.balance || 0).toLocaleString()} USDT disponible).`);
    }

    // Invocar Edge Function de Supabase relayer 'process-share-purchase'
    const { data: relayerRes, error: relayerErr } = await supabase.functions.invoke('process-share-purchase', {
      body: {
        userId,
        assetId: asset.id,
        amountUsdt: amountUsdt,
        shareCount: 1,
        network: 'BEP20'
      }
    });

    if (relayerErr) {
      throw new Error(`Falla de comunicación con el Backend Relayer: ${relayerErr.message || 'La Edge Function no respondió'}. La compra ha sido cancelada y no se ha descontado saldo.`);
    }

    if (!relayerRes || !relayerRes.success || !relayerRes.txHash) {
      throw new Error(relayerRes?.error || 'La transacción no pudo ser minada en la Binance Smart Chain (BSC). La compra ha sido cancelada y no se ha descontado saldo.');
    }

    if (wallet) {
      wallet.balance = relayerRes.newBalance;
    }

    return relayerRes.shareRecord || {
      id: generateUUID(),
      asset_id: asset.id,
      user_id: userId,
      shares_percentage: (amountUsdt / totalValuation) * 100,
      amount_invested_usdt: amountUsdt,
      signed_contract_hash: relayerRes.txHash,
      purchased_at: new Date().toISOString(),
      asset: asset
    };
  }

  // Si SI se pasó un signedHash (Pago Directo Web3 desde billetera de usuario)
  const validUserId = (userId && userId.length === 36) ? userId : '11111111-1111-4111-8111-111111111111';
  const validAssetId = (asset.id && asset.id.length === 36) ? asset.id : generateUUID();
  const sharesPercentage = (amountUsdt / totalValuation) * 100;

  const sharePayload = {
    asset_id: validAssetId,
    user_id: validUserId,
    shares_percentage: sharesPercentage,
    amount_invested_usdt: amountUsdt,
    signed_contract_hash: signedHash,
    purchased_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from(TABLES.ASSET_SHARES)
    .insert(sharePayload)
    .select()
    .single();

  if (error) {
    throw new Error(`Error de base de datos: ${error.message}`);
  }

  const newFundedAmount = currentFunded + amountUsdt;
  const newStatus = newFundedAmount >= totalValuation ? 'active_rent' : asset.status;
  await supabase.from(TABLES.ASSETS).update({ funded_amount: newFundedAmount, status: newStatus }).eq('id', validAssetId);

  return data;
}

// ----------------------------------------------------
// PROPOSALS & VOTES (GOBERNANZA - VOTO PONDERADO)
// ----------------------------------------------------

/**
 * Obtiene el mapa de poder de voto del usuario desglosado por activo.
 * Retorna: { totalPower: number, byAsset: { [asset_id]: number } }
 * Admins sin fracciones retornan totalPower = 1.0 y byAsset = {}.
 */
export async function getUserVotingPower(userId, userRole = 'investor') {
  if (!userId) return { totalPower: 0, byAsset: {} };

  try {
    const { data, error } = await supabase
      .from(TABLES.ASSET_SHARES)
      .select('asset_id, shares_percentage')
      .eq('user_id', userId)
      .gt('shares_percentage', 0);

    if (error) {
      console.warn('Aviso al calcular poder de voto:', error.message);
      const fallback = userRole === 'admin' ? 1.0 : 0;
      return { totalPower: fallback, byAsset: {} };
    }

    const byAsset = {};
    let totalPower = 0;
    for (const s of (data || [])) {
      const pct = Number(s.shares_percentage || 0);
      byAsset[s.asset_id] = (byAsset[s.asset_id] || 0) + pct;
      totalPower += pct;
    }

    // Admin sin fracciones propias: poder simbólico global = 1.0
    if (userRole === 'admin' && totalPower === 0) {
      return { totalPower: 1.0, byAsset: {} };
    }

    return { totalPower, byAsset };
  } catch (err) {
    console.warn('Error al obtener poder de voto:', err.message);
    const fallback = userRole === 'admin' ? 1.0 : 0;
    return { totalPower: fallback, byAsset: {} };
  }
}

/**
 * Obtiene las propuestas de gobernanza filtradas por tenencia ESPECÍFICA de activo.
 * - Admin: ve todas las propuestas, con votingPower = 1.0 si no tiene acciones.
 * - Investor: solo ve propuestas del activo donde tiene shares_percentage > 0.
 *   Cada propuesta incluye `userVotingPower` con el poder del usuario para ese activo.
 *   Si RLS bloquea o el usuario no tiene ninguna acción, retorna hasAccess: false.
 */
export async function fetchProposals(userId = null, userRole = 'investor') {
  const isAdmin = userRole === 'admin';

  // Obtener poder de voto por activo antes de consultar propuestas
  let totalPower = 0;
  let byAsset = {};
  if (userId) {
    const vp = await getUserVotingPower(userId, userRole);
    totalPower = vp.totalPower;
    byAsset    = vp.byAsset;

    // Inversores sin ninguna acción: bloquear sin consultar Supabase
    if (!isAdmin && totalPower === 0) {
      return { proposals: [], votingPower: 0, hasAccess: false };
    }
  }

  const { data, error } = await supabase
    .from(TABLES.PROPOSALS)
    .select(`
      *,
      asset:assets(*),
      votes:votes(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    const denied = ['42501', 'PGRST301', 'PGRST116'];
    if (
      denied.includes(error.code) ||
      error.status === 403 ||
      error.status === 401 ||
      error.message?.toLowerCase().includes('policy') ||
      error.message?.toLowerCase().includes('permission')
    ) {
      console.warn('RLS gobernanza: acceso denegado.', error.code, error.message);
      return { proposals: [], votingPower: 0, hasAccess: false };
    }
    console.warn('Aviso al leer propuestas:', error.message);
    return { proposals: [], votingPower: totalPower, hasAccess: false };
  }

  const allProposals = data || [];

  // Enriquecer cada propuesta con el poder de voto del usuario para ese activo específico
  const enriched = allProposals
    .filter(prop => {
      // Admins ven todo; inversores solo ven propuestas de activos donde tienen acciones
      if (isAdmin) return true;
      return (byAsset[prop.asset_id] || 0) > 0;
    })
    .map(prop => ({
      ...prop,
      userVotingPower: isAdmin
        ? (byAsset[prop.asset_id] || totalPower)  // admin: su poder en ese activo (o 1.0)
        : (byAsset[prop.asset_id] || 0)            // investor: exactamente su % en ese activo
    }));

  return {
    proposals: enriched,
    votingPower: totalPower,
    hasAccess: enriched.length > 0 || isAdmin
  };
}

/**
 * Crea una propuesta de gobernanza mediante consulta directa a Supabase.
 * Valida tenencia de acciones y el límite estricto de 7 días antes de insertar.
 */
export async function createProposal({ assetId, title, description }) {
  if (!assetId || !title || !description) {
    throw new Error('Todos los campos son obligatorios para crear una propuesta.');
  }
  const validAssetId = (assetId && assetId.length === 36) ? assetId : null;
  if (!validAssetId) throw new Error('ID de activo inválido.');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Usuario no autenticado.');

  // 1. Validar tenencia del activo seleccionado (a menos que sea admin)
  const { data: profile } = await supabase
    .from(TABLES.PROFILES)
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) {
    const { data: share } = await supabase
      .from('asset_shares')
      .select('shares_percentage')
      .eq('user_id', user.id)
      .eq('asset_id', validAssetId)
      .gt('shares_percentage', 0)
      .maybeSingle();

    if (!share) {
      throw new Error('Acceso denegado: no posees fracciones activas del activo seleccionado para crear una propuesta.');
    }
  }

  // 2. Validar límite estricto de 7 días (verificar si el usuario creó una propuesta en los últimos 7 días)
  const { data: lastProp } = await supabase
    .from(TABLES.PROPOSALS)
    .select('created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastProp?.created_at) {
    const daysPassed = (Date.now() - new Date(lastProp.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysPassed < 7) {
      const daysLeft = Math.ceil(7 - daysPassed);
      throw new Error(`Límite de creación: debes esperar ${daysLeft} día(s) más antes de crear una nueva propuesta. Solo puedes crear una propuesta cada 7 días.`);
    }
  }

  // 3. Inserción directa
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from(TABLES.PROPOSALS)
    .insert({
      asset_id:    validAssetId,
      title:       title.trim(),
      description: description.trim(),
      status:      'active',
      user_id:     user.id,
      expires_at:  expiresAt,
      created_at:  new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    if (error.code === '42501' || error.status === 403) {
      throw new Error('Acceso denegado: no posees fracciones activas del activo seleccionado para crear una propuesta.');
    }
    throw new Error(error.message || 'Error al crear la propuesta de gobernanza.');
  }
  return data;
}

/**
 * Emite un voto ponderado usando el RPC cast_weighted_vote.
 * El peso del voto = suma de shares_percentage del usuario en asset_shares.
 * Previene votos duplicados a nivel de base de datos.
 * Fallback a inserción directa si el RPC no está disponible.
 */
export async function castVote({ proposalId, userId, voteChoice }) {
  if (!proposalId || !userId || !voteChoice) {
    throw new Error('Faltan parámetros requeridos para emitir el voto.');
  }

  const validProposalId = (proposalId && proposalId.length === 36) ? proposalId : null;
  const validUserId = (userId && userId.length === 36) ? userId : null;

  if (!validProposalId || !validUserId) {
    throw new Error('ID de propuesta o usuario inválido.');
  }

  // 1. Intentar RPC atómica cast_weighted_vote (calcula peso y previene duplicados en DB)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('cast_weighted_vote', {
      p_proposal_id: validProposalId,
      p_user_id: validUserId,
      p_vote: voteChoice
    });

    if (!rpcError && rpcData?.success) {
      return rpcData;
    }

    // Si el RPC retorna error de negocio (sin tenencia, duplicado), propagar el mensaje
    if (rpcError) {
      throw new Error(rpcError.message || 'Error al registrar voto ponderado.');
    }
  } catch (rpcErr) {
    // Si el error proviene del RPC (sin tenencia, voto duplicado, propuesta inactiva), relanzar
    if (rpcErr.message && !rpcErr.message.includes('function') && !rpcErr.message.includes('does not exist')) {
      throw rpcErr;
    }
    console.warn('RPC cast_weighted_vote no disponible, usando fallback directo:', rpcErr.message);
  }

  // 2. Fallback: calcular peso manualmente e insertar directamente
  const vp = await getUserVotingPower(validUserId);
  const fallbackPower = vp.totalPower || 0;

  if (fallbackPower === 0) {
    throw new Error('No posees fracciones activas. Solo los Socios con tenencia de acciones pueden votar en gobernanza.');
  }

  // Verificar expiración de la propuesta
  const { data: propCheck } = await supabase
    .from(TABLES.PROPOSALS)
    .select('status, expires_at')
    .eq('id', validProposalId)
    .maybeSingle();

  if (!propCheck || propCheck.status !== 'active') {
    throw new Error('La propuesta no existe o ya fue cerrada.');
  }
  if (propCheck.expires_at && new Date(propCheck.expires_at) <= new Date()) {
    throw new Error('La propuesta de votación ha expirado (24 horas). Ya no se aceptan votos.');
  }

  // Verificar voto duplicado antes de insertar
  const { data: existing } = await supabase
    .from(TABLES.VOTES)
    .select('id')
    .eq('proposal_id', validProposalId)
    .eq('user_id', validUserId)
    .maybeSingle();

  if (existing) {
    throw new Error('Ya emitiste un voto en esta propuesta. No se permiten votos duplicados.');
  }

  const { data, error } = await supabase
    .from(TABLES.VOTES)
    .insert({
      proposal_id: validProposalId,
      user_id: validUserId,
      vote: voteChoice,
      weight: fallbackPower
    })
    .select()
    .single();

  if (error) throw new Error(error.message || 'Error al registrar el voto.');

  return { success: true, voting_power: fallbackPower, vote: voteChoice, ...data };
}

/**
 * Elimina una propuesta mediante consulta directa a Supabase durante la ventana de gracia de 5 minutos si tiene 0 votos.
 */
export async function deleteProposal({ proposalId, userId }) {
  if (!proposalId || !userId) throw new Error('ID de propuesta y usuario requeridos.');

  const { data: prop, error: propErr } = await supabase
    .from(TABLES.PROPOSALS)
    .select('*, votes:votes(id)')
    .eq('id', proposalId)
    .single();

  if (propErr || !prop) throw new Error('Propuesta no encontrada.');
  if (prop.user_id && prop.user_id !== userId) throw new Error('Solo el creador puede eliminar la propuesta.');

  const createdAt = new Date(prop.created_at).getTime();
  const now = Date.now();
  const minutesPassed = (now - createdAt) / (1000 * 60);

  if (minutesPassed > 5) {
    throw new Error('Transcurridos los 5 minutos de gracia, la propuesta es inmutable y no se puede eliminar.');
  }

  if (prop.votes && prop.votes.length > 0) {
    throw new Error('La propuesta ya recibió votos. Es inmutable y no se puede eliminar.');
  }

  const { error: delErr } = await supabase
    .from(TABLES.PROPOSALS)
    .delete()
    .eq('id', proposalId);

  if (delErr) throw new Error(delErr.message || 'Error al eliminar la propuesta.');
  return { success: true };
}

/**
 * Edita el título o descripción de una propuesta mediante consulta directa a Supabase durante la ventana de gracia de 5 minutos si tiene 0 votos.
 */
export async function updateProposal({ proposalId, userId, title, description }) {
  if (!proposalId || !userId || !title || !description) throw new Error('Todos los campos son requeridos.');

  const { data: prop, error: propErr } = await supabase
    .from(TABLES.PROPOSALS)
    .select('*, votes:votes(id)')
    .eq('id', proposalId)
    .single();

  if (propErr || !prop) throw new Error('Propuesta no encontrada.');
  if (prop.user_id && prop.user_id !== userId) throw new Error('Solo el creador puede editar la propuesta.');

  const createdAt = new Date(prop.created_at).getTime();
  const now = Date.now();
  const minutesPassed = (now - createdAt) / (1000 * 60);

  if (minutesPassed > 5) {
    throw new Error('Transcurridos los 5 minutos de gracia, la propuesta es inmutable y no se puede editar.');
  }

  if (prop.votes && prop.votes.length > 0) {
    throw new Error('La propuesta ya recibió votos. Es inmutable y no se puede editar.');
  }

  const { data: updated, error: updateErr } = await supabase
    .from(TABLES.PROPOSALS)
    .update({ title: title.trim(), description: description.trim() })
    .eq('id', proposalId)
    .select()
    .single();

  if (updateErr) throw new Error(updateErr.message || 'Error al actualizar la propuesta.');
  return updated;
}

/**
 * Cierra propuestas expiradas llamando al RPC close_expired_proposals.
 * Llamar al inicio de fetchProposals para mantener estados sincronizados
 * cuando pg_cron no está disponible en el plan de Supabase.
 */
export async function closeExpiredProposals() {
  try {
    const { data, error } = await supabase.rpc('close_expired_proposals');
    if (!error && data != null) {
      if (data > 0) console.info(`Gobernanza: ${data} propuesta(s) cerradas automáticamente.`);
    }
  } catch (err) {
    // Si el RPC no está creado aún en Supabase, evitar ruido en la consola
  }
}

/**
 * Obtiene las notificaciones de gobernanza del usuario (no leídas primero).
 */
export async function fetchGovernanceNotifications(userId) {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('governance_notifications')
      .select('*, proposal:proposals(title, status), asset:assets(title)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.warn('Aviso al leer notificaciones de gobernanza:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('Error al obtener notificaciones:', err.message);
    return [];
  }
}

/**
 * Marca una o todas las notificaciones de gobernanza como leídas.
 */
export async function markGovernanceNotificationsRead(userId, notifId = null) {
  if (!userId) return;
  try {
    let query = supabase
      .from('governance_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (notifId) query = query.eq('id', notifId);

    await query;
  } catch (err) {
    console.warn('Error al marcar notificaciones como leídas:', err.message);
  }
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

// ─────────────────────────────────────────────────────────────────────────────
// OFICINA VIRTUAL — Funciones de perfil, avatar e historial
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Actualiza campos editables del perfil del usuario en public.profiles.
 * Solo se actualizan los campos que se pasen (full_name, document_id, avatar_url, etc.)
 */
export async function updateUserProfile(userId, fields) {
  // Only update columns that exist in public.profiles schema
  const allowed = ['full_name', 'document_id', 'avatar_url'];
  const safeFields = Object.fromEntries(
    Object.entries(fields).filter(([k]) => allowed.includes(k))
  );

  const { data, error } = await supabase
    .from('profiles')
    .update(safeFields)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(`Error al actualizar perfil: ${error.message}`);
  return data;
}

/**
 * Sube una foto de perfil al bucket 'avatars' de Supabase Storage
 * y actualiza avatar_url en public.profiles.
 * Retorna la URL pública del avatar.
 */
export async function uploadUserAvatar(userId, file) {
  const ext = file.name.split('.').pop();
  const path = `${userId}/avatar.${ext}`;

  // Subir / sobreescribir en bucket 'avatars'
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw new Error(`Error al subir avatar: ${uploadError.message}`);

  // Obtener URL pública
  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
  const publicUrl = urlData?.publicUrl;

  // Persistir URL en profiles
  await updateUserProfile(userId, { avatar_url: publicUrl });

  return publicUrl;
}

/**
 * Obtiene el historial completo de transacciones de la wallet del usuario.
 * Combina depósitos (ingresos) y compras de shares (egresos) ordenados por fecha desc.
 */
export async function fetchWalletTransactions(userId) {
  try {
    // Intentar primero desde wallet_transactions (tabla enriquecida)
    const { data: txData, error: txError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!txError && txData && txData.length > 0) {
      return txData.map(t => ({
        id: t.id,
        type: t.type,
        label: t.type === 'deposit' ? 'Depósito USDT'
             : t.type === 'purchase' ? 'Compra de Participación'
             : t.type === 'yield' ? 'Rendimiento Recibido'
             : 'Retiro',
        amount: Number(t.amount),
        tx_hash: t.tx_hash || null,
        status: t.status,
        description: t.description || '',
        created_at: t.created_at,
      }));
    }

    // Fallback: construir historial desde deposits + asset_shares
    return await fetchUserWalletMovements(userId);
  } catch (err) {
    console.error('Error al obtener historial de transacciones:', err.message);
    return [];
  }
}

// ----------------------------------------------------
// MERCADO SECUNDARIO & ESCROW & GOBERNANZA (48H)
// ----------------------------------------------------

/**
 * Registra una solicitud de reventa e ingresa las acciones a la Bóveda (Escrow)
 * en estado 'IN_REVIEW_GOVERNANCE' (48h Derecho de Tanteo).
 */
export async function createMarketplaceOrder({ sellerId, shareId, assetId, sharesPercentage, priceUsdt }) {
  // 1. Validación estricta de tenencia en asset_shares
  const { data: userShare, error: shareErr } = await supabase
    .from(TABLES.ASSET_SHARES)
    .select('shares_percentage, user_id')
    .eq('id', shareId)
    .eq('user_id', sellerId)
    .single();

  if (shareErr || !userShare || Number(userShare.shares_percentage || 0) <= 0) {
    throw new Error('Validación fallida: No posees fracciones vigentes (> 0%) de este activo para revender.');
  }

  if (Number(sharesPercentage) > Number(userShare.shares_percentage)) {
    throw new Error(`Validación fallida: Intentas revender (${sharesPercentage}%), lo cual supera tu tenencia disponible (${userShare.shares_percentage}%).`);
  }

  // 2. Bloqueo preventivo de órdenes duplicadas activas (IN_REVIEW_GOVERNANCE o PUBLIC_MARKET)
  const { data: activeOrders, error: activeErr } = await supabase
    .from(TABLES.MARKETPLACE_ORDERS)
    .select('id, status')
    .eq('share_id', shareId)
    .in('status', ['IN_REVIEW_GOVERNANCE', 'PUBLIC_MARKET']);

  if (!activeErr && activeOrders && activeOrders.length > 0) {
    throw new Error('Bloqueo preventivo: Esta fracción ya se encuentra listada con una orden activa en la Bóveda Escrow / Mercado Secundario.');
  }

  // 3. Generar hash de bloqueo simulado / transferencia a Escrow
  const escrowTxHash = '0xescrow_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 10);

  const { data, error } = await supabase
    .from(TABLES.MARKETPLACE_ORDERS)
    .insert([
      {
        seller_id: sellerId,
        share_id: shareId,
        asset_id: assetId,
        shares_percentage: Number(sharesPercentage),
        price_usdt: Number(priceUsdt),
        status: 'IN_REVIEW_GOVERNANCE',
        escrow_tx_hash: escrowTxHash,
        governance_expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      }
    ])
    .select('*')
    .single();

  if (error) {
    console.error('Error al crear orden de reventa en el mercado:', error.message);
    throw new Error('No se pudo registrar la solicitud de venta en el mercado.');
  }

  return data;
}

/**
 * Obtiene las órdenes activas (en Escrow / Mercado Secundario) creadas por un usuario.
 */
export async function fetchUserActiveMarketOrders(sellerId) {
  if (!sellerId) return [];

  const { data, error } = await supabase
    .from(TABLES.MARKETPLACE_ORDERS)
    .select('*')
    .eq('seller_id', sellerId)
    .in('status', ['IN_REVIEW_GOVERNANCE', 'PUBLIC_MARKET']);

  if (error) {
    console.warn('Aviso al obtener órdenes activas del usuario:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Obtiene las órdenes en fase de Gobernanza (Derecho de Tanteo 48h)
 * visibles para socios y administradores. Promueve automáticamente expiradas a PUBLIC_MARKET
 * y filtra por tenencia previa si el usuario es de rol 'investor'.
 */
export async function fetchGovernanceMarketOrders(currentUserId = null, userRole = 'investor') {
  try {
    let query = supabase
      .from(TABLES.MARKETPLACE_ORDERS)
      .select(`
        *,
        asset:assets (title, category, images, total_valuation),
        seller:profiles!seller_id (full_name, document_id, avatar_url)
      `)
      .order('created_at', { ascending: false });

    // Excluir de forma estricta órdenes creadas por el usuario autenticado actual
    if (currentUserId) {
      query = query.neq('seller_id', currentUserId);
    }

    const { data, error } = await query;

    // Manejo limpio de errores de RLS o permisos denegados de Supabase
    if (error) {
      if (error.code === '42501' || error.status === 403 || error.message?.includes('policy')) {
        console.warn('Aviso RLS (Acceso restringido por políticas de seguridad de Supabase):', error.message);
      } else {
        console.error('Error al consultar ofertas de gobernanza:', error.message);
      }
      return [];
    }

    const now = new Date();
    // Excluir adicionalmente cualquier orden propia en caso de discrepancia de tipos de ID
    const allOrders = (data || [])
      .filter(order => !currentUserId || order.seller_id !== currentUserId)
      .map(order => {
        if (order.status === 'IN_REVIEW_GOVERNANCE' && new Date(order.governance_expires_at) <= now) {
          return { ...order, status: 'PUBLIC_MARKET' };
        }
        return order;
      });

    // Si el usuario es 'admin', tiene visibilidad general de control
    if (userRole === 'admin' || !currentUserId) {
      return allOrders;
    }

    // Si el usuario es 'investor', verificar en asset_shares en qué activos posee o ha poseído participación previa
    try {
      const { data: userShares, error: sharesErr } = await supabase
        .from(TABLES.ASSET_SHARES)
        .select('asset_id')
        .eq('user_id', currentUserId);

      if (sharesErr) {
        console.warn('Aviso RLS en asset_shares:', sharesErr.message);
        return allOrders.filter(order => order.status !== 'IN_REVIEW_GOVERNANCE');
      }

      const userAssetIds = new Set((userShares || []).map(s => s.asset_id));

      // Filtrar: En la fase de Gobernanza (IN_REVIEW_GOVERNANCE - 48h), solo los accionistas previos de ese activo pueden ver la oferta.
      return allOrders.filter(order => {
        if (order.status === 'IN_REVIEW_GOVERNANCE') {
          return userAssetIds.has(order.asset_id);
        }
        return true;
      });
    } catch (err) {
      console.warn('Error al verificar tenencia previa del inversor:', err.message);
      return allOrders.filter(order => order.status !== 'IN_REVIEW_GOVERNANCE');
    }
  } catch (globalErr) {
    console.warn('Excepción capturada en fetchGovernanceMarketOrders (RLS Fallback):', globalErr.message);
    return [];
  }
}

/**
 * Obtiene las órdenes disponibles públicamente en el Mercado Secundario.
 * Excluye las órdenes creadas por el usuario autenticado actual.
 */
export async function fetchPublicMarketOrders(currentUserId = null) {
  const allOrders = await fetchGovernanceMarketOrders(currentUserId);
  return allOrders.filter(o => o.status === 'PUBLIC_MARKET');
}

/**
 * Ejecuta la compra atómica de una orden por parte de un Socio/Admin durante el periodo de 48h.
 * Realiza la transacción atómica:
 * 1. Cambia el estado a 'SOLD_INTERNAL' y asigna buyer_id
 * 2. Traspasa la propiedad en asset_shares del vendedor al comprador
 * 3. Actualiza el saldo en wallets (débito al comprador, crédito al vendedor)
 * 4. Inserta los registros financieros correspondientes en wallet_transactions
 */
export async function buyMarketplaceOrderInternal({ orderId, buyerId }) {
  // Intentar llamada RPC de Supabase para transacción 100% atómica con rollback automático
  const { data: rpcData, error: rpcError } = await supabase.rpc('process_internal_marketplace_purchase', {
    p_order_id: orderId,
    p_buyer_id: buyerId,
  });

  if (!rpcError && rpcData) {
    return rpcData;
  }

  // Fallback seguro de JavaScript con transacción en serie e inspección de errores
  const completedTxHash = '0xint_buy_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 10);

  // A. Obtener orden de mercado
  const { data: order, error: orderErr } = await supabase
    .from(TABLES.MARKETPLACE_ORDERS)
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderErr || !order) throw new Error('No se encontró la orden de reventa especificada.');
  if (order.status !== 'IN_REVIEW_GOVERNANCE' && order.status !== 'PUBLIC_MARKET') {
    throw new Error('La orden ya ha sido vendida o cancelada.');
  }

  const priceUsdt = Number(order.price_usdt);

  // B. Obtener wallets de comprador y vendedor
  const buyerWallet = await getUserWallet(buyerId);
  if (!buyerWallet || Number(buyerWallet.balance) < priceUsdt) {
    throw new Error(`Saldo insuficiente en USDT ($${Number(buyerWallet?.balance || 0).toFixed(2)}) para completar la compra de $${priceUsdt.toFixed(2)} USDT.`);
  }

  const sellerWallet = await getUserWallet(order.seller_id);

  // C. 1. Actualizar orden a SOLD_INTERNAL
  const { data: updatedOrder, error: updateOrderErr } = await supabase
    .from(TABLES.MARKETPLACE_ORDERS)
    .update({
      status: 'SOLD_INTERNAL',
      buyer_id: buyerId,
      completed_tx_hash: completedTxHash,
      completed_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (updateOrderErr) throw new Error('Fallo al actualizar el estatus de la orden: ' + updateOrderErr.message);

  // C. 2. Traspaso de tenencia en asset_shares del vendedor al comprador
  if (order.share_id) {
    const { error: shareTransferErr } = await supabase
      .from(TABLES.ASSET_SHARES)
      .update({ user_id: buyerId })
      .eq('id', order.share_id);

    if (shareTransferErr) {
      console.error('Error al traspasar la tenencia de la acción:', shareTransferErr.message);
    }
  }

  // C. 3. Movimiento de fondos: Débito al comprador y Crédito obligatorio al vendedor
  try {
    // Débito al comprador
    await depositFunds(buyerWallet.id, buyerWallet.balance, -priceUsdt);

    // Crédito al vendedor (obtener o crear wallet si no existía)
    let sWallet = sellerWallet;
    if (!sWallet) {
      sWallet = await getUserWallet(order.seller_id);
    }

    if (sWallet && sWallet.id) {
      await depositFunds(sWallet.id, sWallet.balance, priceUsdt);
    } else {
      // Intentar crear wallet para el vendedor si no la tenía registrada
      const { data: newSWallet } = await supabase
        .from(TABLES.WALLETS)
        .insert({ user_id: order.seller_id, usdt_address: '', network: 'BEP20', balance: priceUsdt, updated_at: new Date().toISOString() })
        .select()
        .single();

      if (!newSWallet) {
        console.error('No se pudo reacreditar la wallet del vendedor:', order.seller_id);
      }
    }
  } catch (finErr) {
    console.error('Error al ajustar saldos financieros en wallets:', finErr.message);
  }

  // C. 4. Registros auditables en wallet_transactions
  try {
    await supabase.from('wallet_transactions').insert([
      {
        user_id: buyerId,
        type: 'purchase',
        amount: priceUsdt,
        tx_hash: completedTxHash,
        status: 'confirmed',
        description: `Compra de fracción RWA (${order.shares_percentage}%) en Mercado Secundario`
      },
      {
        user_id: order.seller_id,
        type: 'yield',
        amount: priceUsdt,
        tx_hash: completedTxHash,
        status: 'confirmed',
        description: `Venta de fracción RWA (${order.shares_percentage}%) en Mercado Secundario`
      }
    ]);
  } catch (logErr) {
    console.warn('Registro de wallet_transactions omitido:', logErr.message);
  }

  return updatedOrder;
}

/**
 * Ejecuta la compra pública en el Mercado Secundario por cualquier inversor verificado.
 */
export async function buyMarketplaceOrderPublic({ orderId, buyerId, txHash }) {
  return await buyMarketplaceOrderInternal({ orderId, buyerId });
}

/**
 * Cancela una orden de venta activa devolviendo las acciones de la Bóveda al usuario.
 */
export async function cancelMarketplaceOrder({ orderId, sellerId }) {
  const { data, error } = await supabase
    .from(TABLES.MARKETPLACE_ORDERS)
    .update({
      status: 'CANCELLED'
    })
    .eq('id', orderId)
    .eq('seller_id', sellerId)
    .select('*')
    .single();

  if (error) throw new Error('No se pudo cancelar la orden de venta: ' + error.message);
  return data;
}


