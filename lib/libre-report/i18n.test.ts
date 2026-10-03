import { describe, expect, it } from "vitest";
import { deviceDisplayName, deviceList } from "./i18n";

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
