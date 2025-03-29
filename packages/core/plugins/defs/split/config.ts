import type { PluginConfig } from "@account-kit/plugingen";
import { type Address } from "viem";
import { base, baseSepolia, sepolia } from "viem/chains";
import { MultiOwnerPluginGenConfig } from "../multi-owner/config.js";
import { SplitPluginAbi } from "./abi.js";

export const SPLIT_PLUGIN_SEPOLIA =
  "0x1ef5f1E4d06AD60e9A3FD64D00782c21523F7317" as Address;

export const SPLIT_PLUGIN_BASE =
  "0x981656a00aB861498E2DCE2a94b1dd416B684844" as Address;

export const SPLIT_PLUGIN_BASE_SEPOLIA =
  "0x9fBc03780c1AAc814E6BAD2C35Af4f55fCb31D69" as Address;

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
    initAbiParams: [],

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
