import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";

/**
 * Custom render wrapper. Add global providers here as the app grows
 * (e.g., ThemeProvider, SessionProvider for client components).
 */
function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: Providers, ...options });
}

/**
 * Returns a pre-configured userEvent instance with default options.
 * Preferred over `userEvent.setup()` called manually per-test.
 */
function setupUser() {
  return userEvent.setup({ delay: null });
}

export * from "@testing-library/react";
export { customRender as render, setupUser };
