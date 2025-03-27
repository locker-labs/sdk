import type { PluginConfig } from "@account-kit/plugingen";
import { sepolia, baseSepolia } from "viem/chains";
import { MultiOwnerPluginGenConfig } from "../multi-owner/config";
import { SplitPluginAbi } from "./abi";

// sepolia 0xFEd11a0C1c292F2823757925122222bb28b13443
export const SPLIT_PLUGIN_ADDRESS =
  "0x4d1B257678247A2Bc84A4B8A8a77e16D26484CFe" as `0x${string}`;

export const SplitPluginGenConfig: PluginConfig = {
  name: "SplitPlugin",
  abi: SplitPluginAbi,
  addresses: {
    [baseSepolia.id]: SPLIT_PLUGIN_ADDRESS,
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
