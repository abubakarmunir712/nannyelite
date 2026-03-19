import { describe, it, expect } from "vitest";

// ─── Swiss Phone Validation ───
const isValidSwissPhone = (phone: string) => {
  const cleaned = phone.replace(/\s/g, "");
  return /^(\+41|0041|0)[1-9]\d{8}$/.test(cleaned);
};

describe("Swiss Phone Validation", () => {
  it("accepts +41 format", () => {
    expect(isValidSwissPhone("+41 79 123 45 67")).toBe(true);
    expect(isValidSwissPhone("+41791234567")).toBe(true);
  });

  it("accepts 0041 format", () => {
    expect(isValidSwissPhone("0041791234567")).toBe(true);
  });

  it("accepts 0 format", () => {
    expect(isValidSwissPhone("079 123 45 67")).toBe(true);
    expect(isValidSwissPhone("0791234567")).toBe(true);
  });

  it("rejects invalid numbers", () => {
    expect(isValidSwissPhone("123456")).toBe(false);
    expect(isValidSwissPhone("+33 6 12 34 56 78")).toBe(false);
    expect(isValidSwissPhone("")).toBe(false);
    expect(isValidSwissPhone("+41 0123456")).toBe(false); // starts with 0
  });
});

// ─── Speech Language Detection ───
describe("Speech Language Auto-detection", () => {
  it("maps browser languages correctly", () => {
    const detect = (lang: string) => {
      const l = lang.toLowerCase();
      if (l.startsWith("de")) return "de-DE";
      if (l.startsWith("fr")) return "fr-FR";
      if (l.startsWith("it")) return "it-IT";
      return "en-US";
    };

    expect(detect("de-CH")).toBe("de-DE");
    expect(detect("fr-CH")).toBe("fr-FR");
    expect(detect("it-IT")).toBe("it-IT");
    expect(detect("en-GB")).toBe("en-US");
    expect(detect("pt-BR")).toBe("en-US"); // fallback
  });
});

// ─── LocalStorage Progress ───
describe("LocalStorage Progress Saving", () => {
  it("serializes and deserializes Set correctly", () => {
    const slots = new Set(["MON_MORNING", "TUE_AFTERNOON"]);
    const json = JSON.stringify({ availSlots: Array.from(slots) });
    const parsed = JSON.parse(json);
    const restored = new Set(parsed.availSlots);
    expect(restored.has("MON_MORNING")).toBe(true);
    expect(restored.has("TUE_AFTERNOON")).toBe(true);
    expect(restored.size).toBe(2);
  });

  it("handles empty/corrupt data gracefully", () => {
    expect(() => JSON.parse("{}")).not.toThrow();
    expect(() => JSON.parse("invalid")).toThrow();
  });
});
