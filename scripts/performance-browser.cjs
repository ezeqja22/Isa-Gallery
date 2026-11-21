// Uses an existing Playwright installation; no global installs or external outputs.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const output = path.join(
  root,
  "reports/performance",
  process.env.AUDIT_LABEL || "baseline",
);
fs.mkdirSync(output, { recursive: true });
process.env.TEMP = process.env.TMP = path.join(root, "reports/performance/tmp");
const playwright = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/nvm4w/nodejs/node_modules/@playwright/cli/node_modules/playwright",
);
(async () => {
  const browser = await (process.env.AUDIT_BROWSER === "webkit"
    ? playwright.webkit.launch({ headless: true })
    : playwright.chromium.launch({
        channel: "msedge",
        headless: true,
        args: ["--enable-webgl", "--ignore-gpu-blocklist"],
      }));
  const page = await browser.newPage({
    viewport: process.env.AUDIT_MOBILE
      ? { width: 390, height: 844 }
      : { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: !!process.env.AUDIT_MOBILE,
    hasTouch: !!process.env.AUDIT_MOBILE,
  });
  if (process.env.AUDIT_THROTTLE) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 80,
      downloadThroughput: 1024 * 1024,
      uploadThroughput: 256 * 1024,
    });
  }
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning")
      consoleErrors.push(m.text());
  });
  await page.addInitScript(() => {
    window.__fiberRoots = [];
    const renderers = new Map();
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true,
      renderers,
      inject: (r) => {
        const id = renderers.size + 1;
        renderers.set(id, r);
        return id;
      },
      onScheduleFiberRoot: () => {},
      onCommitFiberRoot: (_id, root) => {
        if (!window.__fiberRoots.includes(root)) window.__fiberRoots.push(root);
      },
      onCommitFiberUnmount: () => {},
      onPostCommitFiberRoot: () => {},
    };
    window.__audit = { longTasks: [], draws: 0, triangles: 0 };
    new PerformanceObserver((l) =>
      window.__audit.longTasks.push(
        ...l
          .getEntries()
          .map((e) => ({ start: e.startTime, duration: e.duration })),
      ),
    ).observe({ type: "longtask", buffered: true });
  });
  const start = Date.now();
  await page.goto(process.env.AUDIT_URL || "http://localhost:3000", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  try {
    await page
      .locator(".arrival-card--ready")
      .waitFor({ state: "attached", timeout: 90000 });
  } catch (e) {
    errors.push(e.message);
  }
  const readyMs = Date.now() - start;
  const initialResources = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((r) => ({
        url: r.name,
        bytes: r.transferSize,
        duration: r.duration,
      })),
  );
  console.log("Entrance ready", readyMs);
  await page.waitForTimeout(5500);
  await page.evaluate(() => {
    function find(f) {
      if (!f) return;
      const o = f.stateNode;
      const store = o?.object?.__r3f?.root || o?.__r3f?.root;
      if (store) return store;
      return find(f.child) || find(f.sibling);
    }
    for (const r of window.__fiberRoots) {
      const store = find(r.current);
      if (store) {
        window.__sceneStore = store;
        break;
      }
    }
    window.__audit.views = {};
    window.__measureView = async (name) => {
      const s = window.__sceneStore?.getState();
      if(s){s.invalidate();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
      if (s)
        window.__audit.views[name] = JSON.parse(
          JSON.stringify({
            render: s.gl.info.render,
            memory: s.gl.info.memory,
            programs: s.gl.info.programs.length,
            camera: s.camera.position.toArray(),
          }),
        );
    };
  });
  await page.evaluate(() => window.__measureView("hallway"));
  await page.screenshot({ path: path.join(output, "hallway.png") });
  fs.writeFileSync(
    path.join(output, "page.txt"),
    await page.locator("body").innerText(),
  );
  if (await page.locator(".arrival-card--ready").count()) {
    await page
      .getByRole("button", { name: "View the gallery", exact: false })
      .click();
    console.log("Entered gallery");
    await page
      .getByRole("button", { name: "Visit the atelier", exact: false })
      .waitFor();
    await page.waitForFunction(
      () => !document.querySelector(".chapter-next")?.disabled,
    );
    await page.screenshot({ path: path.join(output, "room1.png") });
    await page.evaluate(() => window.__measureView("room1"));
    await page
      .getByRole("button", { name: "Visit the atelier", exact: false })
      .click();
    console.log("Requested atelier");
    await page.waitForTimeout(2300);
    await page.screenshot({
      path: path.join(output, "stairs-timing-reference.png"),
    });
    await page.waitForFunction(
      () => !document.querySelector(".chapter-next")?.disabled,
    );
    await page.screenshot({ path: path.join(output, "room2.png") });
    await page.evaluate(() => window.__measureView("room2"));
    if (await page.evaluate(() => !!window.__sceneStore)) {
      for (const [name, position, target] of [
        ["stairs", [11.2, -0.7, -4], [14.5, 0.3, -4]],
        ["arch", [0, -0.5, 15], [0, 1, 10]],
        ["art-closeup", [0, -0.2, -6], [0, -0.2, -9.7]],
      ]) {
        await page.evaluate(
          ({ position, target }) => {
            const s = window.__sceneStore.getState();
            s.camera.position.set(...position);
            s.camera.lookAt(...target);
            s.invalidate();
          },
          { position, target },
        );
        await page.waitForTimeout(200);
        await page.screenshot({ path: path.join(output, name + ".png") });
      }
    }
  }
  const data = await page.evaluate(() => {
    const s = window.__sceneStore?.getState();
    return {
      renderer: s
        ? {
            render: s.gl.info.render,
            memory: s.gl.info.memory,
            programs: s.gl.info.programs.length,
            dpr: s.gl.getPixelRatio(),
            gpu: s.gl.getContext().getParameter(s.gl.getContext().RENDERER),
          }
        : null,
      resources: performance
        .getEntriesByType("resource")
        .map((r) => ({
          url: r.name,
          bytes: r.transferSize,
          decoded: r.decodedBodySize,
          duration: r.duration,
        })),
      ...window.__audit,
    };
  });
  fs.writeFileSync(
    path.join(output, "browser.json"),
    JSON.stringify(
      { readyMs, initialResources, errors, consoleErrors, ...data },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ readyMs, errors, output }));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
