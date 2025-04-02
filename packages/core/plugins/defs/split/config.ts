import type { PluginConfig } from "@account-kit/plugingen";
import { type Address, parseAbiParameters } from "viem";
import { base, baseSepolia, sepolia } from "viem/chains";
import { MultiOwnerPluginGenConfig } from "../multi-owner/config.js";
import { SplitPluginAbi } from "./abi.js";

export const SPLIT_PLUGIN_SEPOLIA =
  "0x6edeB1ee954744512A1928B13e7C3Ce5D8Ad84fC" as Address;

export const SPLIT_PLUGIN_BASE =
  "0x3e71215c32095fd32c458E683D557709c3cef2f9" as Address;

export const SPLIT_PLUGIN_BASE_SEPOLIA =
  "0x1F851DE0e959ad33193e5449EC4C23A66eAdbCC7" as Address;

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
