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
      const parsedRequest = typeof transferRequest === "string" ? JSON.parse(transferRequest) : transferRequest;

      // Add detailed logging for the parsed request
      console.log("Parsed request:", JSON.stringify(parsedRequest, null, 2));

      // Validate the request structure
      if (!parsedRequest?.data?.details) {
        throw new Error("Invalid transfer request structure");
      }

      const amount = parseFloat(parsedRequest.data.details.amount);
      const recipientAddress = parsedRequest.data.details.recipientAddress;

      // Enhanced validation for recipient address
      if (!recipientAddress || recipientAddress.trim() === "") {
        throw new Error("Recipient address is required");
      }

      if (!recipientAddress.startsWith("0x") || recipientAddress.length !== 66) {
        throw new Error("Invalid Sui address format");
      }

      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid transfer amount");
      }

      console.log("Transfer details:", {
        fromAddress: account?.address,
        recipientAddress,
        amount,
        rawRequest: transferRequest,
      });

      const txb = new TransactionBlock();

      // Convert SUI amount to MIST (1 SUI = 10^9 MIST)
      const amountInMist = BigInt(Math.floor(amount * 1e9));

      // Directly transfer SUI from sender to recipient
      txb.transferObjects([txb.splitCoins(txb.gas, [amountInMist])], txb.pure(recipientAddress));

      const result = await signAndExecuteTransactionBlock({
        transactionBlock: txb,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      toast.success("Transaction submitted successfully!");
      return result;
    } catch (error) {
      console.error("Transfer error:", error);
      toast.error(error.message || "Transaction failed. Please try again.");
      throw error;
    }
  };

  return { handleTransfer };
}
