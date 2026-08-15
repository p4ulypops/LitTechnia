import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConfirmDialog } from "./confirm-dialog";

function renderDialog(onConfirm: () => Promise<void>, props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  return render(
    <ConfirmDialog
      trigger={<button type="button">Delete scene</button>}
      title="Delete this scene?"
      description="This removes the scene and anything linked to it."
      onConfirm={onConfirm}
      testId="scene"
      {...props}
    />,
  );
}

async function openDialog() {
  fireEvent.click(screen.getByRole("button", { name: "Delete scene" }));
  return screen.findByRole("alertdialog");
}

describe("ConfirmDialog", () => {
  it("stays closed until its trigger is activated", () => {
    renderDialog(vi.fn().mockResolvedValue(undefined));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete scene" })).toBeInTheDocument();
  });

  it("shows the title and description when opened", async () => {
    renderDialog(vi.fn().mockResolvedValue(undefined));
    const dialog = await openDialog();
    expect(dialog).toHaveTextContent("Delete this scene?");
    expect(dialog).toHaveTextContent("This removes the scene and anything linked to it.");
  });

  it("runs the action and closes only after it succeeds", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    renderDialog(onConfirm);
    await openDialog();
    fireEvent.click(screen.getByTestId("button-confirm-scene"));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
  });

  it("stays open and shows the real error inline when the action fails", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("The server said no."));
    renderDialog(onConfirm);
    await openDialog();
    fireEvent.click(screen.getByTestId("button-confirm-scene"));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The server said no.");
    // The dialog is still open, and the author can try again.
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByTestId("button-confirm-scene")).not.toBeDisabled();
  });

  it("falls back to a plain-language message for non-Error failures", async () => {
    const onConfirm = vi.fn().mockRejectedValue("string failure");
    renderDialog(onConfirm);
    await openDialog();
    fireEvent.click(screen.getByTestId("button-confirm-scene"));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("That didn't go through. Nothing was changed");
  });

  it("cannot be dismissed mid-write: cancel and confirm both disable while pending", async () => {
    let release!: () => void;
    const onConfirm = vi.fn().mockImplementation(
      () => new Promise<void>((resolve) => { release = resolve; }),
    );
    renderDialog(onConfirm);
    await openDialog();
    fireEvent.click(screen.getByTestId("button-confirm-scene"));

    const confirmButton = await screen.findByTestId("button-confirm-scene");
    await waitFor(() => expect(confirmButton).toBeDisabled());
    expect(confirmButton).toHaveTextContent("Deleting…");
    expect(screen.getByTestId("button-cancel-confirm-scene")).toBeDisabled();

    // Clicking cancel while pending must not close the dialog.
    fireEvent.click(screen.getByTestId("button-cancel-confirm-scene"));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    release();
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
  });

  it("cancel closes the dialog without running the action", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    renderDialog(onConfirm);
    await openDialog();
    fireEvent.click(screen.getByTestId("button-cancel-confirm-scene"));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("clears a previous error when the dialog is closed and reopened", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("First attempt failed."));
    renderDialog(onConfirm);
    await openDialog();
    fireEvent.click(screen.getByTestId("button-confirm-scene"));
    await screen.findByRole("alert");
    // Close via cancel, reopen, and the error from last time is gone.
    fireEvent.click(screen.getByTestId("button-cancel-confirm-scene"));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    await openDialog();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
