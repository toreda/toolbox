/** OS matcher with an optional raw-version transform (e.g. NT → marketing). */
export type UaOsRule = {name: string; pattern: RegExp; version?: (raw: string) => string};
