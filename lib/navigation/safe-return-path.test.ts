import { describe, expect, it } from "vitest";

import { safeReturnPath } from "./safe-return-path";

describe("safeReturnPath", () => {
  it("accepts a local resident room path", () => {
    expect(safeReturnPath("/u/resident-name")).toBe("/u/resident-name");
  });

  it("retains local query strings and fragments", () => {
    expect(safeReturnPath("/u/resident-name?tab=stories#latest")).toBe(
      "/u/resident-name?tab=stories#latest"
    );
  });

  it.each([
    undefined,
    null,
    "",
    "   ",
    "//example.com/room",
    "https://example.com/room",
    "/u\\example",
    "/u/resident\nname",
    "/u/resident\u0000name",
  ])("rejects an unsafe scalar return path: %s", (value) => {
    expect(safeReturnPath(value)).toBeNull();
  });

  it("does not select a value from an array", () => {
    expect(safeReturnPath(["/u/first", "/u/second"])).toBeNull();
  });
});
