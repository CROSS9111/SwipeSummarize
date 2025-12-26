import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function summarizeContent(title: string, content: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
以下の記事を日本語で3〜5文に要約してください。
重要なポイントを箇条書きではなく、自然な文章でまとめてください。

タイトル: ${title}

本文:
${content.slice(0, 10000)}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("要約の生成に失敗しました。時間をおいてもう一度お試しください。");
  }
}