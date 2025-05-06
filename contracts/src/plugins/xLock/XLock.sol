// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

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
    address public xLockerWallet;
    mapping(bytes => address) public xAddresses;

    constructor(address _reclaimAddress) {
        reclaimAddress = _reclaimAddress;
    }

    function setXLockerWallet(address _xLockerWallet) external {
        xLockerWallet = _xLockerWallet;
    }

     /**
     * @notice   Bind a “handle” (arbitrary bytes) to the signer address.
     * @param    xHandle    The raw handle data the user signed.
     * @param    signature  The EIP-191 signature over `xHandle`.
     */
    function setXAddress(
        bytes calldata xHandle,
        bytes calldata signature
    ) external {
        // 1) Recreate the signed message hash:
        //    “\x19Ethereum Signed Message:\n<length>” + xHandle
        bytes32 digest = ECDSA.toEthSignedMessageHash(xHandle);

        // 2) Recover the address that signed it:
        address signer = ECDSA.recover(digest, signature);
        require(signer != address(0), "XLock: invalid signature");

        // 4) Store and emit
        xAddresses[xHandle] = signer;
        emit XAddressSet(xHandle, signer);
    }
    
    function onInstall(bytes calldata data) external virtual override {
    }

    function onUninstall(bytes calldata data) external virtual override {
    }

    function executeXTrnx(
        uint8 ,
        bytes calldata xHandle,
        address target,
        uint256 value,
        bytes calldata data
    ) external {
        // 1) Verify proof, extract xHandle & expected userOpHash from tweet JSON, then
        // check that keccak256(userOps) matches what was in the tweet before executing.
        // Reclaim(reclaimAddress).verifyProof(proof);

        // 2) Pull out JSON context from the first proof
        // string memory ctx = proof.claimInfo.context;

        // 3) Extract the xHandle (if you still need it for event/logging)
        // string memory handleStr = Claims.extractFieldFromContext(ctx, '"xHandle":"');
        // bytes memory xHandle = bytes(handleStr);

        // 2) Verify xHandle with the Reclaim contract

        // require(xAddresses[xHandle] != address(0), "XLock: xHandle not set");



        IPluginExecutor(xLockerWallet).executeFromPluginExternal(
                    target,
                    value,
                    data);

        emit TrnxExecuted(msg.sender, xHandle);
    }


    function pluginManifest() external pure override returns (PluginManifest memory manifest) {
        // Declare two dependencies.
        manifest.dependencyInterfaceIds = new bytes4[](2);
        manifest.dependencyInterfaceIds[_MANIFEST_DEPENDENCY_INDEX_OWNER_RUNTIME_VALIDATION] = type(IPlugin).interfaceId;
        manifest.dependencyInterfaceIds[_MANIFEST_DEPENDENCY_INDEX_OWNER_USER_OP_VALIDATION] = type(IPlugin).interfaceId;

        // List the execution functions provided by this plugin.
        manifest.executionFunctions = new bytes4[](2);
        manifest.executionFunctions[0] = this.executeXTrnx.selector;
        manifest.executionFunctions[1] = this.setXAddress.selector;

        // Delegate user operation validation to the dependency in slot 1.
        manifest.userOpValidationFunctions = new ManifestAssociatedFunction[](2);
        manifest.userOpValidationFunctions[0] = ManifestAssociatedFunction({
            executionSelector: this.executeXTrnx.selector,
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