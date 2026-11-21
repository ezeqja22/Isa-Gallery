const fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, ".."),
  out = path.join(root, "reports/performance/reliability");
fs.mkdirSync(out, { recursive: true });
process.env.TEMP = process.env.TMP = path.join(root, "reports/performance/tmp");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/nvm4w/nodejs/node_modules/@playwright/cli/node_modules/playwright",
);
const url = process.env.AUDIT_URL || "http://localhost:3007";
const results = [];
async function settle(page) {
  await page.waitForFunction(
    () =>
      !document.querySelector(".chapter-next")?.disabled &&
      !document.querySelector(".visit-loading"),
    {},
    { timeout: 60000 },
  );
  await page.waitForTimeout(250);
}
async function metrics(page) {
  return page.evaluate(() => {
    function find(f) {
      if (!f) return;
      const o = f.stateNode,
        s = o?.object?.__r3f?.root || o?.__r3f?.root;
      return s || find(f.child) || find(f.sibling);
    }
    for (const r of window.__roots) {
      const store = find(r.current);
      if (store) {
        window.__store = store;
        const s = store.getState();
        return {
          render: { ...s.gl.info.render },
          memory: { ...s.gl.info.memory },
          programs: s.gl.info.programs.length,
          camera: s.camera.position.toArray(),
        };
      }
    }
  });
}
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    for (const mobile of [false, true]) {
      const page = await browser.newPage({
        viewport: mobile
          ? { width: 390, height: 844 }
          : { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        isMobile: mobile,
        hasTouch: mobile,
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error" || m.text().includes("GL_INVALID"))
          errors.push(m.text());
      });
      await page.addInitScript(() => {
        window.__roots = [];
        const renderers = new Map();
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
          supportsFiber: true,
          renderers,
          inject: (r) => {
            const id = renderers.size + 1;
            renderers.set(id, r);
            return id;
          },
          onCommitFiberRoot: (_, r) => {
            if (!window.__roots.includes(r)) window.__roots.push(r);
          },
          onCommitFiberUnmount: () => {},
          onPostCommitFiberRoot: () => {},
          onScheduleFiberRoot: () => {},
        };
      });
      const label = mobile ? "mobile-low" : "desktop-high";
      await page.goto(url + "/?quality=" + (mobile ? "low" : "high"));
      await page
        .locator(".arrival-card--ready")
        .waitFor({ state: "attached", timeout: 90000 });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(out, label + "-entrance.png") });
      await page
        .getByRole("button", { name: "View the gallery", exact: false })
        .click();
      await settle(page);
      const cycles = [];
      for (let i = 0; i < 3; i++) {
        await page
          .getByRole("button", { name: "Visit the atelier", exact: false })
          .click();
        await settle(page);
        const upstairs = await metrics(page);
        if (upstairs.render.triangles < 100000)
          throw new Error("Atelier geometry missing");
        if (i === 0)
          await page.screenshot({
            path: path.join(out, label + "-atelier.png"),
          });
        await page
          .getByRole("button", { name: "Return to the gallery", exact: false })
          .click();
        await settle(page);
        cycles.push({ upstairs, downstairs: await metrics(page) });
      }
      await page.getByRole("button", { name: "Explore", exact: false }).click();
      await page.getByRole("button", { name: "Ocean", exact: false }).click();
      await page.getByRole("dialog", { name: "Ocean", exact: true }).waitFor();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(out, label + "-painting.png") });
      await page
        .getByRole("button", { name: "Close artwork inspection" })
        .click();
      await page.mouse.move(200, 400);
      await page.mouse.down();
      await page.mouse.move(260, 420, { steps: 8 });
      await page.mouse.up();
      const recovery = await page.evaluate(() => {
        const s = window.__store.getState(),
          ext = s.gl.getContext().getExtension("WEBGL_lose_context");
        if (!ext) return false;
        window.__restore = () => ext.restoreContext();
        ext.loseContext();
        return true;
      });
      if (recovery) {
        await page
          .getByText("Unable to load the 3D experience", { exact: true })
          .first()
          .waitFor();
        await page.evaluate(() => window.__restore());
        await page
          .getByText("Unable to load the 3D experience", { exact: true })
          .first()
          .waitFor({ state: "hidden", timeout: 20000 });
      }
      results.push({ label, cycles, contextRecovery: recovery, errors });
      console.log(label, JSON.stringify(results.at(-1)));
      await page.close();
    }
    const failure = await browser.newPage();
    await failure.route("**/optimized/hallway-*.gltf", (r) =>
      r.fulfill({ status: 503, body: "test failure" }),
    );
    await failure.goto(url + "/?quality=low");
    await failure
      .getByText("A room could not be loaded. Please retry your visit.", {
        exact: true,
      })
      .waitFor({ timeout: 30000 });
    await failure
      .getByRole("button", { name: "Retry in Low quality", exact: true })
      .waitFor();
    results.push({ assetFailureRecoveryUI: true });
    await failure.close();
    fs.writeFileSync(
      path.join(out, "results.json"),
      JSON.stringify(results, null, 2),
    );
    if (results.some((r) => r.errors?.length))
      throw new Error("Browser errors recorded");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  fs.writeFileSync(path.join(out, "failure.txt"), e.stack);
  console.error(e);
  process.exitCode = 1;
});
