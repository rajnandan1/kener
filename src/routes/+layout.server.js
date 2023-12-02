import site from "$lib/.kener/site.json";

export async function load({ params, route, url }) {
    return {
        site: site,
    };
}
