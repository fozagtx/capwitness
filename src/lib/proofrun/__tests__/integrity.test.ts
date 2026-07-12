import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { listReceipts } from "../receipt-store";

describe("runtime data integrity", () => {
  it("returns an honest empty list when no receipt directory exists", async () => {
    const parent = await mkdtemp(path.join(tmpdir(), "capwitness-empty-"));
    await expect(listReceipts(path.join(parent, "missing"))).resolves.toEqual([]);
  });

  it("surfaces corrupted stored evidence instead of replacing it", async () => {
    const directory = await mkdtemp(
      path.join(tmpdir(), "capwitness-corrupt-"),
    );
    await writeFile(
      path.join(directory, "7c925b0a-cfac-4a68-b578-725ec9c29d43.json"),
      "{\"status\":\"completed\"}\n",
      "utf8",
    );

    await expect(listReceipts(directory)).rejects.toThrow();
  });
});
