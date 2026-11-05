// Slash trimming in linear time. A regex such as /\/+$/ retries at every slash of a long run of them,
// so its time grows with the square of the input.

const SLASH = 47;

/** The string without its trailing slashes */
export function TrimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === SLASH) end--;
  return value.slice(0, end);
}

/** The string without its leading and trailing slashes */
export function TrimSlashes(value: string): string {
  let start = 0;
  while (start < value.length && value.charCodeAt(start) === SLASH) start++;
  return TrimTrailingSlashes(value.slice(start));
}
