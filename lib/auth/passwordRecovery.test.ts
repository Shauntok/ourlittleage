import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

import {
  createPasswordRecoveryClient,
  createPasswordRecoveryRequestClient,
  PASSWORD_RECOVERY_STORAGE_KEY,
} from "./passwordRecovery";

describe("password recovery clients", () => {
  beforeEach(() => {
    mocks.createClient.mockReset();
    mocks.createClient.mockReturnValue({ auth: {} });
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("requests cross-device recovery links without using the normal login session", () => {
    createPasswordRecoveryRequestClient();

    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "anon-key",
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          flowType: "implicit",
          persistSession: false,
        },
      }
    );
  });

  it("isolates the verified recovery session in temporary browser storage", () => {
    createPasswordRecoveryClient();

    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "anon-key",
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: true,
          flowType: "implicit",
          persistSession: true,
          storage: window.sessionStorage,
          storageKey: PASSWORD_RECOVERY_STORAGE_KEY,
        },
      }
    );
  });
});
