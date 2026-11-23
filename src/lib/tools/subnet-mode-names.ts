import { MODES, type DrillMode } from "./subnetting";

/**
 * The name printed for each subnetting mode on the tool page, in the drill and
 * in its result. The names themselves are the engine's (`MODES` in
 * ./subnetting.ts): this is the same table by id, so there is one source.
 */
export const MODE_NAMES = Object.fromEntries(MODES.map((mode) => [mode.id, mode.label])) as Record<DrillMode, string>;

/** The mode that asks a question from any of the others, in random order. */
export const MIXED_MODE_NAME = "Mixed";

/** A mode's printed name, or the id itself for a mode this table does not know. */
export const modeName = (id: string): string => (MODE_NAMES as Record<string, string | undefined>)[id] ?? id;
