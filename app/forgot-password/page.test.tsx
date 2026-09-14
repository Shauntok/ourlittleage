import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createPasswordRecoveryRequestClient: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));

vi.mock("@/lib/auth/passwordRecovery", () => ({
  createPasswordRecoveryRequestClient:
    mocks.createPasswordRecoveryRequestClient,
}));

vi.mock("@/lib/site", () => ({
  SITE_URL: "https://ourlittleage.com",
}));

import ForgotPasswordPage from "./page";

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    mocks.createPasswordRecoveryRequestClient.mockReset();
    mocks.resetPasswordForEmail.mockReset();
    mocks.createPasswordRecoveryRequestClient.mockReturnValue({
      auth: {
        resetPasswordForEmail: mocks.resetPasswordForEmail,
      },
    });
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("sends a cross-device recovery link with the isolated request client", async () => {
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText("你的邮箱"), {
      target: { value: "  QA-A@Example.com  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送重设邮件" }));

    await waitFor(() => {
      expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
        "qa-a@example.com",
        { redirectTo: "https://ourlittleage.com/reset-password" }
      );
    });
    expect(mocks.createPasswordRecoveryRequestClient).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/邮件已经送出/)).toBeInTheDocument();
  });
});
