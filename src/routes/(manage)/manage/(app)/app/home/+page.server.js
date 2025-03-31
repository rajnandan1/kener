import seedSiteData from "$lib/server/db/seedSiteData.js";

export async function load({ parent }) {
  return {
    defaultFooterHTML: seedSiteData.footerHTML,
  };
}
