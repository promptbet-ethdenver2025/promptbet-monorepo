"use client";

import { GET_BETS } from "@/app/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bet_OrderBy,
  GetBetsQuery,
  OrderDirection,
} from "@/lib/__generated__/graphql";
import { ChainConfig } from "@/lib/config";
import { renderUsdcPrefix } from "@/lib/usdcUtils";
import { useQuery } from "@apollo/client";
import { FC, useEffect, useState } from "react";
import { ActivityLine } from "./ActivityLine";
import { PlayerAddressChip } from "./PlayerAddressChip";

// Function to generate a random color based on address
const generateBannerColor = (address: string): string => {
  // Use the first 6 characters of the address as a hex color
  const colorHex = address.slice(2, 8);
  // Create a slightly transparent version for the banner
  return `#${colorHex}40`; // 40 is for 25% opacity
};

interface UserBetsPageProps {
  address: string;
  isSelf: boolean;
  tokenBalance?: string;
  chainConfig?: ChainConfig | null;
}

export const UserBetsPage: FC<UserBetsPageProps> = ({
  address,
  isSelf,
  tokenBalance = "0",
  chainConfig,
}) => {
  // Generate banner color based on address
  const bannerColor = address ? generateBannerColor(address) : "#00000040";

  return (
    <div className="container mx-auto py-8">
      {/* Twitter-style banner that merges with the profile card */}
      <div className="relative mb-16">
        <div
          className="w-full h-32 rounded-t-lg"
          style={{ backgroundColor: bannerColor }}
        />

        <div className="absolute -bottom-16 w-full">
          <UserProfile
            address={address}
            isSelf={isSelf}
            tokenBalance={tokenBalance}
            chainConfig={chainConfig}
          />
        </div>
      </div>

      <div className="mt-20">
        <UserBets address={address} />
      </div>
    </div>
  );
};

interface UserProfileProps {
  address: string;
  isSelf: boolean;
  tokenBalance: string;
  chainConfig?: ChainConfig | null;
}

const UserProfile: FC<UserProfileProps> = ({
  address,
  isSelf,
  tokenBalance,
  chainConfig,
}) => {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PlayerAddressChip
              address={address}
              showAvatar={true}
              variant="large"
            />
            {isSelf && (
              <span className="text-sm bg-blue-900/30 text-blue-400 px-2 py-1 rounded">
                You
              </span>
            )}
          </div>
          <div className="text-sm">
            <span className="text-gray-400">Balance: </span>
            <span className="font-mono flex items-center">
              {renderUsdcPrefix(chainConfig)}
              {parseFloat(tokenBalance || "0").toFixed(2)}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
    </Card>
  );
};

interface UserBetsProps {
  address: string;
}

const UserBets: FC<UserBetsProps> = ({ address }) => {
  if (!address) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Betting History</CardTitle>
      </CardHeader>
      <CardContent>
        <UserBetsActivity address={address} />
      </CardContent>
    </Card>
  );
};

interface UserBetsActivityProps {
  address: string;
}

const UserBetsActivity: FC<UserBetsActivityProps> = ({ address }) => {
  const [maxEntries, setMaxEntries] = useState(10);
  const [poolBets, setPoolBets] = useState<GetBetsQuery["bets"]>([]);
  const [showAdditionalBets, setShowAdditionalBets] = useState(0);
  const [hasMoreBets, setHasMoreBets] = useState(true);

  // Create filter for the user's bets
  const filter = { user: address };

  // Query for user's bets
  const {
    data: queryData,
    loading: isLoading,
    error,
    fetchMore,
  } = useQuery(GET_BETS, {
    variables: {
      first: maxEntries + showAdditionalBets,
      filter,
      orderBy: Bet_OrderBy.BlockTimestamp,
      orderDirection: OrderDirection.Desc,
    },
    skip: !address, // Skip the query if we don't have an address
  });

  // Update poolBets when query data changes
  useEffect(() => {
    if (queryData?.bets) {
      setPoolBets(queryData.bets);

      // If we received fewer bets than requested, there are no more to load
      if (queryData.bets.length < maxEntries + showAdditionalBets) {
        setHasMoreBets(false);
      } else {
        setHasMoreBets(true);
      }
    }
  }, [queryData, maxEntries, showAdditionalBets]);

  const handleLoadMore = () => {
    const newShowAdditional = showAdditionalBets + 10;
    setShowAdditionalBets(newShowAdditional);

    fetchMore({
      variables: {
        first: maxEntries + newShowAdditional,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return fetchMoreResult;
      },
    });
  };

  if (error) {
    return (
      <div className="text-center py-4 text-red-500">
        Error loading bets: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isLoading && poolBets.length === 0 && (
        <div className="text-center py-4">Loading activities...</div>
      )}
      {!isLoading && poolBets.length === 0 && (
        <div className="text-center py-4">No bets found</div>
      )}
      <div className="space-y-2">
        {poolBets.map((bet, index) => (
          <ActivityLine
            key={`${bet.id}-${index}`}
            bet={bet}
            showQuestion={true}
            showPoolImage={false}
          />
        ))}
      </div>

      {poolBets.length > 0 && hasMoreBets && (
        <div className="flex justify-center pt-2">
          <Button
            onClick={handleLoadMore}
            disabled={isLoading}
            variant="outline"
            className="w-full max-w-xs"
          >
            {isLoading ? "Loading..." : "Show More"}
          </Button>
        </div>
      )}
    </div>
  );
};
