import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchArticleContent } from "../jina";

describe("fetchArticleContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("correctly parses nested data from Jina API", async () => {
    const mockResponse = {
      data: {
        title: "Test Title",
        content: "Test Content",
        url: "https://example.com/test",
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchArticleContent("https://example.com/test");

    expect(result).toEqual({
      title: "Test Title",
      content: "Test Content",
      url: "https://example.com/test",
    });
  });

  it("uses default values when data is empty", async () => {
    const mockResponse = {
      data: null,
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchArticleContent("https://example.com/test");

    expect(result).toEqual({
      title: "タイトルなし",
      content: "",
      url: "https://example.com/test",
    });
  });

  it("throws error when response is not ok", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(
      fetchArticleContent("https://example.com/test")
    ).rejects.toThrow("Jina API error: 500");
  });
});
