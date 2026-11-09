import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ModernProfileSettings, { type ModernProfileProps } from "./ModernProfileSettings";

function makeProps(): ModernProfileProps {
  return {
    profile: { avatar_url: null, banner_url: null }, username: "小居民", bio: "你好", theme: "mist",
    saving: false, uploading: false, bannerUploading: false, hasUnsavedChanges: false, message: "",
    cropOpen: false, bannerPreviewUrl: "", crop: { x: 0, y: 0 }, zoom: 1,
    setCrop: vi.fn(), setZoom: vi.fn(), setCroppedAreaPixels: vi.fn(),
    setUsername: vi.fn(), setBio: vi.fn(), setTheme: vi.fn(), setHasUnsavedChanges: vi.fn(),
    chooseBannerFile: vi.fn(), uploadAvatar: vi.fn(), closeCropModal: vi.fn(),
    confirmCropAndUpload: vi.fn(), saveProfile: vi.fn(),
  };
}

describe("ModernProfileSettings", () => {
  it("keeps the two pixel room times and existing profile controls", () => {
    const props = makeProps();
    render(<ModernProfileSettings {...props} />);

    expect(screen.getByRole("img", { name: "日间房间场景" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "房间装扮" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "门牌与头像" })).not.toBeNull();
    expect(screen.queryByText("房间头像")).toBeNull();
    expect(screen.getByRole("heading", { name: "房间的故事" })).not.toBeNull();
    expect(screen.getByRole("textbox", { name: "居民名字" })).not.toBeNull();
    expect(screen.getByRole("textbox", { name: "个人简介" }).getAttribute("maxlength")).toBe("300");
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.queryByText("森林绿")).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: /夜晚/ }));
    expect(props.setTheme).toHaveBeenCalledWith("midnight");
    expect(props.setHasUnsavedChanges).toHaveBeenCalledWith(true);
  });

  it("keeps the banner preview on the page without a separate preview button", () => {
    render(<ModernProfileSettings {...makeProps()} />);
    expect(screen.queryByRole("button", { name: "预览房间" })).toBeNull();
    expect(screen.queryByRole("dialog", { name: "房间预览" })).toBeNull();
  });
});
