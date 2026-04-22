import { describe, it, expect } from "vitest";
import { parseItemPanel, parseMenuPanel } from "../src/cbord/parser";

const MENU_PANEL_HTML = `
<div>
  <section class="card">
    <header class="card-title">Tuesday, April 22, 2025</header>
    <a class="cbo_nn_menuLink" onclick="netnutrition.selectMenu(1001)">Breakfast</a>
    <a class="cbo_nn_menuLink" onclick="netnutrition.selectMenu(1002)">Lunch</a>
  </section>
  <section class="card">
    <header class="card-title">Wednesday, April 23, 2025</header>
    <a class="cbo_nn_menuLink" onclick="netnutrition.selectMenu(1003)">Dinner</a>
  </section>
</div>`;

const ITEM_PANEL_HTML = `
<table>
  <tr class="cbo_nn_itemGroupRow"><td><div role="button">Breakfast Classics</div></td></tr>
  <tr class="cbo_nn_itemPrimaryRow"><td><a class="cbo_nn_itemHover">Scrambled Eggs<img alt="V"/></a></td></tr>
  <tr class="cbo_nn_itemAlternateRow"><td><a class="cbo_nn_itemHover">Bacon</a></td></tr>
  <tr class="cbo_nn_itemGroupRow"><td><div role="button">Grill</div></td></tr>
  <tr class="cbo_nn_itemPrimaryRow"><td><a class="cbo_nn_itemHover">Cheeseburger</a></td></tr>
  <tr class="cbo_nn_itemGroupRow"><td><div role="button">Empty Section</div></td></tr>
</table>`;

describe("parseMenuPanel", () => {
  it("extracts date → meal → menuOid map", async () => {
    const out = await parseMenuPanel(MENU_PANEL_HTML);
    expect(out).toEqual({
      "2025-04-22": { Breakfast: 1001, Lunch: 1002 },
      "2025-04-23": { Dinner: 1003 },
    });
  });
});

describe("parseItemPanel", () => {
  it("extracts categories and dishes, dropping empty categories", async () => {
    const out = await parseItemPanel(ITEM_PANEL_HTML);
    expect(out).toEqual({
      "Breakfast Classics": ["Scrambled Eggs", "Bacon"],
      Grill: ["Cheeseburger"],
    });
    expect(out["Empty Section"]).toBeUndefined();
  });
});
