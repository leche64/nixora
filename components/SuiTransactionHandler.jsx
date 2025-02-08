"use client";

import { useWallet } from "@suiet/wallet-kit";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { toast } from "sonner";

export function useSuiTransfer() {
  const { connected, account, signAndExecuteTransactionBlock } = useWallet();

  const handleTransfer = async (transferRequest) => {
    if (!connected) {
      toast.error("Please connect your wallet first");
      return;
    }
    console.log("Transfer request:", transferRequest);
    console.log("Connected:", connected);

    try {
      // Parse the nested structure from the TRANSFER_REQUEST
      const parsedRequest = typeof transferRequest === "string" ? JSON.parse(transferRequest) : transferRequest;

      // Extract the actual transfer details from the tool_calls structure
      const transferDetails = parsedRequest.tool_calls?.[0]?.function?.arguments;
      const { recipientAddress, amount } =
        typeof transferDetails === "string" ? JSON.parse(transferDetails) : transferDetails;

      // Validate the essential parameters
      if (!recipientAddress || !amount) {
        throw new Error("Missing required transfer parameters");
      }

      // Convert SUI amount to MIST (1 SUI = 10^9 MIST)
      const amountInMist = BigInt(Math.round(parseFloat(amount) * 1e9));

      const txb = new TransactionBlock();
      txb.transferObjects([txb.splitCoins(txb.gas, [amountInMist])], txb.pure(recipientAddress));

      const result = await signAndExecuteTransactionBlock({
        transactionBlock: txb,
        options: { showEffects: true },
      });

      toast.success("Transfer completed successfully!");
      return result;
    } catch (error) {
      console.error("Transfer error:", error);

      if (error.message.includes("User rejected")) {
        toast.error("Transaction cancelled by user");
      } else {
        toast.error(`Transaction failed: ${error.message}`);
      }

      return null;
    }
  };

  return { handleTransfer };
}
