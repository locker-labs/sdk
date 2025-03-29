import { type Address } from "viem";
import { LocalAccountSigner } from "@aa-sdk/core";
import type { EChain } from "tokens";

export interface ILockerClientParams {
  alchemyApiKey: string; // Used for the Alchemy transport.
  chain: EChain;
  signer: ReturnType<typeof LocalAccountSigner.privateKeyToAccountSigner>;
  merchantSeed1?: string;
  salt?: bigint;
}

export enum EPlugins {
    SAVINGS_PLUGIN = "savings_plugin",
    SPLIT_PLUGIN = "split_plugin",
}

/**
 * Interface representing the LockerClient.
 * This is the client returned by createLockerClient.
 */
export type ILockerClient = {
    /**
     * Extend the client with a plugin that adds extra functionality.
     * @param plugin - An object containing additional functions.
     * @returns The extended client.
     */
    getAddress: () => Address;
    isPluginInstalled: (plugin: Address) => Promise<boolean>;
    extend: (pluginActions: any) => any;
    installPlugin: (plugin: Address) => Promise<any>;
    uninstallPlugin: (plugin: Address) => Promise<any>;
    sendUserOps: (to: Address, data: Address, value: bigint) => Promise<any>;
}