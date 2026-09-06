// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HOLD3R ERC-1155 RWA Fractional Tokenization Contract
 * @notice Contrato ERC-1155 para tokenización fraccionada de Activos Reales (RWA) en BNB Smart Chain.
 *         Cada activo registrado tiene un Token ID único. Los inversores reciben tokens on-chain
 *         que representan su participación fraccionada con trazabilidad criptográfica indiscutible.
 * @dev Implementación ERC-1155 autónoma (sin dependencias externas). Compatible con BSC Mainnet.
 *      Flujo de compra: investor.approve(thisContract, amount) → investor.purchaseShares(tokenId, count)
 */

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface IERC1155Receiver {
    function onERC1155Received(address operator, address from, uint256 id, uint256 value, bytes calldata data)
        external returns (bytes4);
    function onERC1155BatchReceived(address operator, address from, uint256[] calldata ids, uint256[] calldata values, bytes calldata data)
        external returns (bytes4);
}

/**
 * @dev Implementación mínima y auditada del estándar ERC-1155 (EIP-1155).
 */
contract HOLD3R_ERC1155 {

    // ─── ERC-1155 Storage ───────────────────────────────────────────────────
    // tokenId => (owner => balance)
    mapping(uint256 => mapping(address => uint256)) private _balances;
    // owner => (operator => approved)
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // ─── HOLD3R RWA Storage ──────────────────────────────────────────────────
    address public owner;
    address public treasuryAddress;
    IERC20  public immutable usdtToken;

    struct AssetInfo {
        uint256 tokenId;
        string  title;
        uint256 pricePerShareUsdt; // In USDT with 18 decimals (BEP20)
        uint256 maxShares;
        uint256 soldShares;
        bool    isActive;
    }

    mapping(uint256 => AssetInfo) public assets;
    uint256[] public registeredTokenIds;

    // investor => tokenId[] de activos adquiridos
    mapping(address => uint256[]) public investorTokenIds;

    // ─── Eventos ERC-1155 Estándar (EIP-1155) ────────────────────────────────
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event URI(string value, uint256 indexed id);

    // ─── Eventos HOLD3R Propietarios ─────────────────────────────────────────
    event AssetRegistered(
        uint256 indexed tokenId,
        string  title,
        uint256 pricePerShareUsdt,
        uint256 maxShares
    );
    event SharesPurchased(
        uint256 indexed tokenId,
        address indexed investor,
        uint256 shareCount,
        uint256 totalCostUsdt,
        uint256 timestamp
    );
    event TreasuryUpdated(address indexed newTreasury);
    event AssetStatusUpdated(uint256 indexed tokenId, bool isActive);

    // ─── Modificadores ───────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "HOLD3R: Solo el administrador puede ejecutar esta accion.");
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────────
    /**
     * @param _usdtAddress Dirección del contrato USDT BEP20 (0x55d398326f99059fF775485246999027B3197955)
     * @param _treasury    Dirección de la Tesorería Oficial HOLD3R (0x72D45C3d8147D3225C841C1f92D73D3F9A6A85a7)
     */
    constructor(address _usdtAddress, address _treasury) {
        require(_usdtAddress != address(0), "HOLD3R: USDT address invalida.");
        require(_treasury    != address(0), "HOLD3R: Treasury address invalida.");
        owner           = msg.sender;
        usdtToken       = IERC20(_usdtAddress);
        treasuryAddress = _treasury;
    }

    // ─── Administración ──────────────────────────────────────────────────────

    /**
     * @notice Registra un nuevo activo RWA con su Token ID único.
     * @param tokenId           Identificador numérico único del token (ej. 1 = Runner TRD, 2 = Oficina Caracas)
     * @param title             Nombre descriptivo del activo
     * @param pricePerShareUsdt Precio por fracción en USDT (con 18 decimales, ej. 100 USDT = 100 * 1e18)
     * @param maxShares         Número máximo de fracciones disponibles para este activo
     */
    function registerAsset(
        uint256 tokenId,
        string  calldata title,
        uint256 pricePerShareUsdt,
        uint256 maxShares
    ) external onlyOwner {
        require(tokenId > 0,                             "HOLD3R: TokenId debe ser mayor a 0.");
        require(assets[tokenId].tokenId == 0,            "HOLD3R: TokenId ya registrado.");
        require(pricePerShareUsdt > 0,                   "HOLD3R: Precio por fraccion invalido.");
        require(maxShares > 0,                           "HOLD3R: Maximo de fracciones invalido.");
        require(bytes(title).length > 0,                 "HOLD3R: Titulo invalido.");

        assets[tokenId] = AssetInfo({
            tokenId:           tokenId,
            title:             title,
            pricePerShareUsdt: pricePerShareUsdt,
            maxShares:         maxShares,
            soldShares:        0,
            isActive:          true
        });

        registeredTokenIds.push(tokenId);
        emit AssetRegistered(tokenId, title, pricePerShareUsdt, maxShares);
    }

    /**
     * @notice Actualiza la dirección de Tesorería Oficial HOLD3R.
     */
    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "HOLD3R: Direccion invalida.");
        treasuryAddress = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /**
     * @notice Activa o desactiva la venta de fracciones de un activo.
     */
    function setAssetStatus(uint256 tokenId, bool isActive) external onlyOwner {
        require(assets[tokenId].tokenId != 0, "HOLD3R: Activo no registrado.");
        assets[tokenId].isActive = isActive;
        emit AssetStatusUpdated(tokenId, isActive);
    }

    // ─── Compra de Fracciones (Core Flow) ────────────────────────────────────

    /**
     * @notice Compra `shareCount` fracciones del activo con tokenId especificado.
     *
     * PRE-REQUISITO: El inversor debe haber aprobado previamente este contrato para gastar USDT:
     *   usdtToken.approve(address(this), totalCost)
     *
     * @param tokenId    Token ID del activo a adquirir (debe estar registrado y activo)
     * @param shareCount Cantidad de fracciones a comprar (>= 1)
     * @return           true si la compra fue exitosa
     *
     * Emite: SharesPurchased, TransferSingle
     */
    function purchaseShares(uint256 tokenId, uint256 shareCount) external returns (bool) {
        AssetInfo storage asset = assets[tokenId];

        require(asset.tokenId != 0,                                  "HOLD3R: Activo no registrado.");
        require(asset.isActive,                                      "HOLD3R: Activo no disponible para compra.");
        require(shareCount > 0,                                      "HOLD3R: shareCount debe ser mayor a 0.");
        require(asset.soldShares + shareCount <= asset.maxShares,    "HOLD3R: Fracciones insuficientes disponibles.");

        uint256 totalCost = shareCount * asset.pricePerShareUsdt;

        require(usdtToken.balanceOf(msg.sender) >= totalCost,
            "HOLD3R: Saldo USDT insuficiente en tu billetera.");
        require(usdtToken.allowance(msg.sender, address(this)) >= totalCost,
            "HOLD3R: Debes aprobar el contrato HOLD3R para gastar tus USDT antes de comprar.");

        // Transferir USDT del inversor a la Tesorería Oficial HOLD3R
        bool ok = usdtToken.transferFrom(msg.sender, treasuryAddress, totalCost);
        require(ok, "HOLD3R: Fallo en la transferencia de USDT a la Tesoreria.");

        // Registrar primer activo para el inversor
        if (_balances[tokenId][msg.sender] == 0) {
            investorTokenIds[msg.sender].push(tokenId);
        }

        // Actualizar contabilidad on-chain
        asset.soldShares += shareCount;

        // Emitir tokens ERC-1155 al inversor (mint)
        _mint(msg.sender, tokenId, shareCount);

        emit SharesPurchased(tokenId, msg.sender, shareCount, totalCost, block.timestamp);
        return true;
    }

    // ─── Vistas de Consulta ──────────────────────────────────────────────────

    /**
     * @notice Retorna las fracciones poseídas por un inversor en un activo.
     */
    function getInvestorShares(uint256 tokenId, address investor) external view returns (uint256) {
        return _balances[tokenId][investor];
    }

    /**
     * @notice Retorna la lista de tokenIds que posee un inversor.
     */
    function getInvestorPortfolio(address investor) external view returns (uint256[] memory) {
        return investorTokenIds[investor];
    }

    /**
     * @notice Calcula el costo total de `shareCount` fracciones del activo.
     */
    function calculateCost(uint256 tokenId, uint256 shareCount) external view returns (uint256) {
        require(assets[tokenId].tokenId != 0, "HOLD3R: Activo no registrado.");
        return shareCount * assets[tokenId].pricePerShareUsdt;
    }

    /**
     * @notice Retorna las fracciones disponibles restantes de un activo.
     */
    function availableShares(uint256 tokenId) external view returns (uint256) {
        AssetInfo storage a = assets[tokenId];
        if (a.tokenId == 0 || !a.isActive) return 0;
        return a.maxShares - a.soldShares;
    }

    // ─── ERC-1155 Standard Implementation ────────────────────────────────────

    function balanceOf(address account, uint256 id) public view returns (uint256) {
        require(account != address(0), "ERC1155: address cero.");
        return _balances[id][account];
    }

    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids)
        external view returns (uint256[] memory)
    {
        require(accounts.length == ids.length, "ERC1155: longitudes distintas.");
        uint256[] memory batchBalances = new uint256[](accounts.length);
        for (uint256 i = 0; i < accounts.length; ++i) {
            batchBalances[i] = balanceOf(accounts[i], ids[i]);
        }
        return batchBalances;
    }

    function setApprovalForAll(address operator, bool approved) external {
        require(msg.sender != operator, "ERC1155: auto-aprobacion invalida.");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address account, address operator) public view returns (bool) {
        return _operatorApprovals[account][operator];
    }

    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external {
        require(to != address(0),                                          "ERC1155: destino address cero.");
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "ERC1155: no autorizado.");
        require(_balances[id][from] >= amount,                             "ERC1155: saldo insuficiente.");

        _balances[id][from]  -= amount;
        _balances[id][to]    += amount;
        emit TransferSingle(msg.sender, from, to, id, amount);
        _checkOnERC1155Received(msg.sender, from, to, id, amount, data);
    }

    function safeBatchTransferFrom(
        address from, address to,
        uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data
    ) external {
        require(to != address(0),                                          "ERC1155: destino address cero.");
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "ERC1155: no autorizado.");
        require(ids.length == amounts.length,                              "ERC1155: longitudes distintas.");

        for (uint256 i = 0; i < ids.length; ++i) {
            require(_balances[ids[i]][from] >= amounts[i], "ERC1155: saldo insuficiente.");
            _balances[ids[i]][from]  -= amounts[i];
            _balances[ids[i]][to]    += amounts[i];
        }
        emit TransferBatch(msg.sender, from, to, ids, amounts);
        _checkOnERC1155BatchReceived(msg.sender, from, to, ids, amounts, data);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0xd9b67a26 // ERC-1155
            || interfaceId == 0x01ffc9a7; // ERC-165
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────────

    function _mint(address to, uint256 id, uint256 amount) internal {
        require(to != address(0), "ERC1155: mint a address cero.");
        _balances[id][to] += amount;
        emit TransferSingle(msg.sender, address(0), to, id, amount);
        _checkOnERC1155Received(msg.sender, address(0), to, id, amount, "");
    }

    function _checkOnERC1155Received(address operator, address from, address to, uint256 id, uint256 amount, bytes memory data) internal {
        if (_isContract(to)) {
            try IERC1155Receiver(to).onERC1155Received(operator, from, id, amount, data) returns (bytes4 response) {
                require(response == IERC1155Receiver.onERC1155Received.selector, "ERC1155: receptor rechazo el token.");
            } catch {
                revert("ERC1155: transferencia a receptor no-ERC1155.");
            }
        }
    }

    function _checkOnERC1155BatchReceived(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) internal {
        if (_isContract(to)) {
            try IERC1155Receiver(to).onERC1155BatchReceived(operator, from, ids, amounts, data) returns (bytes4 response) {
                require(response == IERC1155Receiver.onERC1155BatchReceived.selector, "ERC1155: receptor rechazo el batch.");
            } catch {
                revert("ERC1155: transferencia batch a receptor no-ERC1155.");
            }
        }
    }

    function _isContract(address addr) internal view returns (bool) {
        uint256 size;
        assembly { size := extcodesize(addr) }
        return size > 0;
    }
}
