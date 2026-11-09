import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import RoomViewSkinProvider, { useRoomViewSkin } from "@/components/RoomViewSkinProvider";
import { ROOM_VIEW_SKIN_STORAGE_KEY } from "@/lib/room-view-skin";

function SkinProbe() {
  const { skin, setSkin } = useRoomViewSkin();

  return (
    <div>
      <span data-testid="skin">{skin}</span>
      <button type="button" onClick={() => setSkin("classic")}>
        Select classic
      </button>
    </div>
  );
}

describe("RoomViewSkinProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.body.dataset.roomViewSkin;
  });

  it("applies the saved viewer skin globally and updates it immediately", async () => {
    window.localStorage.setItem(ROOM_VIEW_SKIN_STORAGE_KEY, "modern_pixel");

    render(
      <RoomViewSkinProvider>
        <SkinProbe />
      </RoomViewSkinProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("skin")).toHaveTextContent("modern_pixel");
      expect(document.body.dataset.roomViewSkin).toBe("modern_pixel");
    });

    fireEvent.click(screen.getByRole("button", { name: "Select classic" }));

    expect(screen.getByTestId("skin")).toHaveTextContent("classic");
    expect(document.body.dataset.roomViewSkin).toBe("classic");
    expect(window.localStorage.getItem(ROOM_VIEW_SKIN_STORAGE_KEY)).toBe("classic");
  });
});
