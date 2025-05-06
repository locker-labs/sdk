import type { PluginConfig } from "@account-kit/plugingen";
import {  sepolia } from "viem/chains";
import { MultiOwnerPluginGenConfig } from "../multi-owner/config.js";
import { XLockAbi } from "./abi.js";

export const XLockPluginGenConfig: PluginConfig = {
  name: "XLockPlugin",
  abi: XLockAbi,
  addresses: {
    [sepolia.id]: "0xBc9f3762A996667A6E0d8dfA70092b7EEC1a6557",
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
