/**
 * HOLD3R — Script de Despliegue del Contrato ERC-1155 RWA
 * =========================================================
 * Despliega el contrato HOLD3R_ERC1155 en BNB Smart Chain.
 *
 * USO:
 *   BSC Mainnet:  npx hardhat run scripts/deployERC1155.js --network bscMainnet
 *   BSC Testnet:  npx hardhat run scripts/deployERC1155.js --network bscTestnet
 *
 * VARIABLES DE ENTORNO REQUERIDAS en .env:
 *   DEPLOYER_PRIVATE_KEY   — Clave privada de la wallet de despliegue (sin prefijo 0x)
 *   BSC_MAINNET_RPC_URL    — RPC de BSC Mainnet (default: https://bsc-dataseed.binance.org/)
 *   VITE_USDT_BEP20_CONTRACT  — Dirección del contrato USDT BEP20 en BSC
 *   VITE_TREASURY_BEP20_ADDRESS — Dirección de la Tesorería Oficial HOLD3R
 */

require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║         HOLD3R ERC-1155 RWA — Deploy Script             ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  console.log("🚀 Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer BNB Balance:", ethers.formatEther(balance), "BNB");

  if (balance === 0n) {
    throw new Error("❌ El deployer no tiene BNB para pagar el gas. Recárgalo antes de continuar.");
  }

  // ── Parámetros del Constructor ─────────────────────────────────────────────
  const USDT_ADDRESS = process.env.VITE_USDT_BEP20_CONTRACT;
  const TREASURY_ADDRESS = process.env.VITE_TREASURY_BEP20_ADDRESS;

  if (!USDT_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(USDT_ADDRESS)) {
    throw new Error("❌ VITE_USDT_BEP20_CONTRACT no está definido o es inválido en .env");
  }
  if (!TREASURY_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(TREASURY_ADDRESS)) {
    throw new Error("❌ VITE_TREASURY_BEP20_ADDRESS no está definido o es inválido en .env");
  }

  console.log("\n📋 Parámetros del Constructor:");
  console.log("   USDT Contract (BEP20) :", USDT_ADDRESS);
  console.log("   Treasury Address      :", TREASURY_ADDRESS);

  // ── Despliegue ──────────────────────────────────────────────────────────────
  console.log("\n⏳ Compilando y desplegando HOLD3R_ERC1155...\n");

  const HOLD3R_ERC1155 = await ethers.getContractFactory("HOLD3R_ERC1155");
  const contract = await HOLD3R_ERC1155.deploy(USDT_ADDRESS, TREASURY_ADDRESS);

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("✅ HOLD3R_ERC1155 desplegado exitosamente!");
  console.log("   Dirección del Contrato:", contractAddress);
  console.log("   Red (Chain ID)        :", (await ethers.provider.getNetwork()).chainId);

  // ── Post-Deploy: Registro del primer activo de ejemplo ────────────────────
  // Descomenta y modifica este bloque para registrar activos inmediatamente después del deploy:
  /*
  console.log("\n📝 Registrando activo de ejemplo: Runner TRD (TokenID: 1)...");
  const ONE_HUNDRED_USDT = ethers.parseUnits("100", 18); // 100 USDT con 18 decimales BEP20
  const tx = await contract.registerAsset(
    1,                    // tokenId
    "Runner TRD",         // title
    ONE_HUNDRED_USDT,     // pricePerShareUsdt (100 USDT)
    50                    // maxShares (50 cupos disponibles)
  );
  await tx.wait();
  console.log("✅ Activo Runner TRD registrado. TxHash:", tx.hash);
  */

  // ── Instrucciones Post-Deploy ──────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                  PASOS SIGUIENTES                        ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║ 1. Añade esta línea a tu .env:                           ║");
  console.log(`║    VITE_HOLD3R_ERC1155_ADDRESS=${contractAddress}  ║`);
  console.log("║                                                          ║");
  console.log("║ 2. Verifica el contrato en BscScan:                      ║");
  console.log(`║    https://bscscan.com/address/${contractAddress}  ║`);
  console.log("║                                                          ║");
  console.log("║ 3. Registra activos desde el Panel Admin usando          ║");
  console.log("║    la función registerAsset(tokenId, title, price, max)  ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error en el despliegue:", error.message);
    process.exit(1);
  });
