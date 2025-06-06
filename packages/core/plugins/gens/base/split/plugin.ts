import {
  getContract,
  encodePacked,
  encodeAbiParameters,
  encodeFunctionData,
  type Address,
  type GetContractReturnType,
  type Transport,
  type PublicClient,
  type Client,
  type EncodeFunctionDataParameters,
  type Chain,
  type Hex,
} from "viem";
import {
  ChainNotFoundError,
  AccountNotFoundError,
  isSmartAccountClient,
  IncompatibleClientError,
  type SmartContractAccount,
  type GetAccountParameter,
  type SendUserOperationResult,
  type GetEntryPointFromAccount,
  type UserOperationOverridesParameter,
  type UserOperationContext,
  type GetContextParameter,
} from "@aa-sdk/core";
import {
  installPlugin as installPlugin_,
  type Plugin,
  type FunctionReference,
} from "@account-kit/smart-contracts";
import { MultiOwnerPlugin } from "../multi-owner/plugin.js";

type ExecutionActions<
  TAccount extends SmartContractAccount | undefined =
    | SmartContractAccount
    | undefined,
  TContext extends UserOperationContext | undefined =
    | UserOperationContext
    | undefined,
  TEntryPointVersion extends
    GetEntryPointFromAccount<TAccount> = GetEntryPointFromAccount<TAccount>,
> = {
  createSplit: (
    args: Pick<
      EncodeFunctionDataParameters<
        typeof SplitPluginExecutionFunctionAbi,
        "createSplit"
      >,
      "args"
    > &
      UserOperationOverridesParameter<TEntryPointVersion> &
      GetAccountParameter<TAccount> &
      GetContextParameter<TContext>,
  ) => Promise<SendUserOperationResult<TEntryPointVersion>>;

  toggleIsSplitEnabled: (
    args: Pick<
      EncodeFunctionDataParameters<
        typeof SplitPluginExecutionFunctionAbi,
        "toggleIsSplitEnabled"
      >,
      "args"
    > &
      UserOperationOverridesParameter<TEntryPointVersion> &
      GetAccountParameter<TAccount> &
      GetContextParameter<TContext>,
  ) => Promise<SendUserOperationResult<TEntryPointVersion>>;

  split: (
    args: Pick<
      EncodeFunctionDataParameters<
        typeof SplitPluginExecutionFunctionAbi,
        "split"
      >,
      "args"
    > &
      UserOperationOverridesParameter<TEntryPointVersion> &
      GetAccountParameter<TAccount> &
      GetContextParameter<TContext>,
  ) => Promise<SendUserOperationResult<TEntryPointVersion>>;

  updateSplitConfig: (
    args: Pick<
      EncodeFunctionDataParameters<
        typeof SplitPluginExecutionFunctionAbi,
        "updateSplitConfig"
      >,
      "args"
    > &
      UserOperationOverridesParameter<TEntryPointVersion> &
      GetAccountParameter<TAccount> &
      GetContextParameter<TContext>,
  ) => Promise<SendUserOperationResult<TEntryPointVersion>>;

  deleteSplitConfig: (
    args: Pick<
      EncodeFunctionDataParameters<
        typeof SplitPluginExecutionFunctionAbi,
        "deleteSplitConfig"
      >,
      "args"
    > &
      UserOperationOverridesParameter<TEntryPointVersion> &
      GetAccountParameter<TAccount> &
      GetContextParameter<TContext>,
  ) => Promise<SendUserOperationResult<TEntryPointVersion>>;
};

type InstallArgs = [
  { type: "address"; name: "tokenAddess" },
  { type: "address[]"; name: "splitAddresses" },
  { type: "uint256[]"; name: "percentages" },
];

export type InstallSplitPluginParams = {
  args: Parameters<typeof encodeAbiParameters<InstallArgs>>[1];
  pluginAddress?: Address;
  dependencyOverrides?: FunctionReference[];
};

type ManagementActions<
  TAccount extends SmartContractAccount | undefined =
    | SmartContractAccount
    | undefined,
  TContext extends UserOperationContext | undefined =
    | Record<string, any>
    | undefined,
  TEntryPointVersion extends
    GetEntryPointFromAccount<TAccount> = GetEntryPointFromAccount<TAccount>,
> = {
  installSplitPlugin: (
    args: UserOperationOverridesParameter<TEntryPointVersion> &
      InstallSplitPluginParams &
      GetAccountParameter<TAccount> &
      GetContextParameter<TContext>,
  ) => Promise<SendUserOperationResult<TEntryPointVersion>>;
};

type ReadAndEncodeActions = {
  encodeCreateSplit: (
    args: Pick<
      EncodeFunctionDataParameters<
        typeof SplitPluginExecutionFunctionAbi,
        "createSplit"
      >,
      "args"
    >,
  ) => Hex;

  encodeToggleIsSplitEnabled: (
    args: Pick<
      EncodeFunctionDataParameters<
        typeof SplitPluginExecutionFunctionAbi,
        "toggleIsSplitEnabled"
      >,
      "args"
    >,
  ) => Hex;

  encodeSplit: (
    args: Pick<
      EncodeFunctionDataParameters<
        typeof SplitPluginExecutionFunctionAbi,
        "split"
      >,
      "args"
    >,
  ) => Hex;

  encodeUpdateSplitConfig: (
    args: Pick<
      EncodeFunctionDataParameters<
        typeof SplitPluginExecutionFunctionAbi,
        "updateSplitConfig"
      >,
      "args"
    >,
  ) => Hex;

  encodeDeleteSplitConfig: (
    args: Pick<
      EncodeFunctionDataParameters<
        typeof SplitPluginExecutionFunctionAbi,
        "deleteSplitConfig"
      >,
      "args"
    >,
  ) => Hex;
};

export type SplitPluginActions<
  TAccount extends SmartContractAccount | undefined =
    | SmartContractAccount
    | undefined,
  TContext extends UserOperationContext | undefined =
    | UserOperationContext
    | undefined,
> = ExecutionActions<TAccount, TContext> &
  ManagementActions<TAccount, TContext> &
  ReadAndEncodeActions;

const addresses = {
  8453: "0xF5B538fA17c71Cd12214c5F93E3e31AC153a29De" as Address,
  84532: "0xFedEC60E1314501378e3cb313A50F5AbDDbda11b" as Address,
  11155111: "0xa73840181f066Da4D17AAee5bf932d2B5b97d54b" as Address,
} as Record<number, Address>;

export const SplitPlugin: Plugin<typeof SplitPluginAbi> = {
  meta: {
    name: "Split Plugin",
    version: "0.0.1",
    addresses,
  },
  getContract: <C extends Client>(
    client: C,
    address?: Address,
  ): GetContractReturnType<typeof SplitPluginAbi, PublicClient, Address> => {
    if (!client.chain) throw new ChainNotFoundError();

    return getContract({
      address: address || addresses[client.chain.id],
      abi: SplitPluginAbi,
      client: client,
    }) as GetContractReturnType<typeof SplitPluginAbi, PublicClient, Address>;
  },
};

export const splitPluginActions: <
  TTransport extends Transport = Transport,
  TChain extends Chain | undefined = Chain | undefined,
  TAccount extends SmartContractAccount | undefined =
    | SmartContractAccount
    | undefined,
  TContext extends UserOperationContext | undefined =
    | UserOperationContext
    | undefined,
>(
  client: Client<TTransport, TChain, TAccount>,
) => SplitPluginActions<TAccount, TContext> = (client) => ({
  createSplit({ args, overrides, context, account = client.account }) {
    if (!account) {
      throw new AccountNotFoundError();
    }
    if (!isSmartAccountClient(client)) {
      throw new IncompatibleClientError(
        "SmartAccountClient",
        "createSplit",
        client,
      );
    }

    const uo = encodeFunctionData({
      abi: SplitPluginExecutionFunctionAbi,
      functionName: "createSplit",
      args,
    });

    return client.sendUserOperation({ uo, overrides, account, context });
  },
  toggleIsSplitEnabled({ args, overrides, context, account = client.account }) {
    if (!account) {
      throw new AccountNotFoundError();
    }
    if (!isSmartAccountClient(client)) {
      throw new IncompatibleClientError(
        "SmartAccountClient",
        "toggleIsSplitEnabled",
        client,
      );
    }

    const uo = encodeFunctionData({
      abi: SplitPluginExecutionFunctionAbi,
      functionName: "toggleIsSplitEnabled",
      args,
    });

    return client.sendUserOperation({ uo, overrides, account, context });
  },
  split({ args, overrides, context, account = client.account }) {
    if (!account) {
      throw new AccountNotFoundError();
    }
    if (!isSmartAccountClient(client)) {
      throw new IncompatibleClientError("SmartAccountClient", "split", client);
    }

    const uo = encodeFunctionData({
      abi: SplitPluginExecutionFunctionAbi,
      functionName: "split",
      args,
    });

    return client.sendUserOperation({ uo, overrides, account, context });
  },
  updateSplitConfig({ args, overrides, context, account = client.account }) {
    if (!account) {
      throw new AccountNotFoundError();
    }
    if (!isSmartAccountClient(client)) {
      throw new IncompatibleClientError(
        "SmartAccountClient",
        "updateSplitConfig",
        client,
      );
    }

    const uo = encodeFunctionData({
      abi: SplitPluginExecutionFunctionAbi,
      functionName: "updateSplitConfig",
      args,
    });

    return client.sendUserOperation({ uo, overrides, account, context });
  },
  deleteSplitConfig({ args, overrides, context, account = client.account }) {
    if (!account) {
      throw new AccountNotFoundError();
    }
    if (!isSmartAccountClient(client)) {
      throw new IncompatibleClientError(
        "SmartAccountClient",
        "deleteSplitConfig",
        client,
      );
    }

    const uo = encodeFunctionData({
      abi: SplitPluginExecutionFunctionAbi,
      functionName: "deleteSplitConfig",
      args,
    });

    return client.sendUserOperation({ uo, overrides, account, context });
  },
  installSplitPlugin({
    account = client.account,
    overrides,
    context,
    ...params
  }) {
    if (!account) {
      throw new AccountNotFoundError();
    }

    if (!isSmartAccountClient(client)) {
      throw new IncompatibleClientError(
        "SmartAccountClient",
        "installSplitPlugin",
        client,
      );
    }

    const chain = client.chain;
    if (!chain) {
      throw new ChainNotFoundError();
    }

    const dependencies = params.dependencyOverrides ?? [
      (() => {
        const pluginAddress = MultiOwnerPlugin.meta.addresses[chain.id];
        if (!pluginAddress) {
          throw new Error(
            "missing MultiOwnerPlugin address for chain " + chain.name,
          );
        }

        return encodePacked(["address", "uint8"], [pluginAddress, 0x0]);
      })(),

      (() => {
        const pluginAddress = MultiOwnerPlugin.meta.addresses[chain.id];
        if (!pluginAddress) {
          throw new Error(
            "missing MultiOwnerPlugin address for chain " + chain.name,
          );
        }

        return encodePacked(["address", "uint8"], [pluginAddress, 0x1]);
      })(),
    ];
    const pluginAddress =
      params.pluginAddress ??
      (SplitPlugin.meta.addresses[chain.id] as Address | undefined);

    if (!pluginAddress) {
      throw new Error("missing SplitPlugin address for chain " + chain.name);
    }

    return installPlugin_(client, {
      pluginAddress,
      pluginInitData: encodeAbiParameters(
        [
          { type: "address", name: "tokenAddess" },
          { type: "address[]", name: "splitAddresses" },
          { type: "uint256[]", name: "percentages" },
        ],
        params.args,
      ),
      dependencies,
      overrides,
      account,
      context,
    });
  },
  encodeCreateSplit({ args }) {
    return encodeFunctionData({
      abi: SplitPluginExecutionFunctionAbi,
      functionName: "createSplit",
      args,
    });
  },
  encodeToggleIsSplitEnabled({ args }) {
    return encodeFunctionData({
      abi: SplitPluginExecutionFunctionAbi,
      functionName: "toggleIsSplitEnabled",
      args,
    });
  },
  encodeSplit({ args }) {
    return encodeFunctionData({
      abi: SplitPluginExecutionFunctionAbi,
      functionName: "split",
      args,
    });
  },
  encodeUpdateSplitConfig({ args }) {
    return encodeFunctionData({
      abi: SplitPluginExecutionFunctionAbi,
      functionName: "updateSplitConfig",
      args,
    });
  },
  encodeDeleteSplitConfig({ args }) {
    return encodeFunctionData({
      abi: SplitPluginExecutionFunctionAbi,
      functionName: "deleteSplitConfig",
      args,
    });
  },
});

export const SplitPluginExecutionFunctionAbi = [
  {
    type: "function",
    name: "createSplit",
    inputs: [
      { name: "_tokenAddress", type: "address", internalType: "address" },
      { name: "_splitAddresses", type: "address[]", internalType: "address[]" },
      { name: "_percentages", type: "uint32[]", internalType: "uint32[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "toggleIsSplitEnabled",
    inputs: [
      { name: "_configIndex", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "split",
    inputs: [
      { name: "_configIndex", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateSplitConfig",
    inputs: [
      { name: "_configIndex", type: "uint256", internalType: "uint256" },
      { name: "_splitAddresses", type: "address[]", internalType: "address[]" },
      { name: "_percentages", type: "uint32[]", internalType: "uint32[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "deleteSplitConfig",
    inputs: [
      { name: "_configIndex", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const SplitPluginAbi = [
  {
    type: "function",
    name: "AUTHOR",
    inputs: [],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "NAME",
    inputs: [],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "VERSION",
    inputs: [],
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createSplit",
    inputs: [
      { name: "_tokenAddress", type: "address", internalType: "address" },
      { name: "_splitAddresses", type: "address[]", internalType: "address[]" },
      { name: "_percentages", type: "uint32[]", internalType: "uint32[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "deleteSplitConfig",
    inputs: [
      { name: "_configIndex", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getSplitConfig",
    inputs: [
      { name: "_configIndex", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      { name: "tokenAddress", type: "address", internalType: "address" },
      { name: "splitAddresses", type: "address[]", internalType: "address[]" },
      { name: "percentages", type: "uint32[]", internalType: "uint32[]" },
      { name: "minTokenAmount", type: "uint256", internalType: "uint256" },
      { name: "isSplitEnabled", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSplitIndexes",
    inputs: [{ name: "_user", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isSplitCreator",
    inputs: [
      { name: "_configIndex", type: "uint256", internalType: "uint256" },
      { name: "_splitCreator", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "onInstall",
    inputs: [{ name: "data", type: "bytes", internalType: "bytes" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "onUninstall",
    inputs: [{ name: "", type: "bytes", internalType: "bytes" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "pluginManifest",
    inputs: [],
    outputs: [
      {
        name: "manifest",
        type: "tuple",
        internalType: "struct PluginManifest",
        components: [
          { name: "interfaceIds", type: "bytes4[]", internalType: "bytes4[]" },
          {
            name: "dependencyInterfaceIds",
            type: "bytes4[]",
            internalType: "bytes4[]",
          },
          {
            name: "executionFunctions",
            type: "bytes4[]",
            internalType: "bytes4[]",
          },
          {
            name: "permittedExecutionSelectors",
            type: "bytes4[]",
            internalType: "bytes4[]",
          },
          {
            name: "permitAnyExternalAddress",
            type: "bool",
            internalType: "bool",
          },
          { name: "canSpendNativeToken", type: "bool", internalType: "bool" },
          {
            name: "permittedExternalCalls",
            type: "tuple[]",
            internalType: "struct ManifestExternalCallPermission[]",
            components: [
              {
                name: "externalAddress",
                type: "address",
                internalType: "address",
              },
              { name: "permitAnySelector", type: "bool", internalType: "bool" },
              { name: "selectors", type: "bytes4[]", internalType: "bytes4[]" },
            ],
          },
          {
            name: "userOpValidationFunctions",
            type: "tuple[]",
            internalType: "struct ManifestAssociatedFunction[]",
            components: [
              {
                name: "executionSelector",
                type: "bytes4",
                internalType: "bytes4",
              },
              {
                name: "associatedFunction",
                type: "tuple",
                internalType: "struct ManifestFunction",
                components: [
                  {
                    name: "functionType",
                    type: "uint8",
                    internalType: "enum ManifestAssociatedFunctionType",
                  },
                  { name: "functionId", type: "uint8", internalType: "uint8" },
                  {
                    name: "dependencyIndex",
                    type: "uint256",
                    internalType: "uint256",
                  },
                ],
              },
            ],
          },
          {
            name: "runtimeValidationFunctions",
            type: "tuple[]",
            internalType: "struct ManifestAssociatedFunction[]",
            components: [
              {
                name: "executionSelector",
                type: "bytes4",
                internalType: "bytes4",
              },
              {
                name: "associatedFunction",
                type: "tuple",
                internalType: "struct ManifestFunction",
                components: [
                  {
                    name: "functionType",
                    type: "uint8",
                    internalType: "enum ManifestAssociatedFunctionType",
                  },
                  { name: "functionId", type: "uint8", internalType: "uint8" },
                  {
                    name: "dependencyIndex",
                    type: "uint256",
                    internalType: "uint256",
                  },
                ],
              },
            ],
          },
          {
            name: "preUserOpValidationHooks",
            type: "tuple[]",
            internalType: "struct ManifestAssociatedFunction[]",
            components: [
              {
                name: "executionSelector",
                type: "bytes4",
                internalType: "bytes4",
              },
              {
                name: "associatedFunction",
                type: "tuple",
                internalType: "struct ManifestFunction",
                components: [
                  {
                    name: "functionType",
                    type: "uint8",
                    internalType: "enum ManifestAssociatedFunctionType",
                  },
                  { name: "functionId", type: "uint8", internalType: "uint8" },
                  {
                    name: "dependencyIndex",
                    type: "uint256",
                    internalType: "uint256",
                  },
                ],
              },
            ],
          },
          {
            name: "preRuntimeValidationHooks",
            type: "tuple[]",
            internalType: "struct ManifestAssociatedFunction[]",
            components: [
              {
                name: "executionSelector",
                type: "bytes4",
                internalType: "bytes4",
              },
              {
                name: "associatedFunction",
                type: "tuple",
                internalType: "struct ManifestFunction",
                components: [
                  {
                    name: "functionType",
                    type: "uint8",
                    internalType: "enum ManifestAssociatedFunctionType",
                  },
                  { name: "functionId", type: "uint8", internalType: "uint8" },
                  {
                    name: "dependencyIndex",
                    type: "uint256",
                    internalType: "uint256",
                  },
                ],
              },
            ],
          },
          {
            name: "executionHooks",
            type: "tuple[]",
            internalType: "struct ManifestExecutionHook[]",
            components: [
              {
                name: "executionSelector",
                type: "bytes4",
                internalType: "bytes4",
              },
              {
                name: "preExecHook",
                type: "tuple",
                internalType: "struct ManifestFunction",
                components: [
                  {
                    name: "functionType",
                    type: "uint8",
                    internalType: "enum ManifestAssociatedFunctionType",
                  },
                  { name: "functionId", type: "uint8", internalType: "uint8" },
                  {
                    name: "dependencyIndex",
                    type: "uint256",
                    internalType: "uint256",
                  },
                ],
              },
              {
                name: "postExecHook",
                type: "tuple",
                internalType: "struct ManifestFunction",
                components: [
                  {
                    name: "functionType",
                    type: "uint8",
                    internalType: "enum ManifestAssociatedFunctionType",
                  },
                  { name: "functionId", type: "uint8", internalType: "uint8" },
                  {
                    name: "dependencyIndex",
                    type: "uint256",
                    internalType: "uint256",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "pluginMetadata",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct PluginMetadata",
        components: [
          { name: "name", type: "string", internalType: "string" },
          { name: "version", type: "string", internalType: "string" },
          { name: "author", type: "string", internalType: "string" },
          {
            name: "permissionDescriptors",
            type: "tuple[]",
            internalType: "struct SelectorPermission[]",
            components: [
              {
                name: "functionSelector",
                type: "bytes4",
                internalType: "bytes4",
              },
              {
                name: "permissionDescription",
                type: "string",
                internalType: "string",
              },
            ],
          },
        ],
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "postExecutionHook",
    inputs: [
      { name: "", type: "uint8", internalType: "uint8" },
      { name: "", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "preExecutionHook",
    inputs: [
      { name: "functionId", type: "uint8", internalType: "uint8" },
      { name: "sender", type: "address", internalType: "address" },
      { name: "value", type: "uint256", internalType: "uint256" },
      { name: "data", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "", type: "bytes", internalType: "bytes" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "preRuntimeValidationHook",
    inputs: [
      { name: "functionId", type: "uint8", internalType: "uint8" },
      { name: "sender", type: "address", internalType: "address" },
      { name: "value", type: "uint256", internalType: "uint256" },
      { name: "data", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "preUserOpValidationHook",
    inputs: [
      { name: "functionId", type: "uint8", internalType: "uint8" },
      {
        name: "userOp",
        type: "tuple",
        internalType: "struct UserOperation",
        components: [
          { name: "sender", type: "address", internalType: "address" },
          { name: "nonce", type: "uint256", internalType: "uint256" },
          { name: "initCode", type: "bytes", internalType: "bytes" },
          { name: "callData", type: "bytes", internalType: "bytes" },
          { name: "callGasLimit", type: "uint256", internalType: "uint256" },
          {
            name: "verificationGasLimit",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "preVerificationGas",
            type: "uint256",
            internalType: "uint256",
          },
          { name: "maxFeePerGas", type: "uint256", internalType: "uint256" },
          {
            name: "maxPriorityFeePerGas",
            type: "uint256",
            internalType: "uint256",
          },
          { name: "paymasterAndData", type: "bytes", internalType: "bytes" },
          { name: "signature", type: "bytes", internalType: "bytes" },
        ],
      },
      { name: "userOpHash", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "runtimeValidationFunction",
    inputs: [
      { name: "functionId", type: "uint8", internalType: "uint8" },
      { name: "sender", type: "address", internalType: "address" },
      { name: "value", type: "uint256", internalType: "uint256" },
      { name: "data", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "split",
    inputs: [
      { name: "_configIndex", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "splitConfigCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "splitConfigIndexes",
    inputs: [
      { name: "", type: "address", internalType: "address" },
      { name: "", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "splitConfigs",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "tokenAddress", type: "address", internalType: "address" },
      { name: "minTokenAmount", type: "uint256", internalType: "uint256" },
      { name: "isSplitEnabled", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "supportsInterface",
    inputs: [{ name: "interfaceId", type: "bytes4", internalType: "bytes4" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "toggleIsSplitEnabled",
    inputs: [
      { name: "_configIndex", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateSplitConfig",
    inputs: [
      { name: "_configIndex", type: "uint256", internalType: "uint256" },
      { name: "_splitAddresses", type: "address[]", internalType: "address[]" },
      { name: "_percentages", type: "uint32[]", internalType: "uint32[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "userOpValidationFunction",
    inputs: [
      { name: "", type: "uint8", internalType: "uint8" },
      {
        name: "",
        type: "tuple",
        internalType: "struct UserOperation",
        components: [
          { name: "sender", type: "address", internalType: "address" },
          { name: "nonce", type: "uint256", internalType: "uint256" },
          { name: "initCode", type: "bytes", internalType: "bytes" },
          { name: "callData", type: "bytes", internalType: "bytes" },
          { name: "callGasLimit", type: "uint256", internalType: "uint256" },
          {
            name: "verificationGasLimit",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "preVerificationGas",
            type: "uint256",
            internalType: "uint256",
          },
          { name: "maxFeePerGas", type: "uint256", internalType: "uint256" },
          {
            name: "maxPriorityFeePerGas",
            type: "uint256",
            internalType: "uint256",
          },
          { name: "paymasterAndData", type: "bytes", internalType: "bytes" },
          { name: "signature", type: "bytes", internalType: "bytes" },
        ],
      },
      { name: "", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "pure",
  },
  {
    type: "event",
    name: "AutomationSwitched",
    inputs: [
      {
        name: "configIndex",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "currentState",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SplitConfigCreated",
    inputs: [
      { name: "user", type: "address", indexed: true, internalType: "address" },
      {
        name: "configIndex",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SplitConfigDeleted",
    inputs: [
      {
        name: "configIndex",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SplitExecuted",
    inputs: [
      {
        name: "configIndex",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  { type: "error", name: "AlreadyInitialized", inputs: [] },
  { type: "error", name: "InvalidAction", inputs: [] },
  {
    type: "error",
    name: "NotContractCaller",
    inputs: [{ name: "caller", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "NotImplemented",
    inputs: [
      { name: "selector", type: "bytes4", internalType: "bytes4" },
      { name: "functionId", type: "uint8", internalType: "uint8" },
    ],
  },
  { type: "error", name: "NotInitialized", inputs: [] },
] as const;
