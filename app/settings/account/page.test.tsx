import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  skin: "classic" as "classic" | "modern_pixel",
  push: vi.fn(),
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/components/RoomViewSkinProvider", () => ({ useRoomViewSkin: () => ({ skin: mocks.skin }) }));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
      signInWithPassword: mocks.signInWithPassword,
      updateUser: mocks.updateUser,
      signOut: mocks.signOut,
    },
    from: mocks.from,
  },
}));

import AccountSettingsPage from "./page";

describe("AccountSettingsPage skins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.skin = "classic";
    mocks.getUser.mockResolvedValue({ data: { user: { id: "resident-1", email: "resident@example.com" } } });
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    mocks.updateUser.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.insert.mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ insert: mocks.insert });
  });

  afterEach(cleanup);

  it("keeps the classic account view for the glass skin", async () => {
    render(<AccountSettingsPage />);
    expect(await screen.findByRole("heading", { name: "当前邮箱" })).toBeVisible();
    expect(screen.getByText("resident@example.com")).toBeVisible();
    expect(document.querySelector('[data-account-skin="modern_pixel"]')).toBeNull();
  });

  it("shows the key cabinet design and keeps password confirmation connected", async () => {
    mocks.skin = "modern_pixel";
    render(<AccountSettingsPage />);

    expect(await screen.findByRole("heading", { name: "账号安全" })).toBeVisible();
    expect(screen.getByRole("img", { name: /木制钥匙柜/ })).toBeVisible();
    expect(screen.getByText("resident@example.com")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "更新密码" }));
    expect(screen.getByRole("status")).toHaveTextContent("请输入当前密码");
    fireEvent.change(screen.getByLabelText("当前密码"), { target: { value: "oldpassword" } });
    fireEvent.change(screen.getByLabelText("新密码（至少 8 个字符）"), { target: { value: "newpassword123" } });
    fireEvent.change(screen.getByLabelText("再次输入新密码"), { target: { value: "newpassword123" } });
    fireEvent.click(screen.getByRole("button", { name: "更新密码" }));

    expect(await screen.findByRole("heading", { name: "修改密码？" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "确认修改" }));
    await waitFor(() => expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: "resident@example.com", password: "oldpassword" }));
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "newpassword123" });
  });

  it("asks before signing out from the modern page", async () => {
    mocks.skin = "modern_pixel";
    render(<AccountSettingsPage />);
    await screen.findByRole("heading", { name: "账号安全" });
    fireEvent.click(screen.getByRole("button", { name: "登出" }));
    expect(mocks.signOut).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: "登出" })[1]);
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
    expect(mocks.push).toHaveBeenCalledWith("/");
  });
});
