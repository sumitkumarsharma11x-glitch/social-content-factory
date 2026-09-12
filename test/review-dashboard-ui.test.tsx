// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReviewDashboardPage from "../src/ui/ReviewDashboardPage";

function makePiece(overrides: Partial<any> = {}) {
  return {
    id: 1,
    batch_id: 1,
    platform: "instagram_reel",
    piece_number: 1,
    title: "Photosynthesis 101",
    body: "Plants turn light into food.",
    hashtags: ["#science", "#biology"],
    cta: "Follow for more!",
    status: "pending",
    ...overrides,
  };
}

function makePieces() {
  const pieces = [];
  const platforms = ["instagram_reel", "facebook_post", "youtube_short"] as const;
  let id = 1;
  for (const platform of platforms) {
    for (let n = 1; n <= 10; n++) {
      pieces.push(makePiece({ id: id++, platform, piece_number: n, title: `${platform} piece ${n}` }));
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

describe("ReviewDashboardPage", () => {
  it("loads the batch and shows the first platform's 10 pieces", async () => {
    const pieces = makePieces();
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ ok: true, batch: { id: 1, status: "draft" }, pieces }),
    });

    render(<ReviewDashboardPage batchId={1} />);

    await waitFor(() => expect(screen.getByText(/0\/30 approved/)).toBeInTheDocument());
    expect(screen.getByText("instagram_reel piece 1")).toBeInTheDocument();
    expect(screen.queryByText("facebook_post piece 1")).not.toBeInTheDocument();
  });

  it("shows an error state when the batch fails to load", async () => {
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ ok: false, message: "Batch 1 was not found." }),
    });

    render(<ReviewDashboardPage batchId={1} />);

    await waitFor(() => expect(screen.getByText("Batch 1 was not found.")).toBeInTheDocument());
  });

  it("edits a piece and saves it via PUT", async () => {
    const user = userEvent.setup();
    const pieces = makePieces();
    (fetch as any)
      .mockResolvedValueOnce({ json: async () => ({ ok: true, batch: { id: 1, status: "draft" }, pieces }) })
      .mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          piece: { ...pieces[0], title: "New title", status: "edited" },
        }),
      });

    render(<ReviewDashboardPage batchId={1} />);
    await waitFor(() => expect(screen.getByText("instagram_reel piece 1")).toBeInTheDocument());

    const firstCard = screen.getByText("instagram_reel piece 1").closest("li")!;
    await user.click(within(firstCard).getByRole("button", { name: "Edit" }));

    const titleInput = within(firstCard).getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "New title");
    await user.click(within(firstCard).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByText("New title")).toBeInTheDocument());

    const putCall = (fetch as any).mock.calls[1];
    expect(putCall[0]).toBe("/api/pieces/1");
    expect(putCall[1].method).toBe("PUT");
    const body = JSON.parse(putCall[1].body);
    expect(body.title).toBe("New title");
    expect(body.hashtags).toEqual(["#science", "#biology"]);
  });

  it("approves a piece via POST /transition and updates its status label", async () => {
    const user = userEvent.setup();
    const pieces = makePieces();
    (fetch as any)
      .mockResolvedValueOnce({ json: async () => ({ ok: true, batch: { id: 1, status: "draft" }, pieces }) })
      .mockResolvedValueOnce({
        json: async () => ({ ok: true, piece: { ...pieces[0], status: "approved" } }),
      });

    render(<ReviewDashboardPage batchId={1} />);
    await waitFor(() => expect(screen.getByText("instagram_reel piece 1")).toBeInTheDocument());

    const firstCard = screen.getByText("instagram_reel piece 1").closest("li")!;
    await user.click(within(firstCard).getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(within(firstCard).getByText("Approved")).toBeInTheDocument());

    const postCall = (fetch as any).mock.calls[1];
    expect(postCall[0]).toBe("/api/pieces/1/transition");
    expect(JSON.parse(postCall[1].body)).toEqual({ status: "approved" });
  });

  it("shows a piece-level error when a transition is rejected by the server", async () => {
    const user = userEvent.setup();
    const pieces = makePieces();
    (fetch as any)
      .mockResolvedValueOnce({ json: async () => ({ ok: true, batch: { id: 1, status: "draft" }, pieces }) })
      .mockResolvedValueOnce({
        json: async () => ({ ok: false, message: 'Invalid piece status transition: "approved" -> "approved"' }),
      });

    render(<ReviewDashboardPage batchId={1} />);
    await waitFor(() => expect(screen.getByText("instagram_reel piece 1")).toBeInTheDocument());

    const firstCard = screen.getByText("instagram_reel piece 1").closest("li")!;
    await user.click(within(firstCard).getByRole("button", { name: "Approve" }));

    await waitFor(() =>
      expect(within(firstCard).getByText(/Invalid piece status transition/)).toBeInTheDocument()
    );
  });
});
