function normalize(value: string): { integer: string; fraction: string } {
  if (!/^\d+(?:\.\d+)?$/u.test(value)) {
    throw new Error("CAP order price is not a non-negative decimal.");
  }

  const [rawInteger, rawFraction = ""] = value.split(".");
  return {
    integer: rawInteger.replace(/^0+(?=\d)/u, ""),
    fraction: rawFraction.replace(/0+$/u, ""),
  };
}

export function exceedsDecimalAmount(value: string, limit: string): boolean {
  const left = normalize(value);
  const right = normalize(limit);

  if (left.integer.length !== right.integer.length) {
    return left.integer.length > right.integer.length;
  }
  if (left.integer !== right.integer) {
    return left.integer > right.integer;
  }

  const width = Math.max(left.fraction.length, right.fraction.length);
  return (
    left.fraction.padEnd(width, "0") > right.fraction.padEnd(width, "0")
  );
}

