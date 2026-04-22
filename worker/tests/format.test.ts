import { describe, it, expect } from "vitest";
import { formatMenu } from "../src/util/format";

describe("formatMenu — legacy Markdown parity with utils/formatter.py", () => {
  it("renders categories and dishes exactly", () => {
    const got = formatMenu({
      Breakfast: ["Scrambled Eggs", "Bacon"],
      Lunch: ["Soup"],
    });
    expect(got).toBe(
      "*Breakfast:*\n" +
        "    Scrambled Eggs\n" +
        "    Bacon\n" +
        "\n" +
        "*Lunch:*\n" +
        "    Soup\n" +
        "\n",
    );
  });

  it("neutralises stray * and _ in translated strings", () => {
    const got = formatMenu({ "Grill*": ["rice_pilaf"] });
    expect(got).toBe("*Grill•:*\n    rice pilaf\n\n");
  });

  it("handles empty menu", () => {
    expect(formatMenu({})).toBe("");
  });
});
