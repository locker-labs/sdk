import type { PluginConfig } from "@account-kit/plugingen";
import { type Address, parseAbiParameters } from "viem";
import { base, baseSepolia, sepolia } from "viem/chains";
import { MultiOwnerPluginGenConfig } from "../multi-owner/config.js";
import { SplitPluginAbi } from "./abi.js";

export const SPLIT_PLUGIN_SEPOLIA =
  "0x12438c60e855ca58C34b1b2780d208D733D370CF" as Address;

export const SPLIT_PLUGIN_BASE =
  "0x2a4f50188850660D2C7D411EdA120CBb5D9A3EE4" as Address;

export const SPLIT_PLUGIN_BASE_SEPOLIA =
  "0x400932DCddAc89bEA6F2C261dA7aC1C427BdBf5b" as Address;

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
