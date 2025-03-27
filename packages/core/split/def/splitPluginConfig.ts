import type { PluginConfig } from "@account-kit/plugingen";
import { type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { MultiOwnerPluginGenConfig } from "./multiPlugin";
import { SplitPluginAbi } from "./splitPluginAbi";

// sepolia 0xFEd11a0C1c292F2823757925122222bb28b13443
export const SPLIT_PLUGIN_ADDRESS =
  "0x7AA0c9376178EBC081eAd5C49801C86Ce834D629" as Address;

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
