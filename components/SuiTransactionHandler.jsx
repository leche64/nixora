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

      const result = await signAndExecuteTransactionBlock({
        transactionBlock: txb,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      toast.success(
        <div className="flex flex-col gap-2">
          <p>Transaction submitted successfully!</p>
          <p className="text-sm text-muted-foreground break-all">TX: {result.digest}</p>
        </div>,
        {
          duration: 6000,
          action: {
            label: "View TX",
            onClick: () => window.open(`https://suiexplorer.com/txblock/${result.digest}`, "_blank"),
          },
        }
      );
      return result;
    } catch (error) {
      if (error.message.includes("User rejected")) {
        toast.error("Transaction cancelled by user", {
          duration: 3000,
        });
      } else {
        toast.error(`Transaction failed: ${error.message}`, {
          duration: 4000,
        });
      }
      throw error; // Re-throw to handle in the calling code if needed
    }
  };

  return { handleTransfer };
}
