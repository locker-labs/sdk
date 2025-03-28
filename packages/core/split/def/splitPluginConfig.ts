import type { PluginConfig } from "@account-kit/plugingen";
import { type Address, parseAbiParameters } from "viem";
import { baseSepolia } from "viem/chains";
import { MultiOwnerPluginGenConfig } from "./multiPlugin";
import { SplitPluginAbi } from "./splitPluginAbi";

// sepolia 0xFEd11a0C1c292F2823757925122222bb28b13443
export const SPLIT_PLUGIN_ADDRESS =
  "0x9E663AE3423E334e8F35048D66E3DEaB387C9A0D" as Address;

export const SplitPluginGenConfig: PluginConfig = {
  name: "SplitPlugin",
  abi: SplitPluginAbi,
  addresses: {
    [baseSepolia.id]: SPLIT_PLUGIN_ADDRESS,
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
