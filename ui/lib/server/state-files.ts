import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { open, rename, stat, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  cardSchema,
  type Card,
  type CardsResponse,
  type IntelligenceStatus,
} from "@/lib/types";

const sentientDataDirectory = path.join(
  os.homedir(),
  ".local",
  "share",
  "sentientos",
);

const cardsFilePath = path.join(sentientDataDirectory, "cards", "latest.json");
const memoryFilePath = path.join(sentientDataDirectory, "memory.md");

interface FileSnapshot {
  contents: string;
  signature: string;
  mode: number;
}

export class StateFileError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "StateFileError";
  }
}

function isMissingFile(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

async function readSnapshot(filePath: string): Promise<FileSnapshot | null> {
  let handle;

  try {
    handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    const fileStats = await handle.stat();
    const contents = await handle.readFile({ encoding: "utf8" });

    return {
      contents,
      mode: fileStats.mode,
      signature: `${fileStats.ino}:${fileStats.size}:${fileStats.mtimeMs}`,
    };
  } catch (error) {
    if (isMissingFile(error)) {
      return null;
    }

    throw new StateFileError("The local Sentient state could not be read.", 500);
  } finally {
    await handle?.close();
  }
}

function parseCardsDocument(contents: string, strict: boolean) {
  let document: unknown;

  try {
    document = JSON.parse(contents);
  } catch {
    throw new StateFileError(
      "The local cards file contains invalid JSON. Your data was left unchanged.",
      422,
    );
  }

  if (!Array.isArray(document)) {
    throw new StateFileError(
      "The local cards file must contain a JSON array. Your data was left unchanged.",
      422,
    );
  }

  const cards: Card[] = [];
  let invalidCount = 0;

  for (const candidate of document) {
    const result = cardSchema.safeParse(candidate);

    if (result.success) {
      cards.push(result.data);
    } else {
      invalidCount += 1;
    }
  }

  if (strict && invalidCount > 0) {
    throw new StateFileError(
      "A malformed card prevented this change. Fix the local cards file and try again.",
      422,
    );
  }

  return { cards, invalidCount };
}

export async function readCards(): Promise<CardsResponse> {
  const snapshot = await readSnapshot(cardsFilePath);

  if (!snapshot) {
    return {
      cards: [],
      invalidCount: 0,
      warning: "The cards file has not been created yet.",
    };
  }

  const { cards, invalidCount } = parseCardsDocument(snapshot.contents, false);

  return {
    cards,
    invalidCount,
    warning:
      invalidCount > 0
        ? `${invalidCount} malformed ${invalidCount === 1 ? "card was" : "cards were"} skipped.`
        : null,
  };
}

export async function readMemory() {
  return (await readMemoryDocument()).content;
}

function memoryEtag(contents: string) {
  return `"${createHash("sha256").update(contents).digest("hex")}"`;
}

export async function readMemoryDocument() {
  const snapshot = await readSnapshot(memoryFilePath);

  if (!snapshot) {
    throw new StateFileError(
      "Long-term memory has not been created on this device yet.",
      404,
    );
  }

  return {
    content: snapshot.contents,
    etag: memoryEtag(snapshot.contents),
  };
}

async function writeMemoryAtomically(
  content: string,
  expectedSnapshot: FileSnapshot,
) {
  const tempPath = path.join(
    path.dirname(memoryFilePath),
    `.memory.${process.pid}.${randomUUID()}.tmp`,
  );
  let handle;

  try {
    handle = await open(tempPath, "wx", expectedSnapshot.mode & 0o777);
    await handle.writeFile(content, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;

    if ((await currentSignature(memoryFilePath)) !== expectedSnapshot.signature) {
      throw new StateFileError(
        "Memory changed while this edit was open. Reload it and try again.",
        409,
      );
    }

    await rename(tempPath, memoryFilePath);
  } finally {
    await handle?.close();
    await unlink(tempPath).catch(() => undefined);
  }
}

let memoryMutationQueue: Promise<void> = Promise.resolve();

async function replaceMemory(content: string, expectedEtag?: string | null) {
  const snapshot = await readSnapshot(memoryFilePath);

  if (!snapshot) {
    throw new StateFileError(
      "Long-term memory has not been created on this device yet.",
      404,
    );
  }

  if (expectedEtag && memoryEtag(snapshot.contents) !== expectedEtag) {
    throw new StateFileError(
      "Memory changed while this edit was open. Reload it and try again.",
      409,
    );
  }

  await writeMemoryAtomically(content, snapshot);
  return memoryEtag(content);
}

export function saveMemory(content: string, expectedEtag?: string | null) {
  if (typeof content !== "string") {
    return Promise.reject(new StateFileError("Memory must be Markdown text.", 400));
  }

  if (Buffer.byteLength(content, "utf8") > 1024 * 1024) {
    return Promise.reject(
      new StateFileError("Memory is too large to save from this editor.", 413),
    );
  }

  const mutation = memoryMutationQueue.then(() =>
    replaceMemory(content, expectedEtag),
  );
  memoryMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

async function currentSignature(filePath: string) {
  try {
    const fileStats = await stat(filePath);
    return `${fileStats.ino}:${fileStats.size}:${fileStats.mtimeMs}`;
  } catch (error) {
    if (isMissingFile(error)) {
      return null;
    }

    throw error;
  }
}

async function writeCardsAtomically(
  cards: readonly Card[],
  expectedSnapshot: FileSnapshot,
) {
  const tempPath = path.join(
    path.dirname(cardsFilePath),
    `.latest.${process.pid}.${randomUUID()}.tmp`,
  );
  let handle;

  try {
    handle = await open(tempPath, "wx", expectedSnapshot.mode & 0o777);
    await handle.writeFile(`${JSON.stringify(cards, null, 2)}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;

    if ((await currentSignature(cardsFilePath)) !== expectedSnapshot.signature) {
      throw new StateFileError(
        "The cards changed while this request was being saved. Please try again.",
        409,
      );
    }

    await rename(tempPath, cardsFilePath);
  } finally {
    await handle?.close();
    await unlink(tempPath).catch(() => undefined);
  }
}

let mutationQueue: Promise<void> = Promise.resolve();

async function removeCard(id: string) {
  const snapshot = await readSnapshot(cardsFilePath);

  if (!snapshot) {
    throw new StateFileError("That card is no longer available.", 404);
  }

  const { cards } = parseCardsDocument(snapshot.contents, true);
  const nextCards = cards.filter((card) => card.id !== id);

  if (nextCards.length === cards.length) {
    throw new StateFileError("That card is no longer available.", 404);
  }

  await writeCardsAtomically(nextCards, snapshot);
}

export function deleteCard(id: string) {
  if (id.trim().length === 0 || id.length > 256) {
    return Promise.reject(new StateFileError("The card id is invalid.", 400));
  }

  const mutation = mutationQueue.then(() => removeCard(id));
  mutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

async function fileUpdatedAt(filePath: string) {
  try {
    return (await stat(filePath)).mtime.toISOString();
  } catch (error) {
    if (isMissingFile(error)) {
      return null;
    }

    return null;
  }
}

function latestIso(values: Array<string | null>) {
  const timestamps = values
    .filter((value): value is string => value !== null)
    .map((value) => Date.parse(value))
    .filter((value) => !Number.isNaN(value));

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

export async function readStatus(): Promise<IntelligenceStatus> {
  const [cardsUpdatedAt, memoryUpdatedAt, cardsResult] = await Promise.all([
    fileUpdatedAt(cardsFilePath),
    fileUpdatedAt(memoryFilePath),
    readCards().catch(() => null),
  ]);

  const latestCardCreatedAt = cardsResult
    ? latestIso(cardsResult.cards.map((card) => card.createdAt))
    : null;

  return {
    cardsUpdatedAt,
    memoryUpdatedAt,
    latestUpdateAt: latestIso([
      cardsUpdatedAt,
      memoryUpdatedAt,
      latestCardCreatedAt,
    ]),
  };
}
