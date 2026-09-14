import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type AuthCallback = (event: string, session: unknown) => void;

const mocks = vi.hoisted(() => ({
  authCallback: null as AuthCallback | null,
  createPasswordRecoveryClient: vi.fn(),
  getUser: vi.fn(),
  recoverySignOut: vi.fn(),
  recoveryUpdateUser: vi.fn(),
  sessionUnsubscribe: vi.fn(),
  normalSignOut: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock("@/lib/auth/passwordRecovery", () => ({
  PASSWORD_RECOVERY_STORAGE_KEY: "ola-password-recovery",
  createPasswordRecoveryClient: mocks.createPasswordRecoveryClient,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signOut: mocks.normalSignOut,
    },
  },
}));

import ResetPasswordPage from "./page";

const recoveryUser = {
  id: "qa-a-user-id",
  email: "qa-a@example.com",
};

function setRecoveryUrl() {
  window.history.replaceState(
    {},
    "",
    "/reset-password#access_token=recovery-access&refresh_token=recovery-refresh&type=recovery"
  );
}

function emitRecovery(user = recoveryUser) {
  act(() => {
    mocks.authCallback?.("PASSWORD_RECOVERY", { user });
  });
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/reset-password");
    window.sessionStorage.clear();

    mocks.authCallback = null;
    mocks.createPasswordRecoveryClient.mockReset();
    mocks.getUser.mockReset();
    mocks.recoverySignOut.mockReset();
    mocks.recoveryUpdateUser.mockReset();
    mocks.sessionUnsubscribe.mockReset();
    mocks.normalSignOut.mockReset();
    mocks.onAuthStateChange.mockReset();

    mocks.onAuthStateChange.mockImplementation((callback: AuthCallback) => {
      mocks.authCallback = callback;
      return {
        data: {
          subscription: { unsubscribe: mocks.sessionUnsubscribe },
        },
      };
    });
    mocks.createPasswordRecoveryClient.mockReturnValue({
      auth: {
        getUser: mocks.getUser,
        onAuthStateChange: mocks.onAuthStateChange,
        signOut: mocks.recoverySignOut,
        updateUser: mocks.recoveryUpdateUser,
      },
    });
    mocks.getUser.mockResolvedValue({
      data: { user: recoveryUser },
      error: null,
    });
    mocks.recoveryUpdateUser.mockResolvedValue({ error: null });
    mocks.recoverySignOut.mockResolvedValue({ error: null });
    mocks.normalSignOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("blocks the existing signed-in account when no recovery link was verified", async () => {
    render(<ResetPasswordPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "无法确认这封重设邮件"
    );
    expect(screen.queryByPlaceholderText("新密码")).not.toBeInTheDocument();
    expect(mocks.createPasswordRecoveryClient).not.toHaveBeenCalled();
    expect(mocks.recoveryUpdateUser).not.toHaveBeenCalled();
  });

  it("keeps a visible error when recovery-looking URL values are not verified", async () => {
    vi.useFakeTimers();
    setRecoveryUrl();
    render(<ResetPasswordPage />);

    expect(screen.queryByPlaceholderText("新密码")).not.toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(4500);
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "无法确认这封重设邮件"
    );
    expect(mocks.recoveryUpdateUser).not.toHaveBeenCalled();
  });

  it("updates only the user verified by the password recovery event", async () => {
    setRecoveryUrl();
    render(<ResetPasswordPage />);
    emitRecovery();

    expect(screen.getByText(recoveryUser.email)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("新密码"), {
      target: { value: "new-password-123" },
    });
    fireEvent.change(screen.getByPlaceholderText("再输入一次新密码"), {
      target: { value: "new-password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "重设密码" }));

    await waitFor(() => {
      expect(mocks.recoveryUpdateUser).toHaveBeenCalledWith({
        password: "new-password-123",
      });
    });
    expect(mocks.getUser).toHaveBeenCalledTimes(1);
    expect(mocks.recoverySignOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mocks.normalSignOut).toHaveBeenCalledWith({ scope: "local" });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "密码已经重新设置好了"
    );
  });

  it("refuses the update when the verified user changes before submission", async () => {
    setRecoveryUrl();
    mocks.getUser.mockResolvedValue({
      data: {
        user: { id: "different-user-id", email: "other@example.com" },
      },
      error: null,
    });

    render(<ResetPasswordPage />);
    emitRecovery();

    fireEvent.change(screen.getByPlaceholderText("新密码"), {
      target: { value: "new-password-123" },
    });
    fireEvent.change(screen.getByPlaceholderText("再输入一次新密码"), {
      target: { value: "new-password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "重设密码" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "无法确认这封重设邮件"
    );
    expect(mocks.recoveryUpdateUser).not.toHaveBeenCalled();
    expect(mocks.normalSignOut).not.toHaveBeenCalled();
  });
});
