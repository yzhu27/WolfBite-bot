import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { translateText } from "../src/i18n/translator";
import Chinese from "../../translations/Chinese.json";
import Spanish from "../../translations/Spanish.json";

describe("translateText", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
  });

  it("returns input unchanged for English", () => {
    expect(translateText("Anything Goes", "English")).toBe("Anything Goes");
    expect(warn).not.toHaveBeenCalled();
  });

  it("translates known Chinese key", () => {
    const key = Object.keys(Chinese)[0]!;
    const expected = (Chinese as Record<string, string>)[key]!;
    expect(translateText(key, "Chinese")).toBe(expected);
    expect(warn).not.toHaveBeenCalled();
  });

  it("translates known Spanish key", () => {
    const key = Object.keys(Spanish)[0]!;
    const expected = (Spanish as Record<string, string>)[key]!;
    expect(translateText(key, "Spanish")).toBe(expected);
    expect(warn).not.toHaveBeenCalled();
  });

  it("returns original and warns once per unknown key", () => {
    const text = "Definitely Not Translated Phrase";
    expect(translateText(text, "Chinese")).toBe(text);
    expect(translateText(text, "Chinese")).toBe(text);
    expect(translateText(text, "Chinese")).toBe(text);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("Chinese");
    expect(warn.mock.calls[0]?.[0]).toContain(text);
  });
});
