const BASE_URL = "http://localhost:3000";

async function test_e2e() {
    console.log("--- Starting E2E API Verification ---");

    try {
        // 1. Login as expert1
        console.log("[AUTH] Logging in as expert1...");
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: "expert1",
                password: "pass123",
                group: "TEAM404"
            })
        });

        if (!loginRes.ok) throw new Error(`Login failed with status ${loginRes.status}`);
        const loginData = await loginRes.json();
        const token = loginData.accessToken; // FIXED: auth.service returns accessToken
        if (!token) throw new Error("No accessToken returned from login");
        console.log("✓ Login successful. Role:", loginData.user.role);

        const authHeader = { Authorization: `Bearer ${token}` };

        // 2. Check assignments
        console.log("[EXPERT] Fetching assignments...");
        const assignRes = await fetch(`${BASE_URL}/expert/assignments`, { headers: authHeader });
        if (!assignRes.ok) {
            const errText = await assignRes.text();
            throw new Error(`Fetch assignments failed with status ${assignRes.status}: ${errText}`);
        }
        const assignments = await assignRes.json();
        console.log(`✓ Fetched ${assignments.length} assignments.`);

        // 3. Login as admin2
        console.log("[AUTH] Logging in as admin2...");
        const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: "admin2",
                password: "pass123",
                group: "TEAM404"
            })
        });
        if (!adminLoginRes.ok) throw new Error(`Admin login failed with status ${adminLoginRes.status}`);
        const adminLoginData = await adminLoginRes.json();
        const adminToken = adminLoginData.accessToken;
        console.log("✓ Admin Login successful.");

        const adminHeader = { Authorization: `Bearer ${adminToken}` };

        // 4. Admin: List users
        console.log("[ADMIN] Fetching user list...");
        const usersRes = await fetch(`${BASE_URL}/admin/users`, { headers: adminHeader });
        if (!usersRes.ok) throw new Error(`Fetch users failed with status ${usersRes.status}`);
        const users = await usersRes.json();
        console.log(`✓ Fetched ${users.length} users.`);

        // 5. Admin: List evaluations
        console.log("[ADMIN] Fetching evaluations...");
        const evalsRes = await fetch(`${BASE_URL}/admin/evaluations`, { headers: adminHeader });
        if (!evalsRes.ok) throw new Error(`Fetch evaluations failed with status ${evalsRes.status}`);
        const evaluations = await evalsRes.json();
        console.log(`✓ Fetched ${evaluations.length} evaluations.`);

        console.log("\n--- E2E API Verification PASSED ---");
    } catch (err) {
        console.error("\n--- E2E API Verification FAILED ---");
        console.error(err.message);
        process.exit(1);
    }
}

test_e2e();
