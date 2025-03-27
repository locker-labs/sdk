import { defineConfig } from "@account-kit/plugingen";
import { SplitPluginGenConfig } from "./splits/def/splitPluginConfig";
import { baseSepolia } from "viem/chains";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig([
  {
    outDir: "./splits/utils/",
    chain: baseSepolia,
    rpcUrl: process.env.BASE_SEPOLIA_RPC as string,
    plugins: [SplitPluginGenConfig],
  },
]);
