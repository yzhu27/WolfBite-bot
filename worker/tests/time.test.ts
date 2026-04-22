import { describe, it, expect } from "vitest";
import { queryDateET } from "../src/util/time";

describe("queryDateET — 9pm ET next-day rule", () => {
  it("stays on same day at 20:59 EDT (UTC 00:59)", () => {
    // 2025-04-22T00:59Z → 2025-04-21 20:59 EDT
    expect(queryDateET(new Date("2025-04-22T00:59:00Z"))).toBe("2025-04-21");
  });

  it("rolls to tomorrow at 21:00 EDT (UTC 01:00)", () => {
    // 2025-04-22T01:00Z → 2025-04-21 21:00 EDT → roll to 04-22
    expect(queryDateET(new Date("2025-04-22T01:00:00Z"))).toBe("2025-04-22");
  });

  it("stays on same day at 20:59 EST (winter, UTC 01:59)", () => {
    // 2025-01-15T01:59Z → 2025-01-14 20:59 EST
    expect(queryDateET(new Date("2025-01-15T01:59:00Z"))).toBe("2025-01-14");
  });

  it("rolls to tomorrow at 21:00 EST (winter, UTC 02:00)", () => {
    // 2025-01-15T02:00Z → 2025-01-14 21:00 EST → roll to 01-15
    expect(queryDateET(new Date("2025-01-15T02:00:00Z"))).toBe("2025-01-15");
  });

  it("handles month boundary rollover", () => {
    // 2025-05-01T01:00Z → 2025-04-30 21:00 EDT → roll to 05-01
    expect(queryDateET(new Date("2025-05-01T01:00:00Z"))).toBe("2025-05-01");
  });
});
