import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { receiptSchema, type Receipt } from "./schema";

const RUN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function receiptDirectory(directory?: string): string {
  return (
    directory ??
    process.env.CAPWITNESS_RECEIPT_DIR ??
    path.join(process.cwd(), "data", "receipts")
  );
}

function receiptPath(runId: string, directory?: string): string {
  if (!RUN_ID.test(runId)) {
    throw new Error("Invalid run ID.");
  }

  return path.join(receiptDirectory(directory), `${runId}.json`);
}

export async function saveReceipt(
  receipt: Receipt,
  directory?: string,
): Promise<void> {
  const validated = receiptSchema.parse(receipt);
  const destination = receiptPath(validated.runId, directory);
  const parent = receiptDirectory(directory);
  const temporary = path.join(parent, `.${validated.runId}.${randomUUID()}.tmp`);

  await mkdir(parent, { recursive: true, mode: 0o700 });
  await writeFile(temporary, `${JSON.stringify(validated, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  await rename(temporary, destination);
}

export async function getReceipt(
  runId: string,
  directory?: string,
): Promise<Receipt | null> {
  try {
    const content = await readFile(receiptPath(runId, directory), "utf8");
    return receiptSchema.parse(JSON.parse(content));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

export async function listReceipts(directory?: string): Promise<Receipt[]> {
  const parent = receiptDirectory(directory);

  try {
    const entries = await readdir(parent, { withFileTypes: true });
    const receipts = await Promise.all(
      entries
        .filter(
          (entry) =>
            entry.isFile() &&
            RUN_ID.test(entry.name.replace(/\.json$/u, "")) &&
            entry.name.endsWith(".json"),
        )
        .map((entry) =>
          getReceipt(entry.name.replace(/\.json$/u, ""), directory),
        ),
    );

    return receipts
      .filter((receipt): receipt is Receipt => receipt !== null)
      .sort((left, right) =>
        right.timing.completedAt.localeCompare(left.timing.completedAt),
      );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }
    throw error;
  }
}

export function publicReceipt(receipt: Receipt): Receipt | null {
  return receipt.public ? receiptSchema.parse(receipt) : null;
}

