import React, { useState } from 'react';
import { DollarSign, Shield, FileText, CheckCircle2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { investInAsset } from '../services/api';

export default function InvestmentModal({ asset, userProfile, wallet, onClose, onSuccess }) {
  const [amountUsdt, setAmountUsdt] = useState('100');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!asset) return null;

  const valuation = Number(asset.total_valuation);
  const funded = Number(asset.funded_amount);
  const remainingUsdt = Math.max(0, valuation - funded);
  const userBalance = Number(wallet?.balance || 0);

  const numAmount = Number(amountUsdt) || 0;
  const sharePercent = valuation > 0 ? (numAmount / valuation) * 100 : 0;
  const projectedApr = 14.2; // APR promedio
  const monthlyEstYield = ((numAmount * (projectedApr / 100)) / 12);

  const handleInvest = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (numAmount <= 0) {
      setErrorMsg('Ingresa un monto válido a invertir.');
      return;
    }

    if (numAmount > userBalance) {
      setErrorMsg(`Saldo insuficiente en tu wallet ($${userBalance.toLocaleString()} USDT disponibles). Recarga tu saldo en la barra superior.`);
      return;
    }

    if (numAmount > remainingUsdt) {
      setErrorMsg(`El monto excede el saldo pendiente de fondeo ($${remainingUsdt.toLocaleString()} USDT).`);
      return;
    }

    setLoading(true);

    try {
      const shareData = await investInAsset({
        userId: userProfile.id,
        wallet: wallet,
        asset: asset,
        investmentUsdt: numAmount
      });

      // Animación de celebración
      confetti({
        particleCount: 70,
        spread: 60,
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
      <div className="glass-panel w-full max-w-xl p-6 sm:p-8 border border-emerald-500/40 shadow-2xl relative max-h-[85vh] overflow-y-auto my-auto">
        
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
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Adquirir Fracción de Activo</h3>
            <p className="text-xs text-neutral-400 truncate max-w-sm">{asset.title}</p>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs p-3 rounded-xl mb-4 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleInvest} className="space-y-5">
          {/* Asset Quick Summary Card */}
          <div className="bg-neutral-900/80 border border-white/10 p-4 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center justify-between text-neutral-300">
              <span>Valoración Total del Activo:</span>
              <strong className="font-mono text-white text-sm">${valuation.toLocaleString()} USDT</strong>
            </div>
            <div className="flex items-center justify-between text-neutral-300">
              <span>Fondeo Restante Disponible:</span>
              <strong className="font-mono text-emerald-400 text-sm">${remainingUsdt.toLocaleString()} USDT</strong>
            </div>
            <div className="flex items-center justify-between text-neutral-300">
              <span>Tu Saldo USDT Disponible:</span>
              <strong className="font-mono text-white text-sm">${userBalance.toLocaleString()} USDT</strong>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Monto a Invertir (USDT):
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-emerald-400 font-mono font-extrabold text-lg">$</span>
              <input
                type="number"
                min="1"
                max={Math.min(userBalance, remainingUsdt)}
                step="1"
                required
                value={amountUsdt}
                onChange={(e) => setAmountUsdt(e.target.value)}
                className="w-full bg-neutral-900 border border-white/15 focus:border-emerald-500 text-white font-mono font-bold text-xl rounded-2xl py-3 pl-10 pr-20 outline-none"
                placeholder="100"
              />
              <span className="absolute right-4 top-3.5 text-xs font-mono font-bold text-neutral-400">
                USDT
              </span>
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
              Al confirmar, se emitirá una firma digital indexada en Supabase vinculada a tu Cédula/RIF <strong className="text-white font-mono">{userProfile.document_id}</strong>.
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
              {loading ? 'Firmando Transacción...' : `Confirmar Inversión por $${numAmount} USDT`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
