import { describe, expect, it, vi } from "vitest";
import { SITE_TITLE } from "./metadata";
import { SHARE_COPY, shareSite } from "./share";

/** The Share row's logic (quick 261006-fom, D-06, P-7, T-261006-04), with plain fakes for the
 * browser's share sheet and clipboard. */

function abortError(): Error {
  const error = new Error("The user closed the sheet");
  error.name = "AbortError";
  return error;
}

describe("shareSite", () => {
  it("hands the share sheet the site's name, title line and address, and reports shared", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareSite({ share, clipboard: { writeText } })).toBe("shared");
    expect(share).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({
      title: "Shaper Assistant",
      text: SITE_TITLE,
      url: "https://www.shaperassistant.com",
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("calls the share sheet before anything else is awaited, straight from the tap", () => {
    const share = vi.fn().mockResolvedValue(undefined);
    void shareSite({ share });
    expect(share).toHaveBeenCalledTimes(1);
  });

  it("closing the sheet without sending is left alone: dismissed, nothing copied", async () => {
    const share = vi.fn().mockRejectedValue(abortError());
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareSite({ share, clipboard: { writeText } })).toBe("dismissed");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("a share sheet that fails any other way falls back to copying the address", async () => {
    const share = vi.fn().mockRejectedValue(new Error("NotAllowedError"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareSite({ share, clipboard: { writeText } })).toBe("copied");
    expect(writeText).toHaveBeenCalledWith("https://www.shaperassistant.com");
  });

  it("with no share sheet, copies exactly the site's address", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareSite({ clipboard: { writeText } })).toBe("copied");
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("https://www.shaperassistant.com");
  });

  it("a clipboard that refuses reports failed", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    expect(await shareSite({ clipboard: { writeText } })).toBe("failed");
  });

  it("with neither a share sheet nor a clipboard, reports failed", async () => {
    expect(await shareSite({})).toBe("failed");
  });
});

describe("SHARE_COPY", () => {
  it("reads Share, then Copied, and shows the address when copying fails", () => {
    expect(SHARE_COPY.label).toBe("Share");
    expect(SHARE_COPY.copied).toBe("Copied");
    expect(SHARE_COPY.failed).toContain("www.shaperassistant.com");
  });
});
