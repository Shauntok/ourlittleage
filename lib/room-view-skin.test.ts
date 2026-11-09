import { describe, expect, it } from "vitest";
import { getRoomViewSkin } from "./room-view-skin";

describe("getRoomViewSkin", () => {
  it("keeps the classic skin for empty or unknown preferences", () => {
    expect(getRoomViewSkin(null)).toBe("classic");
    expect(getRoomViewSkin("unknown")).toBe("classic");
  });

  it("accepts the supported viewer skin preferences", () => {
    expect(getRoomViewSkin("modern_pixel")).toBe("modern_pixel");
    expect(getRoomViewSkin("classic")).toBe("classic");
  });
});
