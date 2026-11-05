import { describe, expect, it } from "vitest";
import { HtmlToText, PlainTextVariables } from "./htmlToText";

describe("HtmlToText", () => {
  it("turns an update's paragraphs and list into lines", () => {
    const html =
      "<p>We are looking into it.</p>\n<p><strong>Affected monitors</strong></p>\n<ul>\n<li>Kener.ing: DOWN</li>\n<li>Earth: DEGRADED</li>\n</ul>\n";

    expect(HtmlToText(html)).toBe(
      "We are looking into it.\n\nAffected monitors\n\n- Kener.ing: DOWN\n- Earth: DEGRADED",
    );
  });

  it("decodes entities and keeps line breaks", () => {
    expect(HtmlToText("<p>A &amp; B &lt;ok&gt; it&#39;s &#x2F; done&nbsp;now<br>next line</p>")).toBe(
      "A & B <ok> it's / done now\nnext line",
    );
  });

  it("drops styles and the head, and reads source line breaks as spaces", () => {
    const html = `<html><head><title>T</title><style>p { color: red }</style></head>
      <body><p>We would like to provide
        you with an update.</p><a href="https://x">View</a></body></html>`;

    expect(HtmlToText(html)).toBe("We would like to provide you with an update.\n\nView");
  });

  it("leaves plain text alone", () => {
    expect(HtmlToText("Your code: 123456")).toBe("Your code: 123456");
  });
});

describe("PlainTextVariables", () => {
  it("converts only the values that hold HTML", () => {
    expect(
      PlainTextVariables({ update_text: "<p>Down &amp; out</p>", title: "A & B <3", count: 2, is_down: true }),
    ).toEqual({ update_text: "Down & out", title: "A & B <3", count: 2, is_down: true });
  });
});
