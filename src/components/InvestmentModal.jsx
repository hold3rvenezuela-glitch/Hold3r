import React, { useState } from 'react';
import { DollarSign, Shield, FileText, CheckCircle2, AlertCircle, ArrowRight, Sparkles, Wallet, Globe, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { investInAsset } from '../services/api';
import { sendUsdtWeb3Transfer, isWeb3Available } from '../services/web3';
import { useWeb3ModalAccount } from '@web3modal/ethers/react';

export default function InvestmentModal({ asset, userProfile, wallet, onClose, onSuccess, onOpenWeb3Modal }) {
  const [amountUsdt, setAmountUsdt] = useState('100');
  const [paymentMethod, setPaymentMethod] = useState('credit'); // 'credit' | 'direct_web3'
  const [selectedNetwork, setSelectedNetwork] = useState('BEP20');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { address: wcAddress, isConnected: wcIsConnected } = useWeb3ModalAccount();
  const activeWalletAddress = (wcIsConnected && wcAddress) ? wcAddress : null;

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

      // Si el pago es directo desde la wallet Web3, ejecutamos la transferencia en la blockchain primero
      if (paymentMethod === 'direct_web3') {
        const txRes = await sendUsdtWeb3Transfer({ amountUsdt: numAmount, network: selectedNetwork });
        contractTxHash = txRes.txHash;
      }

      const shareData = await investInAsset({
        userId: userProfile.id,
        wallet: paymentMethod === 'credit' ? wallet : { balance: userBalance }, // No descuenta saldo acreditado si es pago directo Web3
        asset: asset,
        investmentUsdt: numAmount,
        signedHash: contractTxHash
      });

      // Animación de celebración
      confetti({
        particleCount: 75,
        spread: 70,
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
          
          {/* Asset Summary Card */}
          <div className="bg-neutral-900/80 border border-white/10 p-4 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center justify-between text-neutral-300">
              <span>Valoración Total del Activo:</span>
              <strong className="font-mono text-white text-sm">${valuation.toLocaleString()} USDT</strong>
            </div>
            <div className="flex items-center justify-between text-neutral-300">
              <span>Fondeo Restante Disponible:</span>
              <strong className="font-mono text-emerald-400 text-sm">${remainingUsdt.toLocaleString()} USDT</strong>
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
                max={paymentMethod === 'credit' ? Math.min(userBalance, remainingUsdt) : remainingUsdt}
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
              {loading ? 'Procesando Inversión...' : `Confirmar Inversión por $${numAmount} USDT`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
