const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Iniciando despliegue automatizado del contrato HOLD3R_RWA.sol...");

  // 1. Obtener la cuenta desplegadora
  const [deployer] = await hre.ethers.getSigners();
  console.log(`👤 Cuenta desplegadora: ${deployer ? deployer.address : "Modo Simulación / Standalone"}`);

  if (deployer) {
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(`💰 Saldo nativo (BNB): ${hre.ethers.formatEther(balance)} BNB`);
  }

  // 2. Direcciones Oficiales de Producción / Testnet
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;
  console.log(`🌐 Chain ID objetivo: ${chainId}`);

  // BSC Mainnet USDT: 0x55d398326f99059fF775485246999027B3197955
  let usdtTokenAddress = "0x55d398326f99059fF775485246999027B3197955";
  let treasuryAddress = process.env.TREASURY_ADDRESS || "0x72D45C3d8147D3225C841C1f92D73D3F9A6A85a7";

  if (Number(chainId) === 97) {
    console.log("ℹ️ Detectada red BSC Testnet (Chain ID 97)");
    usdtTokenAddress = process.env.TESTNET_USDT_ADDRESS || "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";
  }

  console.log(`📍 USDT Contract: ${usdtTokenAddress}`);
  console.log(`🏦 Treasury Target: ${treasuryAddress}`);

  // 3. Compilación y Despliegue del Contrato inteligente
  const HOLD3R_RWA = await hre.ethers.getContractFactory("HOLD3R_RWA");
  const hold3rRwa = await HOLD3R_RWA.deploy(usdtTokenAddress, treasuryAddress);

  await hold3rRwa.waitForDeployment();
  const contractAddress = await hold3rRwa.getAddress();

  console.log("\n========================================================");
  console.log("✅ CONTRATO INTELIGENTE HOLD3R_RWA DESPLEGADO CON ÉXITO");
  console.log(`📍 Dirección del Contrato: ${contractAddress}`);
  console.log("========================================================\n");

  // 4. Actualizar variables de entorno en .env automáticamente
  const envPath = path.join(__dirname, "../.env");
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  if (envContent.includes("VITE_HOLD3R_RWA_CONTRACT_ADDRESS=")) {
    envContent = envContent.replace(
      /VITE_HOLD3R_RWA_CONTRACT_ADDRESS=.*/,
      `VITE_HOLD3R_RWA_CONTRACT_ADDRESS=${contractAddress}`
    );
  } else {
    envContent += `\nVITE_HOLD3R_RWA_CONTRACT_ADDRESS=${contractAddress}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log("📝 Variable VITE_HOLD3R_RWA_CONTRACT_ADDRESS actualizada en .env");
}

main().catch((error) => {
  console.error("❌ Error en el despliegue del contrato:", error);
  process.exitCode = 1;
});
