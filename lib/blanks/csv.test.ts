import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("splits plain fields and records", () => {
    expect(parseCsv("a,b,c\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("reads a quoted name with doubled quotes as one quote (5'8\"\" SB → 5'8\" SB)", () => {
    expect(parseCsv(`Arctic Foam,"5'8"" SB",T0\r\n`)).toEqual([["Arctic Foam", `5'8" SB`, "T0"]]);
  });

  it("keeps commas and doubled quotes inside a quoted flag", () => {
    const flag = `"wake-surf rocker as drawn (catalog also lists a natural rocker of 2 7/16""N 1""T)"`;
    expect(parseCsv(`x,${flag},y`)).toEqual([
      ["x", `wake-surf rocker as drawn (catalog also lists a natural rocker of 2 7/16"N 1"T)`, "y"],
    ]);
    expect(parseCsv(`"a, b",c`)).toEqual([["a, b", "c"]]);
  });

  it("keeps a curly quote as ordinary text", () => {
    expect(parseCsv(`a,6’0” note,b`)).toEqual([["a", "6’0” note", "b"]]);
  });

  it("ends a record at CRLF or LF alike", () => {
    expect(parseCsv("a,b\r\nc,d\ne,f")).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e", "f"],
    ]);
  });

  it("skips a leading byte-order mark", () => {
    expect(parseCsv("﻿vendor,name\r\n")).toEqual([["vendor", "name"]]);
  });

  it("adds no empty record for a trailing newline, and keeps empty cells as empty strings", () => {
    expect(parseCsv("a,,c,\r\n")).toEqual([["a", "", "c", ""]]);
    expect(parseCsv("")).toEqual([]);
  });

  it("keeps a line break inside a quoted field", () => {
    expect(parseCsv(`"two\nlines",b`)).toEqual([["two\nlines", "b"]]);
  });

  it("throws on a quoted field that is never closed, naming its line", () => {
    expect(() => parseCsv(`a\n"open,b`)).toThrow(/line 2/);
  });

  it("throws on text straight after a closing quote", () => {
    expect(() => parseCsv(`"a"b,c`)).toThrow(/closing quote/);
  });
});
