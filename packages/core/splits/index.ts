import { createExtendedSplitsClient,type ExtendedClientParams } from "./utils/extendedClient";
import { isSplitPluginInstalled } from "./utils/helpers";
import { SPLIT_PLUGIN_ADDRESS } from "./def/config";

export type LockerSplitClient = {
  createSplit: (
    tokenAddress: string,
    percentage: number[],
    receiverAddresses: string[]
  ) => Promise<any>;
  installSplitPlugin: () => Promise<any>;
  uninstallSplitPlugin: () => Promise<any>;
  pauseAutomation: (configIndex: number) => Promise<any>;
  split: (configIndex: number) => Promise<any>;
  sendUserOperation: (
    target: `0x${string}`,
    data: `0x${string}`,
    value: bigint
  ) => Promise<any>;
};

/**
 * Creates a locker splits client that the end user interacts with.
 * It takes in all necessary parameters to build the extended client, then wraps it to expose only selected functions.
 *
 * @param params - The configuration parameters(ExtendedClientParams) for creating the client.
 * @returns A promise that resolves to a LockerSplitClient.
 */
export async function createLockerSplitClient(
  params: ExtendedClientParams
): Promise<LockerSplitClient> {
  const extendedAccount = await createExtendedSplitsClient(params);

  return {
    async createSplit(
      tokenAddress: string,
      percentage: number[],
      receiverAddresses: string[]
    ): Promise<any> {
      console.log("Creating automation...");
      if (!(await isSplitPluginInstalled(extendedAccount))) {
        console.log("Split plugin not installed.");
        return null;
      }
      const res = await extendedAccount.createSplit({
        args: [tokenAddress, receiverAddresses, percentage],
      });
      console.log("Automation created with:", res.hash);
      return res;
    },
    async installSplitPlugin(): Promise<any> {
      console.log("Installing the Split plugin...");
      if (await isSplitPluginInstalled(extendedAccount)) {
        console.log("Split plugin already installed.");
        return null;
      }
      const res = await extendedAccount.installSplitPlugin({ args: [] });
      console.log("Split Plugin installed:", res.hash);
      return res;
    },
    async uninstallSplitPlugin(): Promise<any> {
      console.log("Uninstalling the split plugin...");
      if (!(await isSplitPluginInstalled(extendedAccount))) {
        console.log("Split plugin not installed.");
        return null;
      }
      const res = await extendedAccount.uninstallPlugin({
        pluginAddress: SPLIT_PLUGIN_ADDRESS,
      });
      console.log("Split Plugin uninstalled:", res.hash);
      return res;
    },
    async pauseAutomation(configIndex: number): Promise<any> {
      console.log("Pausing automation...");
      if (!(await isSplitPluginInstalled(extendedAccount))) {
        console.log("Split plugin not installed.");
        return null;
      }
      const res = await extendedAccount.pauseAutomation({
        args: [configIndex],
      });
      console.log("Automation paused with:", res.hash);
      return res;
    },
    async split(configIndex: number): Promise<any> {
      console.log("Splitting...");
      if (!(await isSplitPluginInstalled(extendedAccount))) {
        console.log("Split plugin not installed.");
        return null;
      }
      const res = await extendedAccount.split({ args: [BigInt(configIndex)] });
      console.log("Split executed with:", res.hash);
      return res;
    },
    async sendUserOperation(
      target: `0x${string}`,
      data: `0x${string}`,
      value: bigint
    ): Promise<any> {
      console.log("Sending user operation...");
      const res = await extendedAccount.sendUserOperation({
        uo: {
          target,
          data,
          value,
        },
      });
      console.log("User operation sent with:", res.hash);
      return res;
    },
  };
}