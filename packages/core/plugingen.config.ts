import { defineConfig } from "@account-kit/plugingen";
import { SplitPluginGenConfig } from "./split/def/splitPluginConfig";
import { base, sepolia, baseSepolia } from "viem/chains";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig([
  {
    outDir: "./split/gen/base",
    chain: base,
    rpcUrl: process.env.BASE_RPC as string,
    plugins: [SplitPluginGenConfig],
  },
  {
    outDir: "./split/gen/sepolia",
    chain: sepolia,
    rpcUrl: process.env.SEPOLIA_RPC as string,
    plugins: [SplitPluginGenConfig],
  },
  {
    outDir: "./split/gen/baseSepolia",
    chain: baseSepolia,
    rpcUrl: process.env.BASE_SEPOLIA_RPC as string,
    plugins: [SplitPluginGenConfig],
  },
]);
