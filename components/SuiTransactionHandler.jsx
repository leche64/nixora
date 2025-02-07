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

      // Debug log the incoming amount
      console.log("Incoming amount before conversion:", amount);

      // Ensure amount is treated as a decimal number
      const amountNumber = parseFloat(amount);
      console.log("Amount after parseFloat:", amountNumber);

      // Convert SUI amount to MIST (1 SUI = 10^9 MIST)
      const amountInMist = BigInt(Math.round(amountNumber * 1e9));

      // Debug log the final MIST amount
      console.log("Final MIST amount:", amountInMist.toString());

      const txb = new TransactionBlock();

      // Create transfer transaction
      txb.transferObjects([txb.splitCoins(txb.gas, [amountInMist])], txb.pure(recipientAddress));

      try {
        const result = await signAndExecuteTransactionBlock({
          transactionBlock: txb,
          options: {
            showEffects: true,
          },
        });

        toast.success("Transfer completed successfully!");
        return result;
      } catch (error) {
        // Check specifically for user rejection
        if (error.message.includes("User rejected")) {
          toast.error("Transaction cancelled by user");
          return null; // Return null to indicate user cancellation
        }

        // Handle other wallet-related errors
        console.error("Wallet error:", error);
        toast.error("Transaction failed: " + error.message);
        return null;
      }
    } catch (error) {
      // Handle other errors (parsing, validation etc)
      console.error("Transfer error:", error);
      toast.error("Failed to process transfer request");
      return null;
    }
  };

  return { handleTransfer };
}
