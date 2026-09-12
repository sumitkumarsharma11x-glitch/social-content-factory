// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BatchHistoryPage from "../src/ui/BatchHistoryPage";

function makeBatch(overrides: Partial<any> = {}) {
  return {
    id: 1,
    created_at: "2026-01-01T00:00:00.000Z",
    provider: "mock",
    model: "mock-v1",
    status: "draft",
    totalPieces: 30,
    approvedPieces: 0,
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

describe("BatchHistoryPage", () => {
  it("lists saved batches with their approval progress", async () => {
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({
        ok: true,
        batches: [makeBatch({ id: 1, approvedPieces: 5 }), makeBatch({ id: 2, status: "in_review" })],
      }),
    });

    render(<BatchHistoryPage onOpenBatch={() => {}} />);

    await waitFor(() => expect(screen.getByText("Batch #1")).toBeInTheDocument());
    expect(screen.getByText("Batch #2")).toBeInTheDocument();
    expect(screen.getByText("5/30 approved")).toBeInTheDocument();
    expect(screen.getByText("In review")).toBeInTheDocument();
  });

  it("shows an empty state when there are no batches yet", async () => {
    (fetch as any).mockResolvedValueOnce({ json: async () => ({ ok: true, batches: [] }) });

    render(<BatchHistoryPage onOpenBatch={() => {}} />);

    await waitFor(() =>
      expect(screen.getByText("No batches yet — generate one to see it here.")).toBeInTheDocument()
    );
  });

  it("shows an error state when the list fails to load", async () => {
    (fetch as any).mockResolvedValueOnce({ json: async () => ({ ok: false, message: "DB unavailable" }) });

    render(<BatchHistoryPage onOpenBatch={() => {}} />);

    await waitFor(() => expect(screen.getByText("DB unavailable")).toBeInTheDocument());
  });

  it("calls onOpenBatch with the batch id when Open is clicked", async () => {
    const user = userEvent.setup();
    const onOpenBatch = vi.fn();
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ ok: true, batches: [makeBatch({ id: 42 })] }),
    });

    render(<BatchHistoryPage onOpenBatch={onOpenBatch} />);

    await waitFor(() => expect(screen.getByText("Batch #42")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Open" }));

    expect(onOpenBatch).toHaveBeenCalledWith(42);
  });
});
