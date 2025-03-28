import type { PluginConfig } from "@account-kit/plugingen";
import { type Address, parseAbiParameters } from "viem";
import { base, sepolia } from "viem/chains";
import { MultiOwnerPluginGenConfig } from "./multiPlugin";
import { SplitPluginAbi } from "./splitPluginAbi";

export const SPLIT_PLUGIN_SEPOLIA =
  "0x1ef5f1E4d06AD60e9A3FD64D00782c21523F7317" as Address;

export const SPLIT_PLUGIN_BASE =
  "0x981656a00aB861498E2DCE2a94b1dd416B684844" as Address;

export const chainToSplitPluginAddress: Record<number, Address> = {
  [sepolia.id]: SPLIT_PLUGIN_SEPOLIA,
  [base.id]: SPLIT_PLUGIN_BASE,
};

export const SplitPluginGenConfig: PluginConfig = {
  name: "SplitPlugin",
  abi: SplitPluginAbi,
  addresses: {
    [sepolia.id]: SPLIT_PLUGIN_SEPOLIA,
    [base.id]: SPLIT_PLUGIN_BASE,
  },
  installConfig: {
    initAbiParams: parseAbiParameters("address,address[],uint8[]"),

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
