<script lang="ts" module>
  import type { ComponentProps } from "svelte";
  import type NativeColorPickerType from "svelte-awesome-color-picker";
  export type ColorPickerProps = ComponentProps<typeof NativeColorPickerType>;
</script>

<script lang="ts">
  import NativeColorPicker from "svelte-awesome-color-picker";
  import { getAdminI18n } from "$lib/admin-i18n/context";
  import ColorPickerDialog from "./ColorPickerDialog.svelte";

  const { t: adminT } = getAdminI18n();
  let {
    nullable = false,
    isDialog = true,
    rgb = $bindable(nullable ? null : { r: 255, g: 0, b: 0, a: 1 }),
    hsv = $bindable(nullable ? null : { h: 0, s: 100, v: 100, a: 1 }),
    hex = $bindable(nullable ? null : "#ff0000"),
    color = $bindable(null),
    isDark = $bindable(false),
    isOpen = $bindable(!isDialog),
    label,
    components,
    texts,
    a11yTexts,
    ...pickerProps
  }: ColorPickerProps = $props();

  const localizedTexts = $derived({
    ...texts,
    label: {
      h: $adminT("hue channel"),
      s: $adminT("saturation channel"),
      v: $adminT("brightness channel"),
      r: $adminT("red channel"),
      g: $adminT("green channel"),
      b: $adminT("blue channel"),
      a: $adminT("alpha channel"),
      hex: $adminT("hex color"),
      withoutColor: $adminT("without color"),
      ...texts?.label
    },
    changeTo: texts?.changeTo ?? $adminT("Change color format to")
  });

  function escapeText(text: string): string {
    return text.replace(
      /[&<>"']/g,
      (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!
    );
  }

  const localizedA11yTexts = $derived({
    contrast: $adminT("Contrast:"),
    nbGradeSummary: (count: number) =>
      count ? $adminT("Failed contrast checks: {count}", { count }) : $adminT("Contrast information"),
    guidelines:
      escapeText($adminT("Learn more:")) +
      ' <a href="https://webaim.org/articles/contrast/" target="_blank" rel="noopener noreferrer">' +
      escapeText($adminT("WebAIM contrast guide")) +
      "</a>",
    ...a11yTexts
  });
</script>

<NativeColorPicker
  {...pickerProps}
  {nullable}
  {isDialog}
  label={label ?? $adminT("Choose a color")}
  components={{ wrapper: ColorPickerDialog, ...components }}
  texts={localizedTexts}
  a11yTexts={localizedA11yTexts}
  bind:rgb
  bind:hsv
  bind:hex
  bind:color
  bind:isDark
  bind:isOpen
/>
