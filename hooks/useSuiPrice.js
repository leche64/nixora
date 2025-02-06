import { useQuery } from "@tanstack/react-query";

const SUI_PRICE_QUERY_KEY = ["suiPrice"];
const STALE_TIME = 30 * 1000; // 30 seconds
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

export function useSuiPrice() {
  return useQuery({
    queryKey: SUI_PRICE_QUERY_KEY,
    queryFn: async function () {
      const response = await fetch("/api/sui-price");
      if (!response.ok) {
        throw new Error("Failed to fetch SUI price");
      }
      const data = await response.json();
      return data;
      s;
    },
    refetchInterval: 60 * 1000, // Refetch every minute
    refetchIntervalInBackground: true, // Continue refetching even when tab is in background
    staleTime: STALE_TIME, // Consider data fresh for 30 seconds
    gcTime: CACHE_TIME, // Keep unused data in cache for 5 minutes
    retry: 3, // Retry failed requests 3 times
    retryDelay: function (attemptIndex) {
      return Math.min(1000 * Math.pow(2, attemptIndex), 30000); // Exponential backoff
    },
  });
}
