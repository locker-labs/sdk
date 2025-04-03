// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

import {BasePlugin} from "@modular-account/plugins/BasePlugin.sol";
import {IPluginExecutor} from "@modular-account/interfaces/IPluginExecutor.sol";
import {IStandardExecutor} from "@modular-account/interfaces/IStandardExecutor.sol";
import {
    ManifestFunction,
    ManifestExecutionHook,
    ManifestAssociatedFunctionType,
    ManifestAssociatedFunction,
    PluginManifest,
    PluginMetadata,
    IPlugin
} from "@modular-account/interfaces/IPlugin.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {UserOperation} from "@modular-account/interfaces/erc4337/UserOperation.sol";
import {SIG_VALIDATION_PASSED} from "@modular-account/libraries/Constants.sol";

/// @title Split Plugin
/// @author Locker
/// @notice This plugin lets users automatically split tokens on any executoin.
contract SplitPlugin is BasePlugin {
    string public constant NAME = "Split Plugin";
    string public constant VERSION = "0.0.1";
    string public constant AUTHOR = "Locker";

    // Dependency indices for using the MultiOwner plugin for validation.
    uint256 internal constant _MANIFEST_DEPENDENCY_INDEX_OWNER_RUNTIME_VALIDATION = 0;
    uint256 internal constant _MANIFEST_DEPENDENCY_INDEX_OWNER_USER_OP_VALIDATION = 1;

    // Split config consts
    uint8 internal constant MAX_TOKEN_CONFIGS = 5;
    uint8 internal constant MAX_SPLIT_RECIPIENTS = 10;
    uint32 internal constant MAX_PERCENTAGE = 10000000;

    struct SplitConfig {
        address tokenAddress; // tokenAddress to be split
        address[] splitAddresses; // receiver addresses of the split
        uint32[] percentages; // respective percentages of each splitAddress
        bool isSplitEnabled; // execute split in postExec hook
    }

    event SplitConfigCreated(address indexed user, uint256 indexed configIndex);
    event SplitExecuted(uint256 indexed configIndex);
    event SplitConfigDeleted(uint256 indexed configIndex);
    event AutomationSwitched(uint256 indexed configIndex, bool currentState);

    mapping(address => uint256[]) public splitConfigIndexes;
    mapping(uint256 => SplitConfig) public splitConfigs;
    uint256 public splitConfigCount;

    /// @dev Creates a split configuration for the user
    function createSplit(address _tokenAddress, address[] memory _splitAddresses, uint32[] memory _percentages)
        public
    {
        require(_splitAddresses.length > 0, "SplitPlugin: No split addresses provided");
        require(_splitAddresses.length < MAX_TOKEN_CONFIGS, "SplitPlugin: Split addresses limit exceeded");
        require(
            _splitAddresses.length == _percentages.length,
            "SplitPlugin: Number of split addresses and percentages must be the same"
        );
        uint256[] storage userIndexes = splitConfigIndexes[msg.sender];
        require(userIndexes.length < MAX_SPLIT_RECIPIENTS, "SplitPlugin: Number of split addresses limit reached");
        for (uint256 i = 0; i < userIndexes.length; i++) {
            if (splitConfigs[userIndexes[i]].tokenAddress == _tokenAddress) {
                revert("SplitPlugin: Config for token already exists");
            }
        }

        uint64 totalPercentage = 0;
        for (uint8 i = 0; i < _percentages.length; i++) {
            totalPercentage += _percentages[i];
        }
        require(totalPercentage == MAX_PERCENTAGE, "SplitPlugin: Invalid percentages");
        uint256 currentSplitConfigIndex = splitConfigCount;
        splitConfigCount++;
        SplitConfig memory config = SplitConfig(_tokenAddress, _splitAddresses, _percentages, true);

        userIndexes.push(currentSplitConfigIndex);
        splitConfigs[currentSplitConfigIndex] = config;

        emit SplitConfigCreated(msg.sender, currentSplitConfigIndex);
    }

    /// @dev Pauses the automation for the given split config
    function toggleIsSplitEnabled(uint256 _configIndex) external {
        require(isSplitCreator(_configIndex, msg.sender), "SplitPlugin: Only the creator can toggle the automation");
        SplitConfig storage config = splitConfigs[_configIndex];
        bool automationState = config.isSplitEnabled;
        config.isSplitEnabled = !automationState;

        emit AutomationSwitched(_configIndex, !automationState);
    }

    /// @dev Splits the token balance of the user for a config
    function split(uint256 _configIndex) public {
        SplitConfig memory config = splitConfigs[_configIndex];
        IERC20 token = IERC20(config.tokenAddress);
        uint256 totalSplitAmount = token.balanceOf(address(msg.sender));
        if (!config.isSplitEnabled) {
            return;
        }

        for (uint256 i = 0; i < config.splitAddresses.length; i++) {
            uint256 minTokenAmount = MAX_PERCENTAGE / config.percentages[i];
            require(
                minTokenAmount < totalSplitAmount,
                "SplitPlugin: Not enough tokens to split"
            );
            uint256 amount = (totalSplitAmount * config.percentages[i]) / MAX_PERCENTAGE;
            IPluginExecutor(msg.sender).executeFromPluginExternal(
                config.tokenAddress,
                0,
                abi.encodeWithSelector(IERC20.transfer.selector, config.splitAddresses[i], amount)
            );
        }

        emit SplitExecuted(_configIndex);
    }

    /// @dev Updates the split limit for the given split config
    function updateSplitConfig(uint256 _configIndex, address[] memory _splitAddresses, uint32[] memory _percentages)
        external
    {
        require(isSplitCreator(_configIndex, msg.sender), "SplitPlugin: Only the creator can update the split config");

        uint64 totalPercentage = 0;
        for (uint8 i = 0; i < _percentages.length; i++) {
            totalPercentage += _percentages[i];
        }
        require(totalPercentage == MAX_PERCENTAGE, "SplitPlugin: Invalid percentages");
        require(
            _splitAddresses.length == _percentages.length,
            "SplitPlugin: Number of split addresses and percentages must be the same"
        );

        SplitConfig storage config = splitConfigs[_configIndex];
        config.splitAddresses = _splitAddresses;
        config.percentages = _percentages;
    }

    /// @dev Deletes the split config and removes the index from the user's splitConfigIndexes
    function deleteSplitConfig(uint256 _configIndex) external {
        uint256[] storage userIndexes = splitConfigIndexes[msg.sender];
        for (uint8 i = 0; i < userIndexes.length; i++) {
            if (_configIndex == userIndexes[i]) {
                userIndexes[i] = userIndexes[userIndexes.length - 1];
                userIndexes.pop();
                delete splitConfigs[_configIndex];
                emit SplitConfigDeleted(_configIndex);
                return;
            }
        }
    }

    /// @dev Checks if the given address is the creator of the split config
    function isSplitCreator(uint256 _configIndex, address _splitCreator) public view returns (bool) {
        bool isCreator = false;
        uint256[] memory splitIndexes = splitConfigIndexes[_splitCreator];
        for (uint8 i = 0; i < splitIndexes.length; i++) {
            if (_configIndex == splitIndexes[i]) {
                isCreator = true;
                return isCreator;
            }
        }
        return isCreator;
    }

    function getSplitConfig(uint256 _configIndex)
        external
        view
        returns (
            address tokenAddress,
            address[] memory splitAddresses,
            uint32[] memory percentages,
            bool isSplitEnabled
        )
    {
        SplitConfig memory config = splitConfigs[_configIndex];
        return (config.tokenAddress, config.splitAddresses, config.percentages, config.isSplitEnabled);
    }

    /// @dev Returns the split config indexes for the user
    function getSplitIndexes(address _user) external view returns (uint256[] memory) {
        return splitConfigIndexes[_user];
    }

    function _onInstall(bytes calldata data) internal override {
        (address tokenAddress, address[] memory splitAddresses, uint32[] memory percentages) =
            abi.decode(data, (address, address[], uint32[]));
        createSplit(tokenAddress, splitAddresses, percentages);
    }

    function onUninstall(bytes calldata) external override {
        delete splitConfigIndexes[msg.sender];
    }

    function postExecutionHook(uint8, bytes calldata) external virtual override {
        uint256[] memory configIndexes = splitConfigIndexes[msg.sender];
        if (configIndexes.length == 0) {
            return;
        }
        for (uint256 i = 0; i < configIndexes.length; i++) {
            split(configIndexes[i]);
        }
    }

    /// @notice This function is overridden solely to satisfy the BasePlugin interface.
    /// @dev Since validation is delegated to the MultiOwner plugin, this function should never be called.
    function userOpValidationFunction(
        uint8, // functionId
        UserOperation calldata, // userOp
        bytes32 // userOpHash
    ) external pure override returns (uint256) {
        revert("SplitPlugin: use dependency for validation");
    }

    /// @notice Plugin manifest describing this plugin's functions and validations.
    /// @dev The manifest delegates both userOp and runtime validation to a dependency at index 0.
    function pluginManifest() external pure override returns (PluginManifest memory manifest) {
        // Declare two dependencies.
        manifest.dependencyInterfaceIds = new bytes4[](2);
        manifest.dependencyInterfaceIds[_MANIFEST_DEPENDENCY_INDEX_OWNER_RUNTIME_VALIDATION] = type(IPlugin).interfaceId;
        manifest.dependencyInterfaceIds[_MANIFEST_DEPENDENCY_INDEX_OWNER_USER_OP_VALIDATION] = type(IPlugin).interfaceId;

        // List the execution functions provided by this plugin.
        manifest.executionFunctions = new bytes4[](5);
        manifest.executionFunctions[0] = this.createSplit.selector;
        manifest.executionFunctions[1] = this.toggleIsSplitEnabled.selector;
        manifest.executionFunctions[2] = this.split.selector;
        manifest.executionFunctions[3] = this.updateSplitConfig.selector;
        manifest.executionFunctions[4] = this.deleteSplitConfig.selector;

        // Delegate user operation validation to the dependency in slot 1.
        manifest.userOpValidationFunctions = new ManifestAssociatedFunction[](5);
        manifest.userOpValidationFunctions[0] = ManifestAssociatedFunction({
            executionSelector: this.createSplit.selector,
            associatedFunction: ManifestFunction({
                functionType: ManifestAssociatedFunctionType.DEPENDENCY,
                functionId: 0,
                dependencyIndex: _MANIFEST_DEPENDENCY_INDEX_OWNER_USER_OP_VALIDATION
            })
        });
        manifest.userOpValidationFunctions[1] = ManifestAssociatedFunction({
            executionSelector: this.toggleIsSplitEnabled.selector,
            associatedFunction: ManifestFunction({
                functionType: ManifestAssociatedFunctionType.DEPENDENCY,
                functionId: 0,
                dependencyIndex: _MANIFEST_DEPENDENCY_INDEX_OWNER_USER_OP_VALIDATION
            })
        });
        manifest.userOpValidationFunctions[2] = ManifestAssociatedFunction({
            executionSelector: this.split.selector,
            associatedFunction: ManifestFunction({
                functionType: ManifestAssociatedFunctionType.DEPENDENCY,
                functionId: 0,
                dependencyIndex: _MANIFEST_DEPENDENCY_INDEX_OWNER_USER_OP_VALIDATION
            })
        });
        manifest.userOpValidationFunctions[3] = ManifestAssociatedFunction({
            executionSelector: this.updateSplitConfig.selector,
            associatedFunction: ManifestFunction({
                functionType: ManifestAssociatedFunctionType.DEPENDENCY,
                functionId: 0,
                dependencyIndex: _MANIFEST_DEPENDENCY_INDEX_OWNER_USER_OP_VALIDATION
            })
        });
        manifest.userOpValidationFunctions[4] = ManifestAssociatedFunction({
            executionSelector: this.deleteSplitConfig.selector,
            associatedFunction: ManifestFunction({
                functionType: ManifestAssociatedFunctionType.DEPENDENCY,
                functionId: 0,
                dependencyIndex: _MANIFEST_DEPENDENCY_INDEX_OWNER_USER_OP_VALIDATION
            })
        });

        ManifestFunction memory preExecution =
            ManifestFunction({functionType: ManifestAssociatedFunctionType.NONE, functionId: 0, dependencyIndex: 0});

        ManifestFunction memory postExecution =
            ManifestFunction({functionType: ManifestAssociatedFunctionType.SELF, functionId: 0, dependencyIndex: 0});

        manifest.executionHooks = new ManifestExecutionHook[](1);
        manifest.executionHooks[0] = ManifestExecutionHook({
            executionSelector: IStandardExecutor.execute.selector,
            preExecHook: preExecution,
            postExecHook: postExecution
        });

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
