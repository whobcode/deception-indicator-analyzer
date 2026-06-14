var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/hono/dist/compose.js
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

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/body.js
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

// node_modules/hono/dist/utils/url.js
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

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
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
  #cachedBody = /* @__PURE__ */ __name((key) => {
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
  }, "#cachedBody");
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
};

// node_modules/hono/dist/utils/html.js
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

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var Context = class {
  static {
    __name(this, "Context");
  }
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
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
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
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
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
  header = /* @__PURE__ */ __name((name, value, options) => {
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
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
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
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
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
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
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
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
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
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
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
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
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
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
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
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
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
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => new Response();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
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
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
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
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
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
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
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
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
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
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
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
  }, "request");
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
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
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
  }), "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
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
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
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
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
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
};

// node_modules/hono/dist/router/reg-exp-router/router.js
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
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
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
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
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
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
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
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
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
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
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
};

// node_modules/hono/dist/middleware/cors/index.js
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

// src/worker/audio-analyzer.ts
var AudioAnalyzer = class {
  static {
    __name(this, "AudioAnalyzer");
  }
  sampleRate = 16e3;
  /**
   * Main entry point - extract all features from audio buffer
   */
  async extractFeatures(audioData, sampleRate) {
    this.sampleRate = sampleRate;
    const stressIndicators = this.analyzeStress(audioData);
    const pitchAnalysis = this.analyzePitch(audioData);
    const pauseDetection = this.detectPauses(audioData);
    const formants = this.extractFormants(audioData);
    const spectralFeatures = this.extractSpectralFeatures(audioData);
    const temporalFeatures = this.extractTemporalFeatures(audioData);
    return {
      stressIndicators,
      pitchAnalysis,
      pauseDetection,
      formants,
      spectralFeatures,
      temporalFeatures
    };
  }
  /**
   * Analyze vocal stress indicators using jitter, shimmer, and NHR
   */
  analyzeStress(signal) {
    const f0Values = this.detectPitchAutocorrelation(signal);
    const jitter = this.calculateJitter(f0Values);
    const shimmer = this.calculateShimmer(signal, f0Values);
    const nhr = this.calculateNHR(signal);
    const stressScore = Math.min(
      jitter * 0.35 + shimmer * 0.35 + nhr * 0.3,
      1
    );
    return { jitter, shimmer, nhr, stressScore };
  }
  /**
   * Pitch detection using autocorrelation method
   * Limited to prevent stack overflow on long audio
   */
  detectPitchAutocorrelation(signal) {
    const f0Values = [];
    const frameSize = Math.floor(this.sampleRate * 0.03);
    const hopSize = Math.floor(this.sampleRate * 0.02);
    const maxFrames = 500;
    const totalFrames = Math.floor((signal.length - frameSize) / hopSize);
    const step = totalFrames > maxFrames ? Math.floor(totalFrames / maxFrames) : 1;
    const minPeriod = Math.floor(this.sampleRate / 500);
    const maxPeriod = Math.floor(this.sampleRate / 75);
    let frameCount = 0;
    for (let i = 0; i < signal.length - frameSize && frameCount < maxFrames; i += hopSize * step) {
      const frame = signal.slice(i, i + frameSize);
      frameCount++;
      const windowed = this.applyHammingWindow(frame);
      const autocorr = this.autocorrelate(windowed, minPeriod, maxPeriod);
      let maxVal = 0;
      let maxPeriod_actual = 0;
      for (let period = minPeriod; period < maxPeriod; period++) {
        if (autocorr[period - minPeriod] > maxVal) {
          maxVal = autocorr[period - minPeriod];
          maxPeriod_actual = period;
        }
      }
      if (maxVal > 0.3 && maxPeriod_actual > 0) {
        const f0 = this.sampleRate / maxPeriod_actual;
        f0Values.push(f0);
      }
    }
    return f0Values;
  }
  autocorrelate(frame, minLag, maxLag) {
    const result = [];
    for (let lag = minLag; lag < maxLag; lag++) {
      let sum = 0;
      let norm1 = 0;
      let norm2 = 0;
      for (let i = 0; i < frame.length - lag; i++) {
        sum += frame[i] * frame[i + lag];
        norm1 += frame[i] * frame[i];
        norm2 += frame[i + lag] * frame[i + lag];
      }
      const normFactor = Math.sqrt(norm1 * norm2);
      result.push(normFactor > 0 ? sum / normFactor : 0);
    }
    return result;
  }
  /**
   * Calculate jitter (pitch perturbation)
   */
  calculateJitter(f0Values) {
    if (f0Values.length < 3) return 0;
    let sumDiff = 0;
    for (let i = 1; i < f0Values.length; i++) {
      sumDiff += Math.abs(f0Values[i] - f0Values[i - 1]);
    }
    const meanF0 = f0Values.reduce((a, b) => a + b, 0) / f0Values.length;
    const jitter = sumDiff / (f0Values.length - 1) / meanF0;
    return Math.min(jitter * 25, 1);
  }
  /**
   * Calculate shimmer (amplitude perturbation)
   */
  calculateShimmer(signal, f0Values) {
    if (f0Values.length < 3) return 0;
    const amplitudes = [];
    const frameSize = Math.floor(signal.length / f0Values.length);
    for (let i = 0; i < f0Values.length; i++) {
      const start = i * frameSize;
      const end = Math.min(start + frameSize, signal.length);
      const frame = signal.slice(start, end);
      amplitudes.push(Math.max(...Array.from(frame).map(Math.abs)));
    }
    let sumDiff = 0;
    for (let i = 1; i < amplitudes.length; i++) {
      sumDiff += Math.abs(amplitudes[i] - amplitudes[i - 1]);
    }
    const meanAmp = amplitudes.reduce((a, b) => a + b, 0) / amplitudes.length;
    const shimmer = sumDiff / (amplitudes.length - 1) / (meanAmp + 1e-10);
    return Math.min(shimmer * 8, 1);
  }
  /**
   * Calculate Noise-to-Harmonics Ratio
   */
  calculateNHR(signal) {
    const fft = this.computeFFT(signal);
    const magnitude = fft.map(Math.abs);
    const cutoff = Math.floor(magnitude.length * 0.4);
    const harmonicEnergy = magnitude.slice(0, cutoff).reduce((a, b) => a + b * b, 0);
    const noiseEnergy = magnitude.slice(cutoff).reduce((a, b) => a + b * b, 0);
    const nhr = noiseEnergy / (harmonicEnergy + 1e-10);
    return Math.min(nhr / 2, 1);
  }
  /**
   * Detailed pitch analysis
   */
  analyzePitch(signal) {
    const f0Values = this.detectPitchAutocorrelation(signal);
    if (f0Values.length === 0) {
      return { meanF0: 0, f0Range: 0, f0StdDev: 0, vibrato: 0, vibratoDuration: 0 };
    }
    const meanF0 = f0Values.reduce((a, b) => a + b, 0) / f0Values.length;
    const f0Range = Math.max(...f0Values) - Math.min(...f0Values);
    const variance = f0Values.reduce((sum, val) => sum + (val - meanF0) ** 2, 0) / f0Values.length;
    const f0StdDev = Math.sqrt(variance);
    const { vibrato, vibratoDuration } = this.detectVibrato(f0Values);
    return { meanF0, f0Range, f0StdDev, vibrato, vibratoDuration };
  }
  /**
   * Detect vibrato in pitch contour
   */
  detectVibrato(f0Values) {
    if (f0Values.length < 10) {
      return { vibrato: 0, vibratoDuration: 0 };
    }
    const mean = f0Values.reduce((a, b) => a + b, 0) / f0Values.length;
    const centered = f0Values.map((v) => v - mean);
    const fft = this.computeFFT(new Float32Array(centered));
    const magnitude = fft.slice(0, Math.floor(fft.length / 2)).map(Math.abs);
    const frameRate = 100;
    const minIdx = Math.floor(4 / (frameRate / f0Values.length));
    const maxIdx = Math.floor(8 / (frameRate / f0Values.length));
    let maxMag = 0;
    let vibratoIdx = 0;
    for (let i = Math.max(1, minIdx); i < Math.min(maxIdx, magnitude.length); i++) {
      if (magnitude[i] > maxMag) {
        maxMag = magnitude[i];
        vibratoIdx = i;
      }
    }
    const vibrato = vibratoIdx > 0 ? vibratoIdx * frameRate / f0Values.length : 0;
    const vibratoDuration = maxMag > mean * 0.1 ? f0Values.length / frameRate * 1e3 : 0;
    return { vibrato, vibratoDuration };
  }
  /**
   * Detect pauses and analyze speech timing
   */
  detectPauses(signal) {
    const frameSize = Math.floor(this.sampleRate * 0.02);
    const hopSize = Math.floor(this.sampleRate * 0.01);
    const energies = [];
    for (let i = 0; i < signal.length - frameSize; i += hopSize) {
      const frame = signal.slice(i, i + frameSize);
      const rms = Math.sqrt(frame.reduce((sum, v) => sum + v * v, 0) / frame.length);
      energies.push(rms);
    }
    const maxEnergy = Math.max(...energies);
    const silenceThreshold = maxEnergy * 0.1;
    const minPauseFrames = 20;
    const pauses = [];
    let inPause = false;
    let pauseStart = 0;
    for (let i = 0; i < energies.length; i++) {
      const isSilent = energies[i] < silenceThreshold;
      if (isSilent && !inPause) {
        pauseStart = i;
        inPause = true;
      } else if (!isSilent && inPause) {
        const pauseLength = i - pauseStart;
        if (pauseLength >= minPauseFrames) {
          pauses.push({ start: pauseStart, end: i });
        }
        inPause = false;
      }
    }
    if (inPause && energies.length - pauseStart >= minPauseFrames) {
      pauses.push({ start: pauseStart, end: energies.length });
    }
    const pauseCount = pauses.length;
    const pauseDurations = pauses.map((p) => (p.end - p.start) * 10);
    const totalPauseDuration = pauseDurations.reduce((a, b) => a + b, 0);
    const meanPauseDuration = pauseCount > 0 ? totalPauseDuration / pauseCount : 0;
    const maxPauseDuration = pauseCount > 0 ? Math.max(...pauseDurations) : 0;
    const totalDuration = signal.length / this.sampleRate * 1e3;
    const pauseFrequency = pauseCount / totalDuration * 1e3;
    const speechDuration = totalDuration - totalPauseDuration;
    const estimatedSyllables = speechDuration / 150;
    const speechRate = estimatedSyllables / 1.5 / (totalDuration / 6e4);
    const filledPauses = this.detectFilledPauses(signal);
    return {
      pauseCount,
      totalPauseDuration,
      meanPauseDuration,
      maxPauseDuration,
      pauseFrequency,
      speechRate,
      filledPauses
    };
  }
  /**
   * Detect filled pauses (um, uh) based on acoustic patterns
   * Uses simplified energy-based detection to avoid stack overflow
   */
  detectFilledPauses(signal) {
    const frameSize = Math.floor(this.sampleRate * 0.1);
    const hopSize = Math.floor(this.sampleRate * 0.1);
    const maxFrames = 100;
    const totalFrames = Math.floor((signal.length - frameSize) / hopSize);
    const step = totalFrames > maxFrames ? Math.floor(totalFrames / maxFrames) : 1;
    let filledPauseCount = 0;
    let frameIndex = 0;
    for (let i = 0; i < signal.length - frameSize && frameIndex < maxFrames; i += hopSize * step) {
      const frame = signal.slice(i, i + frameSize);
      frameIndex++;
      const rms = Math.sqrt(frame.reduce((sum, v) => sum + v * v, 0) / frame.length);
      if (rms < 0.01) continue;
      let zcr = 0;
      for (let j = 1; j < frame.length; j++) {
        if (frame[j] >= 0 !== frame[j - 1] >= 0) zcr++;
      }
      const zcrRate = zcr / frame.length;
      const fft = this.computeFFT(frame);
      const halfLen = Math.floor(fft.length / 4);
      let weightedSum = 0;
      let totalMag = 0;
      for (let j = 0; j < halfLen; j++) {
        weightedSum += j * fft[j];
        totalMag += fft[j];
      }
      const centroid = totalMag > 0 ? weightedSum / totalMag : 0;
      if (rms > 0.02 && rms < 0.3 && zcrRate < 0.1 && centroid < halfLen * 0.3) {
        filledPauseCount++;
      }
    }
    return filledPauseCount;
  }
  /**
   * Extract formant frequencies using LPC
   */
  extractFormants(signal) {
    const preemphasized = new Float32Array(signal.length);
    preemphasized[0] = signal[0];
    for (let i = 1; i < signal.length; i++) {
      preemphasized[i] = signal[i] - 0.97 * signal[i - 1];
    }
    const order = 12;
    const lpcCoeffs = this.computeLPC(preemphasized, order);
    const roots = this.findLPCRoots(lpcCoeffs);
    const formantFreqs = roots.filter((r) => r.imag > 0).map((r) => {
      const freq = Math.atan2(r.imag, r.real) * this.sampleRate / (2 * Math.PI);
      const bandwidth = -Math.log(Math.sqrt(r.real ** 2 + r.imag ** 2)) * this.sampleRate / Math.PI;
      return { freq, bandwidth };
    }).filter((f) => f.freq > 90 && f.freq < 5e3).sort((a, b) => a.freq - b.freq);
    return {
      f1: formantFreqs[0]?.freq || 500,
      f2: formantFreqs[1]?.freq || 1500,
      f3: formantFreqs[2]?.freq || 2500,
      f1Bandwidth: formantFreqs[0]?.bandwidth || 100,
      f2Bandwidth: formantFreqs[1]?.bandwidth || 150
    };
  }
  /**
   * Compute Linear Predictive Coding coefficients
   */
  computeLPC(signal, order) {
    const R = [];
    for (let lag = 0; lag <= order; lag++) {
      let sum = 0;
      for (let i = 0; i < signal.length - lag; i++) {
        sum += signal[i] * signal[i + lag];
      }
      R.push(sum);
    }
    const a = new Array(order + 1).fill(0);
    const e = new Array(order + 1).fill(0);
    a[0] = 1;
    e[0] = R[0];
    for (let i = 1; i <= order; i++) {
      let lambda = 0;
      for (let j = 0; j < i; j++) {
        lambda -= a[j] * R[i - j];
      }
      lambda /= e[i - 1] || 1e-10;
      const aNew = [...a];
      for (let j = 0; j <= i; j++) {
        aNew[j] = a[j] + lambda * a[i - j];
      }
      a.splice(0, a.length, ...aNew);
      e[i] = (1 - lambda * lambda) * e[i - 1];
    }
    return a;
  }
  /**
   * Find roots of LPC polynomial
   */
  findLPCRoots(coeffs) {
    const n = coeffs.length - 1;
    const roots = [];
    const z = [];
    for (let i = 0; i < n; i++) {
      const angle = 2 * Math.PI * i / n;
      z.push({ real: 0.9 * Math.cos(angle), imag: 0.9 * Math.sin(angle) });
    }
    for (let iter = 0; iter < 50; iter++) {
      for (let i = 0; i < n; i++) {
        let pReal = coeffs[0];
        let pImag = 0;
        let zPowReal = 1;
        let zPowImag = 0;
        for (let j = 1; j < coeffs.length; j++) {
          const newReal = zPowReal * z[i].real - zPowImag * z[i].imag;
          const newImag = zPowReal * z[i].imag + zPowImag * z[i].real;
          zPowReal = newReal;
          zPowImag = newImag;
          pReal += coeffs[j] * zPowReal;
          pImag += coeffs[j] * zPowImag;
        }
        let prodReal = 1;
        let prodImag = 0;
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            const diffReal = z[i].real - z[j].real;
            const diffImag = z[i].imag - z[j].imag;
            const newProdReal = prodReal * diffReal - prodImag * diffImag;
            const newProdImag = prodReal * diffImag + prodImag * diffReal;
            prodReal = newProdReal;
            prodImag = newProdImag;
          }
        }
        const denom = prodReal * prodReal + prodImag * prodImag + 1e-10;
        z[i].real -= (pReal * prodReal + pImag * prodImag) / denom;
        z[i].imag -= (pImag * prodReal - pReal * prodImag) / denom;
      }
    }
    return z;
  }
  /**
   * Extract spectral features (MFCC, centroid, rolloff, etc.)
   */
  extractSpectralFeatures(signal) {
    const fft = this.computeFFT(signal);
    const magnitude = fft.slice(0, Math.floor(fft.length / 2)).map(Math.abs);
    const mfcc = this.computeMFCC(magnitude, 13);
    let weightedSum = 0;
    let totalMagnitude = 0;
    for (let i = 0; i < magnitude.length; i++) {
      const freq = i * this.sampleRate / (2 * magnitude.length);
      weightedSum += freq * magnitude[i];
      totalMagnitude += magnitude[i];
    }
    const spectralCentroid = totalMagnitude > 0 ? weightedSum / totalMagnitude : 0;
    const totalEnergy = magnitude.reduce((sum, m) => sum + m * m, 0);
    let cumEnergy = 0;
    let spectralRolloff = 0;
    for (let i = 0; i < magnitude.length; i++) {
      cumEnergy += magnitude[i] * magnitude[i];
      if (cumEnergy >= totalEnergy * 0.95) {
        spectralRolloff = i * this.sampleRate / (2 * magnitude.length);
        break;
      }
    }
    const spectralFlux = this.calculateSpectralFlux(signal);
    let zcr = 0;
    for (let i = 1; i < signal.length; i++) {
      if (signal[i] >= 0 !== signal[i - 1] >= 0) {
        zcr++;
      }
    }
    zcr = zcr / signal.length * this.sampleRate;
    const rms = Math.sqrt(signal.reduce((sum, v) => sum + v * v, 0) / signal.length);
    return {
      mfcc,
      spectralCentroid,
      spectralRolloff,
      spectralFlux,
      zcr,
      rms
    };
  }
  /**
   * Compute MFCC (Mel-Frequency Cepstral Coefficients)
   */
  computeMFCC(magnitude, numCoeffs) {
    const numFilters = 26;
    const melFilters = this.createMelFilterbank(magnitude.length, numFilters);
    const melEnergies = [];
    for (let i = 0; i < numFilters; i++) {
      let energy = 0;
      for (let j = 0; j < magnitude.length; j++) {
        energy += melFilters[i][j] * magnitude[j] * magnitude[j];
      }
      melEnergies.push(Math.log(energy + 1e-10));
    }
    const mfcc = [];
    for (let i = 0; i < numCoeffs; i++) {
      let sum = 0;
      for (let j = 0; j < numFilters; j++) {
        sum += melEnergies[j] * Math.cos(Math.PI * i * (j + 0.5) / numFilters);
      }
      mfcc.push(sum);
    }
    return mfcc;
  }
  /**
   * Create triangular mel filterbank
   */
  createMelFilterbank(fftSize, numFilters) {
    const minMel = this.hzToMel(0);
    const maxMel = this.hzToMel(this.sampleRate / 2);
    const melPoints = [];
    for (let i = 0; i <= numFilters + 1; i++) {
      melPoints.push(minMel + i * (maxMel - minMel) / (numFilters + 1));
    }
    const hzPoints = melPoints.map((m) => this.melToHz(m));
    const binPoints = hzPoints.map((h) => Math.floor(h * 2 * fftSize / this.sampleRate));
    const filters = [];
    for (let i = 0; i < numFilters; i++) {
      const filter = new Array(fftSize).fill(0);
      for (let j = binPoints[i]; j < binPoints[i + 1]; j++) {
        filter[j] = (j - binPoints[i]) / (binPoints[i + 1] - binPoints[i]);
      }
      for (let j = binPoints[i + 1]; j < binPoints[i + 2]; j++) {
        filter[j] = (binPoints[i + 2] - j) / (binPoints[i + 2] - binPoints[i + 1]);
      }
      filters.push(filter);
    }
    return filters;
  }
  hzToMel(hz) {
    return 2595 * Math.log10(1 + hz / 700);
  }
  melToHz(mel) {
    return 700 * (Math.pow(10, mel / 2595) - 1);
  }
  /**
   * Calculate spectral flux (frame-by-frame)
   * Limited to prevent stack overflow on long audio
   */
  calculateSpectralFlux(signal) {
    const frameSize = Math.floor(this.sampleRate * 0.025);
    const hopSize = Math.floor(this.sampleRate * 0.025);
    const maxFrames = 200;
    const totalFrames = Math.floor((signal.length - frameSize) / hopSize);
    const step = totalFrames > maxFrames ? Math.floor(totalFrames / maxFrames) : 1;
    let totalFlux = 0;
    let prevMag = null;
    let frameCount = 0;
    for (let i = 0; i < signal.length - frameSize && frameCount < maxFrames; i += hopSize * step) {
      const frame = signal.slice(i, i + frameSize);
      const fft = this.computeFFT(frame);
      const mag = fft.slice(0, Math.floor(fft.length / 2));
      if (prevMag) {
        let flux = 0;
        const len = Math.min(mag.length, prevMag.length);
        for (let j = 0; j < len; j++) {
          const diff = mag[j] - prevMag[j];
          flux += diff > 0 ? diff * diff : 0;
        }
        totalFlux += Math.sqrt(flux);
      }
      prevMag = mag;
      frameCount++;
    }
    return frameCount > 1 ? totalFlux / (frameCount - 1) : 0;
  }
  /**
   * Extract temporal features
   */
  extractTemporalFeatures(signal) {
    const duration = signal.length / this.sampleRate * 1e3;
    const frameSize = Math.floor(this.sampleRate * 0.02);
    let speechFrames = 0;
    let totalFrames = 0;
    const threshold = Math.max(...Array.from(signal).map(Math.abs)) * 0.1;
    for (let i = 0; i < signal.length - frameSize; i += frameSize) {
      const frame = signal.slice(i, i + frameSize);
      const maxAmp = Math.max(...Array.from(frame).map(Math.abs));
      if (maxAmp > threshold) {
        speechFrames++;
      }
      totalFrames++;
    }
    const speechDuration = speechFrames / totalFrames * duration;
    const silenceRatio = 1 - speechFrames / totalFrames;
    let onsetCount = 0;
    let inSpeech = false;
    for (let i = 0; i < signal.length - frameSize; i += frameSize) {
      const frame = signal.slice(i, i + frameSize);
      const maxAmp = Math.max(...Array.from(frame).map(Math.abs));
      const isSpeech = maxAmp > threshold;
      if (isSpeech && !inSpeech) {
        onsetCount++;
      }
      inSpeech = isSpeech;
    }
    return {
      duration,
      speechDuration,
      silenceRatio,
      onsetCount
    };
  }
  /**
   * Apply Hamming window
   */
  applyHammingWindow(frame) {
    const windowed = new Float32Array(frame.length);
    for (let i = 0; i < frame.length; i++) {
      windowed[i] = frame[i] * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (frame.length - 1)));
    }
    return windowed;
  }
  /**
   * Compute FFT using Cooley-Tukey algorithm
   */
  computeFFT(signal) {
    const n = Math.pow(2, Math.ceil(Math.log2(signal.length)));
    const padded = new Float32Array(n);
    padded.set(signal);
    const real = Array.from(padded);
    const imag = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      const j = this.bitReverse(i, Math.log2(n));
      if (j > i) {
        [real[i], real[j]] = [real[j], real[i]];
        [imag[i], imag[j]] = [imag[j], imag[i]];
      }
    }
    for (let size = 2; size <= n; size *= 2) {
      const halfSize = size / 2;
      const angle = -2 * Math.PI / size;
      for (let i = 0; i < n; i += size) {
        for (let j = 0; j < halfSize; j++) {
          const wr = Math.cos(angle * j);
          const wi = Math.sin(angle * j);
          const idx1 = i + j;
          const idx2 = i + j + halfSize;
          const tr = wr * real[idx2] - wi * imag[idx2];
          const ti = wr * imag[idx2] + wi * real[idx2];
          real[idx2] = real[idx1] - tr;
          imag[idx2] = imag[idx1] - ti;
          real[idx1] = real[idx1] + tr;
          imag[idx1] = imag[idx1] + ti;
        }
      }
    }
    return real.map((r, i) => Math.sqrt(r * r + imag[i] * imag[i]));
  }
  bitReverse(x, bits) {
    let result = 0;
    for (let i = 0; i < bits; i++) {
      result = result << 1 | x & 1;
      x >>= 1;
    }
    return result;
  }
};

// src/worker/index.ts
var app = new Hono2();
var audioAnalyzer = new AudioAnalyzer();
app.use("/*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"]
}));
app.get("/api/health", (c) => c.json({ status: "ok", version: "1.0.0" }));
app.post("/api/analyze", async (c) => {
  try {
    const formData = await c.req.formData();
    const audioFile = formData.get("audio");
    if (!audioFile) {
      return c.json({ error: "No audio file provided" }, 400);
    }
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioData = await decodeAudioData(arrayBuffer);
    const audioFeatures = await audioAnalyzer.extractFeatures(
      audioData.samples,
      audioData.sampleRate
    );
    let emotionResult = {
      emotions: { neutral: 1 },
      dominant: "neutral",
      confidence: 0
    };
    let transcription = "";
    if (c.env.HF_API_TOKEN && c.env.ACCOUNT_ID && c.env.GATEWAY_ID) {
      try {
        const [emotionData, transcriptionData] = await Promise.all([
          getEmotionAnalysis(audioFile, c.env),
          getTranscription(audioFile, c.env)
        ]);
        emotionResult = emotionData;
        transcription = transcriptionData;
      } catch (hfError) {
        console.error("Hugging Face API error:", hfError);
      }
    }
    const deceptionFactors = calculateDeceptionFactors(
      audioFeatures,
      emotionResult,
      transcription
    );
    const deceptionScore = computeDeceptionScore(deceptionFactors);
    const riskLevel = getRiskLevel(deceptionScore);
    const explanation = generateExplanation(
      deceptionScore,
      deceptionFactors,
      audioFeatures,
      emotionResult
    );
    const warnings = generateWarnings(audioFeatures, deceptionFactors);
    const result = {
      audioFeatures,
      emotionalState: emotionResult.emotions,
      dominantEmotion: emotionResult.dominant,
      transcription,
      deceptionScore,
      deceptionFactors,
      riskLevel,
      explanation,
      warnings
    };
    return c.json(result);
  } catch (error) {
    console.error("Analysis error:", error);
    return c.json({
      error: error instanceof Error ? error.message : "Analysis failed"
    }, 500);
  }
});
app.post("/api/analyze/quick", async (c) => {
  try {
    const formData = await c.req.formData();
    const audioFile = formData.get("audio");
    if (!audioFile) {
      return c.json({ error: "No audio file provided" }, 400);
    }
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioData = await decodeAudioData(arrayBuffer);
    const audioFeatures = await audioAnalyzer.extractFeatures(
      audioData.samples,
      audioData.sampleRate
    );
    const deceptionFactors = calculateDeceptionFactorsFromAcoustics(audioFeatures);
    const deceptionScore = computeDeceptionScore(deceptionFactors);
    const riskLevel = getRiskLevel(deceptionScore);
    return c.json({
      audioFeatures,
      deceptionScore,
      deceptionFactors,
      riskLevel,
      explanation: generateQuickExplanation(deceptionScore, deceptionFactors, audioFeatures)
    });
  } catch (error) {
    console.error("Quick analysis error:", error);
    return c.json({
      error: error instanceof Error ? error.message : "Analysis failed"
    }, 500);
  }
});
async function decodeAudioData(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (riff === "RIFF") {
    return decodeWav(view);
  }
  const sampleRate = 16e3;
  const samples = new Float32Array(Math.floor((arrayBuffer.byteLength - 44) / 2));
  for (let i = 0; i < samples.length; i++) {
    const int16 = view.getInt16(44 + i * 2, true);
    samples[i] = int16 / 32768;
  }
  return { samples, sampleRate };
}
__name(decodeAudioData, "decodeAudioData");
function decodeWav(view) {
  const numChannels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);
  let dataOffset = 12;
  while (dataOffset < view.byteLength - 8) {
    const chunkId = String.fromCharCode(
      view.getUint8(dataOffset),
      view.getUint8(dataOffset + 1),
      view.getUint8(dataOffset + 2),
      view.getUint8(dataOffset + 3)
    );
    const chunkSize = view.getUint32(dataOffset + 4, true);
    if (chunkId === "data") {
      dataOffset += 8;
      break;
    }
    dataOffset += 8 + chunkSize;
  }
  const bytesPerSample = bitsPerSample / 8;
  const numSamples = Math.floor((view.byteLength - dataOffset) / bytesPerSample / numChannels);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    let sample = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      const offset = dataOffset + (i * numChannels + ch) * bytesPerSample;
      if (bitsPerSample === 16) {
        sample += view.getInt16(offset, true) / 32768;
      } else if (bitsPerSample === 32) {
        sample += view.getFloat32(offset, true);
      } else if (bitsPerSample === 8) {
        sample += (view.getUint8(offset) - 128) / 128;
      }
    }
    samples[i] = sample / numChannels;
  }
  return { samples, sampleRate };
}
__name(decodeWav, "decodeWav");
async function getEmotionAnalysis(audioFile, env) {
  const formData = new FormData();
  formData.append("file", audioFile);
  const response = await fetch(
    `https://gateway.ai.cloudflare.com/v1/${env.ACCOUNT_ID}/${env.GATEWAY_ID}/huggingface/ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.HF_API_TOKEN}`,
        "cf-aig-authorization": `Bearer ${env.CF_API_TOKEN}`
      },
      body: formData
    }
  );
  if (!response.ok) {
    throw new Error(`Emotion API error: ${response.statusText}`);
  }
  const data = await response.json();
  const emotions = {};
  let dominant = "neutral";
  let maxScore = 0;
  if (Array.isArray(data)) {
    for (const item of data) {
      emotions[item.label] = item.score;
      if (item.score > maxScore) {
        maxScore = item.score;
        dominant = item.label;
      }
    }
  }
  return { emotions, dominant, confidence: maxScore };
}
__name(getEmotionAnalysis, "getEmotionAnalysis");
async function getTranscription(audioFile, env) {
  const formData = new FormData();
  formData.append("file", audioFile);
  const response = await fetch(
    `https://gateway.ai.cloudflare.com/v1/${env.ACCOUNT_ID}/${env.GATEWAY_ID}/huggingface/openai/whisper-large-v3`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.HF_API_TOKEN}`,
        "cf-aig-authorization": `Bearer ${env.CF_API_TOKEN}`
      },
      body: formData
    }
  );
  if (!response.ok) {
    return "";
  }
  const data = await response.json();
  return data.text || "";
}
__name(getTranscription, "getTranscription");
function calculateDeceptionFactors(features, emotion, transcription) {
  const stressLevel = features.stressIndicators.stressScore;
  const hesitationPattern = Math.min(
    features.pauseDetection.pauseFrequency * 0.5 + features.pauseDetection.filledPauses * 0.1 + (features.pauseDetection.meanPauseDuration > 500 ? 0.2 : 0),
    1
  );
  const normalPitchRange = 80;
  const pitchVariation = Math.min(
    Math.abs(features.pitchAnalysis.f0Range - normalPitchRange) / normalPitchRange,
    1
  );
  const normalSpeechRate = 150;
  const speechRate = Math.min(
    Math.abs(features.pauseDetection.speechRate - normalSpeechRate) / normalSpeechRate,
    1
  );
  const pauseFrequency = Math.min(features.pauseDetection.pauseFrequency * 2, 1);
  const normalF1 = 500, normalF2 = 1500;
  const formantVariability = Math.min(
    (Math.abs(features.formants.f1 - normalF1) / normalF1 + Math.abs(features.formants.f2 - normalF2) / normalF2) / 2,
    1
  );
  const totalDuration = features.temporalFeatures.duration / 1e3;
  const filledPauseRatio = Math.min(features.pauseDetection.filledPauses / (totalDuration * 2), 1);
  const spectralInstability = Math.min(features.spectralFeatures.spectralFlux / 100, 1);
  const emotionModifiers = {
    "fear": 0.15,
    "angry": 0.1,
    "disgust": 0.1,
    "sad": 0.05,
    "neutral": 0,
    "happy": -0.05,
    "surprise": 0.05
  };
  const emotionMod = emotionModifiers[emotion.dominant] || 0;
  const hedgingWords = [
    "um",
    "uh",
    "like",
    "you know",
    "i mean",
    "maybe",
    "probably",
    "i guess",
    "sort of",
    "kind of",
    "well",
    "actually",
    "honestly",
    "to be honest",
    "truthfully",
    "believe me"
  ];
  const hedgingCount = hedgingWords.filter(
    (word) => transcription.toLowerCase().includes(word)
  ).length;
  const hedgingMod = Math.min(hedgingCount * 0.05, 0.2);
  return {
    stressLevel: Math.min(stressLevel + emotionMod, 1),
    hesitationPattern: Math.min(hesitationPattern + hedgingMod, 1),
    pitchVariation,
    speechRate,
    pauseFrequency,
    formantVariability,
    filledPauseRatio,
    spectralInstability
  };
}
__name(calculateDeceptionFactors, "calculateDeceptionFactors");
function calculateDeceptionFactorsFromAcoustics(features) {
  return {
    stressLevel: features.stressIndicators.stressScore,
    hesitationPattern: Math.min(features.pauseDetection.pauseFrequency * 0.5, 1),
    pitchVariation: Math.min(features.pitchAnalysis.f0Range / 200, 1),
    speechRate: Math.min(Math.abs(features.pauseDetection.speechRate - 150) / 150, 1),
    pauseFrequency: Math.min(features.pauseDetection.pauseFrequency * 2, 1),
    formantVariability: Math.min(Math.abs(features.formants.f1 - 500) / 500, 1),
    filledPauseRatio: Math.min(features.pauseDetection.filledPauses / 5, 1),
    spectralInstability: Math.min(features.spectralFeatures.spectralFlux / 100, 1)
  };
}
__name(calculateDeceptionFactorsFromAcoustics, "calculateDeceptionFactorsFromAcoustics");
function computeDeceptionScore(factors) {
  const weights = {
    stressLevel: 0.2,
    hesitationPattern: 0.18,
    pitchVariation: 0.12,
    speechRate: 0.12,
    pauseFrequency: 0.12,
    formantVariability: 0.08,
    filledPauseRatio: 0.1,
    spectralInstability: 0.08
  };
  let score = 0;
  for (const [key, weight] of Object.entries(weights)) {
    score += (factors[key] || 0) * weight;
  }
  return Math.min(Math.max(score, 0), 1);
}
__name(computeDeceptionScore, "computeDeceptionScore");
function getRiskLevel(score) {
  if (score < 0.35) return "low";
  if (score < 0.65) return "medium";
  return "high";
}
__name(getRiskLevel, "getRiskLevel");
function generateExplanation(score, factors, features, emotion) {
  const parts = [];
  if (score >= 0.65) {
    parts.push("Multiple deception indicators detected. Voice analysis shows elevated stress markers and irregular speech patterns.");
  } else if (score >= 0.35) {
    parts.push("Some deception indicators present. Speech patterns show moderate anomalies worth noting.");
  } else {
    parts.push("Minimal deception indicators detected. Voice patterns appear consistent with baseline truthful speech.");
  }
  if (factors.stressLevel > 0.5) {
    parts.push(`Vocal stress detected: jitter ${(features.stressIndicators.jitter * 100).toFixed(1)}%, shimmer ${(features.stressIndicators.shimmer * 100).toFixed(1)}%.`);
  }
  if (factors.hesitationPattern > 0.5) {
    parts.push(`Hesitation patterns: ${features.pauseDetection.pauseCount} pauses detected (avg ${features.pauseDetection.meanPauseDuration.toFixed(0)}ms).`);
  }
  if (factors.pitchVariation > 0.5) {
    parts.push(`Pitch variation: ${features.pitchAnalysis.f0Range.toFixed(0)}Hz range (mean ${features.pitchAnalysis.meanF0.toFixed(0)}Hz).`);
  }
  if (factors.speechRate > 0.5) {
    parts.push(`Speech rate: ${features.pauseDetection.speechRate.toFixed(0)} WPM (${features.pauseDetection.speechRate > 180 ? "fast" : "slow"}).`);
  }
  if (factors.filledPauseRatio > 0.3) {
    parts.push(`${features.pauseDetection.filledPauses} filled pauses (um/uh) detected.`);
  }
  if (emotion.confidence > 0.5) {
    parts.push(`Dominant emotion: ${emotion.dominant} (${(emotion.confidence * 100).toFixed(0)}% confidence).`);
  }
  return parts.join(" ");
}
__name(generateExplanation, "generateExplanation");
function generateQuickExplanation(score, factors, features) {
  const riskDesc = score >= 0.65 ? "High" : score >= 0.35 ? "Moderate" : "Low";
  return `${riskDesc} deception indicators. Stress: ${(factors.stressLevel * 100).toFixed(0)}%, Hesitation: ${(factors.hesitationPattern * 100).toFixed(0)}%, Speech rate: ${features.pauseDetection.speechRate.toFixed(0)} WPM, Pauses: ${features.pauseDetection.pauseCount}.`;
}
__name(generateQuickExplanation, "generateQuickExplanation");
function generateWarnings(features, factors) {
  const warnings = [];
  if (features.temporalFeatures.duration < 5e3) {
    warnings.push("Audio sample is short (<5 seconds). Results may be less reliable.");
  }
  if (features.temporalFeatures.silenceRatio > 0.7) {
    warnings.push("High silence ratio detected. Limited speech content for analysis.");
  }
  if (features.spectralFeatures.rms < 0.01) {
    warnings.push("Low audio level detected. Recording may be too quiet.");
  }
  warnings.push("Voice analysis detects stress indicators, not actual deception. Results should not be used as definitive evidence.");
  return warnings;
}
__name(generateWarnings, "generateWarnings");
app.get("/*", async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});
var index_default = app;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map