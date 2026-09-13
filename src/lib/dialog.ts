import { useStore } from "../store";

/** In-app replacement for window.confirm(). Tauri v2 intercepts the native
 * confirm/alert globals behind a dialog-plugin permission and returns a
 * Promise instead of a boolean, which silently breaks `if (confirm(...))`
 * call sites — so the app never relies on the native ones. */
export function confirmDialog(message: string, opts: { danger?: boolean } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    useStore.getState().openDialog({ message, kind: "confirm", danger: opts.danger, resolve });
  });
}

export function alertDialog(message: string): Promise<void> {
  return new Promise((resolve) => {
    useStore.getState().openDialog({ message, kind: "alert", resolve: () => resolve() });
  });
}
