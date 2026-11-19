import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { EditorView } from "@codemirror/view";
import Harness from "./CodeEditor.harness.svelte";

describe("administrative code editor forwarding", () => {
  it("mounts the original editor and preserves changes, callbacks and two-way value binding", async () => {
    const onchange = vi.fn();
    const onready = vi.fn();
    const screen = await render(Harness, { initialValue: "const value = 1;", nodebounce: true, onchange, onready });
    await vi.waitFor(() => expect(onready).toHaveBeenCalledOnce());
    const view = onready.mock.calls[0][0] as EditorView;
    expect(view.state.doc.toString()).toBe("const value = 1;");
    expect(document.querySelector('[data-slot="code-editor-fallback"]')).toBeNull();
    view.dispatch({ changes: { from: 0, insert: "// edited\n" } });
    await vi.waitFor(() => expect(onchange).toHaveBeenCalledWith("// edited\nconst value = 1;"));
    await expect.element(screen.getByTestId("bound-editor-value")).toHaveTextContent(/\/\/ edited\s+const value = 1;/);
    await screen.getByRole("button", { name: "Set parent value" }).click();
    await vi.waitFor(() => expect(view.state.doc.toString()).toBe("Updated by parent"));
    await expect.element(screen.getByTestId("bound-editor-value")).toHaveTextContent("Updated by parent");
    expect(onchange).toHaveBeenCalledOnce();
  });

  it("forwards readonly and extensions without replacing their behavior", async () => {
    const onready = vi.fn();
    await render(Harness, {
      initialValue: "read only",
      readonly: true,
      extensions: [EditorView.lineWrapping],
      onready,
    });
    await vi.waitFor(() => expect(onready).toHaveBeenCalledOnce());
    const view = onready.mock.calls[0][0] as EditorView;
    expect(view.state.readOnly).toBe(true);
    expect(view.contentDOM.classList.contains("cm-lineWrapping")).toBe(true);
  });
});
