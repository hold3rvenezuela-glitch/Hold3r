import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 1. Importa WalletConnect
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';

// 2. Configura tu Project ID y tu red (puedes cambiar mainnet por la red que uses, ej. Polygon o BSC)
const projectId = '50744bb9d377a5000a6f5d2d2141fbef'

const mainnet = {
  chainId: 1, // Cambia el chainId según tu red (ej: 137 para Polygon, 56 para BSC, etc.)
  name: 'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: 'https://cloudflare-eth.com'
};

const metadata = {
  name: 'Hold3r',
  description: 'Mi Aplicación Web3',
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