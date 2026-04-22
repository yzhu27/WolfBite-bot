// Ports utils/parser.py onto the Workers-native HTMLRewriter. No cheerio.
//
// Two parsers:
//   parseMenuPanel  — CBORD "menuPanel" HTML  → { date: { meal: menuOid } }
//   parseItemPanel  — CBORD "itemPanel" HTML  → { category: [dish, ...] }

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "Tuesday, April 22, 2025" → "2025-04-22". Locale-independent.
function parseCardDate(text: string): string | null {
  const m = /([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/.exec(text.trim());
  if (!m) return null;
  const month = MONTHS.indexOf(m[1]!);
  if (month < 0) return null;
  return `${m[3]}-${String(month + 1).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
}

async function consume(rewriter: HTMLRewriter, html: string): Promise<void> {
  // HTMLRewriter only runs handlers when the transformed body is consumed.
  await rewriter.transform(new Response(html)).arrayBuffer();
}

export async function parseMenuPanel(
  html: string,
): Promise<Record<string, Record<string, number>>> {
  const out: Record<string, Record<string, number>> = {};
  let currentDate: string | null = null;
  let headerBuf = "";

  // Per-link accumulators (a.cbo_nn_menuLink).
  let linkOid: number | null = null;
  let linkTextBuf = "";

  const rewriter = new HTMLRewriter()
    .on("section.card header.card-title", {
      element(el) {
        headerBuf = "";
        el.onEndTag(() => {
          const iso = parseCardDate(headerBuf);
          if (iso) {
            currentDate = iso;
            out[iso] ??= {};
          }
          headerBuf = "";
        });
      },
      text(chunk) {
        headerBuf += chunk.text;
      },
    })
    .on("section.card a.cbo_nn_menuLink", {
      element(el) {
        const onclick = el.getAttribute("onclick") ?? "";
        const m = /\((\d+)\)/.exec(onclick);
        linkOid = m ? Number(m[1]) : null;
        linkTextBuf = "";
        el.onEndTag(() => {
          if (currentDate && linkOid !== null) {
            const meal = linkTextBuf.trim();
            if (meal) out[currentDate]![meal] = linkOid;
          }
          linkOid = null;
          linkTextBuf = "";
        });
      },
      text(chunk) {
        linkTextBuf += chunk.text;
      },
    });

  await consume(rewriter, html);
  return out;
}

export async function parseItemPanel(
  html: string,
): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  let currentCategory: string | null = null;

  // category accumulator
  let categoryBuf = "";

  // dish accumulator mirrors BeautifulSoup's get_text(" ", strip=True):
  // each text node is stripped, then joined with a single space. We then
  // split on 2+ whitespace and keep the first segment — same as Python's
  //   re.split(r"\s{2,}", item_anchor.get_text(" ", strip=True))[0]
  const dishPieces: string[] = [];
  let currentPiece = "";

  const pushPiece = () => {
    const s = currentPiece.trim();
    if (s) dishPieces.push(s);
    currentPiece = "";
  };

  const categoryHandler = {
    element(el: Element) {
      categoryBuf = "";
      el.onEndTag(() => {
        const cat = categoryBuf.trim();
        if (cat) {
          currentCategory = cat;
          out[cat] ??= [];
        }
        categoryBuf = "";
      });
    },
    text(chunk: Text) {
      categoryBuf += chunk.text;
    },
  };

  const dishHandler = {
    element(el: Element) {
      dishPieces.length = 0;
      currentPiece = "";
      el.onEndTag(() => {
        pushPiece();
        const joined = dishPieces.join(" ");
        const dish = joined.split(/\s{2,}/)[0]!.trim();
        if (currentCategory && dish) (out[currentCategory] ??= []).push(dish);
        dishPieces.length = 0;
      });
    },
    text(chunk: Text) {
      currentPiece += chunk.text;
      if (chunk.lastInTextNode) pushPiece();
    },
  };

  const rewriter = new HTMLRewriter()
    .on('tr.cbo_nn_itemGroupRow div[role="button"]', categoryHandler)
    .on("tr.cbo_nn_itemPrimaryRow a.cbo_nn_itemHover", dishHandler)
    .on("tr.cbo_nn_itemAlternateRow a.cbo_nn_itemHover", dishHandler);

  await consume(rewriter, html);

  // Drop empty categories — matches Python's final dict comprehension filter.
  for (const k of Object.keys(out)) {
    if (out[k]!.length === 0) delete out[k];
  }
  return out;
}
