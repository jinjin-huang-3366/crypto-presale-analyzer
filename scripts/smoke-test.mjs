const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";

function joinUrl(path) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function checkJson(path, expectedStatuses) {
  const url = joinUrl(path);
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!expectedStatuses.includes(response.status)) {
    const body = await response.text();
    throw new Error(
      `${path} returned ${response.status}. Expected ${expectedStatuses.join(", ")}. Body: ${body.slice(0, 300)}`,
    );
  }

  let payload = null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    payload = await response.json();
  }

  return {
    path,
    status: response.status,
    payload,
  };
}

function requireHealthConnected(check) {
  if (check.payload?.status !== "ok" || check.payload?.database !== "connected") {
    throw new Error(
      `${check.path} returned unhealthy payload: ${JSON.stringify(check.payload)}`,
    );
  }
}

async function checkHtml(path, expectedText) {
  const url = joinUrl(path);
  const response = await fetch(url);

  if (response.status !== 200) {
    throw new Error(`${path} returned ${response.status}, expected 200.`);
  }

  const html = await response.text();
  if (!html.includes(expectedText)) {
    throw new Error(`${path} did not contain expected text: ${expectedText}`);
  }

  return {
    path,
    status: response.status,
  };
}

async function run() {
  const checks = [];

  const healthCheck = await checkJson("/api/health", [200]);
  requireHealthConnected(healthCheck);
  checks.push(healthCheck);
  checks.push(await checkJson("/api/projects", [200]));

  const projectsPayload = checks[checks.length - 1].payload;
  const firstProjectSlug = projectsPayload?.projects?.[0]?.slug;

  if (firstProjectSlug) {
    checks.push(await checkJson(`/api/projects/${firstProjectSlug}`, [200]));
    checks.push(await checkJson(`/api/projects/${firstProjectSlug}/score`, [200, 404]));
    checks.push(await checkJson(`/api/projects/${firstProjectSlug}/redflags`, [200]));
  }

  checks.push(await checkHtml("/", "Crypto Presale Analyzer"));
  checks.push(await checkHtml("/projects", "Projects"));
  checks.push(await checkHtml("/compare", "Compare Projects"));
  checks.push(await checkHtml("/admin", "Admin"));

  console.log(`Smoke test passed for ${baseUrl}`);
  for (const check of checks) {
    console.log(`${check.path} -> ${check.status}`);
  }
}

run().catch((error) => {
  console.error(`Smoke test failed for ${baseUrl}`);
  console.error(error.message);
  process.exit(1);
});
