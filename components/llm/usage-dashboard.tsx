"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarIcon, RefreshCw, TrendingUp, TrendingDown, Activity, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UsageStats {
  totalRequests: number;
  successRate: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
  byProvider: Record<string, { count: number; cost: number; tokens: number }>;
  byModel: Record<string, { count: number; cost: number; tokens: number }>;
  byStatus: Record<string, number>;
}

interface UsageDashboardProps {
  environment?: "local" | "staging" | "production";
}

export function UsageDashboard({ environment = "local" }: UsageDashboardProps) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7日前
    to: new Date(),
  });
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [selectedModel, setSelectedModel] = useState<string>("all");

  const fetchUsageData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        environment,
        start_date: dateRange.from.toISOString(),
        end_date: dateRange.to.toISOString(),
      });

      if (selectedProvider !== "all") {
        params.append("provider", selectedProvider);
      }
      if (selectedModel !== "all") {
        params.append("model", selectedModel);
      }

      const response = await fetch(`/api/admin/llm-usage?${params.toString()}`);
      if (!response.ok) throw new Error("使用量データの取得に失敗しました");

      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error("Failed to fetch usage data:", error);
      toast.error("使用量データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, [environment, dateRange, selectedProvider, selectedModel]);

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
    }).format(cost);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("ja-JP").format(num);
  };

  if (!stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle>使用量ダッシュボード</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* 日付範囲 */}
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      format(dateRange.from, "PPP", { locale: ja })
                    ) : (
                      <span>開始日を選択</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date: Date | undefined) => date && setDateRange({ ...dateRange, from: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="flex items-center">〜</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? (
                      format(dateRange.to, "PPP", { locale: ja })
                    ) : (
                      <span>終了日を選択</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date: Date | undefined) => date && setDateRange({ ...dateRange, to: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* 更新ボタン */}
            <Button
              variant="outline"
              size="icon"
              onClick={fetchUsageData}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総リクエスト数</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalRequests)}</div>
            <p className="text-xs text-muted-foreground">
              成功率: {stats.successRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総コスト</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(stats.totalCost)}</div>
            <p className="text-xs text-muted-foreground">
              平均: {formatCost(stats.totalCost / Math.max(stats.totalRequests, 1))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総トークン数</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalTokens)}</div>
            <p className="text-xs text-muted-foreground">
              平均: {formatNumber(Math.round(stats.totalTokens / Math.max(stats.totalRequests, 1)))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均応答時間</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">
              {stats.avgResponseTime < 1000 ? "高速" : stats.avgResponseTime < 3000 ? "標準" : "低速"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* プロバイダー別統計 */}
      <Card>
        <CardHeader>
          <CardTitle>プロバイダー別統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.byProvider).map(([provider, data]) => (
              <div key={provider} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{provider}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatNumber(data.count)} リクエスト
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm">{formatNumber(data.tokens)} トークン</span>
                  <span className="text-sm font-medium">{formatCost(data.cost)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* モデル別統計 */}
      <Card>
        <CardHeader>
          <CardTitle>モデル別統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.byModel).map(([model, data]) => (
              <div key={model} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{model}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatNumber(data.count)} リクエスト
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm">{formatNumber(data.tokens)} トークン</span>
                  <span className="text-sm font-medium">{formatCost(data.cost)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ステータス別統計 */}
      <Card>
        <CardHeader>
          <CardTitle>ステータス別統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <div key={status} className="text-center">
                <Badge
                  variant={
                    status === "success" ? "default" :
                    status === "error" ? "destructive" :
                    "secondary"
                  }
                  className="mb-2"
                >
                  {status}
                </Badge>
                <p className="text-2xl font-bold">{formatNumber(count)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}