import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 1. Importa WalletConnect Web3Modal
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';

// 2. Tu Project ID oficial
const projectId = '50744bb9d377a5000a6f5d2d2141fbef';

const mainnet = {
  chainId: 56, // O la red principal que utilices (ej. 56 para BNB Chain / BSC, 1 para Ethereum)
  name: 'BNB Smart Chain',
  currency: 'BNB',
  explorerUrl: 'https://bscscan.com',
  rpcUrl: 'https://bsc-dataseed.binance.org/'
};

const metadata = {
  name: 'Hold3r',
  description: 'Aplicación Web3',
  url: window.location.origin,
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

createWeb3Modal({
  ethersConfig: defaultConfig({ metadata }),
  chains: [mainnet],
  projectId
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);