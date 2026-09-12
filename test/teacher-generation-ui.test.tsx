// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TeacherGenerationPage from "../src/ui/TeacherGenerationPage";

function makePieces() {
  const platforms = ["instagram_reel", "facebook_post", "youtube_short"] as const;
  const pieces = [];
  let id = 1;
  for (const platform of platforms) {
    for (let n = 1; n <= 10; n++) {
      pieces.push({
        id: id++,
        platform,
        piece_number: n,
        title: `${platform} title ${n}`,
        body: "body",
        hashtags: ["#tag"],
        cta: "cta",
        status: "pending",
      });
    }
  }
  return pieces;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("TeacherGenerationPage", () => {
  it("disables Generate until a topic is entered", async () => {
    render(<TeacherGenerationPage />);
    expect(screen.getByRole("button", { name: "Generate 30 pieces" })).toBeDisabled();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Topic or chapter"), "Photosynthesis");
    expect(screen.getByRole("button", { name: "Generate 30 pieces" })).toBeEnabled();
  });

  it("lets the teacher pick a provider and sends it in the request body", async () => {
    const user = userEvent.setup();
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ ok: true, batchId: 1, attempts: 1, pieces: makePieces() }),
    });

    render(<TeacherGenerationPage />);
    await user.type(screen.getByLabelText("Topic or chapter"), "Photosynthesis");
    await user.click(screen.getByRole("radio", { name: "Claude" }));
    await user.click(screen.getByRole("button", { name: "Generate 30 pieces" }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, options] = (fetch as any).mock.calls[0];
    expect(url).toBe("/api/batches/generate");
    expect(JSON.parse(options.body)).toEqual({ topic: "Photosynthesis", provider: "claude" });
  });

  it("shows a loading state while the request is in flight", async () => {
    const user = userEvent.setup();
    let resolveFetch!: (v: any) => void;
    (fetch as any).mockReturnValueOnce(new Promise((resolve) => (resolveFetch = resolve)));

    render(<TeacherGenerationPage />);
    await user.type(screen.getByLabelText("Topic or chapter"), "Photosynthesis");
    await user.click(screen.getByRole("button", { name: "Generate 30 pieces" }));

    expect(screen.getByText(/Writing 10 Reels/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generating 30 pieces…" })).toBeDisabled();

    resolveFetch({ json: async () => ({ ok: true, batchId: 1, attempts: 1, pieces: makePieces() }) });
    await waitFor(() => expect(screen.getByText(/Draft saved/)).toBeInTheDocument());
  });

  it("displays exactly 30 generated pieces split 10/10/10 across the three platform columns on success", async () => {
    const user = userEvent.setup();
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ ok: true, batchId: 42, attempts: 1, pieces: makePieces() }),
    });

    render(<TeacherGenerationPage />);
    await user.type(screen.getByLabelText("Topic or chapter"), "Photosynthesis");
    await user.click(screen.getByRole("button", { name: "Generate 30 pieces" }));

    await waitFor(() => expect(screen.getByText(/Draft saved — 30\/30 pieces/)).toBeInTheDocument());

    const reelsHeading = screen.getByText("Instagram Reels").closest(".tg-platform-column")!;
    const postsHeading = screen.getByText("Facebook Posts").closest(".tg-platform-column")!;
    const shortsHeading = screen.getByText("YouTube Shorts").closest(".tg-platform-column")!;

    expect(within(reelsHeading).getAllByRole("listitem")).toHaveLength(10);
    expect(within(postsHeading).getAllByRole("listitem")).toHaveLength(10);
    expect(within(shortsHeading).getAllByRole("listitem")).toHaveLength(10);
  });

  it("shows a useful error message and validation details when generation fails", async () => {
    const user = userEvent.setup();
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({
        ok: false,
        stage: "validation",
        message: "Batch failed validation after 2 attempt(s).",
        validationErrors: ["expected exactly 30 pieces, got 29"],
      }),
    });

    render(<TeacherGenerationPage />);
    await user.type(screen.getByLabelText("Topic or chapter"), "Photosynthesis");
    await user.click(screen.getByRole("button", { name: "Generate 30 pieces" }));

    await waitFor(() => expect(screen.getByText("Batch failed validation after 2 attempt(s).")).toBeInTheDocument());
    expect(screen.getByText("expected exactly 30 pieces, got 29")).toBeInTheDocument();
    expect(screen.getByText(/Nothing was saved/)).toBeInTheDocument();
  });

  it("shows an error state when the network request itself throws", async () => {
    const user = userEvent.setup();
    (fetch as any).mockRejectedValueOnce(new Error("Failed to fetch"));

    render(<TeacherGenerationPage />);
    await user.type(screen.getByLabelText("Topic or chapter"), "Photosynthesis");
    await user.click(screen.getByRole("button", { name: "Generate 30 pieces" }));

    await waitFor(() => expect(screen.getByText("Failed to fetch")).toBeInTheDocument());
  });
});
