"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UrlInput } from "@/components/UrlInput";
import { SummaryCard } from "@/components/SummaryCard";
import { ActionButtons } from "@/components/ActionButtons";
import { SwipeableCard } from "@/components/SwipeableCard";
import { Button } from "@/components/ui/button";
import { SummaryWithUrl } from "@/types";
import { toast } from "sonner";
import { BookOpen, Sparkles } from "lucide-react";

export default function Home() {
  const [summary, setSummary] = useState<SummaryWithUrl | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchRandomSummary = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/urls/random");
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setSummary(undefined);
          toast.info(data.error?.message || "URLリストが空です");
        } else {
          throw new Error(data.error?.message || "記事の取得に失敗しました");
        }
      } else {
        setSummary(data);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "エラーが発生しました");
      setSummary(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeep = async () => {
    if (!summary) return;

    setIsProcessing(true);
    try {
      const response = await fetch("/api/saved", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url_id: summary.id,
          title: summary.title,
          summary: summary.summary,
          original_url: summary.url,
          tags: [],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "保存に失敗しました");
      }

      toast.success("記事を保存しました");
      await fetchRandomSummary();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscard = async () => {
    if (!summary) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/urls/${summary.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "削除に失敗しました");
      }

      toast.success("記事を削除しました");
      await fetchRandomSummary();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = async () => {
    await fetchRandomSummary();
  };

  useEffect(() => {
    fetchRandomSummary();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* ヘッダー */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">SwipeSummarize</h1>
          </div>
          <Link href="/saved">
            <Button variant="outline">
              <BookOpen className="h-4 w-4 mr-2" />
              保存済み
            </Button>
          </Link>
        </div>
        <p className="text-muted-foreground mb-6">
          記事をAI要約でサクサク消化。スワイプで「とっとく」か「すてる」を決めよう
        </p>

        {/* URL入力フォーム */}
        <div className="mb-6">
          <UrlInput onUrlAdded={fetchRandomSummary} />
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="space-y-6">
        {/* 要約カード（スワイプ可能） */}
        <div className="flex justify-center">
          <SwipeableCard
            onSwipeLeft={handleDiscard}
            onSwipeRight={handleKeep}
            onSwipeUp={handleRetry}
            disabled={!summary || isLoading || isProcessing}
          >
            <SummaryCard summary={summary} isLoading={isLoading} />
          </SwipeableCard>
        </div>

        {/* アクションボタン */}
        <ActionButtons
          onKeep={handleKeep}
          onDiscard={handleDiscard}
          onRetry={handleRetry}
          isLoading={isProcessing}
          disabled={!summary || isLoading}
          className="mt-6"
        />
      </div>
    </div>
  );
}