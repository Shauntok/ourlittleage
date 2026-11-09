import { describe, expect, it } from "vitest";
import { ROOM_STATUS_HEART_COLORS, ROOM_STATUS_HEART_GRID } from "./room-status-heart";

describe("room status heart pixel grid", () => {
  it("preserves the replacement drawing's 44 by 35 pixel grid and three color regions", () => {
    expect(ROOM_STATUS_HEART_GRID).toHaveLength(35);
    expect(ROOM_STATUS_HEART_GRID.every((row) => row.length === 44)).toBe(true);

    const counts = ROOM_STATUS_HEART_GRID.join("").split("").reduce<Record<string, number>>(
      (total, pixel) => {
        if (pixel !== ".") total[pixel] = (total[pixel] ?? 0) + 1;
        return total;
      },
      {},
    );

    expect(counts).toEqual({ R: 162, D: 194, P: 809 });
    expect(ROOM_STATUS_HEART_GRID.every((row) => /^[.RDP]+$/.test(row))).toBe(true);
  });

  it("retains the hand-drawn shadow contour rather than forcing symmetry", () => {
    expect(ROOM_STATUS_HEART_GRID[3]).toBe(
      "...RRDDPPPPPPPPPPDDRRRRRRDDPPPPPPPPPPDDR....",
    );
    expect(ROOM_STATUS_HEART_GRID[17]).toBe(
      "RRRDPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPDDDDR",
    );
    expect(ROOM_STATUS_HEART_GRID[34]).toBe(
      "...................RRRRRR...................",
    );
  });

  it("uses the original muted rose, warm brown, and blush palette", () => {
    expect(ROOM_STATUS_HEART_COLORS).toEqual({
      outer: "#bf8188",
      inner: "#382927",
      centerLight: "#f7d9d5",
      center: "#f0cbc7",
    });
  });
});
