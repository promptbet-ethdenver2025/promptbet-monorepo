"use client";
//TODO Doesn't support Option A or B, hardcoded to Yes and No
import { useEmbeddedWallet } from "@/components/EmbeddedWalletProvider";
import { placeBet } from "@/lib/betting";
import { MAX_OPTIONS, optionColor, OptionColorClasses } from "@/lib/config";
import { cn, usdcAmountToDollars } from "@/lib/utils";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import Image from "next/image";
import { useState } from "react";

type BetButtonProps = {
  option: string;
  optionIndex: number;
  colorClassnames: OptionColorClasses;
  isSelected?: boolean;
  poolId: string;
  chainId: string | number;
  /**
   * @deprecated This prop is deprecated and will be removed in a future version.
   * The button's disabled state is now handled internally based on loading state.
   */
  disabled?: boolean;
  amount: string;
  // New props for earnings calculation
  totalBetsByOption?: string[];
  totalBets?: string;
};

export const BetButton = ({
  option,
  optionIndex,
  colorClassnames,
  poolId,
  chainId,
  disabled,
  amount,
  totalBetsByOption = [],
  totalBets = "0",
}: BetButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { ready, wallets } = useWallets();
  const { login, authenticated } = usePrivy();
  const { chainConfig } = useEmbeddedWallet();

  // In Storybook/development, use mock data if real data isn't available

  // if (option.length > 24) {
  //   throw new Error("Option text cannot be longer than 24 characters");
  // }
  if (optionIndex < 0 || optionIndex >= MAX_OPTIONS) {
    throw new Error(`Invalid option index, can only be 0-${MAX_OPTIONS - 1}`);
  }

  // Log deprecation warning when disabled prop is used
  if (disabled !== undefined) {
    console.warn(
      "The 'disabled' prop in BetButton is deprecated and will be removed in a future version. " +
        "The button's disabled state is now handled internally based on loading state."
    );
  }

  // Calculate potential earnings
  const calculateEarnings = () => {
    if (
      !amount ||
      parseFloat(amount) === 0 ||
      !totalBetsByOption[optionIndex]
    ) {
      return 0;
    }

    const betAmountInUSDC = parseFloat(amount);
    const optionTotal = parseFloat(totalBetsByOption[optionIndex]);
    const totalPool = parseFloat(totalBets);

    // If there's no bets on the other side (i.e this option is 100% of the pool), you win your bet amount back
    if (optionTotal === totalPool) {
      return 0;
    }

    return (
      (betAmountInUSDC / (optionTotal + betAmountInUSDC)) *
        (totalPool + betAmountInUSDC) -
      betAmountInUSDC
    );
  };

  const potentialEarnings = calculateEarnings();

  const handleClick = async () => {
    console.log("Handling click");

    // If the user is not signed in with Privy, show the popup to allow them to sign in
    if (!authenticated) {
      login();
      return;
    }

    const embeddedWallet = wallets.find(
      (wallet) => wallet.walletClientType === "privy"
    )!;
    try {
      setIsLoading(true);

      // Use the placeBet function from our betting library
      const txResult = await placeBet(
        embeddedWallet,
        chainId,
        poolId,
        optionIndex,
        amount
      );

      alert("Transaction submitted successfully!");
    } catch (error) {
      console.error("Error processing bet:", error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Render the USDC prefix based on the chain config
  const renderUsdcPrefix = () => {
    const prefix = chainConfig?.usdcPrefix;

    if (!prefix) return "+$";

    if (typeof prefix === "string") {
      return `+${prefix}`;
    } else {
      return (
        <>
          +
          <Image
            src={prefix.src}
            width={prefix.width || 16}
            height={prefix.height || 16}
            alt="USDC"
            className="inline-block mr-0.5"
          />
        </>
      );
    }
  };

  return (
    <button
      className={cn(
        "min-w-42 min-h-32 px-4 font-medium fond-bold rounded-xl",
        "flex flex-col items-center justify-center font-bold",
        "w-full h-full border-2 transition-colors duration-200",
        colorClassnames.border,
        colorClassnames.text,
        {
          "text-white": isLoading,
          "bg-gray-900/50": disabled,
          [`${colorClassnames.border}/30`]: disabled,
          [`${colorClassnames.text}/50`]: disabled,
        }
      )}
      disabled={isLoading}
      type="button"
      onClick={handleClick}
      aria-busy={isLoading}
      aria-label={`Place bet on ${option}`}
      style={
        {
          borderColor: `hsl(var(--${optionColor[optionIndex]}-color))`,
          backgroundColor: isLoading
            ? `hsl(var(--${optionColor[optionIndex]}-color))`
            : "transparent",
          color: isLoading ? "white" : undefined,
          WebkitAppearance: "none",
          MozAppearance: "textfield",
          "--hover-color": `hsl(var(--${optionColor[optionIndex]}-color) / 0.2)`,
        } as React.CSSProperties
      }
      // Use onMouseEnter and onMouseLeave for hover effects
      onMouseEnter={(e) => {
        if (!isLoading && !disabled) {
          (
            e.currentTarget as HTMLButtonElement
          ).style.backgroundColor = `hsl(var(--${optionColor[optionIndex]}-color) / 0.2)`;
        }
      }}
      onMouseLeave={(e) => {
        if (!isLoading && !disabled) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "";
        }
      }}
    >
      <div className="flex flex-col items-center justify-center w-full h-full">
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2">Processing...</span>
          </div>
        ) : (
          <>
            <span
              className={`
                  text-center line-clamp-3 mb-1 w-full flex-grow flex items-center justify-center text-xl`}
            >
              {option}
            </span>
            <span className={`text-[8px] text-gray-500 w-full text-center`}>
              You could win
            </span>
            <span
              className={`text-lg font-medium w-full text-center flex items-center justify-center`}
            >
              <span className="flex items-center gap-1">
                {renderUsdcPrefix()}
                {usdcAmountToDollars(potentialEarnings)}
              </span>
            </span>
          </>
        )}
      </div>
    </button>
  );
};
