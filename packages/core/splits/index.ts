import {
  createLockerClient,
  type LockerClientParams,
  type LockerClient,
} from "accounts";
import { splitPluginActions } from "./utils/splitsPlugin";
import { isSplitPluginInstalled } from "./utils/helpers";
import { SPLIT_PLUGIN_ADDRESS } from "./def/splitPluginConfig";

export interface LockerSplitClient extends LockerClient {
  createSplit: (
    tokenAddress: string,
    percentage: number[],
    receiverAddresses: string[]
  ) => Promise<any>;
  installSplitPlugin: () => Promise<any>;
  uninstallSplitPlugin: () => Promise<any>;
  pauseAutomation: (configIndex: number) => Promise<any>;
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
    async installSplitPlugin(): Promise<any> {
      if (await isSplitPluginInstalled(splitsLockerClient)) {
        console.log("Split plugin already installed.");
        return null;
      }
      const res = await splitsLockerClient.installSplitPlugin({ args: [] });
      return res;
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
    async pauseAutomation(configIndex: number): Promise<any> {
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
