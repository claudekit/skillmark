var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-lfa2r7/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/bundle-lfa2r7/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/utils/body.js
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const path = url.slice(start, queryIndex === -1 ? void 0 : queryIndex);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = /* @__PURE__ */ __name(class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
}, "HonoRequest");

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var Context = /* @__PURE__ */ __name(class {
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= new Response(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = new Response(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (layout) => this.#layout = layout;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = new Response(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return new Response(data, { status, headers: responseHeaders });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => {
    this.#notFoundHandler ??= () => new Response();
    return this.#notFoundHandler(this);
  };
}, "Context");

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = /* @__PURE__ */ __name(class extends Error {
}, "UnsupportedPathError");

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = /* @__PURE__ */ __name(class _Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
}, "_Hono");

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }, "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = /* @__PURE__ */ __name(class _Node {
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
}, "_Node");

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = /* @__PURE__ */ __name(class {
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
}, "Trie");

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = /* @__PURE__ */ __name(class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
}, "RegExpRouter");

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = /* @__PURE__ */ __name(class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
}, "SmartRouter");

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = /* @__PURE__ */ __name(class _Node2 {
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #getHandlerSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
    return handlerSets;
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              handlerSets.push(
                ...this.#getHandlerSets(nextNode.#children["*"], method, node.#params)
              );
            }
            handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          const restPathString = parts.slice(i).join("/");
          if (matcher instanceof RegExp) {
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
              if (Object.keys(child.#children).length) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
              if (child.#children["*"]) {
                handlerSets.push(
                  ...this.#getHandlerSets(child.#children["*"], method, params, node.#params)
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
}, "_Node");

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = /* @__PURE__ */ __name(class {
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
}, "TrieRouter");

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/hono.js
var Hono2 = /* @__PURE__ */ __name(class extends Hono {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
}, "Hono");

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/utils/color.js
function getColorEnabled() {
  const { process, Deno } = globalThis;
  const isNoColor = typeof Deno?.noColor === "boolean" ? Deno.noColor : process !== void 0 ? (
    // eslint-disable-next-line no-unsafe-optional-chaining
    "NO_COLOR" in process?.env
  ) : false;
  return !isNoColor;
}
__name(getColorEnabled, "getColorEnabled");
async function getColorEnabledAsync() {
  const { navigator } = globalThis;
  const cfWorkers = "cloudflare:workers";
  const isNoColor = navigator !== void 0 && navigator.userAgent === "Cloudflare-Workers" ? await (async () => {
    try {
      return "NO_COLOR" in ((await import(cfWorkers)).env ?? {});
    } catch {
      return false;
    }
  })() : !getColorEnabled();
  return !isNoColor;
}
__name(getColorEnabledAsync, "getColorEnabledAsync");

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/middleware/logger/index.js
var humanize = /* @__PURE__ */ __name((times) => {
  const [delimiter, separator] = [",", "."];
  const orderTimes = times.map((v) => v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + delimiter));
  return orderTimes.join(separator);
}, "humanize");
var time = /* @__PURE__ */ __name((start) => {
  const delta = Date.now() - start;
  return humanize([delta < 1e3 ? delta + "ms" : Math.round(delta / 1e3) + "s"]);
}, "time");
var colorStatus = /* @__PURE__ */ __name(async (status) => {
  const colorEnabled = await getColorEnabledAsync();
  if (colorEnabled) {
    switch (status / 100 | 0) {
      case 5:
        return `\x1B[31m${status}\x1B[0m`;
      case 4:
        return `\x1B[33m${status}\x1B[0m`;
      case 3:
        return `\x1B[36m${status}\x1B[0m`;
      case 2:
        return `\x1B[32m${status}\x1B[0m`;
    }
  }
  return `${status}`;
}, "colorStatus");
async function log(fn, prefix, method, path, status = 0, elapsed) {
  const out = prefix === "<--" ? `${prefix} ${method} ${path}` : `${prefix} ${method} ${path} ${await colorStatus(status)} ${elapsed}`;
  fn(out);
}
__name(log, "log");
var logger = /* @__PURE__ */ __name((fn = console.log) => {
  return /* @__PURE__ */ __name(async function logger2(c, next) {
    const { method, url } = c.req;
    const path = url.slice(url.indexOf("/", 8));
    await log(fn, "<--", method, path);
    const start = Date.now();
    await next();
    await log(fn, "-->", method, path, c.res.status, time(start));
  }, "logger2");
}, "logger");

// src/routes/api-endpoints-handler.ts
var apiRouter = new Hono2();
apiRouter.post("/results", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "Missing or invalid API key" }, 401);
    }
    const apiKey = authHeader.slice(7);
    const keyInfo = await verifyApiKeyAndGetInfo(c.env.DB, apiKey);
    if (!keyInfo) {
      return c.json({ error: "Invalid API key" }, 401);
    }
    const payload = await c.req.json();
    if (!payload.skillId || !payload.skillName || !payload.model || !payload.hash) {
      return c.json({ error: "Missing required fields" }, 400);
    }
    if (!["haiku", "sonnet", "opus"].includes(payload.model)) {
      return c.json({ error: "Invalid model" }, 400);
    }
    if (payload.accuracy < 0 || payload.accuracy > 100) {
      return c.json({ error: "Accuracy must be between 0 and 100" }, 400);
    }
    await ensureSkillExists(c.env.DB, payload.skillId, payload.skillName, payload.source);
    const resultId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO results (
        id, skill_id, model, accuracy, tokens_total, tokens_input, tokens_output,
        duration_ms, cost_usd, tool_count, runs, hash, raw_json,
        submitter_github, test_files, skillsh_link
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      resultId,
      payload.skillId,
      payload.model,
      payload.accuracy,
      payload.tokensTotal,
      payload.tokensInput || null,
      payload.tokensOutput || null,
      payload.durationMs,
      payload.costUsd,
      payload.toolCount || null,
      payload.runs,
      payload.hash,
      payload.rawJson || null,
      keyInfo.githubUsername || null,
      payload.testFiles ? JSON.stringify(payload.testFiles) : null,
      payload.skillshLink || null
    ).run();
    await updateApiKeyLastUsed(c.env.DB, apiKey);
    const rank = await getSkillRank(c.env.DB, payload.skillId);
    return c.json({
      success: true,
      resultId,
      leaderboardUrl: `https://skillmark.sh/?skill=${encodeURIComponent(payload.skillName)}`,
      rank,
      submitter: keyInfo.githubUsername ? {
        github: keyInfo.githubUsername,
        avatar: keyInfo.githubAvatar
      } : null
    });
  } catch (error) {
    console.error("Error submitting result:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});
apiRouter.get("/leaderboard", async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
    const offset = parseInt(c.req.query("offset") || "0");
    const results = await c.env.DB.prepare(`
      SELECT
        skill_id as skillId,
        skill_name as skillName,
        source,
        best_accuracy as bestAccuracy,
        best_model as bestModel,
        avg_tokens as avgTokens,
        avg_cost as avgCost,
        last_tested as lastTested,
        total_runs as totalRuns
      FROM leaderboard
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();
    const entries = results.results?.map((row) => ({
      ...row,
      lastTested: row.lastTested ? new Date(row.lastTested * 1e3).toISOString() : null
    })) || [];
    return c.json({ entries });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});
apiRouter.get("/skill/:name", async (c) => {
  try {
    const skillName = decodeURIComponent(c.req.param("name"));
    const skill = await c.env.DB.prepare(`
      SELECT
        skill_id as skillId,
        skill_name as skillName,
        source,
        best_accuracy as bestAccuracy,
        best_model as bestModel,
        avg_tokens as avgTokens,
        avg_cost as avgCost,
        last_tested as lastTested,
        total_runs as totalRuns
      FROM leaderboard
      WHERE skill_name = ?
    `).bind(skillName).first();
    if (!skill) {
      return c.json({ error: "Skill not found" }, 404);
    }
    const history = await c.env.DB.prepare(`
      SELECT
        accuracy,
        model,
        created_at as date
      FROM results
      WHERE skill_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).bind(skill.skillId).all();
    const formattedHistory = history.results?.map((row) => ({
      accuracy: row.accuracy,
      model: row.model,
      date: row.date ? new Date(row.date * 1e3).toISOString() : null
    })) || [];
    return c.json({
      ...skill,
      lastTested: skill.lastTested ? new Date(skill.lastTested * 1e3).toISOString() : null,
      history: formattedHistory
    });
  } catch (error) {
    console.error("Error fetching skill:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});
apiRouter.post("/verify", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ valid: false }, 401);
    }
    const apiKey = authHeader.slice(7);
    const isValid = await verifyApiKey(c.env.DB, apiKey);
    return c.json({ valid: isValid });
  } catch (error) {
    return c.json({ valid: false }, 500);
  }
});
async function verifyApiKey(db, apiKey) {
  const keyHash = await hashApiKey(apiKey);
  const result = await db.prepare(`
    SELECT id FROM api_keys WHERE key_hash = ?
  `).bind(keyHash).first();
  return result !== null;
}
__name(verifyApiKey, "verifyApiKey");
async function verifyApiKeyAndGetInfo(db, apiKey) {
  const keyHash = await hashApiKey(apiKey);
  const result = await db.prepare(`
    SELECT github_username, github_avatar FROM api_keys WHERE key_hash = ?
  `).bind(keyHash).first();
  if (!result) {
    return null;
  }
  return {
    githubUsername: result.github_username,
    githubAvatar: result.github_avatar
  };
}
__name(verifyApiKeyAndGetInfo, "verifyApiKeyAndGetInfo");
async function updateApiKeyLastUsed(db, apiKey) {
  const keyHash = await hashApiKey(apiKey);
  await db.prepare(`
    UPDATE api_keys SET last_used_at = unixepoch() WHERE key_hash = ?
  `).bind(keyHash).run();
}
__name(updateApiKeyLastUsed, "updateApiKeyLastUsed");
async function hashApiKey(apiKey) {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashApiKey, "hashApiKey");
async function ensureSkillExists(db, skillId, skillName, source) {
  const existing = await db.prepare(`
    SELECT id FROM skills WHERE id = ?
  `).bind(skillId).first();
  if (!existing) {
    await db.prepare(`
      INSERT INTO skills (id, name, source) VALUES (?, ?, ?)
    `).bind(skillId, skillName, source).run();
  }
}
__name(ensureSkillExists, "ensureSkillExists");
async function getSkillRank(db, skillId) {
  const result = await db.prepare(`
    SELECT COUNT(*) + 1 as rank
    FROM leaderboard
    WHERE best_accuracy > (
      SELECT best_accuracy FROM leaderboard WHERE skill_id = ?
    )
  `).bind(skillId).first();
  return result?.rank || null;
}
__name(getSkillRank, "getSkillRank");

// src/routes/html-pages-renderer.ts
var pagesRouter = new Hono2();
pagesRouter.get("/", async (c) => {
  try {
    const cookieHeader = c.req.header("Cookie") || "";
    const currentUser = await getCurrentUser(c.env.DB, cookieHeader);
    const results = await c.env.DB.prepare(`
      SELECT
        l.skill_id as skillId,
        l.skill_name as skillName,
        l.source,
        l.best_accuracy as bestAccuracy,
        l.best_model as bestModel,
        l.avg_tokens as avgTokens,
        l.avg_cost as avgCost,
        l.last_tested as lastTested,
        l.total_runs as totalRuns,
        (SELECT submitter_github FROM results WHERE skill_id = l.skill_id ORDER BY created_at DESC LIMIT 1) as submitterGithub,
        (SELECT skillsh_link FROM results WHERE skill_id = l.skill_id AND skillsh_link IS NOT NULL ORDER BY created_at DESC LIMIT 1) as skillshLink
      FROM leaderboard l
      LIMIT 50
    `).all();
    const entries = results.results || [];
    return c.html(renderLeaderboardPage(entries, currentUser));
  } catch (error) {
    console.error("Error rendering leaderboard:", error);
    return c.html(renderErrorPage("Failed to load leaderboard"));
  }
});
pagesRouter.get("/docs", (c) => {
  return c.html(renderDocsPage());
});
pagesRouter.get("/how-it-works", (c) => {
  return c.html(renderHowItWorksPage());
});
pagesRouter.get("/skill/:name", async (c) => {
  try {
    const skillName = decodeURIComponent(c.req.param("name"));
    const skill = await c.env.DB.prepare(`
      SELECT
        l.skill_id as skillId,
        l.skill_name as skillName,
        l.source,
        l.best_accuracy as bestAccuracy,
        l.best_model as bestModel,
        l.avg_tokens as avgTokens,
        l.avg_cost as avgCost,
        l.last_tested as lastTested,
        l.total_runs as totalRuns
      FROM leaderboard l
      WHERE l.skill_name = ?
    `).bind(skillName).first();
    if (!skill) {
      return c.html(renderErrorPage("Skill not found"), 404);
    }
    const results = await c.env.DB.prepare(`
      SELECT
        r.accuracy,
        r.model,
        r.tokens_total as tokensTotal,
        r.cost_usd as costUsd,
        r.created_at as createdAt,
        r.submitter_github as submitterGithub,
        r.skillsh_link as skillshLink,
        r.test_files as testFiles
      FROM results r
      WHERE r.skill_id = ?
      ORDER BY r.created_at DESC
      LIMIT 20
    `).bind(skill.skillId).all();
    const formattedResults = results.results?.map((r) => ({
      accuracy: r.accuracy,
      model: r.model,
      tokensTotal: r.tokensTotal,
      costUsd: r.costUsd,
      createdAt: r.createdAt ? new Date(r.createdAt * 1e3).toISOString() : null,
      submitterGithub: r.submitterGithub,
      skillshLink: r.skillshLink,
      testFiles: r.testFiles ? JSON.parse(r.testFiles) : null
    })) || [];
    return c.html(renderSkillDetailPage(skill, formattedResults));
  } catch (error) {
    console.error("Error rendering skill page:", error);
    return c.html(renderErrorPage("Failed to load skill details"));
  }
});
pagesRouter.get("/login", (c) => {
  const error = c.req.query("error");
  return c.html(renderLoginPage(error));
});
pagesRouter.get("/dashboard", async (c) => {
  const cookieHeader = c.req.header("Cookie") || "";
  const sessionId = parseCookie(cookieHeader, "skillmark_session");
  if (!sessionId) {
    return c.redirect("/login");
  }
  const session = await c.env.DB.prepare(`
    SELECT u.id, u.github_username, u.github_avatar
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > unixepoch()
  `).bind(sessionId).first();
  if (!session) {
    return c.redirect("/login");
  }
  const keys = await c.env.DB.prepare(`
    SELECT id, created_at, last_used_at
    FROM api_keys
    WHERE github_username = ?
    ORDER BY created_at DESC
  `).bind(session.github_username).all();
  const formattedKeys = keys.results?.map((key) => ({
    id: key.id,
    createdAt: key.created_at ? new Date(key.created_at * 1e3).toISOString() : null,
    lastUsedAt: key.last_used_at ? new Date(key.last_used_at * 1e3).toISOString() : null
  })) || [];
  return c.html(renderDashboardPage({
    username: session.github_username,
    avatar: session.github_avatar,
    keys: formattedKeys
  }));
});
function parseCookie(cookieHeader, name) {
  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [cookieName, ...rest] = cookie.trim().split("=");
    if (cookieName === name) {
      return rest.join("=");
    }
  }
  return null;
}
__name(parseCookie, "parseCookie");
async function getCurrentUser(db, cookieHeader) {
  const sessionId = parseCookie(cookieHeader, "skillmark_session");
  if (!sessionId)
    return null;
  const session = await db.prepare(`
    SELECT u.github_username, u.github_avatar
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > unixepoch()
  `).bind(sessionId).first();
  if (!session)
    return null;
  return {
    username: session.github_username,
    avatar: session.github_avatar
  };
}
__name(getCurrentUser, "getCurrentUser");
function renderNav(currentUser) {
  const userSection = currentUser ? `<a href="/dashboard" class="user-nav">
        <img src="${currentUser.avatar || `https://github.com/${currentUser.username}.png?size=32`}" alt="" class="user-avatar">
        <span>@${escapeHtml(currentUser.username)}</span>
      </a>` : `<a href="/login">Login</a>`;
  return `
  <nav>
    <div class="nav-left">
      <a href="/" class="nav-home">
        <svg class="nav-logo" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
        <span class="nav-divider">/</span>
        <span class="nav-title">Skillmark</span>
      </a>
    </div>
    <div class="nav-right">
      <a href="/docs">Docs</a>
      <a href="/how-it-works">How It Works</a>
      <a href="https://github.com/claudekit/skillmark" title="GitHub"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg></a>
      ${userSection}
    </div>
  </nav>`;
}
__name(renderNav, "renderNav");
function renderLeaderboardPage(entries, currentUser = null) {
  const totalRuns = entries.reduce((sum, e) => sum + e.totalRuns, 0);
  const rows = entries.map((entry, index) => {
    const rank = index + 1;
    const accuracy = entry.bestAccuracy.toFixed(1);
    const source = entry.source || "";
    const repoPath = source.replace("https://github.com/", "").replace(/\.git$/, "");
    const submitter = entry.submitterGithub;
    const skillshLink = entry.skillshLink;
    return `
      <tr onclick="window.location='/skill/${encodeURIComponent(entry.skillName)}'" style="cursor: pointer;">
        <td class="rank">${rank}</td>
        <td class="skill">
          <div class="skill-info">
            <span class="skill-name">${escapeHtml(entry.skillName)}</span>
            ${repoPath ? `<span class="skill-repo">${escapeHtml(repoPath)}</span>` : ""}
            ${skillshLink ? `<a href="${escapeHtml(skillshLink)}" class="skillsh-link" onclick="event.stopPropagation()">skill.sh</a>` : ""}
          </div>
        </td>
        <td class="submitter">
          ${submitter ? `
            <a href="https://github.com/${escapeHtml(submitter)}" class="submitter-link" onclick="event.stopPropagation()">
              <img src="https://github.com/${escapeHtml(submitter)}.png?size=24" alt="" class="submitter-avatar">
              <span>@${escapeHtml(submitter)}</span>
            </a>
          ` : '<span class="no-submitter">-</span>'}
        </td>
        <td class="accuracy">${accuracy}%</td>
      </tr>
    `;
  }).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Skillmark - Agent Skill Benchmarks</title>
  <meta name="description" content="The open agent skill benchmarking platform. Test and compare AI agent skills with detailed metrics.">

  <!-- Favicon -->
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/favicon.png">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://skillmark.sh/">
  <meta property="og:title" content="Skillmark - Agent Skill Benchmarks">
  <meta property="og:description" content="Benchmark your AI agent skills with detailed metrics. Compare accuracy, token usage, and cost across models.">
  <meta property="og:image" content="https://cdn.claudekit.cc/skillmark/og-image.png">
  <meta property="og:site_name" content="Skillmark">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://skillmark.sh/">
  <meta name="twitter:title" content="Skillmark - Agent Skill Benchmarks">
  <meta name="twitter:description" content="Benchmark your AI agent skills with detailed metrics. Compare accuracy, token usage, and cost across models.">
  <meta name="twitter:image" content="https://cdn.claudekit.cc/skillmark/og-image.png">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :root {
      --bg: #000;
      --text: #ededed;
      --text-secondary: #888;
      --border: #333;
      --hover: #111;
    }

    body {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }

    /* Navigation */
    nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border);
    }

    .nav-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .nav-logo {
      font-size: 1.25rem;
    }

    .nav-divider {
      color: var(--text-secondary);
      margin: 0 0.25rem;
    }

    .nav-title {
      font-weight: 500;
    }

    .nav-right {
      display: flex;
      gap: 1.5rem;
    }

    .nav-right a {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.875rem;
    }

    .nav-right a:hover {
      color: var(--text);
    }

    .user-nav {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .user-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
    }

    .nav-home {
      display: flex;
      align-items: center;
      text-decoration: none;
      color: inherit;
    }

    /* Main container */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 4rem 1.5rem;
    }

    /* Hero section */
    .hero {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4rem;
      margin-bottom: 4rem;
      align-items: start;
    }

    .hero-left {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .logo-text {
      font-family: 'Geist Mono', monospace;
      font-size: 4rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      line-height: 1;
    }

    .logo-subtitle {
      font-size: 0.75rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--text-secondary);
    }

    .hero-right p {
      font-size: 1.5rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    /* Install section */
    .install-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4rem;
      margin-bottom: 5rem;
    }

    .install-box h3 {
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--text-secondary);
      margin-bottom: 1rem;
    }

    .install-command {
      display: flex;
      align-items: center;
      background: #0a0a0a;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.875rem 1rem;
      font-family: 'Geist Mono', monospace;
      font-size: 0.875rem;
    }

    .install-command .dollar {
      color: var(--text-secondary);
      margin-right: 0.5rem;
      user-select: none;
    }

    .install-command code {
      flex: 1;
    }

    .install-command .copy-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0.25rem;
    }

    .install-command .copy-btn:hover {
      color: var(--text);
    }

    .agents-list {
      display: flex;
      gap: 1.5rem;
      align-items: center;
    }

    .agent-icon {
      width: 32px;
      height: 32px;
      opacity: 0.6;
    }

    .agent-icon:hover {
      opacity: 1;
    }

    /* Leaderboard section */
    .leaderboard-section h2 {
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--text-secondary);
      margin-bottom: 1.5rem;
    }

    /* Search bar */
    .search-container {
      position: relative;
      margin-bottom: 1.5rem;
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
    }

    .search-input {
      width: 100%;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.875rem 1rem 0.875rem 2.75rem;
      font-family: 'Geist Mono', monospace;
      font-size: 0.875rem;
      color: var(--text);
      outline: none;
    }

    .search-input::placeholder {
      color: var(--text-secondary);
    }

    .search-input:focus {
      border-color: #555;
    }

    .search-shortcut {
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
      font-family: 'Geist Mono', monospace;
      font-size: 0.75rem;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 0.125rem 0.375rem;
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.75rem;
    }

    .tab {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-family: inherit;
      font-size: 0.875rem;
      cursor: pointer;
      padding: 0;
    }

    .tab:hover {
      color: var(--text);
    }

    .tab.active {
      color: var(--text);
      text-decoration: underline;
      text-underline-offset: 0.5rem;
    }

    .tab-count {
      color: var(--text-secondary);
    }

    /* Table */
    .leaderboard-table {
      width: 100%;
      border-collapse: collapse;
    }

    .leaderboard-table th {
      text-align: left;
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-secondary);
      font-weight: 500;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border);
    }

    .leaderboard-table th:last-child {
      text-align: right;
    }

    .leaderboard-table td {
      padding: 1rem 0;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }

    .leaderboard-table tr:hover td {
      background: var(--hover);
    }

    .rank {
      width: 50px;
      color: var(--text-secondary);
      font-family: 'Geist Mono', monospace;
    }

    .skill {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .skill-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .skill-name {
      font-weight: 500;
    }

    .skill-repo {
      font-family: 'Geist Mono', monospace;
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .skillsh-link {
      font-size: 0.75rem;
      color: #58a6ff;
      text-decoration: none;
    }

    .skillsh-link:hover {
      text-decoration: underline;
    }

    .submitter {
      width: 150px;
    }

    .submitter-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.8125rem;
    }

    .submitter-link:hover {
      color: var(--text);
    }

    .submitter-avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
    }

    .no-submitter {
      color: var(--text-secondary);
    }

    .accuracy {
      text-align: right;
      font-family: 'Geist Mono', monospace;
      font-weight: 500;
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--text-secondary);
    }

    .empty-state p {
      margin-bottom: 2rem;
    }

    .empty-cta {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    .empty-cta code {
      background: #0a0a0a;
      border: 1px solid var(--border);
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      font-family: 'Geist Mono', monospace;
      font-size: 0.875rem;
    }

    /* Footer */
    footer {
      margin-top: 4rem;
      padding: 2rem 0;
      border-top: 1px solid var(--border);
      text-align: center;
      color: var(--text-secondary);
      font-size: 0.8125rem;
    }

    footer a {
      color: var(--text);
      text-decoration: none;
    }

    footer a:hover {
      text-decoration: underline;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .hero {
        grid-template-columns: 1fr;
        gap: 2rem;
      }

      .logo-text {
        font-size: 2.5rem;
      }

      .hero-right p {
        font-size: 1.125rem;
      }

      .install-section {
        grid-template-columns: 1fr;
        gap: 2rem;
      }

      .agents-list {
        flex-wrap: wrap;
      }
    }
  </style>
</head>
<body>
  ${renderNav(currentUser)}

  <div class="container">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-left">
        <div>
          <div class="logo-text">SKILLMARK</div>
          <div class="logo-subtitle">The Agent Skill Benchmarking Platform</div>
        </div>
      </div>
      <div class="hero-right">
        <p>Benchmark your AI agent skills with detailed metrics. Compare accuracy, token usage, and cost across models.</p>
      </div>
    </section>

    <!-- Install -->
    <section class="install-section">
      <div class="install-box">
        <h3>Install in One Command</h3>
        <div class="install-command">
          <span class="dollar">$</span>
          <code>npx skillmark run &lt;skill-path&gt;</code>
          <button class="copy-btn" onclick="navigator.clipboard.writeText('npx skillmark run')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="install-box">
        <h3>Compatible with These Agents</h3>
        <div class="agents-list">
          <svg class="agent-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
          <svg class="agent-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          <svg class="agent-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6zm0 4h8v2H6zm10 0h2v2h-2zm-6-4h8v2h-8z"/></svg>
          <svg class="agent-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        </div>
      </div>
    </section>

    <!-- Leaderboard -->
    <section class="leaderboard-section">
      <h2>Skills Leaderboard</h2>

      <div class="search-container">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" class="search-input" placeholder="Search skills..." id="search">
        <span class="search-shortcut">/</span>
      </div>

      <div class="tabs">
        <button class="tab active">All Time <span class="tab-count">(${entries.length.toLocaleString()})</span></button>
        <button class="tab">By Accuracy</button>
        <button class="tab">By Tokens</button>
        <button class="tab">By Cost</button>
      </div>

      ${entries.length > 0 ? `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Skill</th>
            <th>Submitter</th>
            <th>Accuracy</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      ` : `
      <div class="empty-state">
        <p>No benchmark results yet.</p>
        <div class="empty-cta">
          <code>npx skillmark run &lt;skill-path&gt;</code>
          <code>npx skillmark publish ./result.json --api-key &lt;key&gt;</code>
        </div>
      </div>
      `}
    </section>

    <footer>
      <p>
        Built with <a href="https://github.com/claudekit/skillmark">Skillmark</a> \xB7
        <a href="https://www.npmjs.com/package/skillmark">npm</a> \xB7
        <a href="https://github.com/claudekit/skillmark">GitHub</a> \xB7
        by <a href="https://claudekit.cc">ClaudeKit.cc</a>
      </p>
    </footer>
  </div>

  <script>
    // Keyboard shortcut for search
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('search').focus();
      }
    });

    // Search functionality
    document.getElementById('search').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll('.leaderboard-table tbody tr').forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
      });
    });
  <\/script>
</body>
</html>`;
}
__name(renderLeaderboardPage, "renderLeaderboardPage");
function renderErrorPage(message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error - Skillmark</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Geist', -apple-system, sans-serif;
      background: #000;
      color: #ededed;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }
    .error {
      text-align: center;
      padding: 2rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }
    p { color: #888; margin-bottom: 1.5rem; }
    a {
      color: #ededed;
      text-decoration: underline;
      text-underline-offset: 4px;
    }
  </style>
</head>
<body>
  <div class="error">
    <h1>Something went wrong</h1>
    <p>${escapeHtml(message)}</p>
    <a href="/">Back to leaderboard</a>
  </div>
</body>
</html>`;
}
__name(renderErrorPage, "renderErrorPage");
function renderDocsPage() {
  return renderDocLayout("Getting Started", `
    <section class="doc-section">
      <h2>Installation</h2>
      <p>Install Skillmark globally or use npx:</p>
      <pre><code>npm install -g skillmark
# or
npx skillmark</code></pre>
    </section>

    <section class="doc-section">
      <h2>Requirements</h2>
      <ul>
        <li><strong>Claude Code CLI</strong> - Skillmark runs benchmarks using Claude Code locally</li>
        <li><strong>Claude Max subscription</strong> - Required for Claude Code API access</li>
      </ul>
      <p>All benchmarks run 100% locally on your machine.</p>
    </section>

    <section class="doc-section">
      <h2>Quick Start</h2>
      <p>Run your first benchmark in 3 steps:</p>

      <h3>1. Test Files (Auto-generated)</h3>
      <p>Skillmark auto-generates test files based on your skill's SKILL.md. Just run:</p>
      <pre><code>skillmark run ./my-skill</code></pre>
      <p>Or create tests manually with YAML frontmatter:</p>
      <pre><code>---
name: my-first-test
type: knowledge
concepts:
  - concept-one
  - concept-two
timeout: 120
---

# Prompt
Your question or task here.

# Expected
- [ ] First expected outcome
- [ ] Second expected outcome</code></pre>

      <h3>2. Run the benchmark</h3>
      <pre><code>skillmark run ./my-skill --tests ./tests --model sonnet --runs 3</code></pre>

      <h3>3. View results</h3>
      <p>Results are saved to <code>./skillmark-results/</code>:</p>
      <ul>
        <li><code>result.json</code> - Machine-readable metrics</li>
        <li><code>report.md</code> - Human-readable report</li>
      </ul>
    </section>

    <section class="doc-section">
      <h2>CLI Commands</h2>
      <table>
        <tr><td><code>skillmark run &lt;skill&gt;</code></td><td>Run benchmark against a skill</td></tr>
        <tr><td><code>skillmark publish &lt;result&gt;</code></td><td>Upload results to leaderboard</td></tr>
        <tr><td><code>skillmark leaderboard</code></td><td>View skill rankings</td></tr>
      </table>
    </section>

    <section class="doc-section">
      <h2>Options</h2>
      <table>
        <tr><td><code>--tests &lt;path&gt;</code></td><td>Path to test suite (default: ./tests)</td></tr>
        <tr><td><code>--model &lt;model&gt;</code></td><td>haiku | sonnet | opus (default: opus)</td></tr>
        <tr><td><code>--runs &lt;n&gt;</code></td><td>Number of iterations (default: 3)</td></tr>
        <tr><td><code>--output &lt;dir&gt;</code></td><td>Output directory (default: ./skillmark-results)</td></tr>
        <tr><td><code>--publish</code></td><td>Auto-publish results to leaderboard</td></tr>
      </table>
    </section>

    <section class="doc-section">
      <h2>Publishing Results</h2>
      <h3>1. Get API Key</h3>
      <p><a href="/login">Login with GitHub</a> to get your API key from the dashboard.</p>

      <h3>2. Save API Key</h3>
      <pre><code># Option 1: Environment variable
export SKILLMARK_API_KEY=sk_your_key

# Option 2: Config file
echo "api_key=sk_your_key" > ~/.skillmarkrc</code></pre>

      <h3>3. Publish</h3>
      <pre><code># Auto-publish after benchmark
skillmark run ./my-skill --publish

# Or publish existing results
skillmark publish ./skillmark-results/result.json</code></pre>
    </section>
  `);
}
__name(renderDocsPage, "renderDocsPage");
function renderHowItWorksPage() {
  return renderDocLayout("How It Works", `
    <section class="doc-section">
      <h2>Overview</h2>
      <p>Skillmark benchmarks AI agent skills by running standardized tests and measuring key metrics:</p>
      <ul>
        <li><strong>Accuracy</strong> - Percentage of expected concepts matched</li>
        <li><strong>Tokens</strong> - Total tokens consumed (input + output). Lower = more efficient</li>
        <li><strong>Duration</strong> - Wall-clock execution time</li>
        <li><strong>Cost</strong> - Estimated API cost in USD</li>
        <li><strong>Tool Calls</strong> - Number of tool invocations</li>
        <li><strong>Model</strong> - Claude model used (haiku, sonnet, opus)</li>
      </ul>
    </section>

    <section class="doc-section">
      <h2>Test Types</h2>
      <table>
        <tr><td><code>knowledge</code></td><td>Q&A style tests checking if response covers expected concepts</td></tr>
        <tr><td><code>task</code></td><td>Execution tests verifying tool usage and task completion</td></tr>
      </table>
    </section>

    <section class="doc-section">
      <h2>Scoring</h2>
      <p>Accuracy is calculated by matching response content against expected concepts:</p>
      <pre><code>accuracy = (matched_concepts / total_concepts) \xD7 100%</code></pre>
      <p>The scorer uses fuzzy matching to handle variations like plurals, hyphens, and common abbreviations.</p>
    </section>

    <section class="doc-section">
      <h2>Token Efficiency</h2>
      <p>Token usage is captured from Claude Code CLI transcript after each run:</p>
      <ul>
        <li><strong>Input tokens</strong> - Prompt + context sent to Claude</li>
        <li><strong>Output tokens</strong> - Claude's response + tool calls</li>
        <li><strong>Total tokens</strong> - Input + Output (used for efficiency ranking)</li>
      </ul>
      <p>Skills achieving same accuracy with fewer tokens rank higher in token efficiency.</p>
    </section>

    <section class="doc-section">
      <h2>Skill Sources</h2>
      <p>Skillmark supports multiple skill sources:</p>
      <table>
        <tr><td><strong>Local</strong></td><td><code>./my-skill</code> or <code>~/.claude/skills/my-skill</code></td></tr>
        <tr><td><strong>Git</strong></td><td><code>https://github.com/user/skill-repo</code></td></tr>
        <tr><td><strong>skill.sh</strong></td><td><code>skill.sh/user/skill-name</code></td></tr>
      </table>
    </section>

    <section class="doc-section">
      <h2>Publishing Results</h2>
      <p>Share your benchmark results on the public leaderboard:</p>
      <pre><code>skillmark publish ./skillmark-results/result.json --api-key YOUR_KEY</code></pre>
      <p>Results include a verification hash to prevent tampering.</p>
    </section>

    <section class="doc-section">
      <h2>Architecture</h2>
      <pre><code>\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510     \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510     \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502  CLI        \u2502\u2500\u2500\u2500\u2500\u25B6\u2502  Claude     \u2502\u2500\u2500\u2500\u2500\u25B6\u2502  Results    \u2502
\u2502  skillmark  \u2502     \u2502  Engine     \u2502     \u2502  JSON + MD  \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518     \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518     \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2518
                                               \u2502
                                               \u25BC
                                        \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
                                        \u2502  Cloudflare \u2502
                                        \u2502  Workers+D1 \u2502
                                        \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518</code></pre>
    </section>

    <section class="doc-section">
      <h2>Enhanced Test Generation</h2>
      <p>Skillmark uses an enhanced test generation flow when no tests exist:</p>
      <pre><code>\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510     \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502  SKILL.md   \u2502\u2500\u2500\u2500\u2500\u25B6\u2502  skill-creator + @claude-code-guide \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518     \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
                                    \u2502
                    \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
                    \u25BC (success)     \u25BC (fails)       \u2502
            \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510        \u2502
            \u2502  Enhanced   \u2502  \u2502  Basic      \u2502        \u2502
            \u2502  Prompt     \u2502  \u2502  Prompt     \u2502        \u2502
            \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2518  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2518        \u2502
                   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2518               \u2502
                               \u25BC                    \u2502
                       \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510              \u2502
                       \u2502  Test Files \u2502\u25C0\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
                       \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518</code></pre>
    </section>

    <section class="doc-section">
      <h2>skill-creator Skill</h2>
      <p>The <code>skill-creator</code> skill analyzes SKILL.md to extract structured metadata:</p>
      <table>
        <tr><td><strong>capabilities</strong></td><td>Core capabilities (3-6 items)</td></tr>
        <tr><td><strong>keyConcepts</strong></td><td>Key topics/keywords (5-10 items)</td></tr>
        <tr><td><strong>edgeCases</strong></td><td>Failure scenarios to test (3-5 items)</td></tr>
        <tr><td><strong>testingPatterns</strong></td><td>Claude Code testing best practices</td></tr>
        <tr><td><strong>toolInvocations</strong></td><td>Expected tool calls</td></tr>
      </table>
      <p>If skill-creator is not installed, Skillmark auto-installs it via:</p>
      <pre><code>npx skills add https://github.com/anthropics/claudekit-skills --skill skill-creator</code></pre>
    </section>

    <section class="doc-section">
      <h2>claude-code-guide Subagent</h2>
      <p>The <code>@claude-code-guide</code> subagent provides Claude Code-specific testing patterns:</p>
      <ul>
        <li>Skill invocation patterns and best practices</li>
        <li>Common failure modes and edge cases</li>
        <li>Tool usage expectations (Read, Write, Bash, etc.)</li>
        <li>Testing patterns for knowledge vs task tests</li>
      </ul>
      <p>It's referenced via prompt engineering in skill-creator:</p>
      <pre><code>Use @"claude-code-guide (agent)" to understand Claude Code CLI patterns...</code></pre>
      <p>Claude's built-in subagent routing handles the reference automatically.</p>
    </section>

    <section class="doc-section">
      <h2>Error Handling</h2>
      <p>Skillmark uses retry-then-degrade pattern for robustness:</p>
      <table>
        <tr><td><strong>skill-creator succeeds</strong></td><td>Enhanced prompt with analysis</td></tr>
        <tr><td><strong>skill-creator fails (1 retry)</strong></td><td>Degrades to basic prompt</td></tr>
        <tr><td><strong>Claude CLI fails</strong></td><td>Generates single fallback test</td></tr>
      </table>
      <p>This ensures test generation always succeeds, even if enhanced analysis fails.</p>
    </section>
  `);
}
__name(renderHowItWorksPage, "renderHowItWorksPage");
function renderDocLayout(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Skillmark</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --bg: #000; --text: #ededed; --text-secondary: #888; --border: #333; }
    body { font-family: 'Geist', -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; -webkit-font-smoothing: antialiased; }
    nav { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); }
    .nav-left { display: flex; align-items: center; gap: 0.5rem; }
    .nav-left a { color: var(--text); text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
    .nav-divider { color: var(--text-secondary); }
    .nav-right { display: flex; gap: 1.5rem; }
    .nav-right a { color: var(--text-secondary); text-decoration: none; font-size: 0.875rem; }
    .nav-right a:hover, .nav-right a.active { color: var(--text); }
    .container { max-width: 800px; margin: 0 auto; padding: 3rem 1.5rem; }
    h1 { font-size: 2.5rem; font-weight: 600; margin-bottom: 2rem; }
    .doc-section { margin-bottom: 3rem; }
    .doc-section h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; color: var(--text); }
    .doc-section h3 { font-size: 1rem; font-weight: 500; margin: 1.5rem 0 0.5rem; color: var(--text); }
    .doc-section p { color: var(--text-secondary); margin-bottom: 1rem; }
    .doc-section ul { color: var(--text-secondary); margin-left: 1.5rem; margin-bottom: 1rem; }
    .doc-section li { margin-bottom: 0.5rem; }
    .doc-section strong { color: var(--text); }
    pre { background: #0a0a0a; border: 1px solid var(--border); border-radius: 8px; padding: 1rem; overflow-x: auto; margin-bottom: 1rem; }
    code { font-family: 'Geist Mono', monospace; font-size: 0.875rem; }
    p code { background: #1a1a1a; padding: 0.125rem 0.375rem; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
    table td { padding: 0.75rem 0; border-bottom: 1px solid var(--border); color: var(--text-secondary); }
    table td:first-child { color: var(--text); width: 40%; }
    footer { margin-top: 3rem; padding: 2rem 0; border-top: 1px solid var(--border); text-align: center; color: var(--text-secondary); font-size: 0.8125rem; }
    footer a { color: var(--text); text-decoration: none; }
  </style>
</head>
<body>
  <nav>
    <div class="nav-left">
      <a href="/">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        <span>Skillmark</span>
      </a>
    </div>
    <div class="nav-right">
      <a href="/docs">Docs</a>
      <a href="/how-it-works">How It Works</a>
      <a href="https://github.com/claudekit/skillmark" title="GitHub"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg></a>
      <a href="/login">Login</a>
    </div>
  </nav>
  <div class="container">
    <h1>${title}</h1>
    ${content}
    <footer>
      <a href="https://github.com/claudekit/skillmark">Skillmark</a> \xB7 Built for AI agent developers \xB7 by <a href="https://claudekit.cc">ClaudeKit.cc</a>
    </footer>
  </div>
</body>
</html>`;
}
__name(renderDocLayout, "renderDocLayout");
function renderSkillDetailPage(skill, results) {
  const latestResult = results[0];
  const skillshLink = latestResult?.skillshLink || skill.skillshLink;
  const resultRows = results.map((r, i) => `
    <tr>
      <td class="result-date">${r.createdAt ? formatRelativeTime(new Date(r.createdAt).getTime() / 1e3) : "-"}</td>
      <td class="result-model">${escapeHtml(r.model)}</td>
      <td class="result-accuracy">${r.accuracy.toFixed(1)}%</td>
      <td class="result-tokens">${r.tokensTotal?.toLocaleString() || "-"}</td>
      <td class="result-cost">$${r.costUsd?.toFixed(4) || "-"}</td>
      <td class="result-submitter">
        ${r.submitterGithub ? `
          <a href="https://github.com/${escapeHtml(r.submitterGithub)}" class="submitter-link">
            <img src="https://github.com/${escapeHtml(r.submitterGithub)}.png?size=20" alt="" class="submitter-avatar-sm">
            @${escapeHtml(r.submitterGithub)}
          </a>
        ` : "-"}
      </td>
    </tr>
  `).join("");
  const testFilesSection = latestResult?.testFiles?.length ? `
    <section class="test-files-section">
      <h2>Test Files</h2>
      <div class="test-files-tabs">
        ${latestResult.testFiles.map((f, i) => `
          <button class="test-file-tab ${i === 0 ? "active" : ""}" data-index="${i}">${escapeHtml(f.name)}</button>
        `).join("")}
      </div>
      <div class="test-files-content">
        ${latestResult.testFiles.map((f, i) => `
          <pre class="test-file-content ${i === 0 ? "active" : ""}" data-index="${i}"><code>${escapeHtml(f.content)}</code></pre>
        `).join("")}
      </div>
    </section>
  ` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(skill.skillName)} - Skillmark</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --bg: #000; --text: #ededed; --text-secondary: #888; --border: #333; }
    body { font-family: 'Geist', -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; -webkit-font-smoothing: antialiased; }
    nav { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); }
    .nav-left { display: flex; align-items: center; gap: 0.5rem; }
    .nav-left a { color: var(--text); text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
    .nav-right { display: flex; gap: 1.5rem; }
    .nav-right a { color: var(--text-secondary); text-decoration: none; font-size: 0.875rem; }
    .nav-right a:hover { color: var(--text); }
    .container { max-width: 1000px; margin: 0 auto; padding: 3rem 1.5rem; }
    .breadcrumb { color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem; }
    .breadcrumb a { color: var(--text-secondary); text-decoration: none; }
    .breadcrumb a:hover { color: var(--text); }
    h1 { font-size: 2.5rem; font-weight: 600; margin-bottom: 0.5rem; }
    .skill-meta { display: flex; gap: 1.5rem; color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 2rem; }
    .skill-meta a { color: #58a6ff; text-decoration: none; }
    .skill-meta a:hover { text-decoration: underline; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 3rem; }
    .stat-card { background: #0a0a0a; border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; }
    .stat-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-secondary); margin-bottom: 0.5rem; }
    .stat-value { font-family: 'Geist Mono', monospace; font-size: 1.5rem; font-weight: 500; }
    .section { margin-bottom: 3rem; }
    .section h2 { font-size: 1rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-secondary); margin-bottom: 1rem; }
    .results-table { width: 100%; border-collapse: collapse; }
    .results-table th { text-align: left; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-secondary); font-weight: 500; padding: 0.75rem 0; border-bottom: 1px solid var(--border); }
    .results-table td { padding: 0.75rem 0; border-bottom: 1px solid var(--border); font-size: 0.875rem; }
    .result-accuracy { font-family: 'Geist Mono', monospace; font-weight: 500; }
    .result-tokens, .result-cost { font-family: 'Geist Mono', monospace; color: var(--text-secondary); }
    .submitter-link { display: flex; align-items: center; gap: 0.375rem; color: var(--text-secondary); text-decoration: none; font-size: 0.8125rem; }
    .submitter-link:hover { color: var(--text); }
    .submitter-avatar-sm { width: 16px; height: 16px; border-radius: 50%; }
    .test-files-section { background: #0a0a0a; border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; }
    .test-files-section h2 { margin-bottom: 1rem; }
    .test-files-tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .test-file-tab { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-family: 'Geist Mono', monospace; font-size: 0.8125rem; }
    .test-file-tab:hover { border-color: var(--text-secondary); }
    .test-file-tab.active { background: var(--text); color: var(--bg); border-color: var(--text); }
    .test-file-content { display: none; background: #000; border: 1px solid var(--border); border-radius: 6px; padding: 1rem; overflow-x: auto; max-height: 400px; overflow-y: auto; }
    .test-file-content.active { display: block; }
    .test-file-content code { font-family: 'Geist Mono', monospace; font-size: 0.8125rem; white-space: pre-wrap; }
    footer { margin-top: 3rem; padding: 2rem 0; border-top: 1px solid var(--border); text-align: center; color: var(--text-secondary); font-size: 0.8125rem; }
    footer a { color: var(--text); text-decoration: none; }
    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .results-table { font-size: 0.8125rem; }
    }
  </style>
</head>
<body>
  <nav>
    <div class="nav-left">
      <a href="/">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        <span>Skillmark</span>
      </a>
    </div>
    <div class="nav-right">
      <a href="/docs">Docs</a>
      <a href="/how-it-works">How It Works</a>
      <a href="https://github.com/claudekit/skillmark" title="GitHub"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg></a>
      <a href="/login">Login</a>
    </div>
  </nav>
  <div class="container">
    <div class="breadcrumb">
      <a href="/">Leaderboard</a> / ${escapeHtml(skill.skillName)}
    </div>
    <h1>${escapeHtml(skill.skillName)}</h1>
    <div class="skill-meta">
      ${skill.source ? `<span>Source: <a href="${escapeHtml(skill.source)}">${escapeHtml(skill.source.replace("https://github.com/", ""))}</a></span>` : ""}
      ${skillshLink ? `<span><a href="${escapeHtml(skillshLink)}">View on skill.sh</a></span>` : ""}
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Best Accuracy</div>
        <div class="stat-value">${skill.bestAccuracy.toFixed(1)}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Best Model</div>
        <div class="stat-value">${escapeHtml(skill.bestModel)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg Tokens</div>
        <div class="stat-value">${Math.round(skill.avgTokens).toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Runs</div>
        <div class="stat-value">${skill.totalRuns}</div>
      </div>
    </div>

    <section class="section">
      <h2>Result History</h2>
      <table class="results-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Model</th>
            <th>Accuracy</th>
            <th>Tokens</th>
            <th>Cost</th>
            <th>Submitter</th>
          </tr>
        </thead>
        <tbody>
          ${resultRows}
        </tbody>
      </table>
    </section>

    ${testFilesSection}

    <footer>
      <a href="https://github.com/claudekit/skillmark">Skillmark</a> \xB7 Built for AI agent developers \xB7 by <a href="https://claudekit.cc">ClaudeKit.cc</a>
    </footer>
  </div>

  <script>
    // Test file tab switching
    document.querySelectorAll('.test-file-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const index = tab.dataset.index;
        document.querySelectorAll('.test-file-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.test-file-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.querySelector('.test-file-content[data-index="' + index + '"]').classList.add('active');
      });
    });
  <\/script>
</body>
</html>`;
}
__name(renderSkillDetailPage, "renderSkillDetailPage");
function renderLoginPage(error) {
  const errorMessage = error ? `
    <div class="error-message">
      ${error === "oauth_failed" ? "GitHub authentication failed. Please try again." : error === "token_failed" ? "Failed to authenticate with GitHub. Please try again." : "An error occurred. Please try again."}
    </div>
  ` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - Skillmark</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --bg: #000; --text: #ededed; --text-secondary: #888; --border: #333; }
    body {
      font-family: 'Geist', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      -webkit-font-smoothing: antialiased;
    }
    nav { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); }
    .nav-left { display: flex; align-items: center; gap: 0.5rem; }
    .nav-left a { color: var(--text); text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
    .login-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .login-box {
      max-width: 400px;
      width: 100%;
      text-align: center;
    }
    h1 { font-size: 2rem; font-weight: 600; margin-bottom: 0.5rem; }
    .subtitle { color: var(--text-secondary); margin-bottom: 2rem; }
    .github-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.875rem 1.5rem;
      background: #ededed;
      color: #000;
      border: none;
      border-radius: 8px;
      font-family: inherit;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s;
    }
    .github-btn:hover { background: #fff; }
    .github-btn svg { width: 20px; height: 20px; }
    .error-message {
      background: rgba(248, 81, 73, 0.1);
      border: 1px solid rgba(248, 81, 73, 0.3);
      color: #f85149;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
    }
    .info-text {
      margin-top: 2rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
    .info-text a { color: var(--text); }
  </style>
</head>
<body>
  <nav>
    <div class="nav-left">
      <a href="/">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        <span>Skillmark</span>
      </a>
    </div>
  </nav>
  <div class="login-container">
    <div class="login-box">
      <h1>Sign in</h1>
      <p class="subtitle">Get an API key to publish benchmark results</p>
      ${errorMessage}
      <a href="/auth/github" class="github-btn">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
        Continue with GitHub
      </a>
      <p class="info-text">
        By signing in, you agree to our <a href="/docs">Terms of Service</a>.
      </p>
    </div>
  </div>
</body>
</html>`;
}
__name(renderLoginPage, "renderLoginPage");
function renderDashboardPage(user) {
  const keyRows = user.keys.map((key) => `
    <tr data-key-id="${escapeHtml(key.id)}">
      <td class="key-id">
        <code>${escapeHtml(key.id.slice(0, 8))}...</code>
      </td>
      <td class="key-created">${key.createdAt ? formatRelativeTime(new Date(key.createdAt).getTime() / 1e3) : "Unknown"}</td>
      <td class="key-used">${key.lastUsedAt ? formatRelativeTime(new Date(key.lastUsedAt).getTime() / 1e3) : "Never"}</td>
      <td class="key-actions">
        <button class="revoke-btn" onclick="revokeKey('${escapeHtml(key.id)}')">Revoke</button>
      </td>
    </tr>
  `).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard - Skillmark</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --bg: #000; --text: #ededed; --text-secondary: #888; --border: #333; --success: #3fb950; }
    body {
      font-family: 'Geist', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }
    nav { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); }
    .nav-left { display: flex; align-items: center; gap: 0.5rem; }
    .nav-left a { color: var(--text); text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }
    .nav-right { display: flex; align-items: center; gap: 1rem; }
    .nav-right a { color: var(--text-secondary); text-decoration: none; font-size: 0.875rem; }
    .nav-right a:hover { color: var(--text); }
    .user-info { display: flex; align-items: center; gap: 0.5rem; }
    .user-avatar { width: 28px; height: 28px; border-radius: 50%; }
    .user-name { font-size: 0.875rem; }
    .container { max-width: 800px; margin: 0 auto; padding: 3rem 1.5rem; }
    h1 { font-size: 2rem; font-weight: 600; margin-bottom: 0.5rem; }
    .subtitle { color: var(--text-secondary); margin-bottom: 2rem; }
    .section { margin-bottom: 3rem; }
    .section h2 { font-size: 1rem; font-weight: 500; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-secondary); }
    .generate-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      background: var(--text);
      color: var(--bg);
      border: none;
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      margin-bottom: 1.5rem;
    }
    .generate-btn:hover { background: #fff; }
    .generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .new-key-display {
      display: none;
      background: rgba(63, 185, 80, 0.1);
      border: 1px solid rgba(63, 185, 80, 0.3);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }
    .new-key-display.visible { display: block; }
    .new-key-display p { color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.75rem; }
    .new-key-display .key-value {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #0a0a0a;
      padding: 0.75rem;
      border-radius: 6px;
      font-family: 'Geist Mono', monospace;
      font-size: 0.8125rem;
      word-break: break-all;
    }
    .copy-btn {
      flex-shrink: 0;
      background: none;
      border: 1px solid var(--border);
      color: var(--text-secondary);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.75rem;
    }
    .copy-btn:hover { color: var(--text); border-color: var(--text-secondary); }
    .done-btn {
      flex-shrink: 0;
      background: var(--success);
      border: none;
      color: #000;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .done-btn:hover { opacity: 0.9; }
    .keys-table { width: 100%; border-collapse: collapse; }
    .keys-table th {
      text-align: left;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-secondary);
      font-weight: 500;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border);
    }
    .keys-table td { padding: 1rem 0; border-bottom: 1px solid var(--border); }
    .keys-table code { font-family: 'Geist Mono', monospace; font-size: 0.8125rem; }
    .key-created, .key-used { color: var(--text-secondary); font-size: 0.875rem; }
    .revoke-btn {
      background: none;
      border: 1px solid #f85149;
      color: #f85149;
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8125rem;
      cursor: pointer;
    }
    .revoke-btn:hover { background: rgba(248, 81, 73, 0.1); }
    .empty-state { color: var(--text-secondary); padding: 2rem 0; }
    .usage-section { background: #0a0a0a; border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; }
    .usage-section h3 { font-size: 0.875rem; font-weight: 500; margin-bottom: 1rem; }
    .usage-section pre { background: #000; border: 1px solid var(--border); border-radius: 6px; padding: 1rem; overflow-x: auto; margin-bottom: 0.75rem; }
    .usage-section code { font-family: 'Geist Mono', monospace; font-size: 0.8125rem; }
    .usage-section p { color: var(--text-secondary); font-size: 0.8125rem; }
  </style>
</head>
<body>
  <nav>
    <div class="nav-left">
      <a href="/">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        <span>Skillmark</span>
      </a>
    </div>
    <div class="nav-right">
      <div class="user-info">
        ${user.avatar ? `<img src="${escapeHtml(user.avatar)}" alt="" class="user-avatar">` : ""}
        <span class="user-name">${escapeHtml(user.username)}</span>
      </div>
      <a href="/auth/logout">Sign out</a>
    </div>
  </nav>
  <div class="container">
    <h1>Dashboard</h1>
    <p class="subtitle">Manage your API keys for publishing benchmark results</p>

    <div class="section">
      <h2>API Keys</h2>
      <button class="generate-btn" id="generateBtn" onclick="generateKey()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Generate New Key
      </button>

      <div class="new-key-display" id="newKeyDisplay">
        <p><strong>New API key created!</strong> Copy it now - you won't see it again.</p>
        <div class="key-value">
          <code id="newKeyValue"></code>
          <button class="copy-btn" onclick="copyKey()">Copy</button>
          <button class="done-btn" onclick="location.reload()">Done</button>
        </div>
      </div>

      ${user.keys.length > 0 ? `
      <table class="keys-table">
        <thead>
          <tr>
            <th>Key ID</th>
            <th>Created</th>
            <th>Last Used</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="keysTableBody">
          ${keyRows}
        </tbody>
      </table>
      ` : `
      <p class="empty-state">No API keys yet. Generate one to start publishing benchmarks.</p>
      `}
    </div>

    <div class="section">
      <h2>Usage</h2>
      <div class="usage-section">
        <h3>Save your API key</h3>
        <pre><code># Option 1: Environment variable
export SKILLMARK_API_KEY=sk_your_key_here

# Option 2: Config file (~/.skillmarkrc)
echo "api_key=sk_your_key_here" > ~/.skillmarkrc</code></pre>
        <p>The CLI reads from env var first, then ~/.skillmarkrc.</p>
      </div>
    </div>

    <div class="section">
      <div class="usage-section">
        <h3>Publish with auto-publish flag</h3>
        <pre><code># Run benchmark and auto-publish results
skillmark run ./my-skill --publish

# Or publish existing results
skillmark publish ./skillmark-results/result.json</code></pre>
      </div>
    </div>
  </div>

  <script>
    async function generateKey() {
      const btn = document.getElementById('generateBtn');
      btn.disabled = true;
      btn.textContent = 'Generating...';

      try {
        const res = await fetch('/auth/keys', { method: 'POST' });
        const data = await res.json();

        if (data.apiKey) {
          document.getElementById('newKeyValue').textContent = data.apiKey;
          document.getElementById('newKeyDisplay').classList.add('visible');
          btn.style.display = 'none';
        } else {
          alert('Failed to generate key: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Failed to generate key: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Generate New Key';
      }
    }

    function copyKey() {
      const key = document.getElementById('newKeyValue').textContent;
      navigator.clipboard.writeText(key).then(() => {
        const btn = event.target;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy', 2000);
      });
    }

    async function revokeKey(keyId) {
      if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) {
        return;
      }

      try {
        const res = await fetch('/auth/keys/' + keyId, { method: 'DELETE' });
        const data = await res.json();

        if (data.success) {
          document.querySelector('tr[data-key-id="' + keyId + '"]').remove();
        } else {
          alert('Failed to revoke key: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Failed to revoke key: ' + err.message);
      }
    }
  <\/script>
</body>
</html>`;
}
__name(renderDashboardPage, "renderDashboardPage");
function formatRelativeTime(timestamp) {
  if (!timestamp)
    return "Never";
  const now = Math.floor(Date.now() / 1e3);
  const diff = now - timestamp;
  if (diff < 60)
    return "just now";
  if (diff < 3600)
    return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)
    return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800)
    return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592e3)
    return `${Math.floor(diff / 604800)}w ago`;
  if (diff < 31536e3)
    return `${Math.floor(diff / 2592e3)}mo ago`;
  return `${Math.floor(diff / 31536e3)}y ago`;
}
__name(formatRelativeTime, "formatRelativeTime");
function escapeHtml(str) {
  if (!str)
    return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
__name(escapeHtml, "escapeHtml");

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/utils/cookie.js
var validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;
var validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
var parse = /* @__PURE__ */ __name((cookie, name) => {
  if (name && cookie.indexOf(name) === -1) {
    return {};
  }
  const pairs = cookie.trim().split(";");
  const parsedCookie = {};
  for (let pairStr of pairs) {
    pairStr = pairStr.trim();
    const valueStartPos = pairStr.indexOf("=");
    if (valueStartPos === -1) {
      continue;
    }
    const cookieName = pairStr.substring(0, valueStartPos).trim();
    if (name && name !== cookieName || !validCookieNameRegEx.test(cookieName)) {
      continue;
    }
    let cookieValue = pairStr.substring(valueStartPos + 1).trim();
    if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) {
      cookieValue = cookieValue.slice(1, -1);
    }
    if (validCookieValueRegEx.test(cookieValue)) {
      parsedCookie[cookieName] = cookieValue.indexOf("%") !== -1 ? tryDecode(cookieValue, decodeURIComponent_) : cookieValue;
      if (name) {
        break;
      }
    }
  }
  return parsedCookie;
}, "parse");
var _serialize = /* @__PURE__ */ __name((name, value, opt = {}) => {
  let cookie = `${name}=${value}`;
  if (name.startsWith("__Secure-") && !opt.secure) {
    throw new Error("__Secure- Cookie must have Secure attributes");
  }
  if (name.startsWith("__Host-")) {
    if (!opt.secure) {
      throw new Error("__Host- Cookie must have Secure attributes");
    }
    if (opt.path !== "/") {
      throw new Error('__Host- Cookie must have Path attributes with "/"');
    }
    if (opt.domain) {
      throw new Error("__Host- Cookie must not have Domain attributes");
    }
  }
  if (opt && typeof opt.maxAge === "number" && opt.maxAge >= 0) {
    if (opt.maxAge > 3456e4) {
      throw new Error(
        "Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration."
      );
    }
    cookie += `; Max-Age=${opt.maxAge | 0}`;
  }
  if (opt.domain && opt.prefix !== "host") {
    cookie += `; Domain=${opt.domain}`;
  }
  if (opt.path) {
    cookie += `; Path=${opt.path}`;
  }
  if (opt.expires) {
    if (opt.expires.getTime() - Date.now() > 3456e7) {
      throw new Error(
        "Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future."
      );
    }
    cookie += `; Expires=${opt.expires.toUTCString()}`;
  }
  if (opt.httpOnly) {
    cookie += "; HttpOnly";
  }
  if (opt.secure) {
    cookie += "; Secure";
  }
  if (opt.sameSite) {
    cookie += `; SameSite=${opt.sameSite.charAt(0).toUpperCase() + opt.sameSite.slice(1)}`;
  }
  if (opt.priority) {
    cookie += `; Priority=${opt.priority.charAt(0).toUpperCase() + opt.priority.slice(1)}`;
  }
  if (opt.partitioned) {
    if (!opt.secure) {
      throw new Error("Partitioned Cookie must have Secure attributes");
    }
    cookie += "; Partitioned";
  }
  return cookie;
}, "_serialize");
var serialize = /* @__PURE__ */ __name((name, value, opt) => {
  value = encodeURIComponent(value);
  return _serialize(name, value, opt);
}, "serialize");

// ../../node_modules/.pnpm/hono@4.11.7/node_modules/hono/dist/helper/cookie/index.js
var getCookie = /* @__PURE__ */ __name((c, key, prefix) => {
  const cookie = c.req.raw.headers.get("Cookie");
  if (typeof key === "string") {
    if (!cookie) {
      return void 0;
    }
    let finalKey = key;
    if (prefix === "secure") {
      finalKey = "__Secure-" + key;
    } else if (prefix === "host") {
      finalKey = "__Host-" + key;
    }
    const obj2 = parse(cookie, finalKey);
    return obj2[finalKey];
  }
  if (!cookie) {
    return {};
  }
  const obj = parse(cookie);
  return obj;
}, "getCookie");
var generateCookie = /* @__PURE__ */ __name((name, value, opt) => {
  let cookie;
  if (opt?.prefix === "secure") {
    cookie = serialize("__Secure-" + name, value, { path: "/", ...opt, secure: true });
  } else if (opt?.prefix === "host") {
    cookie = serialize("__Host-" + name, value, {
      ...opt,
      path: "/",
      secure: true,
      domain: void 0
    });
  } else {
    cookie = serialize(name, value, { path: "/", ...opt });
  }
  return cookie;
}, "generateCookie");
var setCookie = /* @__PURE__ */ __name((c, name, value, opt) => {
  const cookie = generateCookie(name, value, opt);
  c.header("Set-Cookie", cookie, { append: true });
}, "setCookie");
var deleteCookie = /* @__PURE__ */ __name((c, name, opt) => {
  const deletedCookie = getCookie(c, name, opt?.prefix);
  setCookie(c, name, "", { ...opt, maxAge: 0 });
  return deletedCookie;
}, "deleteCookie");

// src/routes/github-oauth-authentication-handler.ts
var authRouter = new Hono2();
var GITHUB_OAUTH_URL = "https://github.com/login/oauth/authorize";
var GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
var GITHUB_USER_URL = "https://api.github.com/user";
var SESSION_COOKIE = "skillmark_session";
var SESSION_DURATION_DAYS = 30;
authRouter.get("/github", (c) => {
  const clientId = c.env.GITHUB_CLIENT_ID;
  const baseUrl = getBaseUrl(c.req.url, c.env.ENVIRONMENT);
  const redirectUri = `${baseUrl}/auth/github/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user user:email",
    state: generateState()
  });
  return c.redirect(`${GITHUB_OAUTH_URL}?${params.toString()}`);
});
authRouter.get("/github/callback", async (c) => {
  const code = c.req.query("code");
  const error = c.req.query("error");
  if (error || !code) {
    return c.redirect("/login?error=oauth_failed");
  }
  try {
    const baseUrl = getBaseUrl(c.req.url, c.env.ENVIRONMENT);
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        client_id: c.env.GITHUB_CLIENT_ID,
        client_secret: c.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${baseUrl}/auth/github/callback`
      })
    });
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      console.error("Failed to get access token:", tokenData);
      return c.redirect("/login?error=token_failed");
    }
    const userResponse = await fetch(GITHUB_USER_URL, {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Skillmark-OAuth"
      }
    });
    const githubUser = await userResponse.json();
    const userId = await upsertUser(c.env.DB, githubUser);
    const sessionId = await createSession(c.env.DB, userId);
    setCookie(c, SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: c.env.ENVIRONMENT === "production",
      sameSite: "Lax",
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
      path: "/"
    });
    return c.redirect("/dashboard");
  } catch (err) {
    console.error("OAuth callback error:", err);
    return c.redirect("/login?error=oauth_failed");
  }
});
authRouter.get("/logout", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (sessionId) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
  }
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.redirect("/");
});
authRouter.get("/me", async (c) => {
  const user = await getCurrentUser2(c);
  if (!user) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  return c.json({
    id: user.id,
    githubUsername: user.githubUsername,
    githubAvatar: user.githubAvatar
  });
});
authRouter.post("/keys", async (c) => {
  const user = await getCurrentUser2(c);
  if (!user) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  const apiKey = generateApiKey();
  const keyHash = await hashApiKey2(apiKey);
  const keyId = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO api_keys (id, key_hash, user_name, github_username, github_avatar, github_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    keyId,
    keyHash,
    user.githubUsername,
    user.githubUsername,
    user.githubAvatar,
    user.githubId
  ).run();
  return c.json({
    apiKey,
    keyId,
    message: "API key generated. Store it securely - it cannot be retrieved again."
  });
});
authRouter.get("/keys", async (c) => {
  const user = await getCurrentUser2(c);
  if (!user) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  const keys = await c.env.DB.prepare(`
    SELECT id, created_at, last_used_at
    FROM api_keys
    WHERE github_id = ?
    ORDER BY created_at DESC
  `).bind(user.githubId).all();
  const formattedKeys = keys.results?.map((key) => ({
    id: key.id,
    createdAt: key.created_at ? new Date(key.created_at * 1e3).toISOString() : null,
    lastUsedAt: key.last_used_at ? new Date(key.last_used_at * 1e3).toISOString() : null
  })) || [];
  return c.json({ keys: formattedKeys });
});
authRouter.delete("/keys/:id", async (c) => {
  const user = await getCurrentUser2(c);
  if (!user) {
    return c.json({ error: "Not authenticated" }, 401);
  }
  const keyId = c.req.param("id");
  const key = await c.env.DB.prepare(`
    SELECT id FROM api_keys WHERE id = ? AND github_id = ?
  `).bind(keyId, user.githubId).first();
  if (!key) {
    return c.json({ error: "Key not found" }, 404);
  }
  await c.env.DB.prepare("DELETE FROM api_keys WHERE id = ?").bind(keyId).run();
  return c.json({ success: true });
});
authRouter.post("/verify-key", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ valid: false }, 401);
  }
  const apiKey = authHeader.slice(7);
  const keyHash = await hashApiKey2(apiKey);
  const keyRecord = await c.env.DB.prepare(`
    SELECT github_username, github_avatar, github_id
    FROM api_keys
    WHERE key_hash = ?
  `).bind(keyHash).first();
  if (!keyRecord) {
    return c.json({ valid: false }, 401);
  }
  await c.env.DB.prepare(`
    UPDATE api_keys SET last_used_at = unixepoch() WHERE key_hash = ?
  `).bind(keyHash).run();
  return c.json({
    valid: true,
    user: {
      githubUsername: keyRecord.github_username,
      githubAvatar: keyRecord.github_avatar
    }
  });
});
async function getCurrentUser2(c) {
  const cookieHeader = c.req.header("Cookie") || "";
  const cookies = parseCookies(cookieHeader);
  const sessionId = cookies[SESSION_COOKIE];
  if (!sessionId) {
    return null;
  }
  const session = await c.env.DB.prepare(`
    SELECT u.id, u.github_id, u.github_username, u.github_avatar
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > unixepoch()
  `).bind(sessionId).first();
  if (!session) {
    return null;
  }
  return {
    id: session.id,
    githubId: session.github_id,
    githubUsername: session.github_username,
    githubAvatar: session.github_avatar
  };
}
__name(getCurrentUser2, "getCurrentUser");
function parseCookies(cookieHeader) {
  const cookies = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    if (name) {
      cookies[name] = rest.join("=");
    }
  });
  return cookies;
}
__name(parseCookies, "parseCookies");
async function upsertUser(db, githubUser) {
  const existingUser = await db.prepare(`
    SELECT id FROM users WHERE github_id = ?
  `).bind(githubUser.id).first();
  if (existingUser) {
    await db.prepare(`
      UPDATE users
      SET github_username = ?, github_avatar = ?, github_email = ?, updated_at = unixepoch()
      WHERE github_id = ?
    `).bind(
      githubUser.login,
      githubUser.avatar_url,
      githubUser.email,
      githubUser.id
    ).run();
    return existingUser.id;
  }
  const userId = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO users (id, github_id, github_username, github_avatar, github_email)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    userId,
    githubUser.id,
    githubUser.login,
    githubUser.avatar_url,
    githubUser.email
  ).run();
  return userId;
}
__name(upsertUser, "upsertUser");
async function createSession(db, userId) {
  const sessionId = crypto.randomUUID();
  const expiresAt = Math.floor(Date.now() / 1e3) + SESSION_DURATION_DAYS * 24 * 60 * 60;
  await db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `).bind(sessionId, userId, expiresAt).run();
  return sessionId;
}
__name(createSession, "createSession");
function generateApiKey() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return "sk_" + Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
__name(generateApiKey, "generateApiKey");
async function hashApiKey2(apiKey) {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashApiKey2, "hashApiKey");
function generateState() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
__name(generateState, "generateState");
function getBaseUrl(requestUrl, environment) {
  const url = new URL(requestUrl);
  if (environment === "production") {
    return "https://skillmark.sh";
  }
  return `${url.protocol}//${url.host}`;
}
__name(getBaseUrl, "getBaseUrl");

// src/routes/static-assets-handler.ts
var assetsRouter = new Hono2();
var FAVICON_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAACQAAAAjCAYAAAD8BaggAAAKq2lDQ1BJQ0MgUHJvZmlsZQAASImVlwdUk8kWx+f70kNCCyAgJfQmvQWQEkILvTdRCUmAUGIMBBGxIYsrsKKISFMWdJWi4KoUWSsWLCwKCtg3yKKirosFGyrvAw5hd9957513z5nM7/xz586de2ZybgAgK7MEgjRYFoB0fqYw1NudGh0TS8U9BxCgABlAACYsdoaAHhzsDxCbn/9u74cQb8Rumc7E+vfv/6vJcbgZbACgYIQTOBnsdIRPIOMNWyDMBADVgOg6azIFM9yLsIIQSRBh8QwnzfG7GU6YZTR+1ic8lIGwGgB4EoslTAKAZIjo1Cx2EhKH5IOwBZ/D4yOcjbBLevoqDsKdCBsiPgKEZ+LTEv4SJ+lvMRMkMVmsJAnPnWXW8B68DEEaa+3/WY7/belpovk9DJBBShb6hCKzNFKz31NX+UmYnxAYNM88zqz/LCeLfCLmmZ3BiJ3njLQw5jxzWB5+kjhpgf7znMjzkvjwMpnh88zN8AybZ+GqUMm+iUIGfZ5ZwoUcRKkREj2Zy5TEz0kOj5rnLF5koCS31DC/BR+GRBeKQiVn4fK93Rf29ZLUIT3jL2fnMSVrM5PDfSR1YC3kz+XTF2JmREty43A9PBd8IiT+gkx3yV6CtGCJPzfNW6JnZIVJ1mYil3NhbbCkhiks3+B5Bt4gAFgDG2AKGACpSCY3O3PmEIxVgrVCXlJyJpWOvDQulclnmy2hWllY2QEw827nrsXbO7PvEVLCL2gbcpHrrI5A9oLGLALgyHEAZOMWNLMbAKhaANAdwxYJs+Y09MwHBhCR3wMFoAI0gA4wRDKzAnbACbgBT+ALgkA4iAErABskg3QgBGtALtgMCkAR2AF2gypQC/aDBnAEHAMd4BQ4Dy6D6+AmGAT3gRiMgRdgArwHUxAE4SAyRIFUIE1IDzKBrCAa5AJ5Qv5QKBQDxUNJEB8SQbnQFqgIKoWqoDqoEfoZOgmdh65C/dBdaAQah95An2EUTIIVYHVYHzaHaTAd9oPD4eVwErwazoHz4O1wBVwPH4bb4fPwdXgQFsMv4EkUQEmhlFBaKFMUDcVABaFiUYkoIWoDqhBVjqpHtaC6UD2oWygx6iXqExqLpqCpaFO0E9oHHYFmo1ejN6CL0VXoBnQ7+iL6FnoEPYH+hiFj1DAmGEcMExONScKswRRgyjEHMW2YS5hBzBjmPRaLVcIaYO2xPtgYbAp2HbYYuxfbij2H7ceOYidxOJwKzgTnjAvCsXCZuAJcJe4w7ixuADeG+4iXwmvirfBe+Fg8H5+HL8c34c/gB/BP8VMEWYIewZEQROAQ1hJKCAcIXYQbhDHCFFGOaEB0JoYTU4ibiRXEFuIl4gPiWykpKW0pB6kQKZ7UJqkKqaNSV6RGpD6R5EnGJAYpjiQibScdIp0j3SW9JZPJ+mQ3ciw5k7yd3Ei+QH5E/ihNkTaTZkpzpDdKV0u3Sw9Iv5IhyOjJ0GVWyOTIlMscl7kh81KWIKsvy5BlyW6QrZY9KTssOylHkbOUC5JLlyuWa5K7KvdMHievL+8pz5HPl98vf0F+lIKi6FAYFDZlC+UA5RJlTAGrYKDAVEhRKFI4otCnMKEor2ijGKmYrViteFpRrIRS0ldiKqUplSgdUxpS+rxIfRF9EXfRtkUtiwYWfVBerOymzFUuVG5VHlT+rEJV8VRJVdmp0qHyUBWtaqwaorpGdZ/qJdWXixUWOy1mLy5cfGzxPTVYzVgtVG2d2n61XrVJdQ11b3WBeqX6BfWXGkoabhopGmUaZzTGNSmaLpo8zTLNs5rPqYpUOjWNWkG9SJ3QUtPy0RJp1Wn1aU1pG2hHaOdpt2o/1CHq0HQSdcp0unUmdDV1A3RzdZt17+kR9Gh6yXp79Hr0Pugb6Efpb9Xv0H9moGzANMgxaDZ4YEg2dDVcbVhveNsIa0QzSjXaa3TTGDa2NU42rja+YQKb2JnwTPaa9C/BLHFYwl9Sv2TYlGRKN80ybTYdMVMy8zfLM+swe2Wuax5rvtO8x/ybha1FmsUBi/uW8pa+lnmWXZZvrIyt2FbVVretydZe1hutO61f25jYcG322dyxpdgG2G617bb9amdvJ7RrsRu317WPt6+xH6Yp0IJpxbQrDhgHd4eNDqccPjnaOWY6HnP808nUKdWpyenZUoOl3KUHlo46azuznOucxS5Ul3iXH13ErlquLNd618duOm4ct4NuT+lG9BT6Yfordwt3oXub+weGI2M945wHysPbo9Cjz1PeM8KzyvORl7ZXklez14S3rfc673M+GB8/n50+w0x1JpvZyJzwtfdd73vRj+QX5lfl99jf2F/o3xUAB/gG7Ap4EKgXyA/sCAJBzKBdQQ+DDYJXB/8Sgg0JDqkOeRJqGZob2hNGCVsZ1hT2Ptw9vCT8foRhhCiiO1ImMi6yMfJDlEdUaZQ42jx6ffT1GNUYXkxnLC42MvZg7OQyz2W7l43F2cYVxA0tN1ievfzqCtUVaStOr5RZyVp5PB4THxXfFP+FFcSqZ00mMBNqEibYDPYe9guOG6eMM8515pZynyY6J5YmPktyTtqVNJ7smlye/JLH4FXxXqf4pNSmfEgNSj2UOp0Wldaajk+PTz/Jl+en8i+u0liVvapfYCIoEIhXO67evXpC6Cc8mAFlLM/ozFRAGqRekaHoO9FIlktWddbHNZFrjmfLZfOze9car9269mmOV85P69Dr2Ou6c7VyN+eOrKevr9sAbUjY0L1RZ2P+xrFN3psaNhM3p27+Nc8irzTv3ZaoLV356vmb8ke/8/6uuUC6QFgwvNVpa+336O953/dts95Wue1bIafwWpFFUXnRl2J28bUfLH+o+GF6e+L2vhK7kn07sDv4O4Z2uu5sKJUrzSkd3RWwq72MWlZY9m73yt1Xy23Ka/cQ94j2iCv8KzordSt3VH6pSq4arHavbq1Rq9lW82EvZ+/APrd9LbXqtUW1n3/k/XinzruuvV6/vnw/dn/W/icHIg/0/ET7qfGg6sGig98P8Q+JG0IbLjbaNzY2qTWVNMPNoubxw3GHbx7xONLZYtpS16rUWnQUHBUdff5z/M9Dx/yOdR+nHW85oXeipo3SVtgOta9tn+hI7hB3xnT2n/Q92d3l1NX2i9kvh05pnao+rXi65AzxTP6Z6bM5ZyfPCc69PJ90frR7Zff9C9EXbl8Mudh3ye/Slctely/00HvOXnG+cuqq49WT12jXOq7bXW/vte1t+9X217Y+u772G/Y3Om463OzqX9p/ZsB14Pwtj1uXbzNvXx8MHOwfihi6Mxw3LL7DufPsbtrd1/ey7k3d3/QA86DwoezD8kdqj+p/M/qtVWwnPj3iMdL7OOzx/VH26IvfM37/Mpb/hPyk/Knm08ZnVs9OjXuN33y+7PnYC8GLqZcFf8j9UfPK8NWJP93+7J2Inhh7LXw9/ab4rcrbQ+9s3nVPBk8+ep/+fupD4UeVjw2faJ96Pkd9fjq15gvuS8VXo69d3/y+PZhOn54WsISs2VYAhQw4MRGAN4cAIMcAQLkJAHHZXF89a9Bcf4FZAv+J53rvWUM6l6NuAAQiw30TAE3nADBGZEVkDka0cDcAW1tLxnwPPNuvzxi5ESBt0ozdraksAP+wuV7+L3n/cwaSqH+b/wU37QX8G4OYsAAAAFZlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA5KGAAcAAAASAAAARKACAAQAAAABAAAAJKADAAQAAAABAAAAIwAAAABBU0NJSQAAAFNjcmVlbnNob3Qa73x3AAAB1GlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyI+CiAgICAgICAgIDxleGlmOlBpeGVsWURpbWVuc2lvbj4zNTwvZXhpZjpQaXhlbFlEaW1lbnNpb24+CiAgICAgICAgIDxleGlmOlBpeGVsWERpbWVuc2lvbj4zNjwvZXhpZjpQaXhlbFhEaW1lbnNpb24+CiAgICAgICAgIDxleGlmOlVzZXJDb21tZW50PlNjcmVlbnNob3Q8L2V4aWY6VXNlckNvbW1lbnQ+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgpJaYwnAAABRElEQVRYCe1U0RGDIAy1ncFpdAfH0Rl0HIdwGnewPM9HKfVMCfnwenDHCQkhj/dMHlVVbW7eZjxvg+QAUgBJihSGCkMSA5L/v/6htm2lB6v86NTJs+/7bV3XbZ7n5NirfI/DmfwSB8bH1HXt17kL1T/k2PnIaymdCtAHGrcZhiE2qfcqySjXsixV0zR7civZkhkK5eq6zjNhJVsyICKYpmlfgiUMS9nEskVpo8TDibJ3ODbHjLdjz3kWg7P0X3zfl5wdChMSUNx7aGdC9ija8Y1jznIdtmtAF4H+tWSDSQmILP5yR3AmH1DIIi4mMxpAqrJ3Sb+GA7HbcluBuspiRKw29iVWYXxO2psBGsdRyvWT30wyZKNsWGs7txlDAEHZtHLhDgxfvhZr9iLtXaaS4XW5w1SyXDCIL4AkFgtDhSGJAcn/AqbFa8IIHwjUAAAAAElFTkSuQmCC";
assetsRouter.get("/favicon.ico", (c) => {
  const buffer = Uint8Array.from(atob(FAVICON_BASE64), (c2) => c2.charCodeAt(0));
  return new Response(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000"
    }
  });
});
assetsRouter.get("/favicon.png", (c) => {
  const buffer = Uint8Array.from(atob(FAVICON_BASE64), (c2) => c2.charCodeAt(0));
  return new Response(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000"
    }
  });
});
assetsRouter.get("/og-image.png", async (c) => {
  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#0a0a0a"/>
    <text x="100" y="150" font-family="monospace" font-size="72" font-weight="bold" fill="#fff">SKILLMARK</text>
    <text x="100" y="210" font-family="monospace" font-size="24" fill="#888">THE AGENT SKILL BENCHMARKING PLATFORM</text>
    <text x="100" y="320" font-family="sans-serif" font-size="36" fill="#ccc">Benchmark your AI agent skills with detailed</text>
    <text x="100" y="370" font-family="sans-serif" font-size="36" fill="#ccc">metrics. Compare accuracy, token usage, and</text>
    <text x="100" y="420" font-family="sans-serif" font-size="36" fill="#ccc">cost across models.</text>
    <text x="100" y="540" font-family="monospace" font-size="20" fill="#666">$ npx skillmark run &lt;skill-path&gt;</text>
  </svg>`;
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400"
    }
  });
});

// src/worker-entry-point.ts
var app = new Hono2();
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Skillmark-Version"]
}));
app.use("*", async (c, next) => {
  if (c.env.ENVIRONMENT !== "production") {
    return logger()(c, next);
  }
  return next();
});
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.route("/", assetsRouter);
app.route("/auth", authRouter);
app.route("/api", apiRouter);
app.route("/", pagesRouter);
app.notFound((c) => {
  const accept = c.req.header("Accept") || "";
  if (accept.includes("application/json")) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>404 - Skillmark</title>
      <style>
        body {
          font-family: system-ui, sans-serif;
          background: #0d1117;
          color: #c9d1d9;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
        }
        .container { text-align: center; }
        h1 { color: #58a6ff; }
        a { color: #58a6ff; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>404</h1>
        <p>Page not found</p>
        <p><a href="/">Back to leaderboard</a></p>
      </div>
    </body>
    </html>
  `, 404);
});
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  const accept = c.req.header("Accept") || "";
  if (accept.includes("application/json")) {
    return c.json({ error: "Internal server error" }, 500);
  }
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Error - Skillmark</title>
      <style>
        body {
          font-family: system-ui, sans-serif;
          background: #0d1117;
          color: #c9d1d9;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
        }
        .container { text-align: center; }
        h1 { color: #f85149; }
        a { color: #58a6ff; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Error</h1>
        <p>Something went wrong</p>
        <p><a href="/">Back to leaderboard</a></p>
      </div>
    </body>
    </html>
  `, 500);
});
var worker_entry_point_default = app;

// ../../node_modules/.pnpm/wrangler@3.114.17_@cloudflare+workers-types@4.20260203.0/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../node_modules/.pnpm/wrangler@3.114.17_@cloudflare+workers-types@4.20260203.0/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-lfa2r7/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_entry_point_default;

// ../../node_modules/.pnpm/wrangler@3.114.17_@cloudflare+workers-types@4.20260203.0/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-lfa2r7/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker-entry-point.js.map
