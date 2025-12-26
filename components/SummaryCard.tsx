"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LinkIcon, FileText, Clock } from "lucide-react";
import { SummaryWithUrl } from "@/types";

interface SummaryCardProps {
  summary?: SummaryWithUrl;
  isLoading?: boolean;
}

export function SummaryCard({ summary, isLoading }: SummaryCardProps) {
  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl h-[500px]">
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="w-full max-w-2xl h-[500px] flex items-center justify-center">
        <CardContent className="text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>URLリストが空です</p>
          <p className="text-sm mt-2">新しいURLを追加してください</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const estimatedReadTime = Math.ceil(summary.original_length / 400);

  return (
    <Card className="w-full max-w-2xl h-[500px] flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl line-clamp-2">{summary.title}</CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <LinkIcon className="h-3 w-3" />
          <a
            href={summary.url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate hover:underline max-w-[300px]"
            title={summary.url}
          >
            {new URL(summary.url).hostname}
          </a>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>約{estimatedReadTime}分</span>
          </div>
          <span>{formatDate(summary.created_at)}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="mb-3">
          <Badge variant="secondary">AI要約</Badge>
        </div>
        <ScrollArea className="h-[300px] pr-4">
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            {summary.summary}
          </p>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}