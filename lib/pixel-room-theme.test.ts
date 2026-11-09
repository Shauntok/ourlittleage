import { describe, expect, it } from "vitest";
import { getPixelRoomTime, getStoredRoomTheme } from "./pixel-room-theme";

describe("pixel room time", () => {
  it("maps existing classic room values without discarding them", () => {
    expect(getPixelRoomTime("midnight")).toBe("evening");
    for (const value of ["mist", "ocean", "forest", "sunset", null]) {
      expect(getPixelRoomTime(value)).toBe("day");
    }
  });

  it("saves either pixel choice in the existing room theme field", () => {
    expect(getStoredRoomTheme("day")).toBe("mist");
    expect(getStoredRoomTheme("evening")).toBe("midnight");
  });
});
