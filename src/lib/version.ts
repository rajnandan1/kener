function getVersionUsingVite() {
  try {
    if (!!import.meta.env.PACKAGE_VERSION) {
      return import.meta.env.PACKAGE_VERSION;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export default function version() {
  let v = getVersionUsingVite();
  if (!!v) {
    return v;
  } else {
    // Browser-safe fallback (avoid importing Node modules in client bundle)
    if (typeof process !== "undefined" && process.env?.npm_package_version) {
      return process.env.npm_package_version;
    }
    return "0.0.0";
  }
}
