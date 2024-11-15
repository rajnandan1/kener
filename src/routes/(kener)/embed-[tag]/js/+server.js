// @ts-nocheck
// @ts-ignore
import fs from "fs-extra";
import { siteStore } from "$lib/server/stores/site";
import { get } from "svelte/store";
let siteData = get(siteStore);
export async function GET({ url, params }) {
	const { tag } = params;
	const query = url.searchParams;
	const uriEmbedded = query.get("monitor");
	const theme = query.get("theme") || "light";
	const bgc = query.get("bgc") || "transparent";
	const uriOriginal = uriEmbedded;

	const currentSlug = tag;
	const js = `
	(function () {
    var createEmbedFrame = function () {
        var uid = "KENER_" + ~~(new Date().getTime() / 86400000);
        var uriOriginal = "${uriOriginal}";
        var uriOriginalNoProtocol = uriOriginal.split("//").pop();
        var uriEmbedded = "${uriEmbedded}?theme=${theme}&bgc=${bgc}";
        var currentSlug = "${currentSlug}";
        var target = document.querySelector("script[src*='" + uriOriginalNoProtocol + "']");
        var iframe = document.createElement("iframe");

        iframe.src = uriEmbedded;
        iframe.id = uid;
        iframe.width = "0%";
        iframe.height = "0";
        iframe.frameBorder = "0";
        iframe.allowtransparency = true;
        iframe.sandbox = "allow-modals allow-forms allow-same-origin allow-scripts allow-popups allow-top-navigation-by-user-activation allow-downloads";
        iframe.allow = "midi; geolocation; microphone; camera; display-capture; encrypted-media;";

        target.parentNode.insertBefore(iframe, target.nextSibling);

        var setHeight = function (data) {
	
            if (data.slug === currentSlug) {
                var height = data.height;
                iframe.height = height;
            }
        };
        var setWidth = function (data) {
		
            if (data.slug === currentSlug) {
                var width = data.width;
                iframe.width = width;
            }
        };

        var listeners = function (event) {
            var eventName = event.data[0];
            var data = event.data[1];
			if(event.data.height !== undefined) {
				setHeight(event.data);
			}
			if(event.data.width !== undefined) {
				setWidth(event.data);
			}
            
        };

        window.addEventListener("message", listeners, false);
    };

    setTimeout(createEmbedFrame, 5);
}).call(this);

	`;
	return new Response(js, {
		headers: {
			"Content-Type": "application/javascript"
		}
	});
}
