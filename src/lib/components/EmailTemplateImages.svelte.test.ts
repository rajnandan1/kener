import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import type { EditorView } from "@codemirror/view";
import EmailTemplateImages from "./EmailTemplateImages.svelte";

// Thumbnails get a data URL instead of a request to /assets/images, which the test server cannot answer:
// a 1×1 PNG, or bytes that are no image for an id starting 0000.
vi.mock("$lib/client/resolver.js", () => ({
  default: (_resolve: unknown, path: string) =>
    path.startsWith("/assets/images/0000")
      ? "data:image/png;base64,AAAA"
      : path.startsWith("/assets/images/")
        ? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        : path,
}));

const uploaded = { id: "a1b2c3d4e5f60718.png", url: "/assets/images/a1b2c3d4e5f60718.png", width: 1200, height: 400 };

function mockUpload() {
  const fetchMock = vi.fn(
    async (_url: string, _init?: RequestInit) => ({ ok: true, json: async () => uploaded }) as Response,
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Picks a file in the hidden input, as the file dialog does.
function pick(container: HTMLElement, file: File) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const files = new DataTransfer();
  files.items.add(file);
  input.files = files.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

const png = () => new File([new Uint8Array([137, 80, 78, 71])], "Company Logo.png", { type: "image/png" });

describe("EmailTemplateImages", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploads the image and puts a cid reference to it at the cursor", async () => {
    const fetchMock = mockUpload();
    const view = {
      state: { replaceSelection: vi.fn((text: string) => ({ changes: text })) },
      dispatch: vi.fn(),
      focus: vi.fn(),
    };
    const screen = await render(EmailTemplateImages, {
      value: "<p>Hi</p>",
      view: view as unknown as EditorView,
    });

    pick(screen.container, png());

    await vi.waitFor(() => expect(view.dispatch).toHaveBeenCalledOnce());
    const [snippet] = view.state.replaceSelection.mock.calls[0];
    expect(snippet).toBe(
      `<img src="cid:${uploaded.id}" alt="Company Logo" width="600" style="display: block; max-width: 100%; height: auto; border: 0" />`,
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body).toMatchObject({
      action: "uploadImage",
      data: { mimeType: "image/png", maxWidth: 1200, maxHeight: 1200 },
    });
  });

  it("adds the image at the end without an editor, and shows it among the template's images", async () => {
    mockUpload();
    const screen = await render(EmailTemplateImages, { value: "<p>Hi</p>" });

    pick(screen.container, png());

    await expect.element(screen.getByTitle(`cid:${uploaded.id}`)).toBeInTheDocument();
  });

  it("flags a referenced image that cannot be loaded", async () => {
    const screen = await render(EmailTemplateImages, { value: '<img src="cid:0000000000000000.png">' });

    await expect.element(screen.getByText("Missing: cid:0000000000000000.png")).toBeInTheDocument();
  });

  it("refuses a file that is not an image, without uploading it", async () => {
    const fetchMock = mockUpload();
    const screen = await render(EmailTemplateImages, { value: "" });

    pick(screen.container, new File(["x"], "notes.txt", { type: "text/plain" }));

    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
