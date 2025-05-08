import type { PluginConfig } from "@account-kit/plugingen";
import {  sepolia } from "viem/chains";
import { MultiOwnerPluginGenConfig } from "../multi-owner/config.js";
import { XLockAbi } from "./abi.js";

export const XLockPluginGenConfig: PluginConfig = {
  name: "XLockPlugin",
  abi: XLockAbi,
  addresses: {
    [sepolia.id]: "0x04a8250ABfad42c48401c92773dc86adc93a0B59",
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
