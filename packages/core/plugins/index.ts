import {
  createLockerClient,
} from "../accounts/impl";
import { type Address, createPublicClient, http } from "viem";
import { splitPluginActions as baseSplitPluginActions } from "./gens/base/split/plugin";
import { splitPluginActions as sepoliaSplitPluginActions } from "./gens/sepolia/split/plugin";
import { splitPluginActions as baseSepoliaSplitPluginActions } from "./gens/baseSepolia/split/plugin";
import { isSplitPluginInstalled } from "./utils/helpers";
import { chainToSplitPluginAddress } from "./defs/split/config";
import { base, baseSepolia, sepolia } from "@account-kit/infra";
import { adaptLockerChain2AlchemyChain, waitForTransaction } from "../helpers";
import { SplitPluginAbi } from "./defs/split/abi";
import type { ILockerClient, ILockerClientParams } from "accounts/types";

export interface ILockerSplitClient extends ILockerClient {
  getAddress: () => Address;

  getConfigs: () => Promise<bigint[]>;

  createSplit: (
    tokenAddress: Address,
    percentage: number[],
    receiverAddresses: Address[]
  ) => Promise<any>;

  installSplitPlugin: () => Promise<any>;

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
      percentage: number[],
      receiverAddresses: string[]
    ): Promise<any> {
      if (!(await isSplitPluginInstalled(splitLockerClient, chainId))) {
        console.log("Split plugin not installed.");
        return null;
      }
      const res = await splitLockerClient.createSplit({
        args: [tokenAddress, receiverAddresses, percentage],
      });
      console.log("Waiting for confirmation...");
      await waitForTransaction(res.hash, alchemyRpcUrl);
      console.log("Split config created:", res);
      return res;
    },

    async installSplitPlugin(): Promise<any> {
      if (await isSplitPluginInstalled(splitLockerClient, chainId)) {
        console.log("Split plugin already installed.");
        return null;
      }
      const res = await splitLockerClient.installSplitPlugin({
        args: [],
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
      const res = await splitLockerClient.deleteSplitConfig({
        args: [configIndex],
      });
      console.log("Waiting for deletion confirmation...");
      await waitForTransaction(res.hash, alchemyRpcUrl);
      return res;
    },
  };
}
