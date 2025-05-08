import { defineConfig } from "@account-kit/plugingen";
import { SplitPluginGenConfig } from "./plugins/defs/split/config";
import { MultiOwnerPluginGenConfig } from "./plugins/defs/multi-owner/config";
import { XLockPluginGenConfig } from "./plugins/defs/xLock/config";
import { base, sepolia, baseSepolia } from "viem/chains";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig([
  // {
  //   outDir: "./plugins/gens/base",
  //   chain: base,
  //   rpcUrl: process.env.BASE_RPC as string,
  //   plugins: [MultiOwnerPluginGenConfig, SplitPluginGenConfig],
  // },
  // {
  //   outDir: "./plugins/gens/sepolia",
  //   chain: sepolia,
  //   rpcUrl: process.env.SEPOLIA_RPC as string,
  //   plugins: [MultiOwnerPluginGenConfig, SplitPluginGenConfig],
  // },
  // {
  //   outDir: "./plugins/gens/baseSepolia",
  //   chain: baseSepolia,
  //   rpcUrl: process.env.BASE_SEPOLIA_RPC as string,
  //   plugins: [MultiOwnerPluginGenConfig, SplitPluginGenConfig],
  // },
  {
    outDir: "./plugins/gens/xLock",
    chain: sepolia,
    rpcUrl: process.env.SEPOLIA_RPC as string,
    plugins: [MultiOwnerPluginGenConfig, XLockPluginGenConfig],
  },
]);
