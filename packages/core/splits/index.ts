import {
  createLockerClient,
  type LockerClientParams,
  type LockerClient,
} from "accounts";
import { type Address } from "viem";
import { splitPluginActions } from "./utils/splitsPlugin";
import { isSplitPluginInstalled } from "./utils/helpers";
import { SPLIT_PLUGIN_ADDRESS } from "./def/splitPluginConfig";

export interface LockerSplitClient extends LockerClient {
  createSplit: (
    tokenAddress: Address,
    percentage: number[],
    receiverAddresses: Address[]
  ) => Promise<any>;
  installSplitPlugin: (
    tokenAddress: Address,
    percentage: number[],
    receiverAddresses: Address[]
  ) => Promise<any>;
  isSplitsPluginInstalled: () => Promise<boolean>;
  uninstallSplitPlugin: () => Promise<any>;
  toggleAutomation: (configIndex: number) => Promise<any>;
  split: (configIndex: number) => Promise<any>;
  deleteSplit: (configIndex: number) => Promise<any>;
}

/**
 * Creates a locker splits client that the end user interacts with.
 * It takes in all necessary parameters to build the extended client, then wraps it to expose only selected functions.
 *
 * @param params - The configuration parameters(ExtendedClientParams) for creating the client.
 * @returns A promise that resolves to a LockerSplitClient.
 */
export async function createLockerSplitClient(
  params: LockerClientParams
): Promise<LockerSplitClient> {
  const lockerClient = await createLockerClient(params);
  const splitsLockerClient = await lockerClient.extend(splitPluginActions);

  return {
    ...lockerClient,
    async createSplit(
      tokenAddress: string,
      percentage: number[],
      receiverAddresses: string[]
    ): Promise<any> {
      if (!(await isSplitPluginInstalled(splitsLockerClient))) {
        console.log("Split plugin not installed.");
        return null;
      }
      const res = await splitsLockerClient.createSplit({
        args: [tokenAddress, receiverAddresses, percentage],
      });
      return res;
    },
    async installSplitPlugin(
      tokenAddress: Address,
      percentage: number[],
      receiverAddresses: Address[]
    ): Promise<any> {
      if (await isSplitPluginInstalled(splitsLockerClient)) {
        console.log("Split plugin already installed.");
        return null;
      }
      const res = await splitsLockerClient.installSplitPlugin({
        args: [tokenAddress, receiverAddresses, percentage],
      });
      return res;
    },
    async isSplitsPluginInstalled(): Promise<boolean> {
      return await isSplitPluginInstalled(splitsLockerClient);
    },
    async uninstallSplitPlugin(): Promise<any> {
      if (!(await isSplitPluginInstalled(splitsLockerClient))) {
        console.log("Split plugin not installed.");
        return null;
      }
      const res = await splitsLockerClient.uninstallPlugin({
        pluginAddress: SPLIT_PLUGIN_ADDRESS,
      });
      return res;
    },
    async toggleAutomation(configIndex: number): Promise<any> {
      if (!(await isSplitPluginInstalled(splitsLockerClient))) {
        console.log("Split plugin not installed.");
        return null;
      }
      const res = await splitsLockerClient.pauseAutomation({
        args: [configIndex],
      });
      return res;
    },
    async split(configIndex: number): Promise<any> {
      if (!(await isSplitPluginInstalled(splitsLockerClient))) {
        console.log("Split plugin not installed.");
        return null;
      }
      const res = await splitsLockerClient.split({
        args: [BigInt(configIndex)],
      });
      return res;
    },
    async deleteSplit(configIndex: number): Promise<any> {
      if (!(await isSplitPluginInstalled(splitsLockerClient))) {
        console.log("Split plugin not installed.");
        return null;
      }
      const res = await splitsLockerClient.deleteSplitConfig({
        args: [BigInt(configIndex)],
      });
      return res;
    },
  };
}
