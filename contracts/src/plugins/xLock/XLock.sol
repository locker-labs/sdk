// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {BasePlugin} from "@modular-account/plugins/BasePlugin.sol";
import {
    ManifestFunction,
    ManifestExecutionHook,
    ManifestAssociatedFunctionType,
    ManifestAssociatedFunction,
    PluginManifest,
    PluginMetadata,
    IPlugin
} from "@modular-account/interfaces/IPlugin.sol";
import {IPluginExecutor} from "@modular-account/interfaces/IPluginExecutor.sol";

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@delegation/DelegationManager.sol";




contract XLock is BasePlugin {
    using ECDSA for bytes32;

    string public constant NAME = "XLock Plugin";
    string public constant VERSION = "0.1.0";
    string public constant AUTHOR = "Locker";

    // Dependency indices for using the MultiOwner plugin for validation.
    uint256 internal constant _MANIFEST_DEPENDENCY_INDEX_OWNER_RUNTIME_VALIDATION = 0;
    uint256 internal constant _MANIFEST_DEPENDENCY_INDEX_OWNER_USER_OP_VALIDATION = 1;


    event XAddressSet(bytes xHandle, address indexed xAddress);
    event TrnxExecuted(address indexed sender, bytes xHandle);

    address public reclaimAddress;
    DelegationManager public delegationManager;
    address public xLockerWallet;
    mapping(bytes => address) public xAddresses;

    constructor(address _reclaimAddress, address _delegationManager) {
        reclaimAddress = _reclaimAddress;
        delegationManager = DelegationManager(_delegationManager);
    }

    function setXLockerWallet(address _xLockerWallet) external {
        xLockerWallet = _xLockerWallet;
    }

     /**
     * @notice   Bind a “handle” (arbitrary bytes) to the signer address.
     * @param    xHandle    The raw handle data the user signed.
     */
    function setXAddress(
        bytes calldata xHandle
    ) external {
        xAddresses[xHandle] = msg.sender;
        emit XAddressSet(xHandle, msg.sender);
    }
    
    function onInstall(bytes calldata data) external virtual override {
    }

    function onUninstall(bytes calldata data) external virtual override {
    }

    function redeemAndBuyToken(
        uint8 ,
        bytes calldata xHandle,
        address tokenAddress,
        address tokenAmount,
        bytes[] calldata permissionContexts,
        ModeCode[] calldata modes,
        bytes[] calldata executionCallDatas
    ) external {
        // Redeem delegation and transfer ETH.
        delegationManager.redeemDelegations(permissionContexts, modes, executionCallDatas);


        emit TrnxExecuted(msg.sender, xHandle);
    }

    

    function pluginManifest() external pure override returns (PluginManifest memory manifest) {
        // Declare two dependencies.
        manifest.dependencyInterfaceIds = new bytes4[](2);
        manifest.dependencyInterfaceIds[_MANIFEST_DEPENDENCY_INDEX_OWNER_RUNTIME_VALIDATION] = type(IPlugin).interfaceId;
        manifest.dependencyInterfaceIds[_MANIFEST_DEPENDENCY_INDEX_OWNER_USER_OP_VALIDATION] = type(IPlugin).interfaceId;

        // List the execution functions provided by this plugin.
        manifest.executionFunctions = new bytes4[](3);
        manifest.executionFunctions[0] = this.redeemAndBuyToken.selector;
        manifest.executionFunctions[1] = this.setXAddress.selector;
        manifest.executionFunctions[2] = this.setXLockerWallet.selector;

        // Delegate user operation validation to the dependency in slot 1.
        manifest.userOpValidationFunctions = new ManifestAssociatedFunction[](3);
        manifest.userOpValidationFunctions[0] = ManifestAssociatedFunction({
            executionSelector: this.redeemAndBuyToken.selector,
            associatedFunction: ManifestFunction({
                functionType: ManifestAssociatedFunctionType.DEPENDENCY,
                functionId: 0,
                dependencyIndex: _MANIFEST_DEPENDENCY_INDEX_OWNER_USER_OP_VALIDATION
            })
        });
        manifest.userOpValidationFunctions[1] = ManifestAssociatedFunction({
            executionSelector: this.setXAddress.selector,
            associatedFunction: ManifestFunction({
                functionType: ManifestAssociatedFunctionType.DEPENDENCY,
                functionId: 0,
                dependencyIndex: _MANIFEST_DEPENDENCY_INDEX_OWNER_USER_OP_VALIDATION
            })
        });
        manifest.userOpValidationFunctions[2] = ManifestAssociatedFunction({
            executionSelector: this.setXLockerWallet.selector,
            associatedFunction: ManifestFunction({
                functionType: ManifestAssociatedFunctionType.DEPENDENCY,
                functionId: 0,
                dependencyIndex: _MANIFEST_DEPENDENCY_INDEX_OWNER_USER_OP_VALIDATION
            })
        });

        manifest.executionHooks = new ManifestExecutionHook[](0);

        // We do not use runtime validation, so leave these arrays empty.
        manifest.runtimeValidationFunctions = new ManifestAssociatedFunction[](0);
        manifest.preRuntimeValidationHooks = new ManifestAssociatedFunction[](0);

        // Set permissions.
        manifest.permitAnyExternalAddress = true;
        manifest.canSpendNativeToken = true;
        manifest.permittedExecutionSelectors = new bytes4[](0);

        return manifest;
    }

    function pluginMetadata() external pure virtual override returns (PluginMetadata memory) {
        PluginMetadata memory metadata;
        metadata.name = NAME;
        metadata.version = VERSION;
        metadata.author = AUTHOR;
        return metadata;
    }

}