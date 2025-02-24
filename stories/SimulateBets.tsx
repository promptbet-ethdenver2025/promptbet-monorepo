"use client";

import { GET_POOL } from "@/app/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PoolStatus } from "@/lib/__generated__/graphql";
import { shame, USDC_DECIMALS, usdcAmountToDollars } from "@/lib/utils";
import { useQuery } from "@apollo/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useForm } from "react-hook-form";
import * as z from "zod";

interface SimulateBetsProps {
  poolId: string;
}

const LoadingSkeleton = () => (
  <Card className="w-full max-w-md mx-auto">
    <CardHeader>
      <Skeleton className="h-8 w-40" />
    </CardHeader>
    <CardContent className="space-y-4">
      <div>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-36" />
      </div>
    </CardContent>
  </Card>
);

const betFormSchema = z.object({
  betAmount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)), "Must be a valid number")
    .refine((val) => parseFloat(val) > 0, "Bet amount must be greater than 0")
    .refine(
      (val) => parseFloat(val) <= 10000,
      "Maximum bet amount is 10,000 USDC"
    ),
});

type BetFormValues = z.infer<typeof betFormSchema>;

export const SimulateBets = ({ poolId }: SimulateBetsProps) => {
  const {
    register,
    watch,
    formState: { errors },
  } = useForm<BetFormValues>({
    resolver: zodResolver(betFormSchema),
    defaultValues: {
      betAmount: "100",
    },
  });

  const privy = usePrivy();
  const { ready, wallets } = useWallets();
  console.log("ready", ready);
  console.log("wallets", wallets);
  console.log("wallet[0]", wallets[0]);
  const betAmount = watch("betAmount");

  const {
    data,
    loading,
    error: queryError,
  } = useQuery(GET_POOL, {
    variables: { poolId: shame(poolId) },
  });

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (queryError) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="py-4">
          <div className="text-red-500">
            Error loading bet data. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPool = data?.pool?.totalBets;
  const bettingOpen = data?.pool?.status === PoolStatus.Pending;
  const postiveOption = data?.pool?.options[0] || "Oh, yes";
  const negativeOption = data?.pool?.options[1] || "Oh, No";
  const totalPositiveBets = data?.pool?.totalBetsByOption[0];
  const totalNegativeBets = data?.pool?.totalBetsByOption[1];

  // Calculate potential earnings
  const calculateEarnings = (optionTotal: number) => {
    const bet = parseFloat(betAmount) * Math.pow(10, USDC_DECIMALS); //betAmount is written by user in dollars, so we need to convert it to USDC
    const totalPoolParsed = parseFloat(totalPool); // Total pool comes from contract and is already in USDC
    if (!bet) {
      return 0;
    }
    // If there's no bets on the other side (i.e this option is 100% of the pool), you win your bet amount back
    if (optionTotal === totalPool) {
      return 0;
    }
    return (bet / (optionTotal + bet)) * (totalPoolParsed + bet) - bet;
  };

  const positiveEarnings = calculateEarnings(totalPositiveBets);
  const negativeEarnings = calculateEarnings(totalNegativeBets);

  const handleOptionClick = (option: string) => {
    alert(`I would place a bet on ${option} here, if I had one`);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Simulate Your Bet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="betAmount" className="text-sm font-medium block mb-2">
            Bet Amount
          </label>
          <Input
            id="betAmount"
            type="number"
            {...register("betAmount")}
            className={`w-full ${errors.betAmount ? "border-red-500" : ""}`}
            min="0"
            step="1"
          />
          {errors.betAmount && (
            <div className="text-sm text-red-500 mt-1">
              {errors.betAmount.message}
            </div>
          )}
        </div>
        <div className="text-sm text-gray-500 text-center">
          Potential Earnings
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => handleOptionClick(postiveOption)}
            className="w-full h-auto py-4 flex flex-col items-center
            border-option-a bg-option-a/30"
            variant="outline"
            disabled={!bettingOpen}
          >
            <span className="text-lg font-semibold mb-2">{postiveOption}</span>
            <span className="text-lg font-bold">
              {usdcAmountToDollars(positiveEarnings)}
            </span>
            <span className={"text-xs text-muted-foreground"}>
              {usdcAmountToDollars(totalPositiveBets)} bets in pool
            </span>
          </Button>

          <Button
            onClick={() => handleOptionClick(negativeOption)}
            className="w-full h-auto py-4 flex flex-col items-center
            border-option-b bg-option-b/30"
            disabled={!bettingOpen}
            variant="outline"
          >
            <span className="text-lg font-semibold mb-2">{negativeOption}</span>
            <span className="text-lg font-bold">
              {usdcAmountToDollars(negativeEarnings)}
            </span>
            <span className={"text-xs text-muted-foreground"}>
              {usdcAmountToDollars(totalNegativeBets)} bets in pool
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
