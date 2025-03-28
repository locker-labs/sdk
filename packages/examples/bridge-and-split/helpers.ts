const alchemyRpcUrl = process.env.ALCHEMY_BASE_SEPOLIA_RPC_URL!;

const getUserOperationByHash = async (userOpHash: string) => {
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
      return data.result.transactionHash
    } catch (e) {
      console.error(e);
    }
  };

  async function getTransactionReceipt(txHash: string) {
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
      return data.result;
    } catch (error) {
      console.error("Error:", error);
    }
  }

export const waitForTransaction = async (userOpHash: string) => {

    let txHash;

    while (!txHash) {
      txHash = await getUserOperationByHash(userOpHash);
      if (txHash) {
        console.log("txHash:", txHash);
        break;
      }
      console.log("Waiting for txHash...");
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for 3 seconds before retrying
    }

    let txReceipt;

    while (!txReceipt) {
      txReceipt = await getTransactionReceipt(txHash);
      if (txReceipt) {
        console.log("Receipt:", txReceipt);
        break;
      }
      console.log("Waiting for txReceipt...");
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second before retrying
    }

}