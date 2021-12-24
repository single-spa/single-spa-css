import { AppProps, LifeCycleFn } from "single-spa";
import axios from "axios";

const defaultOptions: Required<SingleSpaCssOpts> = {
  cssUrls: [],
  webpackExtractedCss: false,
  timeout: 5000,
  shouldUnmount: true,
  createLink: (url) => {
    const linkEl = document.createElement("link");
    linkEl.href = url;
    linkEl.rel = "stylesheet";
    return linkEl;
  },
  manifestUrl: "",
};

export default function singleSpaCss<ExtraProps>(
  _opts: SingleSpaCssOpts
): CSSLifecycles<ExtraProps> {
  if (!_opts || typeof _opts !== "object") {
    throw Error(`single-spa-css: opts must be an object`);
  }

  // Requires polyfill in IE11
  const opts: Required<SingleSpaCssOpts> = Object.assign(
    {},
    defaultOptions,
    _opts
  );

  if (!Array.isArray(opts.cssUrls)) {
    throw Error("single-spa-css: cssUrls must be an array");
  }
  if (
    opts.cssUrls.length > 0 &&
    opts.cssUrls.filter((url) => url).length === 0
  ) {
    throw Error("single-spa-css: cssUrls should not be empty string");
  }

  const allCssUrls = opts.cssUrls;

  const manifestUrl = opts.manifestUrl;

  if (opts.webpackExtractedCss) {
    if (!__webpack_require__.cssAssets) {
      throw Error(
        "single-spa-css: to use webpackExtractedCss, add ExposeRuntimeCssAssetsPlugin to your webpack config."
      );
    }

    allCssUrls.push(
      ...__webpack_require__.cssAssets.map(
        (fileName) =>
          __webpack_public_path__ +
          __webpack_require__.cssAssetFileName(fileName)
      )
    );
  }

  const linkElements: LinkElements = {};
  let linkElementsToUnmount: ElementsToUnmount[] = [];

  // 生成 preload 链接并插入到 head
  function genPreloadLink2Head(url: string) {
    const preloadEl = document.querySelector(
      `link[rel="preload"][as="style"][href="${url}"]`
    );

    if (!preloadEl) {
      const linkEl = document.createElement("link");
      linkEl.rel = "preload";
      linkEl.setAttribute("as", "style");
      linkEl.href = url;

      document.head.appendChild(linkEl);
    }
  }

  function bootstrap(props: AppProps) {
    return Promise.all(
      allCssUrls
        .map(
          (cssUrl) =>
            new Promise<void>((resolve, reject) => {
              const [url] = extractUrl(cssUrl);
              genPreloadLink2Head(url);
              // Don't wait for preload to finish before finishing bootstrap
              resolve();
            })
        )
        .concat(
          manifestUrl
            ? new Promise<void>((resolve) => {
                extractManifestCssUrl(manifestUrl).then(([url]) => {
                  genPreloadLink2Head(url);
                });
                // Don't wait for preload to finish before finishing bootstrap
                resolve();
              })
            : []
        )
    );
  }

  function genLink2Head(url, shouldUnmount, props, opts, resolve, reject) {
    const existingLinkEl = document.querySelector(
      `link[rel="stylesheet"][href="${url}"]`
    );

    if (existingLinkEl) {
      linkElements[url] = existingLinkEl as HTMLLinkElement;
      resolve();
    } else {
      const timeout = setTimeout(() => {
        reject(
          `single-spa-css: While mounting '${props.name}', loading CSS from URL ${linkEl.href} timed out after ${opts.timeout}ms`
        );
      }, opts.timeout);
      const linkEl = opts.createLink(url);
      linkEl.addEventListener("load", () => {
        clearTimeout(timeout);
        resolve();
      });
      linkEl.addEventListener("error", () => {
        clearTimeout(timeout);
        reject(
          Error(
            `single-spa-css: While mounting '${props.name}', loading CSS from URL ${linkEl.href} failed.`
          )
        );
      });
      linkElements[url] = linkEl;
      document.head.appendChild(linkEl);

      if (shouldUnmount) {
        linkElementsToUnmount.push([linkEl, url]);
      }
    }
  }

  function mount(props: AppProps) {
    return Promise.all(
      allCssUrls
        .map(
          (cssUrl) =>
            new Promise<void>((resolve, reject) => {
              const [url, shouldUnmount] = extractUrl(cssUrl);
              genLink2Head(url, shouldUnmount, props, opts, resolve, reject);
            })
        )
        .concat(
          manifestUrl
            ? new Promise<void>((resolve, reject) => {
                extractManifestCssUrl(manifestUrl).then(
                  ([url, shouldUnmount]) => {
                    genLink2Head(
                      url,
                      shouldUnmount,
                      props,
                      opts,
                      resolve,
                      reject
                    );
                  }
                );
              })
            : []
        )
    );
  }

  function unmount(props: AppProps) {
    const elements = linkElementsToUnmount;

    // reset this array immediately so that only one mounted instance tries to unmount
    // the link elements at a time
    linkElementsToUnmount = [];

    return Promise.all(
      elements.map(([linkEl, url]) =>
        Promise.resolve().then(() => {
          delete linkElements[url];
          if (linkEl.parentNode) {
            linkEl.parentNode.removeChild(linkEl);
          }
        })
      )
    );
  }

  function extractUrl(cssUrl: CssUrl): [string, boolean] {
    if (typeof cssUrl === "string") {
      return [cssUrl, opts.shouldUnmount];
    } else {
      return [
        cssUrl.href,
        cssUrl.hasOwnProperty("shouldUnmount")
          ? cssUrl.shouldUnmount
          : opts.shouldUnmount,
      ];
    }
  }

  function extractManifestCssUrl(jsonUrl: string): Promise<[string, boolean]> {
    const origin = /^(http|https)?:\/\/[\w-.]+(:\d+)?/i.exec(jsonUrl)![0];
    let url = "";
    return new Promise((resolve, reject) => {
      axios.get(jsonUrl).then((res) => {
        // TODO 这里可能存在多种格式的 manifest.json 文件，目前是最基础的格式
        url = origin + "/" + res.data["main.css"];
        resolve([
          url,
          opts.shouldUnmount, // 使用默认的
        ]);
      });
    });
  }

  return { bootstrap, mount, unmount };
}

type SingleSpaCssOpts = {
  cssUrls?: CssUrl[];
  webpackExtractedCss?: boolean;
  timeout?: number;
  shouldUnmount?: boolean;
  createLink?: (url: string) => HTMLLinkElement;
  manifestUrl?: string;
};

type CssUrl =
  | string
  | {
      href: string;
      shouldUnmount: boolean;
    };

type LinkElements = {
  [url: string]: HTMLLinkElement;
};

type ElementsToUnmount = [HTMLLinkElement, string];

type CSSLifecycles<ExtraProps> = {
  bootstrap: LifeCycleFn<ExtraProps>;
  mount: LifeCycleFn<ExtraProps>;
  unmount: LifeCycleFn<ExtraProps>;
};
