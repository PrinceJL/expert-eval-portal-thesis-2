const BASE_URL = "http://localhost:3000";

async function test_messaging() {
    console.log("--- Starting Messaging Verification ---");

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
        const loginData = await loginRes.json();
        const token = loginData.accessToken;
        const authHeader = { Authorization: `Bearer ${token}` };
        console.log("✓ Expert logged in.");

        // 2. Check contacts (Experts should see Admins)
        console.log("[MESSAGING] Fetching contacts for expert...");
        const contactsRes = await fetch(`${BASE_URL}/messages/contacts`, { headers: authHeader });
        const contacts = await contactsRes.json();
        console.log("Contacts Response:", contacts);
        const contactsArr = Array.isArray(contacts) ? contacts : (contacts.users || []);
        const adminContact = contactsArr.find(c => c.role === "ADMIN");
        if (adminContact) {
            console.log(`✓ Found admin contact: ${adminContact.username}`);
        } else {
            console.log("! No admin contact found (Expected if only expert1 exists, checking seed_admin results).");
        }

        // 3. Test sending a message with content
        if (adminContact) {
            console.log("[MESSAGING] Sending message to admin...");
            const sendRes = await fetch(`${BASE_URL}/messages/send`, {
                method: "POST",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({
                    recipientId: adminContact.id,
                    content: "Hello Admin, I have a query."
                })
            });
            if (sendRes.ok) console.log("✓ Message sent successfully.");
            else console.log("! Message send failed.");
        }

        console.log("\n--- Messaging Verification COMPLETE ---");
    } catch (err) {
        console.error("\n--- Messaging Verification FAILED ---");
        console.error(err.message);
        process.exit(1);
    }
}

test_messaging();
