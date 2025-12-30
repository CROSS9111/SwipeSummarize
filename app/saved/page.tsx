"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ExternalLink, Calendar, Tag } from "lucide-react";
import { SavedRecord } from "@/types";
import { toast } from "sonner";
import { DeleteButton } from "@/components/saved/DeleteButton";
import { ConfirmDeleteDialog } from "@/components/saved/ConfirmDeleteDialog";
import { BatchSelectControl } from "@/components/saved/BatchSelectControl";

export default function SavedPage() {
  const [savedItems, setSavedItems] = useState<SavedRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "single" | "batch" | "all";
    ids?: string[];
    title?: string;
  } | null>(null);

  useEffect(() => {
    fetchSavedItems();
  }, []);

  const fetchSavedItems = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/saved");
      if (!response.ok) {
        throw new Error("保存済みリストの取得に失敗しました");
      }
      const data = await response.json();
      setSavedItems(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 選択状態の管理
  const handleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(savedItems.map((item) => item.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // 削除モーダルを開く
  const openDeleteModal = (
    type: "single" | "batch" | "all",
    ids?: string[],
    title?: string
  ) => {
    setDeleteTarget({ type, ids, title });
    setDeleteModalOpen(true);
  };

  // 削除処理を実行
  const executeDeletion = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      let response: Response;

      switch (deleteTarget.type) {
        case "single":
          if (!deleteTarget.ids || deleteTarget.ids.length === 0) return;
          response = await fetch(`/api/delete/${deleteTarget.ids[0]}`, {
            method: "DELETE",
          });
          break;

        case "batch":
          if (!deleteTarget.ids || deleteTarget.ids.length === 0) return;
          response = await fetch("/api/delete/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: deleteTarget.ids }),
          });
          break;

        case "all":
          response = await fetch("/api/delete/all", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confirm: true }),
          });
          break;

        default:
          return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "削除に失敗しました");
      }

      // 成功時の処理
      const result = await response.json();
      const count = result.deletedCount || 1;
      toast.success(
        deleteTarget.type === "single"
          ? "記事が削除されました"
          : `${count}件の記事が削除されました`
      );

      // UIを更新
      setSelectedIds([]);
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      await fetchSavedItems(); // リストを再取得
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  // 削除確認メッセージを生成
  const getDeleteMessage = () => {
    if (!deleteTarget) return { title: "", message: "" };

    switch (deleteTarget.type) {
      case "single":
        return {
          title: "記事を削除しますか？",
          message: `「${deleteTarget.title}」を削除します。この操作は取り消せません。`,
        };
      case "batch":
        return {
          title: "選択した記事を削除しますか？",
          message: `${deleteTarget.ids?.length}件の記事を削除します。この操作は取り消せません。`,
        };
      case "all":
        return {
          title: "全ての記事を削除しますか？",
          message: `保存済みの全ての記事（${savedItems.length}件）が削除されます。この操作は取り消せません。`,
        };
      default:
        return { title: "", message: "" };
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* ヘッダー */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">保存済みの記事</h1>
            <p className="text-muted-foreground">
              とっとくした記事の要約一覧
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              ホームに戻る
            </Button>
          </Link>
        </div>
      </header>

      {/* 一括選択コントロール */}
      {!isLoading && savedItems.length > 0 && (
        <BatchSelectControl
          selectedCount={selectedIds.length}
          totalCount={savedItems.length}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onDeleteSelected={() =>
            openDeleteModal("batch", selectedIds)
          }
          onDeleteAll={() => openDeleteModal("all")}
          disabled={isDeleting}
        />
      )}

      {/* コンテンツ */}
      <div>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : savedItems.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground mb-4">
                まだ保存済みの記事がありません
              </p>
              <Link href="/">
                <Button>記事を仕分ける</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {savedItems.map((item) => (
              <Card key={item.id} className="flex flex-col h-full relative">
                {/* チェックボックスと削除ボタン */}
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.includes(item.id)}
                    onCheckedChange={() => handleSelectItem(item.id)}
                    aria-label={`${item.title}を選択`}
                  />
                  <DeleteButton
                    id={item.id}
                    onDelete={(id) =>
                      openDeleteModal("single", [id], item.title)
                    }
                    disabled={isDeleting}
                  />
                </div>

                <CardHeader className="pr-24">
                  <CardTitle className="text-lg line-clamp-2">
                    {item.title}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                  <a
                    href={item.original_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    元の記事を読む
                  </a>
                </CardHeader>
                <CardContent className="flex-1">
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {item.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <ScrollArea className="h-32">
                    <p className="text-sm leading-relaxed line-clamp-6">
                      {item.summary}
                    </p>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      <ConfirmDeleteDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={getDeleteMessage().title}
        message={getDeleteMessage().message}
        onConfirm={executeDeletion}
        loading={isDeleting}
      />
    </div>
  );
}