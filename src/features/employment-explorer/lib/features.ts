/**
 * Compile-time feature flags.
 *
 * `turnoverModule` gates §6.9 (Turnover and retention friction), which
 * publishes employer survey material absent from the published report and
 * is awaiting authorial clearance from ODTÜ-GÜNAM, METU and GÜNDER
 * (BuildSpec "Items to Confirm" 4). It ships OFF and is deliberately a
 * build-time constant — not a URL parameter or runtime toggle — so the
 * unreleased module cannot be reached on a deployed site by crafting a
 * link. Flip it here and rebuild once clearance is confirmed.
 */
export const FEATURES = {
  turnoverModule: false,
} as const;
