// @vitest-environment node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const publicPagePath = resolve(root, "app/settings/changelog/page.tsx");
const publicDataPath = resolve(root, "lib/changelog/public.ts");
const adminDataPath = resolve(root, "lib/admin/changelog.ts");
const adminPagePath = resolve(root, "app/admin/changelog/page.tsx");

describe("public and admin changelog separation", () => {
  it("keeps admin-only entries out of the public changelog source", () => {
    expect(existsSync(publicDataPath)).toBe(true);
    if (!existsSync(publicDataPath)) return;

    const publicSource = [publicPagePath, publicDataPath]
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(publicSource).not.toContain("后台控制中心新增居民年龄分布");
    expect(publicSource).not.toContain("内容后台可查看每篇作品的精确有效阅读次数");
    expect(publicSource).not.toContain("新增业配管理中心");
    expect(publicSource).not.toContain("后台部分开关");
    expect(publicSource).not.toContain("12 小时去重");
    expect(publicSource).not.toContain("Google Analytics");
  });

  it("keeps internal entries in a server-only module behind a server guard", () => {
    expect(existsSync(adminDataPath)).toBe(true);
    expect(existsSync(adminPagePath)).toBe(true);
    if (!existsSync(adminDataPath) || !existsSync(adminPagePath)) return;

    const adminDataSource = readFileSync(adminDataPath, "utf8");
    const adminPageSource = readFileSync(adminPagePath, "utf8");

    expect(adminDataSource).toContain('import "server-only"');
    expect(adminPageSource).toContain("getAdminActor");
    expect(adminPageSource).toContain("canViewAdminChangelog");
  });
});
