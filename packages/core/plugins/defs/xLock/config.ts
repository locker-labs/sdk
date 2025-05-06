import type { PluginConfig } from "@account-kit/plugingen";
import {  sepolia } from "viem/chains";
import { MultiOwnerPluginGenConfig } from "../multi-owner/config.js";
import { XLockAbi } from "./abi.js";

export const XLockPluginGenConfig: PluginConfig = {
  name: "SplitPlugin",
  abi: XLockAbi,
  addresses: {
    [sepolia.id]: "0xAeA689d136d8Fd7098aC8f2c81aEFE1c34c92E3A",
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
