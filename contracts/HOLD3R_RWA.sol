// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HOLD3R RWA (Real World Assets) Fractional Investment & Governance Smart Contract
 * @dev Contrato Inteligente de Inversión Fraccionada en Activos Reales y Gobernanza Web3 en BNB Smart Chain (BSC).
 *      Soporta depósitos directos en USDT BEP20, emisión de participaciones (shares), distribución de rendimientos
 *      y votaciones ponderadas por token/participación.
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract HOLD3R_RWA {
    address public owner;
    address public treasuryAddress;
    IERC20 public immutable usdtToken; // Contrato Oficial USDT BEP20 (0x55d398326f99059fF775485246999027B3197955)

    struct Asset {
        bytes32 assetId;
        string title;
        uint256 totalValuationUsdt;
        uint256 fundedAmountUsdt;
        uint256 pricePerShareUsdt;
        uint256 totalShares;
        uint256 availableShares;
        bool isActive;
        bool isFullyFunded;
    }

    struct SharePurchase {
        bytes32 assetId;
        address investor;
        uint256 sharesCount;
        uint256 amountUsdt;
        uint256 timestamp;
    }

    struct Proposal {
        uint256 proposalId;
        bytes32 assetId;
        string title;
        string description;
        address creator;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 createdAt;
        bool isCompleted;
        bool isApproved;
    }

    // Registros Mapeados
    mapping(bytes32 => Asset) public assets;
    bytes32[] public assetIdsList;

    // Participaciones por Activo y por Inversor: assetId => investorAddress => sharesCount
    mapping(bytes32 => mapping(address => uint256)) public assetShares;
    mapping(bytes32 => mapping(address => uint256)) public assetAmountInvested;
    mapping(bytes32 => address[]) public assetInvestorsList;

    // Gobernanza: proposalId => Proposal
    mapping(uint256 => Proposal) public proposals;
    uint256 public nextProposalId = 1;
    // proposalId => voterAddress => hasVoted
    mapping(uint256 => mapping(address => bool)) public proposalVotes;

    // Eventos Oficiales Blockchain
    event AssetRegistered(bytes32 indexed assetId, string title, uint256 totalValuationUsdt, uint256 pricePerShareUsdt);
    event FractionalSharePurchased(
        bytes32 indexed assetId, 
        address indexed investor, 
        uint256 sharesCount, 
        uint256 amountUsdt, 
        uint256 timestamp
    );
    event ProposalCreated(uint256 indexed proposalId, bytes32 indexed assetId, string title, address creator);
    event ProposalVoted(uint256 indexed proposalId, address indexed voter, bool voteYes, uint256 weight);
    event TreasuryUpdated(address newTreasury);

    modifier onlyOwner() {
        require(msg.sender == owner, "HOLD3R: Solo el administrador autorizado puede ejecutar esta accion.");
        _;
    }

    constructor(address _usdtTokenAddress, address _treasuryAddress) {
        require(_usdtTokenAddress != address(0), "HOLD3R: Direccion USDT invalida.");
        require(_treasuryAddress != address(0), "HOLD3R: Direccion Tesoreria invalida.");
        
        owner = msg.sender;
        usdtToken = IERC20(_usdtTokenAddress);
        treasuryAddress = _treasuryAddress;
    }

    /**
     * @notice Registra un nuevo activo RWA en el contrato inteligente (Ej. Maquinaria, Vehiculo, Inmueble)
     */
    function registerAsset(
        bytes32 assetId,
        string memory title,
        uint256 totalValuationUsdt,
        uint256 pricePerShareUsdt
    ) external onlyOwner {
        require(assetId != bytes32(0), "HOLD3R: AssetID vacio.");
        require(totalValuationUsdt > 0, "HOLD3R: Valuacion debe ser mayor a 0.");
        require(pricePerShareUsdt > 0 && pricePerShareUsdt <= totalValuationUsdt, "HOLD3R: Precio por accion invalido.");

        uint256 calculatedShares = totalValuationUsdt / pricePerShareUsdt;

        assets[assetId] = Asset({
            assetId: assetId,
            title: title,
            totalValuationUsdt: totalValuationUsdt,
            fundedAmountUsdt: 0,
            pricePerShareUsdt: pricePerShareUsdt,
            totalShares: calculatedShares,
            availableShares: calculatedShares,
            isActive: true,
            isFullyFunded: false
        });

        assetIdsList.push(assetId);

        emit AssetRegistered(assetId, title, totalValuationUsdt, pricePerShareUsdt);
    }

    /**
     * @notice Adquiere acciones fraccionadas de un activo RWA usando USDT BEP20 real
     * @param assetId Identificador único bytes32 del activo
     * @param sharesCount Cantidad de acciones a comprar (1 o más)
     */
    function buyAssetShares(bytes32 assetId, uint256 sharesCount) external returns (bool) {
        Asset storage targetAsset = assets[assetId];
        require(targetAsset.isActive, "HOLD3R: El activo no se encuentra activo.");
        require(!targetAsset.isFullyFunded, "HOLD3R: El activo ya ha completado su fondeo total.");
        require(sharesCount > 0, "HOLD3R: La cantidad de acciones debe ser mayor a 0.");
        require(sharesCount <= targetAsset.availableShares, "HOLD3R: Cantidad de acciones excede las disponibles.");

        uint256 totalPaymentUsdt = sharesCount * targetAsset.pricePerShareUsdt;

        // Verificar margen de USDT permitido (Allowance) y saldo en billetera del inversor
        require(usdtToken.balanceOf(msg.sender) >= totalPaymentUsdt, "HOLD3R: Saldo insuficiente de USDT en tu billetera.");
        require(usdtToken.allowance(msg.sender, address(this)) >= totalPaymentUsdt, "HOLD3R: Debes aprobar el contrato RWA antes de transferir USDT.");

        // Transferencia directa de USDT BEP20 desde la billetera del inversor a la Tesorería Oficial HOLD3R
        bool transferSuccess = usdtToken.transferFrom(msg.sender, treasuryAddress, totalPaymentUsdt);
        require(transferSuccess, "HOLD3R: Fallo en la transferencia de USDT a la Tesoreria.");

        // Registrar primer compra si es la primera vez del inversor en este activo
        if (assetShares[assetId][msg.sender] == 0) {
            assetInvestorsList[assetId].push(msg.sender);
        }

        // Actualizar contabilidad del activo en Blockchain
        assetShares[assetId][msg.sender] += sharesCount;
        assetAmountInvested[assetId][msg.sender] += totalPaymentUsdt;
        
        targetAsset.fundedAmountUsdt += totalPaymentUsdt;
        targetAsset.availableShares -= sharesCount;

        if (targetAsset.availableShares == 0) {
            targetAsset.isFullyFunded = true;
        }

        // Emitir Evento Blockchain Oficial
        emit FractionalSharePurchased(assetId, msg.sender, sharesCount, totalPaymentUsdt, block.timestamp);

        return true;
    }

    /**
     * @notice Crea una propuesta de gobernanza asociada a un activo RWA
     */
    function createProposal(bytes32 assetId, string memory title, string memory description) external returns (uint256) {
        require(bytes(title).length > 0, "HOLD3R: Titulo de propuesta invalido.");
        require(assetShares[assetId][msg.sender] > 0, "HOLD3R: Solo los holders de este activo pueden crear propuestas.");

        uint256 proposalId = nextProposalId++;

        proposals[proposalId] = Proposal({
            proposalId: proposalId,
            assetId: assetId,
            title: title,
            description: description,
            creator: msg.sender,
            yesVotes: 0,
            noVotes: 0,
            createdAt: block.timestamp,
            isCompleted: false,
            isApproved: false
        });

        emit ProposalCreated(proposalId, assetId, title, msg.sender);
        return proposalId;
    }

    /**
     * @notice Emite un voto en una propuesta de gobernanza ponderado por el número de acciones poseídas
     */
    function voteProposal(uint256 proposalId, bool voteYes) external returns (bool) {
        Proposal storage prop = proposals[proposalId];
        require(prop.proposalId != 0, "HOLD3R: Propuesta no existe.");
        require(!prop.isCompleted, "HOLD3R: La propuesta ya ha sido completada.");
        require(!proposalVotes[proposalId][msg.sender], "HOLD3R: Ya has emitido tu voto en esta propuesta.");

        uint256 weight = assetShares[prop.assetId][msg.sender];
        require(weight > 0, "HOLD3R: No posees acciones en este activo para ejercer derecho a voto.");

        proposalVotes[proposalId][msg.sender] = true;

        if (voteYes) {
            prop.yesVotes += weight;
        } else {
            prop.noVotes += weight;
        }

        emit ProposalVoted(proposalId, msg.sender, voteYes, weight);
        return true;
    }

    /**
     * @notice Actualiza la dirección de Tesorería Oficial
     */
    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "HOLD3R: Direccion de tesoreria invalida.");
        treasuryAddress = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /**
     * @notice Consulta las participaciones poseídas por un inversor en un activo
     */
    function getInvestorShares(bytes32 assetId, address investor) external view returns (uint256 sharesCount, uint256 amountInvested) {
        return (assetShares[assetId][investor], assetAmountInvested[assetId][investor]);
    }
}
