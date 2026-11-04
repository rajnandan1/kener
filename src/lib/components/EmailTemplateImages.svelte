<script lang="ts">
  import type { EditorView } from "@codemirror/view";
  import { Button } from "$lib/components/ui/button/index.js";
  import { toast } from "svelte-sonner";
  import ImagePlusIcon from "@lucide/svelte/icons/image-plus";
  import Loader from "@lucide/svelte/icons/loader";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import GC from "$lib/global-constants.js";

  // Uploads an image and puts <img src="cid:ID"> into an email template's HTML at the cursor. When the email
  // is sent, each image it refers to by cid: goes along as an inline attachment, so no hosted URL is needed.
  interface Props {
    // The template HTML
    value: string;
    // The CodeMirror editor of that HTML, to insert at its cursor; without it the image goes at the end
    view?: EditorView;
  }

  let { value = $bindable(), view }: Props = $props();

  const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic", "image/heif"];
  // Uploads are kept up to twice a 600px email column, so they stay sharp on high-density screens.
  const STORED_MAX_PX = 1200;
  const SHOWN_MAX_PX = 600;

  let uploading = $state(false);
  let fileInput = $state<HTMLInputElement>();
  let missing = $state<Record<string, boolean>>({});
  const referencedIds = $derived([...new Set([...(value ?? "").matchAll(/cid:([A-Za-z0-9._-]+)/g)].map((m) => m[1]))]);

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = (error) => reject(error);
    });
  }

  function escapeAttribute(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function insert(snippet: string) {
    if (view) {
      view.dispatch(view.state.replaceSelection(snippet));
      view.focus();
    } else {
      value = (value ?? "") + snippet;
    }
  }

  async function handleFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Allowed: PNG, JPG, WebP, HEIC");
      input.value = "";
      return;
    }
    if (file.size > GC.MAX_UPLOAD_BYTES) {
      toast.error(`File too large. Maximum size is ${GC.MAX_UPLOAD_BYTES / (1024 * 1024)}MB`);
      input.value = "";
      return;
    }

    uploading = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "uploadImage",
          data: {
            base64: await fileToBase64(file),
            mimeType: file.type,
            fileName: file.name,
            maxWidth: STORED_MAX_PX,
            maxHeight: STORED_MAX_PX
          }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const alt = escapeAttribute(file.name.replace(/\.[^.]+$/, ""));
      const width = Math.min(Number(result.width) || SHOWN_MAX_PX, SHOWN_MAX_PX);
      insert(
        `<img src="cid:${result.id}" alt="${alt}" width="${width}" style="display: block; max-width: 100%; height: auto; border: 0" />`
      );
      toast.success("Image inserted");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      uploading = false;
      input.value = "";
    }
  }
</script>

<div class="flex flex-col gap-2">
  <div class="flex flex-wrap items-center gap-2">
    <input
      bind:this={fileInput}
      type="file"
      accept={ALLOWED_TYPES.join(",")}
      class="hidden"
      aria-label="Image to insert"
      onchange={handleFile}
    />
    <Button type="button" variant="outline" size="sm" onclick={() => fileInput?.click()} disabled={uploading}>
      {#if uploading}
        <Loader class="size-4 animate-spin" />
      {:else}
        <ImagePlusIcon class="size-4" />
      {/if}
      Insert image
    </Button>
    {#each referencedIds as id (id)}
      {#if missing[id]}
        <span
          class="border-destructive/50 text-destructive rounded-md border px-2 py-1 text-xs"
          title="No uploaded image has this id; the email is sent without it"
        >
          Missing: cid:{id}
        </span>
      {:else}
        <a href={clientResolver(resolve, `/assets/images/${id}`)} target="_blank" rel="noreferrer" title="cid:{id}">
          <img
            src={clientResolver(resolve, `/assets/images/${id}`)}
            alt="cid:{id}"
            class="size-8 rounded border object-cover"
            onerror={() => (missing[id] = true)}
          />
        </a>
      {/if}
    {/each}
  </div>
  <p class="text-muted-foreground text-xs">
    Inserts <code class="bg-muted rounded px-1">&lt;img src="cid:…"&gt;</code> at the cursor. The image is sent inside the
    email as an inline attachment; move or resize the tag like any other HTML.
  </p>
</div>
