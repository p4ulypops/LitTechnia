import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { SaveStatusText, useSaveStatus, type SaveState } from "./save-status";

type Harness = ReturnType<typeof useSaveStatus>;

let harness: Harness;

function Probe({ onRetry }: { onRetry?: () => void }) {
  harness = useSaveStatus();
  return <SaveStatusText state={harness.state} error={harness.error} testId="probe" onRetry={onRetry} />;
}

function states(): SaveState[] {
  // Rendered marker lets us observe state transitions through the DOM only.
  const el = document.querySelector("[data-testid^='status-']");
  if (!el) return ["idle"];
  const id = el.getAttribute("data-testid") ?? "";
  if (id.startsWith("status-saving")) return ["saving"];
  if (id.startsWith("status-saved")) return ["saved"];
  if (id.startsWith("status-error")) return ["error"];
  return ["idle"];
}

describe("useSaveStatus + SaveStatusText", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing while idle", () => {
    const { container } = render(<Probe />);
    expect(container).toBeEmptyDOMElement();
  });

  it("acknowledges a successful write, then reverts to idle on its own", async () => {
    const { container } = render(<Probe />);
    let result: string | undefined;
    await act(async () => {
      result = await harness.run(async () => "done");
    });
    expect(result).toBe("done");
    expect(states()).toEqual(["saved"]);

    const status = screen.getByTestId("status-saved-probe");
    expect(status).toHaveAttribute("role", "status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Saved");

    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("reports a failure assertively and does not auto-clear it", async () => {
    render(<Probe />);
    let result: string | undefined = "untouched";
    await act(async () => {
      result = await harness.run(async () => {
        throw new Error("Disk full.");
      });
    });
    expect(result).toBeUndefined();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Disk full.");

    // Error must persist: advancing well past the saved-revert delay changes nothing.
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Disk full.");
  });

  it("uses a plain-language fallback when the failure is not an Error", async () => {
    render(<Probe />);
    await act(async () => {
      await harness.run(async () => {
        throw "weird";
      });
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Something went wrong. Your change was not saved.",
    );
  });

  it("reset() clears an error without retrying", async () => {
    const { container } = render(<Probe />);
    await act(async () => {
      await harness.run(async () => {
        throw new Error("Nope.");
      });
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    act(() => {
      harness.reset();
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("a new run replaces a previous error", async () => {
    render(<Probe />);
    await act(async () => {
      await harness.run(async () => {
        throw new Error("First failure.");
      });
    });
    expect(screen.getByRole("alert")).toHaveTextContent("First failure.");

    await act(async () => {
      await harness.run(async () => "ok");
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByTestId("status-saved-probe")).toBeInTheDocument();
  });

  it("offers a same-place retry action only when onRetry is provided", async () => {
    const onRetry = vi.fn();
    const { unmount } = render(<Probe onRetry={onRetry} />);
    await act(async () => {
      await harness.run(async () => {
        throw new Error("Retry me.");
      });
    });
    const retry = screen.getByTestId("button-retry-probe");
    retry.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
    unmount();

    render(<Probe />);
    await act(async () => {
      await harness.run(async () => {
        throw new Error("No retry here.");
      });
    });
    expect(screen.queryByTestId("button-retry-probe")).not.toBeInTheDocument();
  });
});
