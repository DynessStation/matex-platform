// Decoding of the hashids-encoded ids used in the API (see hsid.ts).

interface IdCodec {
  decode(id: string): ReadonlyArray<number | bigint>;
}

/** The numeric id behind an encoded id, or null when it is missing or invalid. */
export const decodeId = (value: unknown, codec: IdCodec): number | null => {
  const id = Number(codec.decode(String(value ?? ''))[0]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};
