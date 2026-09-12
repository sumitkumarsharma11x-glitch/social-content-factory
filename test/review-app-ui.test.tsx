// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReviewApp from "../src/ui/ReviewApp";

function makePiece(overrides: Partial<any> = {}) {
  return {
    id: 1,
    batch_id: 7,
    platform: "instagram_reel",
    piece_number: 1,
    title: "Photosynthesis 101",
    body: "Plants turn light into food.",
    hashtags: ["#science"],
    cta: "Follow for more!",
    status: "pending",
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ReviewApp", () => {
  it("starts on the batch history list, then opens the dashboard for the chosen batch", async () => {
    const user = userEvent.setup();
    (fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          batches: [
            {
              id: 7,
              created_at: "2026-01-01T00:00:00.000Z",
              provider: "mock",
              model: "mock-v1",
              status: "draft",
              totalPieces: 30,
              approvedPieces: 0,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ ok: true, batch: { id: 7, status: "draft" }, pieces: [makePiece()] }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          batches: [
            {
              id: 7,
              created_at: "2026-01-01T00:00:00.000Z",
              provider: "mock",
              model: "mock-v1",
              status: "draft",
              totalPieces: 30,
              approvedPieces: 0,
            },
          ],
        }),
      });

    render(<ReviewApp />);

    await waitFor(() => expect(screen.getByText("Batch #7")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Open" }));

    await waitFor(() => expect(screen.getByText("Photosynthesis 101")).toBeInTheDocument());
    expect((fetch as any).mock.calls[1][0]).toBe("/api/batches/7");

    await user.click(screen.getByRole("button", { name: "← Back to batches" }));
    expect(screen.getByText("Batch #7")).toBeInTheDocument();
  });
});
