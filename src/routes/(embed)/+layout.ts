import type { LayoutLoad } from "./$types";
import { GetLayoutClientData } from "$lib/client/layoutClientData";

export const load: LayoutLoad = async ({ data }) => {
  const clientData = await GetLayoutClientData(data.languageSetting);

  return {
    ...data,
    ...clientData,
  };
};
