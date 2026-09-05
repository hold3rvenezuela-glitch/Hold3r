import React, { useState, useEffect } from 'react';
import { DollarSign, Shield, FileText, CheckCircle2, AlertCircle, ArrowRight, Sparkles, Wallet, Globe, RefreshCw, Clock, Lock, Check, UserPlus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { investInAsset, reserveAssetSlot, getActiveReservation, releaseAssetReservation, joinAssetWaitlist, fetchActiveReservationsSumForAsset } from '../services/api';
import { sendUsdtWeb3Transfer, isWeb3Available } from '../services/web3';
import { useWeb3ModalAccount } from '@web3modal/ethers/react';
import AssetImageCarousel from './AssetImageCarousel';

export default function InvestmentModal({ asset, userProfile, wallet, onClose, onSuccess, onOpenWeb3Modal }) {
  const { address: wcAddress, isConnected: wcIsConnected } = useWeb3ModalAccount();
  const activeWalletAddress = (wcIsConnected && wcAddress) ? wcAddress : null;

  if (!asset) return null;

  const [totalReservedSum, setTotalReservedSum] = useState(0);

  useEffect(() => {
    if (asset?.id) {
      fetchActiveReservationsSumForAsset(asset.id).then(sum => {
        setTotalReservedSum(sum || 0);
      });
    }
  }, [asset?.id]);

  const valuation = Number(asset.total_valuation);
  const funded = Number(asset.funded_amount);
  const effectiveFunded = funded + totalReservedSum;
  const remainingUsdt = Math.max(0, valuation - effectiveFunded);
  const userBalance = Number(wallet?.balance || 0);

  const minInvestment = Number(asset.min_investment || asset.minInvestment || 10);
  const maxInvestment = (asset.max_investment || asset.maxInvestment)
    ? Number(asset.max_investment || asset.maxInvestment)
    : null;

  const assetImages = Array.isArray(asset.images) && asset.images.length > 0
    ? asset.images
    : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80'];

  // Lógica de Cuota Fija (Mínimo == Máximo)
  const isFixedQuota = Boolean(minInvestment && maxInvestment && minInvestment === maxInvestment);
  const fixedQuotaAmount = isFixedQuota ? minInvestment : null;

  const totalShares = isFixedQuota ? Math.floor(valuation / fixedQuotaAmount) : 0;
  const fundedShares = isFixedQuota ? Math.floor(effectiveFunded / fixedQuotaAmount) : 0;
  const availableShares = isFixedQuota ? Math.max(0, totalShares - fundedShares) : 0;

  // Estado del activo (Agotado o Disponible)
  const isSoldOut = asset.status === 'sold' || remainingUsdt <= 0 || (isFixedQuota && availableShares <= 0);

  // Estados del Formulario
  const [selectedQuotaCount, setSelectedQuotaCount] = useState(1);
  const [amountUsdt, setAmountUsdt] = useState(isFixedQuota ? (1 * fixedQuotaAmount).toString() : '100');
  const [paymentMethod, setPaymentMethod] = useState('credit'); // 'credit' | 'direct_web3'
  const [selectedNetwork, setSelectedNetwork] = useState('BEP20');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados de Reserva de Cupo (15 Minutos)
  const [activeReservation, setActiveReservation] = useState(null);
  const [reservationTimeLeft, setReservationTimeLeft] = useState(900); // 15 min = 900s
  const [isReserving, setIsReserving] = useState(false);

  // Estados de Lista de Espera
  const [joinedWaitlist, setJoinedWaitlist] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  // Cargar reserva previa al abrir modal
  useEffect(() => {
    if (asset?.id && userProfile?.id) {
      const existing = getActiveReservation(asset.id, userProfile.id);
      if (existing) {
        setActiveReservation(existing);
        const secondsLeft = Math.max(0, Math.floor((existing.expiresAt - Date.now()) / 1000));
        setReservationTimeLeft(secondsLeft);
        setAmountUsdt(existing.amountUsdt.toString());
      }
    }
  }, [asset?.id, userProfile?.id]);

  // Temporizador decreciente de reserva (15 Minutos)
  useEffect(() => {
    if (!activeReservation) return;

    const interval = setInterval(() => {
      const seconds = Math.floor((activeReservation.expiresAt - Date.now()) / 1000);
      if (seconds <= 0) {
        setActiveReservation(null);
        setReservationTimeLeft(0);
        releaseAssetReservation(asset.id, userProfile?.id);
        setErrorMsg('⏱️ Tu tiempo de reserva de 15 minutos ha expirado. Por favor presiona "Reservar Cupo" nuevamente.');
      } else {
        setReservationTimeLeft(seconds);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeReservation, asset?.id, userProfile?.id]);

  // Formatear segundos MM:SS
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const numAmount = isFixedQuota ? (selectedQuotaCount * fixedQuotaAmount) : (Number(amountUsdt) || 0);
  const sharePercent = valuation > 0 ? (numAmount / valuation) * 100 : 0;
  const projectedApr = 14.2; // APR promedio
  const monthlyEstYield = ((numAmount * (projectedApr / 100)) / 12);

  // Handler para Reservar Cupo (15 min)
  const handleReserveSlot = async () => {
    setErrorMsg('');
    setIsReserving(true);
    try {
      if (numAmount <= 0) throw new Error('Ingresa un monto válido.');
      if (isFixedQuota && numAmount % fixedQuotaAmount !== 0) {
        throw new Error(`Sólo se permite la compra en cuotas exactas de $${fixedQuotaAmount.toLocaleString()} USDT.`);
      }

      const res = await reserveAssetSlot({
        assetId: asset.id,
        userId: userProfile?.id || 'demo_user',
        amountUsdt: numAmount
      });

      setActiveReservation(res);
      setReservationTimeLeft(900);
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo completar la reserva de cupo.');
    } finally {
      setIsReserving(false);
    }
  };

  // Handler para Lista de Espera
  const handleJoinWaitlist = async () => {
    setWaitlistLoading(true);
    try {
      await joinAssetWaitlist({
        assetId: asset.id,
        userId: userProfile?.id,
        documentId: userProfile?.document_id,
        email: userProfile?.email
      });
      setJoinedWaitlist(true);
    } catch (err) {
      setErrorMsg('No se pudo completar el registro en la lista de espera.');
    } finally {
      setWaitlistLoading(false);
    }
  };

  const handleInvest = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (isSoldOut) {
      setErrorMsg('El activo está agotado. No se aceptan más pagos.');
      return;
    }

    if (!activeReservation) {
      setErrorMsg('Debes presionar "Reservar Cupo" antes de realizar el pago.');
      return;
    }

    if (numAmount <= 0) {
      setErrorMsg('Ingresa un monto válido a invertir.');
      return;
    }

    if (isFixedQuota && numAmount % fixedQuotaAmount !== 0) {
      setErrorMsg(`La inversión debe ser un múltiplo exacto de $${fixedQuotaAmount.toLocaleString()} USDT.`);
      return;
    }

    if (!isFixedQuota && numAmount < minInvestment) {
      setErrorMsg(`La inversión mínima permitida por socio para este activo es de $${minInvestment.toLocaleString()} USDT.`);
      return;
    }

    if (!isFixedQuota && maxInvestment && numAmount > maxInvestment) {
      const maxSharePercent = valuation > 0 ? ((maxInvestment / valuation) * 100).toFixed(1) : 0;
      setErrorMsg(`La inversión máxima permitida por socio para este activo es de $${maxInvestment.toLocaleString()} USDT (${maxSharePercent}% de participación).`);
      return;
    }

    if (numAmount > remainingUsdt) {
      setErrorMsg(`El monto excede el saldo pendiente de fondeo ($${remainingUsdt.toLocaleString()} USDT).`);
      return;
    }

    if (paymentMethod === 'credit' && numAmount > userBalance) {
      setErrorMsg(`Saldo acreditado insuficiente ($${userBalance.toLocaleString()} USDT disponible). Realiza un depósito o usa Pago Directo desde tu Wallet.`);
      return;
    }

    if (paymentMethod === 'direct_web3' && !activeWalletAddress && !isWeb3Available()) {
      if (onOpenWeb3Modal) onOpenWeb3Modal();
      setErrorMsg('Conecta tu Billetera Web3 para firmar la transferencia directa.');
      return;
    }

    setLoading(true);

    try {
      let contractTxHash = null;

      if (paymentMethod === 'direct_web3') {
        const txRes = await sendUsdtWeb3Transfer({ amountUsdt: numAmount, network: selectedNetwork });
        contractTxHash = txRes.txHash;
      }

      const shareData = await investInAsset({
        userId: userProfile?.id || '11111111-1111-4111-8111-111111111111',
        wallet: paymentMethod === 'credit' ? wallet : { balance: userBalance },
        asset: asset,
        investmentUsdt: numAmount,
        signedHash: contractTxHash
      });

      // Liberar reserva al completar la compra
      releaseAssetReservation(asset.id, userProfile?.id);

      confetti({
        particleCount: 85,
        spread: 75,
        origin: { y: 0.6 }
      });

      onSuccess(shareData);
      onClose();
    } catch (err) {
      console.error('Error al procesar inversión:', err);
      setErrorMsg(err.message || 'Ocurrió un error al procesar la inversión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md pt-24 pb-12 overflow-y-auto animate-fade-in">
      <div className="glass-panel w-full max-w-xl p-6 sm:p-8 border border-emerald-500/40 shadow-2xl relative max-h-[85vh] overflow-y-auto my-auto space-y-5">
        
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white text-xl font-bold p-1 rounded-lg"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Adquirir Fracción de Activo</h3>
              <p className="text-xs text-neutral-400 truncate max-w-xs">{asset.title}</p>
            </div>
          </div>

          {/* Badges Modalidad */}
          {isSoldOut ? (
            <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs px-3 py-1 rounded-full font-bold">
              Activo Agotado
            </span>
          ) : isFixedQuota ? (
            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs px-3 py-1 rounded-full font-bold">
              Cuota Fija: ${fixedQuotaAmount.toLocaleString()} USDT
            </span>
          ) : null}
        </div>

        {/* Carrusel Deslizante de Fotografías en Modal */}
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg">
          <AssetImageCarousel 
            images={assetImages} 
            title={asset.title} 
            heightClass="h-44 sm:h-52"
          />
        </div>

        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs p-3 rounded-xl font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* CASO 1: ACTIVO AGOTADO -> LISTA DE ESPERA */}
        {isSoldOut ? (
          <div className="bg-neutral-900/90 border border-rose-500/30 p-6 rounded-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Este activo se encuentra 100% fondeado</h4>
              <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto leading-relaxed">
                Todas las cuotas o participaciones disponibles han sido adjudicadas o reservadas. Puedes unirte a la lista de espera para recibir notificación prioritaria si algún cupo se libera.
              </p>
            </div>

            {joinedWaitlist ? (
              <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs p-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>🎉 ¡Te has unido exitosamente a la Lista de Espera! Te avisaremos al liberarse un cupo.</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleJoinWaitlist}
                disabled={waitlistLoading}
                className="btn-primary w-full py-3 text-xs font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500"
              >
                <UserPlus className="w-4 h-4" />
                {waitlistLoading ? 'Registrando...' : 'Unirme a la Lista de Espera Prioritaria'}
              </button>
            )}
          </div>
        ) : (
          /* CASO 2: FORMULARIO NORMAL / CUOTA FIJA */
          <form onSubmit={handleInvest} className="space-y-5">
            
            {/* Asset Summary Card & Quotas count */}
            <div className="bg-neutral-900/80 border border-white/10 p-4 rounded-2xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-neutral-300">
                <span>Valoración Total del Activo:</span>
                <strong className="font-mono text-white text-sm">${valuation.toLocaleString()} USDT</strong>
              </div>
              
              {isFixedQuota ? (
                <>
                  <div className="flex items-center justify-between text-neutral-300">
                    <span>Acciones / Cuotas Totales del Activo:</span>
                    <strong className="font-mono text-cyan-300 text-xs">{totalShares} cuotas de ${fixedQuotaAmount.toLocaleString()} USDT</strong>
                  </div>
                  <div className="flex items-center justify-between text-neutral-300">
                    <span>Cuotas Disponibles para Compra:</span>
                    <strong className="font-mono text-emerald-400 text-sm">{availableShares} cuotas libres</strong>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between text-neutral-300">
                  <span>Fondeo Restante Disponible:</span>
                  <strong className="font-mono text-emerald-400 text-sm">${remainingUsdt.toLocaleString()} USDT</strong>
                </div>
              )}

              {/* Temporizador de Reserva Status */}
              <div className="flex items-center justify-between text-neutral-300 pt-2 border-t border-white/10 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Estado de Reserva de Cupo:
                </span>
                {activeReservation ? (
                  <span className="font-mono text-emerald-400 font-extrabold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                    ⏱️ Reservado por {formatTimer(reservationTimeLeft)} min
                  </span>
                ) : (
                  <span className="font-mono text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    ⚠️ Pendiente de Reserva (15 min)
                  </span>
                )}
              </div>
            </div>

            {/* SELECTOR DE MONTO O CUOTA FIJA */}
            {isFixedQuota ? (
              <div className="bg-neutral-900/90 border border-cyan-500/40 p-4 rounded-2xl space-y-3">
                <label className="block text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  Selección por Cuota Fija ($${fixedQuotaAmount.toLocaleString()} USDT por cuota):
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(count => {
                    if (count > availableShares) return null;
                    const countCost = count * fixedQuotaAmount;
                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setSelectedQuotaCount(count)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          selectedQuotaCount === count
                            ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold shadow-lg shadow-cyan-500/10'
                            : 'bg-neutral-950 border-white/10 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-bold">{count} {count === 1 ? 'Cuota' : 'Cuotas'}</div>
                        <div className="text-[11px] font-mono font-extrabold text-cyan-300 mt-0.5">
                          ${countCost.toLocaleString()} USDT
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-neutral-300 pt-1">
                  <span>Monto Total a Invertir:</span>
                  <strong className="text-sm font-bold text-white">${numAmount.toLocaleString()} USDT</strong>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Monto a Invertir (USDT):
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-emerald-400 font-mono font-extrabold text-lg">$</span>
                  <input
                    type="number"
                    min={minInvestment}
                    max={paymentMethod === 'credit' ? Math.min(userBalance, remainingUsdt) : remainingUsdt}
                    step="1"
                    required
                    disabled={Boolean(activeReservation)}
                    value={amountUsdt}
                    onChange={(e) => setAmountUsdt(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/15 focus:border-emerald-500 text-white font-mono font-bold text-xl rounded-2xl py-3 pl-10 pr-20 outline-none disabled:opacity-75"
                    placeholder="100"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-mono font-bold text-neutral-400">
                    USDT
                  </span>
                </div>
              </div>
            )}

            {/* BOTÓN OBLIGATORIO: RESERVAR CUPO (15 MINUTOS) */}
            {!activeReservation ? (
              <div className="bg-neutral-900/90 border border-amber-500/40 p-4 rounded-2xl space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-amber-200">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Para habilitar las direcciones de tesorería y el pago directo, debes <strong>Reservar un Cupo</strong>. El cupo se bloqueará exclusivamente para tu wallet durante 15 minutos.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleReserveSlot}
                  disabled={isReserving || numAmount <= 0}
                  className="w-full py-3.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Clock className="w-4 h-4" />
                  {isReserving ? 'Reservando Cupo en Supabase...' : isFixedQuota 
                    ? `Reservar Cupo (1 de ${availableShares} disponibles por $${numAmount.toLocaleString()} USDT)`
                    : `Reservar Cupo (1 cupo de $${numAmount.toLocaleString()} USDT disponible)`}
                </button>
              </div>
            ) : (
              /* MÉTODOS DE PAGO UNLOCKED UNA VEZ RESERVADO EL CUPO */
              <div className="space-y-4 animate-fade-in border-t border-white/10 pt-4">
                
                {/* Banner de Confirmación de Reserva Activa */}
                <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs p-3 rounded-2xl flex items-center justify-between gap-2 font-semibold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>¡Cupo Reservado! Tienes <strong>{formatTimer(reservationTimeLeft)} minutos</strong> para completar el pago.</span>
                  </div>
                </div>

                {/* Payment Method Switcher */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-2">
                    Método de Pago para Inversión:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('credit')}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                        paymentMethod === 'credit'
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-lg'
                          : 'bg-neutral-900/90 border-white/10 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
                          <Wallet className="w-4 h-4" />
                          Crédito HOLD3R
                        </span>
                        <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                          Acreditado
                        </span>
                      </div>
                      <p className="text-[11px] font-mono font-extrabold text-white">
                        ${userBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('direct_web3')}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                        paymentMethod === 'direct_web3'
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-lg'
                          : 'bg-neutral-900/90 border-white/10 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5 text-cyan-400">
                          <Globe className="w-4 h-4" />
                          Pago Directo Web3
                        </span>
                        <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">
                          WalletConnect
                        </span>
                      </div>
                      <p className="text-[11px] font-mono truncate text-neutral-300">
                        {activeWalletAddress ? `${activeWalletAddress.substring(0, 6)}...${activeWalletAddress.substring(activeWalletAddress.length - 4)}` : 'Conectar Billetera'}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Realtime Shares Calculator */}
                <div className="bg-neutral-900/90 border border-emerald-500/30 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-300">Participación en Propiedad:</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {sharePercent.toFixed(4)}% del activo
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-300">Rendimiento Proyectado (APR ~{projectedApr}%):</span>
                    <span className="text-sm font-bold text-white font-mono">
                      +${monthlyEstYield.toFixed(2)} USDT / mes
                    </span>
                  </div>
                </div>

                {/* Legal Notice */}
                <div className="flex items-start gap-2.5 p-3 bg-neutral-900/60 border border-white/10 rounded-xl text-[11px] text-neutral-400">
                  <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p>
                    Al confirmar, se emitirá una firma digital indexada en Supabase vinculada a tu Cédula/RIF <strong className="text-white font-mono">{userProfile?.document_id || 'V-00000000'}</strong>.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary text-xs"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={loading || numAmount <= 0}
                    className="btn-primary text-xs py-3 px-6"
                  >
                    {loading ? 'Procesando Inversión...' : `Confirmar y Pagar $${numAmount.toLocaleString()} USDT`}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
