import { describe, expect, it } from "vitest";
import { deviceDisplayName, deviceList, LABEL_KEYS, makeT } from "./i18n";

describe("device names", () => {
  it("shows a known product name in the report language", () => {
    expect(deviceDisplayName("فري ستايل ليبري لنك", "en")).toBe("FreeStyle LibreLink");
    expect(deviceDisplayName("FreeStyle LibreLink", "ar")).toBe("فري ستايل ليبري لنك");
    expect(deviceDisplayName("FreeStyle LibreLink", "en")).toBe("FreeStyle LibreLink");
  });

  it("prints unknown names exactly as exported", () => {
    expect(deviceDisplayName("FreeStyle Libre 2 reader", "ar")).toBe("FreeStyle Libre 2 reader");
  });

  it("joins with the language's own comma, and a dash when empty", () => {
    expect(deviceList(["فري ستايل ليبري لنك", "X"], "en")).toBe("FreeStyle LibreLink, X");
    expect(deviceList(["A", "B"], "ar")).toBe("A، B");
    expect(deviceList([], "en")).toBe("—");
  });
});

describe("comparison signs", () => {
  // Signs are stored by meaning; the browser mirrors them in Arabic. A sign
  // copied from the printed Arabic glyph would be the opposite character.
  const signs = (s: string) => [...s].filter((c) => "<>≤≥".includes(c)).join("");
  const ar = makeT("ar");
  const en = makeT("en");

  it.each(LABEL_KEYS)("%s uses the same signs in Arabic and English", (key) => {
    expect(signs(ar(key))).toBe(signs(en(key)));
  });
});
