"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfigForm } from "@/components/llm/config-form";
import { UsageDashboard } from "@/components/llm/usage-dashboard";
import { CostAnalysis } from "@/components/llm/cost-analysis";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, BarChart, DollarSign, Shield } from "lucide-react";

export default function LLMAdminPage() {
  const [activeTab, setActiveTab] = useState("settings");
  const [environment, setEnvironment] = useState<"local" | "staging" | "production">("local");

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">LLM管理</h1>
        <p className="text-muted-foreground">
          AIプロバイダーの設定、使用量の監視、コストの分析を行います
        </p>
      </div>

      {/* 環境選択 */}
      <Card>
        <CardHeader>
          <CardTitle>環境選択</CardTitle>
          <CardDescription>
            設定を行う環境を選択してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={environment} onValueChange={(v: string) => setEnvironment(v as "local" | "staging" | "production")}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="local">
                <Shield className="mr-2 h-4 w-4" />
                ローカル
              </TabsTrigger>
              <TabsTrigger value="staging">
                <Shield className="mr-2 h-4 w-4" />
                ステージング
              </TabsTrigger>
              <TabsTrigger value="production">
                <Shield className="mr-2 h-4 w-4" />
                本番
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* メインコンテンツ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            設定
          </TabsTrigger>
          <TabsTrigger value="usage">
            <BarChart className="mr-2 h-4 w-4" />
            使用量
          </TabsTrigger>
          <TabsTrigger value="cost">
            <DollarSign className="mr-2 h-4 w-4" />
            コスト分析
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <ConfigForm environment={environment} />
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <UsageDashboard environment={environment} />
        </TabsContent>

        <TabsContent value="cost" className="space-y-4">
          <CostAnalysis environment={environment} />
        </TabsContent>
      </Tabs>
    </div>
  );
}