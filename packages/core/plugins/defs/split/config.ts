import type { PluginConfig } from "@account-kit/plugingen";
import { type Address, parseAbiParameters } from "viem";
import { base, baseSepolia, sepolia } from "viem/chains";
import { MultiOwnerPluginGenConfig } from "../multi-owner/config.js";
import { SplitPluginAbi } from "./abi.js";

export const SPLIT_PLUGIN_SEPOLIA =
  "0xa73840181f066Da4D17AAee5bf932d2B5b97d54b" as Address;

export const SPLIT_PLUGIN_BASE =
  "0xF5B538fA17c71Cd12214c5F93E3e31AC153a29De" as Address;

export const SPLIT_PLUGIN_BASE_SEPOLIA =
  "0xFedEC60E1314501378e3cb313A50F5AbDDbda11b" as Address;

export const chainToSplitPluginAddress: Record<number, Address> = {
  [sepolia.id]: SPLIT_PLUGIN_SEPOLIA,
  [base.id]: SPLIT_PLUGIN_BASE,
  [baseSepolia.id]: SPLIT_PLUGIN_BASE_SEPOLIA,
};

export const SplitPluginGenConfig: PluginConfig = {
  name: "SplitPlugin",
  abi: SplitPluginAbi,
  addresses: {
    [sepolia.id]: SPLIT_PLUGIN_SEPOLIA,
    [base.id]: SPLIT_PLUGIN_BASE,
    [baseSepolia.id]: SPLIT_PLUGIN_BASE_SEPOLIA,
  },
  installConfig: {
    initAbiParams: parseAbiParameters(
      "address tokenAddess, address[] splitAddresses, uint256[] percentages"
    ),

    dependencies: [
      {
        plugin: MultiOwnerPluginGenConfig,
        functionId: "0x0",
      },
      {
        plugin: MultiOwnerPluginGenConfig,
        functionId: "0x1",
      },
    ],
  },
};
