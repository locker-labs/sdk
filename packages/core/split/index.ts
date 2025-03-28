import {
  createLockerClient,
  type LockerClientParams,
  type LockerClient,
} from "accounts";
import { type Address } from "viem";
import { splitPluginActions } from "./utils/splitPlugin";
import { isSplitPluginInstalled } from "./utils/helpers";
import { SPLIT_PLUGIN_ADDRESS } from "./def/splitPluginConfig";

export interface LockerSplitClient extends LockerClient {
  createSplit: (
    tokenAddress: Address,
    percentage: number[],
    receiverAddresses: Address[]
  ) => Promise<any>;
  installSplitPlugin: () => Promise<any>;
  isSplitPluginInstalled: () => Promise<boolean>;
  uninstallSplitPlugin: () => Promise<any>;
  toggleAutomation: (configIndex: number) => Promise<any>;
  split: (configIndex: number) => Promise<any>;
  deleteSplit: (configIndex: number) => Promise<any>;
}

/**
 * Creates a Locker Split Client that the end user interacts with.
 * It takes in all necessary parameters to build the extended client, then wraps it to expose only selected functions.
 *
 * @param params - The configuration parameters(ExtendedClientParams) for creating the client.
 * @returns A promise that resolves to a LockerSplitClient.
 */
export async function createLockerSplitClient(
  params: LockerClientParams
): Promise<LockerSplitClient> {
  const lockerClient = await createLockerClient(params);
  const splitLockerClient = await lockerClient.extend(splitPluginActions);

  return {
    ...lockerClient,
    async createSplit(
      tokenAddress: string,
      percentage: number[],
      receiverAddresses: string[]
    ): Promise<any> {
      if (!(await isSplitPluginInstalled(splitLockerClient))) {
        console.log("Split plugin not installed.");
        return null;
      }
      const res = await splitLockerClient.createSplit({
        args: [tokenAddress, receiverAddresses, percentage],
      });
      return res;
    },
    async installSplitPlugin(): Promise<any> {
      if (await isSplitPluginInstalled(splitLockerClient)) {
        console.log("Split plugin already installed.");
        return null;
      }
      const res = await splitLockerClient.installSplitPlugin({
        args: [],
      });
      return res;
    },
    async isSplitPluginInstalled(): Promise<boolean> {
      return await isSplitPluginInstalled(splitLockerClient);
    },
    async uninstallSplitPlugin(): Promise<any> {
      if (!(await isSplitPluginInstalled(splitLockerClient))) {
        console.log("Split plugin not installed.");
        return null;
      }
      const res = await splitLockerClient.uninstallPlugin({
        pluginAddress: SPLIT_PLUGIN_ADDRESS,
      });
      return res;
    },
    async toggleAutomation(configIndex: number): Promise<any> {
      if (!(await isSplitPluginInstalled(splitLockerClient))) {
        console.log("Split plugin not installed.");
        return null;
      }
      const res = await splitLockerClient.pauseAutomation({
        args: [configIndex],
      });
      return res;
    },
    async split(configIndex: number): Promise<any> {
      if (!(await isSplitPluginInstalled(splitLockerClient))) {
        console.log("Split plugin not installed.");
        return null;
      }
      const res = await splitLockerClient.split({
        args: [BigInt(configIndex)],
      });
      return res;
    },
    async deleteSplit(configIndex: number): Promise<any> {
      if (!(await isSplitPluginInstalled(splitLockerClient))) {
        console.log("Split plugin not installed.");
        return null;
      }
      const res = await splitLockerClient.deleteSplitConfig({
        args: [BigInt(configIndex)],
      });
      return res;
    },
  };
}
