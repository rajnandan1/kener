const IsValidURL = function (url) {
    return /^(http|https):\/\/[^ "]+$/.test(url);
};
const IsValidHTTPMethod = function (method) {
	return /^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH)$/.test(method);
}
export { IsValidURL, IsValidHTTPMethod };
