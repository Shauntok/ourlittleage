import { expect, it, vi } from "vitest";

const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  })
);

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

import DraftsPage from "./page";

it("redirects the retired global draft box to trash", () => {
  expect(() => DraftsPage()).toThrow("redirect:/trash");
  expect(redirect).toHaveBeenCalledWith("/trash");
});
