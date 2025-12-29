"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { PRICING } from "@/lib/llm/pricing";

interface CostAnalysisProps {
  environment?: "local" | "staging" | "production";
  dateRange?: { from: Date; to: Date };
}

interface CostData {
  daily: Array<{ date: string; cost: number; requests: number }>;
  byProvider: Array<{ name: string; cost: number; percentage: number }>;
  byModel: Array<{ name: string; cost: number; requests: number }>;
  projections: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  budget: {
    used: number;
    limit: number;
    percentage: number;
  };
}

export function CostAnalysis({ environment = "local", dateRange }: CostAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [costData, setCostData] = useState<CostData | null>(null);
  const [view, setView] = useState<"daily" | "provider" | "model">("daily");

  useEffect(() => {
    fetchCostData();
  }, [environment, dateRange]);

  const fetchCostData = async () => {
    setLoading(true);
    try {
      // 実際のAPIコールの実装
      const mockData: CostData = {
        daily: Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return {
            date: format(date, "MM/dd"),
            cost: Math.random() * 10,
            requests: Math.floor(Math.random() * 1000),
          };
        }),
        byProvider: [
          { name: "Google", cost: 15.32, percentage: 35 },
          { name: "OpenAI", cost: 12.45, percentage: 28 },
          { name: "Anthropic", cost: 8.76, percentage: 20 },
          { name: "Azure", cost: 7.54, percentage: 17 },
        ],
        byModel: [
          { name: "gemini-2.0-flash-exp", cost: 15.32, requests: 2341 },
          { name: "gpt-4o", cost: 12.45, requests: 543 },
          { name: "claude-3-5-haiku", cost: 8.76, requests: 1234 },
        ],
        projections: {
          daily: 6.15,
          weekly: 43.05,
          monthly: 184.50,
          yearly: 2244.75,
        },
        budget: {
          used: 44.07,
          limit: 100,
          percentage: 44.07,
        },
      };
      setCostData(mockData);
    } catch (error) {
      console.error("Failed to fetch cost data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(cost);
  };

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  if (loading || !costData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 予算状況 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            予算使用状況
            {costData.budget.percentage > 80 && (
              <Badge variant="destructive" className="ml-2">
                <AlertCircle className="mr-1 h-3 w-3" />
                予算警告
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>使用済み</span>
              <span className="font-medium">{formatCost(costData.budget.used)}</span>
            </div>
            <Progress value={costData.budget.percentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{costData.budget.percentage.toFixed(1)}%</span>
              <span>予算: {formatCost(costData.budget.limit)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* コスト予測 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">日次平均</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(costData.projections.daily)}</div>
            <p className="text-xs text-muted-foreground">過去7日間の平均</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">週次予測</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(costData.projections.weekly)}</div>
            <p className="text-xs text-muted-foreground">現在のペースで</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">月次予測</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(costData.projections.monthly)}</div>
            <p className="text-xs text-muted-foreground">現在のペースで</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">年次予測</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(costData.projections.yearly)}</div>
            <p className="text-xs text-muted-foreground">現在のペースで</p>
          </CardContent>
        </Card>
      </div>

      {/* コスト分析グラフ */}
      <Card>
        <CardHeader>
          <CardTitle>コスト分析</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={view} onValueChange={(v: string) => setView(v as "daily" | "provider" | "model")}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">日次推移</TabsTrigger>
              <TabsTrigger value="provider">プロバイダー別</TabsTrigger>
              <TabsTrigger value="model">モデル別</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={costData.daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCost(value) : ''} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="#3b82f6"
                    name="コスト"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="provider" className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costData.byProvider}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name} (${entry.percentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="cost"
                  >
                    {costData.byProvider.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCost(value) : ''} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {costData.byProvider.map((provider, index) => (
                  <div key={provider.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm">{provider.name}</span>
                    </div>
                    <span className="text-sm font-medium">{formatCost(provider.cost)}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="model" className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={costData.byModel}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCost(value) : ''} />
                  <Legend />
                  <Bar dataKey="cost" fill="#3b82f6" name="コスト" />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* コスト最適化の提案 */}
      <Card>
        <CardHeader>
          <CardTitle>コスト最適化の提案</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="mt-0.5">提案</Badge>
              <div className="text-sm">
                <p className="font-medium">より安価なモデルへの切り替え</p>
                <p className="text-muted-foreground">
                  現在のgpt-4oの使用をgemini-2.0-flash-expに切り替えることで、月額約{formatCost(5.23)}節約できます
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="mt-0.5">提案</Badge>
              <div className="text-sm">
                <p className="font-medium">キャッシュの活用</p>
                <p className="text-muted-foreground">
                  頻繁に要約される記事をキャッシュすることで、月額約{formatCost(2.15)}節約できます
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="mt-0.5">提案</Badge>
              <div className="text-sm">
                <p className="font-medium">バッチ処理の活用</p>
                <p className="text-muted-foreground">
                  リアルタイム処理が不要な要約をバッチ処理に切り替えることで、コストを50%削減できます
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}