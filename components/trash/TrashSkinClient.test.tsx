import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  skin: "modern_pixel" as "modern_pixel" | "classic",
  dynamicCalls: 0,
}));

vi.mock("@/components/RoomViewSkinProvider", () => ({
  useRoomViewSkin: () => ({ skin: mocks.skin }),
}));
vi.mock("next/dynamic", () => ({
  default: () => {
    const kind = mocks.dynamicCalls++ === 0 ? "classic" : "modern_pixel";
    return () => <div data-testid={`${kind}-trash`} />;
  },
}));

import TrashSkinClient from "./TrashSkinClient";

beforeEach(() => { mocks.skin = "modern_pixel"; });

it("renders the modern drawer only for the modern skin", () => {
  render(<TrashSkinClient items={[]} serverNow="2026-10-23T12:00:00Z" loadError={false} />);
  expect(screen.getByTestId("modern_pixel-trash")).toBeInTheDocument();
  expect(screen.queryByTestId("classic-trash")).not.toBeInTheDocument();
});

it("keeps the original trash view for classic skin", () => {
  mocks.skin = "classic";
  render(<TrashSkinClient items={[]} serverNow="2026-10-23T12:00:00Z" loadError={false} />);
  expect(screen.getByTestId("classic-trash")).toBeInTheDocument();
  expect(screen.queryByTestId("modern_pixel-trash")).not.toBeInTheDocument();
});
