import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 1. Importa WalletConnect Web3Modal para Ethers
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';

// 2. Project ID oficial de WalletConnect Cloud / Reown
const projectId = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WALLETCONNECT_PROJECT_ID)
  || (typeof process !== 'undefined' && process.env && process.env.VITE_WALLETCONNECT_PROJECT_ID)
  || '50744bb9d377a5000a6f5d2d2141fbef';

// 3. Redes principales soportadas (BNB Smart Chain y Ethereum Mainnet)
const bscMainnet = {
  chainId: 56,
  name: 'BNB Smart Chain',
  currency: 'BNB',
  explorerUrl: 'https://bscscan.com',
  rpcUrl: 'https://bsc-dataseed.binance.org/'
};

const ethereumMainnet = {
  chainId: 1,
  name: 'Ethereum Mainnet',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: 'https://eth.llamarpc.com'
};

// 4. Metadata oficial dinámica (garantiza el esquema de URI wc: correcto en móviles)
const metadata = {
  name: 'HOLD3R',
  description: 'Tokenización e Inversión Fraccionada · Venezuela',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://hold3r.vercel.app',
  icons: ['https://hold3r.vercel.app/favicon.ico']
};

createWeb3Modal({
  ethersConfig: defaultConfig({ metadata }),
  chains: [bscMainnet, ethereumMainnet],
  projectId,
  enableAnalytics: false
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);