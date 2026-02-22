import type { LayoutLoad } from "./$types";
import { GetLayoutClientData } from "$lib/client/layoutClientData";
import { setMode } from "mode-watcher";

export const load: LayoutLoad = async ({ data, fetch }) => {
  const clientData = await GetLayoutClientData(data.languageSetting, fetch);

  const theme =
    data.defaultSiteTheme === "dark" || data.defaultSiteTheme === "light" || data.defaultSiteTheme === "system"
      ? data.defaultSiteTheme
      : "system";

  // Only set mode if not already present in localStorage
  if (typeof window !== "undefined" && !localStorage.getItem("mode-watcher-mode")) {
    setMode(theme);
  }

  return {
    ...data,
    ...clientData,
  };
};
