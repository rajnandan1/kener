const l = function (sessionLangMap: Record<string, string>, key: string, args: Record<string, string> = {}): string {
  try {
    let obj = sessionLangMap[key];

    // Replace placeholders in the string using the args object
    if (obj && typeof obj === "string") {
      obj = obj.replace(/%\w+/g, (placeholder) => {
        const argKey = placeholder.slice(1); // Remove the `%` to get the key
        return args[argKey] !== undefined ? args[argKey] : placeholder;
      });
    }
    if (obj && typeof obj === "string") {
      return obj;
    }
    console.warn(`Missing localization for key: ${key}`);
    return key;
  } catch (e) {
    console.error("Error in localization function:", e);
    return key;
  }
};

export { l };
