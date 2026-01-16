"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { UrlInput } from "@/components/UrlInput";
import { SummaryCard } from "@/components/SummaryCard";
import { ActionButtons } from "@/components/ActionButtons";
import { WaitingList } from "@/components/WaitingList";
import { Button } from "@/components/ui/button";
import { SummaryWithUrl } from "@/types";
import { toast } from "sonner";
import { BookOpen, Sparkles } from "lucide-react";

// framer-motion を含む SwipeableCard を動的インポート（バンドルサイズ最適化）
const SwipeableCard = dynamic(
  () => import("@/components/SwipeableCard").then((mod) => mod.SwipeableCard),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-2xl">
        <SummaryCard isLoading={true} />
      </div>
    ),
  }
);

export default function Home() {
  const [summary, setSummary] = useState<SummaryWithUrl | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
    const currentSummaryId = summary.id;

    // 楽観的UI更新: 即座に現在のカードをクリア
    setSummary(undefined);

    try {
      // 保存APIと次の記事取得を並列実行
      const [saveResponse, nextSummaryResponse] = await Promise.all([
        fetch("/api/saved", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url_id: currentSummaryId,
            title: summary.title,
            summary: summary.summary,
            original_url: summary.url,
            tags: summary.tags || [],
          }),
        }),
        fetch("/api/urls/random"),
      ]);

      // 保存結果をチェック
      if (!saveResponse.ok) {
        const data = await saveResponse.json();
        throw new Error(data.error?.message || "保存に失敗しました");
      }

      toast.success("記事を保存しました");

      // 次の記事を設定
      if (nextSummaryResponse.ok) {
        const nextData = await nextSummaryResponse.json();
        setSummary(nextData);
      } else {
        const errorData = await nextSummaryResponse.json();
        if (nextSummaryResponse.status === 404) {
          toast.info(errorData.error?.message || "URLリストが空です");
        }
      }

      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "エラーが発生しました");
      // エラー時は再取得を試みる
      await fetchRandomSummary();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscard = async () => {
    if (!summary) return;

    setIsProcessing(true);
    const currentSummaryId = summary.id;

    // 楽観的UI更新: 即座に現在のカードをクリア
    setSummary(undefined);

    try {
      // 削除APIと次の記事取得を並列実行
      const [deleteResponse, nextSummaryResponse] = await Promise.all([
        fetch(`/api/urls/${currentSummaryId}`, {
          method: "DELETE",
        }),
        fetch("/api/urls/random"),
      ]);

      // 削除結果をチェック
      if (!deleteResponse.ok) {
        const data = await deleteResponse.json();
        throw new Error(data.error?.message || "削除に失敗しました");
      }

      toast.success("記事を削除しました");

      // 次の記事を設定
      if (nextSummaryResponse.ok) {
        const nextData = await nextSummaryResponse.json();
        setSummary(nextData);
      } else {
        const errorData = await nextSummaryResponse.json();
        if (nextSummaryResponse.status === 404) {
          toast.info(errorData.error?.message || "URLリストが空です");
        }
      }

      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "エラーが発生しました");
      // エラー時は再取得を試みる
      await fetchRandomSummary();
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
          <UrlInput onUrlAdded={() => {
            fetchRandomSummary();
            setRefreshTrigger(prev => prev + 1);
          }} />
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

      {/* Waiting List */}
      <div className="mt-8">
        <WaitingList refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}