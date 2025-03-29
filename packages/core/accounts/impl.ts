import { alchemy } from "@account-kit/infra";
import type { ILockerClientParams, ILockerClient } from "./types";
import { createModularAccountAlchemyClient } from "@account-kit/smart-contracts";
import { adaptLockerChain2AlchemyChain } from "helpers";

/**
 * Validates the input parameters for creating the client.
 */
function validateClientParams(params: ILockerClientParams): void {
  if (!params.alchemyApiKey || params.alchemyApiKey.trim() === "") {
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

/**
 * Creates a locker modular account client without any plugins.
 * Users can later install plugins onto this client using installPlugin.
 *
 * @param params - The configuration parameters for creating the client.
 * @returns A promise that resolves to the locker modular account client.
 */
export async function createLockerClient(
  params: ILockerClientParams
): Promise<ILockerClient> {
  validateClientParams(params);

  const { alchemyApiKey: apiKey, chain: lockerChain, signer } = params;

  const chain = adaptLockerChain2AlchemyChain(lockerChain);

  const aaClient = await createModularAccountAlchemyClient({
    signer,
    chain,
    transport: alchemy({ apiKey }),
  });

  const lockerClient: ILockerClient = {
    getAddress: () => aaClient.getAddress(),

    isPluginInstalled: async (plugin) => {
      const installedPlugins = await aaClient.getInstalledPlugins({});
      if (!installedPlugins.includes(plugin)) {
        return false;
      }
      return true;
    },

    extend: (pluginActions) => aaClient.extend(pluginActions) as ILockerClient,

    installPlugin: async (plugin) => {
      return await aaClient.installPlugin({
        pluginAddress: plugin,
      });
    },

    uninstallPlugin: async (plugin) => {
      return await aaClient.uninstallPlugin({ pluginAddress: plugin });
    },

    sendUserOps: async (to, data, value) => {
      return await aaClient.sendUserOperation({
        uo: {
          target: to,
          data,
          value,
        },
      });
    },
  };

  return lockerClient as ILockerClient;
}
