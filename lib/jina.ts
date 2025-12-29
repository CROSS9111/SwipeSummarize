import { JinaResponse } from "@/types";

export async function fetchArticleContent(url: string): Promise<JinaResponse> {
  const response = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
    headers: {
      Accept: "application/json",
      ...(process.env.JINA_API_KEY && {
        Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      }),
    },
  });

  if (!response.ok) {
    throw new Error(`Jina API error: ${response.status}`);
  }

  const json = await response.json();
  const data = json.data || {};

  return {
    title: data.title || "タイトルなし",
    content: data.content || "",
    url: data.url || url,
  };
}
