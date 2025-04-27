import { type Address, createPublicClient, http } from "viem";

import {
  createLockerClient,
} from "../accounts/impl.js";
import { splitPluginActions as baseSplitPluginActions } from "./gens/base/split/plugin.js";
import { splitPluginActions as sepoliaSplitPluginActions } from "./gens/sepolia/split/plugin.js";
import { splitPluginActions as baseSepoliaSplitPluginActions } from "./gens/baseSepolia/split/plugin.js";
import { isSplitPluginInstalled } from "./utils/helpers.js";
import { chainToSplitPluginAddress } from "./defs/split/config.js";
import { base, baseSepolia, sepolia } from "@account-kit/infra";
import { adaptLockerChain2AlchemyChain, waitForTransaction } from "../accounts/helpers.js";
import { SplitPluginAbi } from "./defs/split/abi.js";
import type { ILockerClient, ILockerClientParams } from "../accounts/types.js";

const MAX_PERCENTAGE = 100_000_000;

function convertPercentage(percentage: number): bigint {
  if (percentage > 1) {
    throw new Error("Percentage must be less than 1");
  }
  if (percentage < 0.00000001) {
    throw new Error("Percentage must be at least 0.00000001");
  }
  return BigInt(Math.floor(percentage * MAX_PERCENTAGE));
}

export interface ILockerSplitClient extends ILockerClient {
  getAddress: () => Address;

  getConfigs: () => Promise<bigint[]>;

  createSplit: (
    tokenAddress: Address,
    percentages: number[],
    receiverAddresses: Address[]
  ) => Promise<any>;

  installSplitPlugin: (
    tokenAddress: Address,
    percentages: number[],
    receiverAddresses: Address[]
  ) => Promise<any>;

  isSplitPluginInstalled: () => Promise<boolean>;

  uninstallSplitPlugin: () => Promise<any>;

  toggleIsSplitEnabled: (configIndex: number) => Promise<any>;

  split: (configIndex: number) => Promise<any>;

  deleteSplit: (configIndex: bigint) => Promise<any>;
}

/**
 * Creates a Locker Split Client that the end user interacts with.
 * It takes in all necessary parameters to build the extended client, then wraps it to expose only selected functions.
 *
 * @param params - The configuration parameters(ExtendedClientParams) for creating the client.
 * @returns A promise that resolves to a LockerSplitClient.
 */
export async function createLockerSplitClient(
  params: ILockerClientParams
): Promise<ILockerSplitClient> {
  const lockerClient = await createLockerClient(params);
  const { chain: lockerChain, alchemyApiKey } = params;

  const chain = adaptLockerChain2AlchemyChain(lockerChain);
  const chainId = chain.id;

  let splitPluginActions;
  switch (chainId) {
    case base.id:
      splitPluginActions = baseSplitPluginActions;
      break;
    case baseSepolia.id:
      splitPluginActions = baseSepoliaSplitPluginActions;
      break;
    case sepolia.id:
      splitPluginActions = sepoliaSplitPluginActions;
      break;
    default:
      throw new Error(`Unsupported chain: ${chain.id}`);
  }

  const splitLockerClient = await lockerClient.extend(splitPluginActions);
  const alchemyRpcUrl = `${chain.rpcUrls.alchemy.http[0]}/${alchemyApiKey}`;

  const client = createPublicClient({
    chain,
    transport: http(alchemyRpcUrl),
  });

  return {
    ...lockerClient,
    async getConfigs(): Promise<bigint[]> {
      if (!(await isSplitPluginInstalled(splitLockerClient, chainId))) {
        console.log("Split plugin not installed.");
        return [];
      }
      const globalIndexes = [];
      // Get all the global indexes, Max possible 5.
      // TODO: Replace with a query.
      for (let i = 0; i < 5; i++) {
        let globalIndex;
        try {
          globalIndex = await client.readContract({
            address: chainToSplitPluginAddress[chain.id],
            abi: SplitPluginAbi,
            functionName: "splitConfigIndexes",
            args: [await splitLockerClient.getAddress(), BigInt(i)],
          });
          globalIndexes.push(globalIndex);
        } catch {
          break;
        }
      }
      return globalIndexes;
    },
    async createSplit(
      tokenAddress: string,
      percentages: number[],
      receiverAddresses: string[]
    ): Promise<any> {
      if (!(await isSplitPluginInstalled(splitLockerClient, chainId))) {
        console.log("Split plugin not installed.");
        return null;
      }
      const convertedPercentages = percentages.map(convertPercentage);
      console.log("Creating Split Config...");
      const res = await splitLockerClient.createSplit({
        args: [tokenAddress, receiverAddresses, convertedPercentages],
      });
      console.log("Waiting for creation confirmation...");
      await waitForTransaction(res.hash, alchemyRpcUrl);
      console.log("Split config created:", res);
      return res;
    },

    async installSplitPlugin(
      tokenAddress,
      percentages,
      splitAddresses
    ): Promise<any> {
      if (await isSplitPluginInstalled(splitLockerClient, chainId)) {
        console.log("Split plugin already installed.");
        return null;
      }
      const convertedPercentages = percentages.map(convertPercentage);
      console.log("Installing Split Plugin...");
      const res = await splitLockerClient.installSplitPlugin({
        args: [tokenAddress, splitAddresses, convertedPercentages],
      });

      console.log("Waiting for installation confirmation...");
      await waitForTransaction(res.hash, alchemyRpcUrl);
      console.log("Split plugin installed with:", res);

      return res;
    },

    async isSplitPluginInstalled(): Promise<boolean> {
      return await isSplitPluginInstalled(splitLockerClient, chainId);
    },

    async uninstallSplitPlugin(): Promise<any> {
      if (!(await isSplitPluginInstalled(splitLockerClient, chainId))) {
        console.log("Split plugin not installed.");
        return null;
      }

      console.log("Uninstalling Split Plugin...");
      const res = await splitLockerClient.uninstallPlugin({
        pluginAddress: chainToSplitPluginAddress[chain.id],
      });

      console.log("Waiting for uninstallation confirmation...");
      await waitForTransaction(res.hash, alchemyRpcUrl);
      return res;
    },

    async toggleIsSplitEnabled(configIndex: number): Promise<any> {
      if (!(await isSplitPluginInstalled(splitLockerClient, chainId))) {
        console.log("Split plugin not installed.");
        return null;
      }
      const res = await splitLockerClient.pauseAutomation({
        args: [configIndex],
      });
      return res;
    },

    async split(configIndex: number): Promise<any> {
      if (!(await isSplitPluginInstalled(splitLockerClient, chainId))) {
        console.log("Split plugin not installed.");
        return null;
      }
      const res = await splitLockerClient.split({
        args: [BigInt(configIndex)],
      });
      return res;
    },

    async deleteSplit(configIndex: bigint): Promise<any> {
      if (!(await isSplitPluginInstalled(splitLockerClient, chainId))) {
        console.log("Split plugin not installed.");
        return null;
      }

      const isSplitCreator = await client.readContract({
        address: chainToSplitPluginAddress[chain.id],
        abi: SplitPluginAbi,
        functionName: "isSplitCreator",
        args: [configIndex, await splitLockerClient.getAddress()],
      });
      if (!isSplitCreator) {
        console.log(
          "You are not the creator of this split config:",
          Number(configIndex)
        );
        return null;
      }

      console.log("Deleting Split Config...");
      const res = await splitLockerClient.deleteSplitConfig({
        args: [configIndex],
      });
      console.log("Waiting for deletion confirmation...");
      await waitForTransaction(res.hash, alchemyRpcUrl);
      return res;
    },
  };
}
