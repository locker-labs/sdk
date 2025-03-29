import { EChain } from "tokens";
import { base, baseSepolia, sepolia } from "@account-kit/infra";

const getUserOperationByHash = async (userOpHash: string, alchemyRpcUrl: string) => {
  const headers = {
    accept: "application/json",
    "content-type": "application/json",
  };

  const body = JSON.stringify({
    id: 1,
    jsonrpc: "2.0",
    method: "eth_getUserOperationByHash",
    params: [userOpHash],
  });

  try {
    const response = await fetch(alchemyRpcUrl, {
      method: "POST",
      headers: headers,
      body: body,
    });
    const data: any = await response.json();
    return data?.result?.transactionHash;
  } catch (e) {
    console.error(e);
  }
};

async function getTransactionReceipt(txHash: string, alchemyRpcUrl: string) {
  const headers = {
    accept: "application/json",
    "content-type": "application/json",
  };

  const body = JSON.stringify({
    id: 1,
    jsonrpc: "2.0",
    method: "eth_getTransactionReceipt",
    params: [txHash],
  });

  try {
    const response = await fetch(alchemyRpcUrl, {
      method: "POST",
      headers: headers,
      body: body,
    });

    const data: any = await response.json();
    return data?.result;
  } catch (error) {
    console.error("Error:", error);
  }
}

export const waitForTransaction = async (userOpHash: string, alchemyRpcUrl: string) => {
  console.log("Waiting for userOp confirmation...");

  let txHash;

  while (!txHash) {
    txHash = await getUserOperationByHash(userOpHash, alchemyRpcUrl);
    if (txHash) {
      console.log("txHash:", txHash);
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for 3 seconds before retrying
  }

  let txReceipt;
  console.log("Waiting for tx confirmation...");

  while (!txReceipt) {
    txReceipt = await getTransactionReceipt(txHash, alchemyRpcUrl);
    if (txReceipt) {
      console.log("Receipt:", txReceipt);
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second before retrying
  }
}

export const adaptLockerChain2ViemChain = (lockerChain: EChain) => {
  switch (lockerChain) {
    case EChain.BASE:
      return base;
    case EChain.BASE_SEPOLIA:
      return baseSepolia;
    case EChain.SEPOLIA:
      return sepolia;
    case EChain.SOLANA:
    case EChain.SOLANA_DEVNET:
    default:
      throw new Error(`Unsupported chain: ${lockerChain}`);
  }
}