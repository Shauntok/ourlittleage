export type RoomStatusHeartPixel = "R" | "D" | "P";

export const ROOM_STATUS_HEART_COLORS = {
  outer: "#bf8188",
  inner: "#382927",
  centerLight: "#f7d9d5",
  center: "#f0cbc7",
} as const;

export const ROOM_STATUS_HEART_GRID = [
  ".......RRRRRRRRRR...........RRRRRRRRRR......",
  "......RRRDDDDDDDRRR.......RRRDDDDDDDDRR.....",
  "....RRRDDDPPPPPDDDRR....RRRDDDPPPPPPDDRR....",
  "...RRDDPPPPPPPPPPDDRRRRRRDDPPPPPPPPPPDDR....",
  "..RRDDPPPPPPPPPPPPDDDRRDDPPPPPPPPPPPPPDDRR..",
  ".RRDDPPPPPPPPPPPPPPPDDDPPPPPPPPPPPPPPPPDDRRR",
  "RRDDPPPPPPPPPPPPPPPPPDDPPPPPPPPPPPPPPPPPDDDR",
  "RDDPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPDDR",
  "RDPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPDDR",
  "RDPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPDDR",
  "RDPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPDDR",
  "RDPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPDDR",
  "RDPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPDDR",
  "RDPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPDDR",
  "RDPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPDDR",
  "RDPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPDDR",
  "RDDDPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPDDDR",
  "RRRDPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPDDDDR",
  "..RDPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPDDRRR",
  "..RDDDPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPDDDDR..",
  "..RRRDPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPDDDDR..",
  "....RDDDPPPPPPPPPPPPPPPPPPPPPPPPPPPDDDDRRR..",
  "....RRRDPPPPPPPPPPPPPPPPPPPPPPPPPPPDDDDR....",
  "......RDDDPPPPPPPPPPPPPPPPPPPPPPPDDDDRRR....",
  "......RRRDPPPPPPPPPPPPPPPPPPPPPPPDDDDR......",
  "........RDDDDPPPPPPPPPPPPPPPPPDDDDDRRR......",
  "........RRRRDPPPPPPPPPPPPPPPPPDDDDDR........",
  "...........RDDDDPPPPPPPPPPPDDDDDRRRR........",
  "...........RRRRDPPPPPPPPPPPDDDDDR...........",
  "..............RDDDDPPPPPPDDDDRRRR...........",
  "..............RRRRDPPPPPPDDDDR..............",
  ".................RDDDPPDDDRRRR..............",
  ".................RRRDDDDDDR.................",
  "...................RDDDDRRR.................",
  "...................RRRRRR...................",
] as const;

export function createRoomStatusHeartPath(pixel: RoomStatusHeartPixel) {
  return ROOM_STATUS_HEART_GRID.flatMap((row, y) => {
    const paths: string[] = [];
    let x = 0;

    while (x < row.length) {
      if (row[x] !== pixel) {
        x += 1;
        continue;
      }

      const start = x;
      while (row[x] === pixel) x += 1;
      paths.push(`M${start} ${y}h${x - start}v1H${start}z`);
    }

    return paths;
  }).join("");
}

export const ROOM_STATUS_HEART_PATHS = {
  outer: createRoomStatusHeartPath("R"),
  inner: createRoomStatusHeartPath("D"),
  center: createRoomStatusHeartPath("P"),
} as const;
