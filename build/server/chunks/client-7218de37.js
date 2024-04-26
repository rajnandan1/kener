import { c as create_ssr_component, d as compute_rest_props, g as spread, h as escape_attribute_value, i as escape_object } from './ssr-3edfa391.js';
import { c as cn, i as is_void } from './Icon-36e7f051.js';
import { tv } from 'tailwind-variants';
import 'clsx';

const Badge = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["class", "href", "variant"]);
  let { class: className = void 0 } = $$props;
  let { href = void 0 } = $$props;
  let { variant = "default" } = $$props;
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.href === void 0 && $$bindings.href && href !== void 0)
    $$bindings.href(href);
  if ($$props.variant === void 0 && $$bindings.variant && variant !== void 0)
    $$bindings.variant(variant);
  return `${((tag) => {
    return tag ? `<${href ? "a" : "span"}${spread(
      [
        { href: escape_attribute_value(href) },
        {
          class: escape_attribute_value(cn(badgeVariants({ variant, className })))
        },
        escape_object($$restProps)
      ],
      {}
    )}>${is_void(tag) ? "" : `${slots.default ? slots.default({}) : ``}`}${is_void(tag) ? "" : `</${tag}>`}` : "";
  })(href ? "a" : "span")}`;
});
const badgeVariants = tv({
  base: "inline-flex items-center border rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none select-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  variants: {
    variant: {
      default: "bg-primary hover:bg-primary/80 border-transparent text-primary-foreground",
      secondary: "bg-secondary hover:bg-secondary/80 border-transparent text-secondary-foreground",
      destructive: "bg-destructive hover:bg-destructive/80 border-transparent text-destructive-foreground",
      outline: "text-foreground"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});
const l = function(sessionLangMap, key) {
  const keys = key.split(".");
  let obj = sessionLangMap;
  for (const key2 of keys) {
    obj = obj[key2];
    if (!obj) {
      break;
    }
  }
  return obj || key;
};
const summaryTime = function(sessionLangMap, message) {
  if (message == "No Data") {
    return sessionLangMap.monitor.status_no_data;
  }
  if (message == "Status OK") {
    return sessionLangMap.monitor.status_ok;
  }
  const expectedStrings = [
    {
      regexes: [/^(DEGRADED|DOWN)/g, /\d+ minute$/g],
      s: sessionLangMap.monitor.status_x_minute,
      output: function(message2, sessionLangMap2) {
        let match = message2.match(this.regexes[0]);
        const status = match ? match[0] : null;
        if (!status) {
          return message2;
        }
        match = message2.match(this.regexes[1]);
        const duration = match ? match[0] : null;
        if (!duration) {
          return message2;
        }
        const digits = duration.replace(" minute", "").split("").map((elem) => {
          return sessionLangMap2.numbers[String(elem)];
        }).join("");
        return this.s.replace(/%status/g, sessionLangMap2.statuses[status]).replace(/%minute/, digits);
      }
    },
    {
      regexes: [/^(DEGRADED|DOWN)/g, /\d+ minutes$/g],
      s: sessionLangMap.monitor.status_x_minutes,
      output: function(message2, sessionLangMap2) {
        let match = message2.match(this.regexes[0]);
        const status = match ? match[0] : null;
        if (!status) {
          return message2;
        }
        match = message2.match(this.regexes[1]);
        const duration = match ? match[0] : null;
        if (!duration) {
          return message2;
        }
        const digits = duration.replace(" minutes", "").split("").map((elem) => {
          return sessionLangMap2.numbers[String(elem)];
        }).join("");
        let res = this.s.replace(/%status/g, sessionLangMap2.statuses[status]).replace(/%minutes/, digits);
        return res;
      }
    },
    {
      regexes: [/^(DEGRADED|DOWN)/g, /\d+h/g, /\d+m$/g],
      s: sessionLangMap.monitor.status_x_hour_y_minute,
      output: function(message2, sessionLangMap2) {
        let match = message2.match(this.regexes[0]);
        const status = match ? match[0] : null;
        if (!status) {
          return message2;
        }
        match = message2.match(this.regexes[1]);
        const hour = match ? match[0] : null;
        if (!hour) {
          return message2;
        }
        match = message2.match(this.regexes[2]);
        const minute = match ? match[0] : null;
        if (!minute) {
          return message2;
        }
        const digits = hour.replace("h", "").split("").map((elem) => {
          return sessionLangMap2.numbers[String(elem)];
        }).join("");
        const digits2 = minute.replace("m", "").split("").map((elem) => {
          return sessionLangMap2.numbers[String(elem)];
        }).join("");
        return this.s.replace(/%status/g, sessionLangMap2.statuses[status]).replace(/%hours/g, digits).replace(/%minutes/, digits2);
      }
    },
    {
      regexes: [/^Last \d+ hours$/g],
      s: sessionLangMap.root.last_x_hours,
      output: function(message2, sessionLangMap2) {
        let match = message2.match(/\d+/g);
        const hours = match ? match[0] : null;
        if (!hours) {
          return message2;
        }
        const digits = hours.split("").map((elem) => {
          return sessionLangMap2.numbers[String(elem)];
        }).join("");
        return this.s.replace(/%hours/g, digits);
      }
    }
  ];
  let selectedIndex = -1;
  for (let i = 0; i < expectedStrings.length; i++) {
    let matchCount = 0;
    for (let j = 0; j < expectedStrings[i].regexes.length; j++) {
      if (message.match(expectedStrings[i].regexes[j])) {
        matchCount++;
      }
    }
    if (matchCount == expectedStrings[i].regexes.length) {
      selectedIndex = i;
      break;
    }
  }
  if (selectedIndex < 0) {
    return message;
  }
  const selectedReplace = expectedStrings[selectedIndex];
  return selectedReplace.output(message, sessionLangMap);
};
const n = function(sessionLangMap, inputString) {
  const translations = sessionLangMap.numbers;
  return inputString.replace(
    /\d/g,
    (match) => translations[match] || match
  );
};

export { Badge as B, l, n, summaryTime as s };
//# sourceMappingURL=client-7218de37.js.map
