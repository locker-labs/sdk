import { LocalAccountSigner } from "@aa-sdk/core";
import { alchemy, baseSepolia } from "@account-kit/infra";
import { createModularAccountAlchemyClient } from "@account-kit/smart-contracts";
import { type Address } from "viem";
import * as dotenv from "dotenv";
dotenv.config();

export const chain = baseSepolia;

export interface LockerClientParams {
  apiKey: string; // Used for the Alchemy transport.
  chain: typeof baseSepolia;
  signer: ReturnType<typeof LocalAccountSigner.privateKeyToAccountSigner>;
  merchantSeed1?: string;
}

/**
 * Validates the input parameters for creating the client.
 */
function validateClientParams(params: LockerClientParams): void {
  if (!params.apiKey || params.apiKey.trim() === "") {
    throw new Error(
      "Invalid parameter: 'apiKey' is required and cannot be empty."
    );
  }
  if (!params.chain) {
    throw new Error("Invalid parameter: 'chain' is required.");
  }
  if (!params.signer) {
    throw new Error(
      "Invalid configuration: No signer provided and no default PRIVATE KEY found in environment."
    );
  }
}

export enum Plugins {
  SAVINGS_PLUGIN = "savings_plugin",
  SPLIT_PLUGIN = "split_plugin",
}

/**
 * Interface representing the LockerClient.
 * This is the client returned by createLockerClient.
 */
export interface LockerClient {
  /**
   * Extend the client with a plugin that adds extra functionality.
   * @param plugin - An object containing additional functions.
   * @returns The extended client.
   */
  address: () => Address;
  isPluginInstalled: (plugin: Address) => Promise<boolean>;
  extend: (pluginActions: any) => any;
  installPlugin: (plugin: Address) => Promise<any>;
  uninstallPlugin: (plugin: Address) => Promise<any>;
  sendUserOps: (to: Address, data: Address, value: bigint) => Promise<any>;
}

/**
 * Creates a locker modular account client without any plugins.
 * Users can later install plugins onto this client using installPlugin.
 *
 * @param params - The configuration parameters for creating the client.
 * @returns A promise that resolves to the locker modular account client.
 */
export async function createLockerClient(
  params: LockerClientParams
): Promise<LockerClient> {
  validateClientParams(params);

  const { apiKey, chain, signer } = params;

  const baseClient = await createModularAccountAlchemyClient({
    signer,
    chain,
    transport: alchemy({ apiKey }),
  });

  const lockerClient: LockerClient = {
    address: () => baseClient.getAddress(),
    isPluginInstalled: async (plugin) => {
      const installedPlugins = await baseClient.getInstalledPlugins({});
      if (!installedPlugins.includes(plugin)) {
        return false;
      }
      return true;
    },
    extend: (pluginActions) => baseClient.extend(pluginActions) as LockerClient,

    installPlugin: async (plugin) => {
      return await baseClient.installPlugin({
        pluginAddress: plugin,
      });
    },

    uninstallPlugin: async (plugin) => {
      return await baseClient.uninstallPlugin({ pluginAddress: plugin });
    },

    sendUserOps: async (to, data, value) => {
      return await baseClient.sendUserOperation({
        uo: {
          target: to,
          data,
          value,
        },
      });
    },
  };

  return lockerClient as LockerClient;
}
