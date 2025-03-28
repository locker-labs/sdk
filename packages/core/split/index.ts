import {
  createLockerClient,
  type LockerClientParams,
  type LockerClient,
} from "accounts";
import { type Address } from "viem";
import { splitPluginActions as baseSplitPluginActions } from "./gen/base/split/plugin";
import { splitPluginActions as sepoliaSplitPluginActions } from "./gen/sepolia/split/plugin";
import { splitPluginActions as baseSepoliaSplitPluginActions } from "./gen/baseSepolia/split/plugin";
import { isSplitPluginInstalled } from "./utils/helpers";
import { chainToSplitPluginAddress } from "./def/splitPluginConfig";
import { base, baseSepolia } from "viem/chains";
import { waitForTransaction } from '../helpers';

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
  const splitPluginActions =
    params.chain.id === base.id
      ? baseSplitPluginActions
      : params.chain.id === baseSepolia.id ?
      baseSepoliaSplitPluginActions
      : sepoliaSplitPluginActions;
  const splitLockerClient = await lockerClient.extend(splitPluginActions);
  const chainId = params.chain.id;
  return {
    ...lockerClient,
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
      await waitForTransaction(res.hash);
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

      let pluginInstalled = await isSplitPluginInstalled(splitLockerClient, chainId);
      while (!pluginInstalled) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        pluginInstalled = await isSplitPluginInstalled(splitLockerClient, chainId);
        console.log("Waiting for split plugin to be installed...");
      }
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
        pluginAddress: chainToSplitPluginAddress[params.chain.id],
      });
      return res;
    },
    async toggleAutomation(configIndex: number): Promise<any> {
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
    async deleteSplit(configIndex: number): Promise<any> {
      if (!(await isSplitPluginInstalled(splitLockerClient, chainId))) {
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
