import * as singleSpa from "single-spa";
import singleSpaCss from "./single-spa-css";

describe("single-spa-css", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it(`throws if you pass in invalid opts`, () => {
    // @ts-ignore
    expect(() => singleSpaCss()).toThrowError();

    expect(() => singleSpaCss(null)).toThrowError();

    // @ts-ignore
    expect(() => singleSpaCss("asdfsdf")).toThrowError();
  });

  it(`throws if cssUrls is not an array`, () => {
    // @ts-ignore
    expect(() => singleSpaCss({ cssUrls: "/main.css" })).toThrowError();
  });

  it(`preloads scripts during the bootstrap lifecycle`, async () => {
    const url = "https://example.com/main.css";

    const lifecycles = singleSpaCss<{}>({
      cssUrls: [url],
    });

    expect(findPreloadEl(url)).not.toBeInTheDocument();

    await lifecycles.bootstrap(createProps());

    expect(findPreloadEl(url)).toBeInTheDocument();
  });

  it(`mounts <link> elements and waits for them to load before resolving the mount promise. Then it unmounts them`, async () => {
    const url = "https://example.com/main.css";

    const lifecycles = singleSpaCss<{}>({
      cssUrls: [url],
    });

    expect(findLinkEl(url)).not.toBeInTheDocument();

    const props = createProps();

    await lifecycles.bootstrap(props);

    expect(findLinkEl(url)).not.toBeInTheDocument();

    const mountPromise = lifecycles.mount(props);

    await macroTick();

    expect(findLinkEl(url)).toBeInTheDocument();

    findLinkEl(url).dispatchEvent(new CustomEvent("load"));

    await mountPromise;

    await lifecycles.unmount(props);

    expect(findLinkEl(url)).not.toBeInTheDocument();
  });

  it(`rejects the mount promise if the <link> fails to load`, async () => {
    const url = "https://example.com/main.css";

    const lifecycles = singleSpaCss<{}>({
      cssUrls: [url],
    });

    const props = createProps();

    await lifecycles.bootstrap(props);

    const mountPromise = lifecycles.mount(props);

    await macroTick();

    findLinkEl(url).dispatchEvent(new CustomEvent("error"));

    await expect(mountPromise).rejects.toThrowError(
      `loading CSS from URL ${url} failed`
    );
  });

  it(`does not preload the stylesheet if it's already in DOM`, async () => {
    const url = "https://example.com/main.css";

    const lifecycles = singleSpaCss<{}>({
      cssUrls: [url],
    });

    const props = createProps();

    const preloadEl = document.createElement("link");
    preloadEl.rel = "preload";
    preloadEl.setAttribute("as", "style");
    preloadEl.href = url;

    document.head.appendChild(preloadEl);

    expect(findAllPreloadEls(url).length).toBe(1);
    expect(findPreloadEl(url)).toBe(preloadEl);

    await lifecycles.bootstrap(props);

    expect(findAllPreloadEls(url).length).toBe(1);
    expect(findPreloadEl(url)).toBe(preloadEl);
  });

  it(`does not mount the CSS if it's already in the DOM`, async () => {
    const url = "https://example.com/main.css";

    const lifecycles = singleSpaCss<{}>({
      cssUrls: [url],
    });

    const props = createProps();

    await lifecycles.bootstrap(props);

    const linkEl = document.createElement("link");
    linkEl.rel = "stylesheet";
    linkEl.href = url;

    document.head.appendChild(linkEl);

    expect(findAllLinkEls(url).length).toBe(1);
    expect(findLinkEl(url)).toBe(linkEl);

    await lifecycles.mount(props);

    expect(findAllLinkEls(url).length).toBe(1);
    expect(findLinkEl(url)).toBe(linkEl);
  });

  it(`correctly handles top-level shouldUnmount: true configuration`, async () => {
    const cssUrls = [
      "/1.css",
      { href: "/2.css", shouldUnmount: true },
      { href: "/3.css", shouldUnmount: false },
    ];
    const lifecycles = singleSpaCss<{}>({
      cssUrls,
      shouldUnmount: true,
    });

    const props = createProps();

    await lifecycles.bootstrap(props);
    const mountPromise = lifecycles.mount(props);

    await macroTick();

    cssUrls.forEach((cssUrl) => {
      const url = typeof cssUrl === "string" ? cssUrl : cssUrl.href;
      findLinkEl(url).dispatchEvent(new CustomEvent("load"));
    });

    await mountPromise;

    expect(findLinkEl("/1.css")).toBeInTheDocument();
    expect(findLinkEl("/2.css")).toBeInTheDocument();
    expect(findLinkEl("/3.css")).toBeInTheDocument();

    await lifecycles.unmount(props);

    expect(findLinkEl("/1.css")).not.toBeInTheDocument();
    expect(findLinkEl("/2.css")).not.toBeInTheDocument();
    expect(findLinkEl("/3.css")).toBeInTheDocument();
  });

  it(`correctly handles top-level shouldUnmount: false configuration`, async () => {
    const cssUrls = [
      "/1.css",
      { href: "/2.css", shouldUnmount: true },
      { href: "/3.css", shouldUnmount: false },
    ];
    const lifecycles = singleSpaCss<{}>({
      cssUrls,
      shouldUnmount: false,
    });

    const props = createProps();

    await lifecycles.bootstrap(props);
    const mountPromise = lifecycles.mount(props);

    await macroTick();

    cssUrls.forEach((cssUrl) => {
      const url = typeof cssUrl === "string" ? cssUrl : cssUrl.href;
      findLinkEl(url).dispatchEvent(new CustomEvent("load"));
    });

    await mountPromise;

    expect(findLinkEl("/1.css")).toBeInTheDocument();
    expect(findLinkEl("/2.css")).toBeInTheDocument();
    expect(findLinkEl("/3.css")).toBeInTheDocument();

    await lifecycles.unmount(props);

    expect(findLinkEl("/1.css")).toBeInTheDocument();
    expect(findLinkEl("/2.css")).not.toBeInTheDocument();
    expect(findLinkEl("/3.css")).toBeInTheDocument();
  });

  it(`correctly handles timeouts`, async () => {
    const url = "https://example.com/main.css";

    const lifecycles = singleSpaCss<{}>({
      cssUrls: [url],
      timeout: 0,
    });

    const props = createProps();

    await lifecycles.bootstrap(props);

    const mountPromise = lifecycles.mount(props);

    const mountSucceeded = await mountPromise.then(
      () => true,
      () => false
    );

    expect(mountSucceeded).toBe(false);
  });
});

function findPreloadEl(url: string): HTMLElement {
  return document.querySelector(
    `link[rel="preload"][as="style"][href="${url}"]`
  );
}

function findAllPreloadEls(url: string): NodeList {
  return document.querySelectorAll(
    `link[rel="preload"][as="style"][href="${url}"]`
  );
}

function findLinkEl(url: string): HTMLElement {
  return document.querySelector(`link[rel="stylesheet"][href="${url}"]`);
}

function findAllLinkEls(url: string): NodeList {
  return document.querySelectorAll(`link[rel="stylesheet"][href="${url}"]`);
}

function macroTick(millis: number = 10) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}

function createProps(): singleSpa.AppProps {
  return {
    singleSpa,
    name: "test",
    mountParcel: singleSpa.mountRootParcel,
  };
}
