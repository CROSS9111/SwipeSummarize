"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { WaitingListItem } from "./WaitingListItem";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

interface WaitingItem {
  id: string;
  url: string;
  created_at: string;
}

interface WaitingListProps {
  refreshTrigger?: number;
}

export function WaitingList({ refreshTrigger }: WaitingListProps) {
  const [items, setItems] = useState<WaitingItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchWaitingList = useCallback(async (pageNum: number, reset = false) => {
    if (!reset && (isLoading || !hasMore)) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/urls/waiting-list?page=${pageNum}&limit=20`);

      if (!response.ok) {
        throw new Error("Failed to fetch waiting list");
      }

      const data = await response.json();

      setItems(prev => reset ? data.items : [...prev, ...data.items]);
      setHasMore(data.pagination.hasMore);
      setTotal(data.pagination.total);
      setPage(pageNum);

      if (reset) {
        setIsInitialLoad(false);
      }
    } catch (error) {
      console.error("Error fetching waiting list:", error);
      if (pageNum === 1) {
        toast.error("リストの取得に失敗しました");
      }
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading]);

  // Initial load and refresh on trigger
  useEffect(() => {
    fetchWaitingList(1, true);
  }, [refreshTrigger, fetchWaitingList]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isInitialLoad) {
          fetchWaitingList(page + 1);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [page, hasMore, isLoading, isInitialLoad, fetchWaitingList]);

  if (isInitialLoad && isLoading) {
    return (
      <div className="border rounded-lg p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!isInitialLoad && items.length === 0) {
    return (
      <div className="border rounded-lg p-8">
        <div className="text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>待機中の記事はありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Waiting List
          </h2>
          <span className="text-sm text-muted-foreground">
            {total}件
          </span>
        </div>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="p-2">
          {items.map((item) => (
            <WaitingListItem
              key={item.id}
              url={item.url}
              createdAt={item.created_at}
            />
          ))}

          {hasMore && (
            <div ref={observerTarget} className="py-4 flex justify-center">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchWaitingList(page + 1)}
                >
                  さらに読み込む
                </Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}