import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const BASE_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface TestResult {
  endpoint: string;
  status: number | string;
  passed: boolean;
  notes?: string;
}

async function runTests() {
  const results: TestResult[] = [];
  let authTokenCookie = "";

  console.log("=== Starting Modern Mobile Center Health Check ===\n");

  // Helper to log and store results
  const check = async (
    name: string,
    path: string,
    options: RequestInit = {},
    expectedStatus?: number
  ) => {
    try {
      const url = `${BASE_URL}${path}`;
      const response = await fetch(url, options);
      const passed = expectedStatus
        ? response.status === expectedStatus
        : response.status >= 200 && response.status < 400;
      let notes = "";

      if (path === "/api/auth/login" && passed) {
        const setCookie = response.headers.get("set-cookie");
        if (setCookie) {
          const match = setCookie.match(/mmc_token=([^;]+)/);
          if (match) {
            authTokenCookie = `mmc_token=${match[1]}`;
            notes = "Successfully retrieved auth token cookie";
          }
        }
      }

      results.push({
        endpoint: `${options.method || "GET"} ${path}`,
        status: response.status,
        passed,
        notes: notes || `Content-Type: ${response.headers.get("content-type")}`,
      });

      console.log(
        `[${passed ? "✔" : "✘"}] ${options.method || "GET"} ${path} - Status: ${response.status} ${notes ? `(${notes})` : ""}`
      );
    } catch (err: any) {
      results.push({
        endpoint: `${options.method || "GET"} ${path}`,
        status: "FAILED",
        passed: false,
        notes: err.message,
      });
      console.log(`[✘] ${options.method || "GET"} ${path} - FAILED: ${err.message}`);
    }
  };

  // 1. Test Public Pages
  console.log("--- Testing Public Pages ---");
  const publicPages = [
    "/",
    "/shop",
    "/upcoming",
    "/second-hand",
    "/contact",
    "/sell-or-exchange",
    "/login",
    "/signup",
    "/cart",
    "/wishlist",
    "/compare",
  ];
  for (const page of publicPages) {
    await check("Public Page", page);
  }

  // 2. Test Public APIs
  console.log("\n--- Testing Public APIs ---");
  await check("Products API", "/api/products");
  await check("Categories API", "/api/categories");
  await check("Brands API", "/api/brands");

  // 3. Test Authentication Flow
  console.log("\n--- Testing Authentication & Protected APIs ---");
  
  // Unauthenticated /api/auth/me should return 401 unauthorized
  await check("Auth Me (Unauthenticated)", "/api/auth/me", {}, 401);

  const ownerEmail = process.env.OWNER_EMAIL;
  const ownerPassword = process.env.OWNER_PASSWORD;

  if (!ownerEmail || !ownerPassword) {
    console.log("[!] Skipping Owner Login Test - OWNER_EMAIL or OWNER_PASSWORD not found in environment");
  } else {
    console.log(`Attempting login for owner: ${ownerEmail}`);
    await check("Login API", "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ownerEmail, password: ownerPassword }),
    });

    if (authTokenCookie) {
      // Test Auth Me with cookie
      await check("Auth Me (Authenticated)", "/api/auth/me", {
        headers: { Cookie: authTokenCookie },
      });

      // Test Dashboard Stats (Admin only)
      await check("Dashboard Stats API (Admin)", "/api/dashboard/stats", {
        headers: { Cookie: authTokenCookie },
      });

      // Test Users API (Admin only)
      await check("Users API (Admin)", "/api/users", {
        headers: { Cookie: authTokenCookie },
      });
    } else {
      console.log("[✘] Cannot test protected APIs - failed to obtain auth cookie");
    }
  }

  console.log("\n=== Health Check Summary ===");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`Total Tests Run: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log("\nFailed Tests Details:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`- ${r.endpoint}: Status ${r.status} (${r.notes})`);
      });
    process.exit(1);
  } else {
    console.log("\n✔ All health checks passed successfully!");
    process.exit(0);
  }
}

runTests();
