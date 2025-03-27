import { LocalAccountSigner } from "@aa-sdk/core";
import { alchemy, baseSepolia } from "@account-kit/infra";
import { createModularAccountAlchemyClient } from "@account-kit/smart-contracts";
import { splitPluginActions } from "./splitsPlugin";
import * as dotenv from "dotenv";
dotenv.config();

export const chain = baseSepolia;
const DEFAULT_PRIV_KEY = process.env.PRIV_KEY!;
const DEFAULT_ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY!;

export interface ExtendedClientParams {
  apiKey: string;
  chain: typeof baseSepolia;
  signer?: ReturnType<typeof LocalAccountSigner.privateKeyToAccountSigner>;
  merchantSeed1?: string;
}

/**
 * Validates the input parameters for createLockerSplitsClient.
 * Throws an error if any required parameter is missing or invalid.
 */
function validateLockerSplitsClientParams(params: ExtendedClientParams): void {
  if (!params.apiKey || params.apiKey.trim() === "") {
    throw new Error(
      "Invalid parameter: 'apiKey' is required and cannot be empty."
    );
  }
  if (!params.chain) {
    throw new Error("Invalid parameter: 'chain' is required.");
  }
  if (!params.signer && (!DEFAULT_PRIV_KEY || DEFAULT_PRIV_KEY.trim() === "")) {
    throw new Error(
      "Invalid configuration: No signer provided and no default PRIVATE KEY found in environment."
    );
  }
}

/**
 * Creates a locker splits client by validating inputs, initializing the underlying modular account client,
 * and extending it with the splits plugin.
 *
 * @param params - The configuration parameters for creating the client.
 * @returns A promise that resolves to the extended client.
 */
export async function createExtendedSplitsClient(
  params: ExtendedClientParams
): Promise<any> {
  validateLockerSplitsClientParams(params);

  const { apiKey, chain, signer } = params;
  const resolvedSigner =
    signer ??
    LocalAccountSigner.privateKeyToAccountSigner(`0x${DEFAULT_PRIV_KEY}`);
  const resolvedAlchemyApiKey = DEFAULT_ALCHEMY_API_KEY || apiKey;

  const modularAccountClient = await createModularAccountAlchemyClient({
    signer: resolvedSigner,
    chain,
    transport: alchemy({ apiKey: resolvedAlchemyApiKey }),
  });

  const extendedClient = modularAccountClient.extend(splitPluginActions);
  return extendedClient;
}

/**
 * Define a type alias for the extended client using our function's inferred return type.
 */
export type ExtendedClient = Awaited<ReturnType<typeof createExtendedSplitsClient>>;
