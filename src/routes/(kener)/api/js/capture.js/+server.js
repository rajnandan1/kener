// @ts-nocheck
import gtm from "$lib/snippets/capture/google-tag-manager.js?raw";
import mx from "$lib/snippets/capture/mixpanel.js?raw";
import am from "$lib/snippets/capture/amplitude.js?raw";
import pl from "$lib/snippets/capture/plausible.js?raw";
import mscl from "$lib/snippets/capture/clarity.js?raw";
import um from "$lib/snippets/capture/umami.js?raw";
import { GetAllAnalyticsData } from "$lib/server/controllers/controller.js";
export async function GET({ params, setHeaders, url }) {
  let analyticsData = await GetAllAnalyticsData();

  analyticsData = analyticsData.filter((item) => item.value.isEnabled == true);
  if (analyticsData.length == 0) {
    return new Response("//no data", {
      headers: {
        "Content-Type": "application/javascript",
      },
    });
  }

  //reduce to key value
  analyticsData = analyticsData.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {});

  let captureScript = "";
  if (!!analyticsData["analytics.googleTagManager"]) {
    let id = analyticsData["analytics.googleTagManager"].requirements["Measurement ID"];
    captureScript = captureScript + ";\n" + gtm.replaceAll("{{id}}", id);
  }
  if (!!analyticsData["analytics.mixpanel"]) {
    let projectToken = analyticsData["analytics.mixpanel"].requirements["Project Token"];
    captureScript = captureScript + ";\n" + mx.replaceAll("{{YOUR_PROJECT_TOKEN}}", projectToken);
  }
  if (!!analyticsData["analytics.amplitude"]) {
    let api_key = analyticsData["analytics.amplitude"].requirements["Amplitude API Key"];
    captureScript = captureScript + ";\n" + am.replaceAll("{{api_key}}", api_key);
  }

  if (!!analyticsData["analytics.plausible"]) {
    let domain = analyticsData["analytics.plausible"].requirements["Domain"];
    let api = analyticsData["analytics.plausible"].requirements["API"];
    let script_src = analyticsData["analytics.plausible"].requirements["Script Source"];
    captureScript =
      captureScript +
      ";\n" +
      pl.replaceAll("{{domain}}", domain).replaceAll("{{api}}", api).replaceAll("{{script_src}}", script_src);
  }

  if (!!analyticsData["analytics.clarity"]) {
    let project_id = analyticsData["analytics.clarity"].requirements["Project ID"];
    captureScript = captureScript + ";\n" + mscl.replaceAll("{{project_id}}", project_id);
  }
  if (!!analyticsData["analytics.umami"]) {
    let website_id = analyticsData["analytics.umami"].requirements["Website ID"];
    captureScript = captureScript + ";\n" + um.replaceAll("{{website_id}}", website_id);
  }

  return new Response(captureScript, {
    headers: {
      "Content-Type": "application/javascript",
    },
  });
}
