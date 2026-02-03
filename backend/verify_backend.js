const { spawn } = require('child_process');
const http = require('http');
const jwt = require('jsonwebtoken');

// Colors for console output
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m"
};

function log(message, type = 'info') {
    const color = type === 'success' ? colors.green :
        type === 'error' ? colors.red :
            type === 'warn' ? colors.yellow : colors.blue;
    console.log(`${color}[TEST] ${message}${colors.reset}`);
}

// Generate a test token
const TEST_SECRET = process.env.JWT_SECRET || "default_secret_key";
const testToken = jwt.sign({ id: "test-user-id", role: "EXPERT" }, TEST_SECRET, { expiresIn: '1h' });

async function runTests() {
    log("Starting backend server for testing...");

    // Start the server process
    const serverProcess = spawn('node', ['src/server.js'], {
        cwd: '.',
        stdio: 'pipe',
        env: { ...process.env, JWT_SECRET: TEST_SECRET }
    });

    let serverReady = false;

    serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        // console.log(`[SERVER] ${output.trim()}`);
        if (output.includes('Server running on port 3000')) {
            serverReady = true;
            log("Server started successfully!", 'success');
            performApiTests();
        }
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`[SERVER ERROR] ${data}`);
    });

    // Wait for server to start
    setTimeout(() => {
        if (!serverReady) {
            log("Server failed to start in time. Aborting.", 'error');
            serverProcess.kill();
            process.exit(1);
        }
    }, 15000); // Increased timeout for DB connection attempts

    async function performApiTests() {
        try {
            log("Running API tests...", 'warn');

            // Test 0: Unauthorized Access (Should Fail)
            log("Test 0: Unauthorized Access");
            try {
                await makeRequest('/expert/save', 'POST', {}, null); // No token
                log("✗ Failed to reject unauthorized request", 'error');
            } catch (e) {
                if (e.message.includes("401")) {
                    log("✓ Correctly rejected unauthorized request", 'success');
                } else {
                    log(`✗ Unexpected error: ${e.message}`, 'error');
                }
            }

            // Test 1: Save Draft
            log("Test 1: Save Draft Evaluation");
            const draftData = {
                assignmentId: "test-assignment-123",
                expertId: "expert-001",
                modelVersionId: "model-v1",
                scores: {
                    legalCorrectness: { value: 4, notes: "Good" }
                },
                generalNotes: "Initial draft"
            };

            await makeRequest('/expert/save', 'POST', draftData, testToken);
            log("✓ Draft saved successfully", 'success');

            // Test 2: Submit Evaluation (Fail - Missing Fields)
            log("Test 2: Submit Invalid Evaluation (Should Fail)");
            const invalidData = {
                assignmentId: "test-assignment-123",
                scores: {
                    legalCorrectness: { value: 5 }
                    // Missing other required fields
                }
            };

            try {
                await makeRequest('/expert/submit', 'POST', invalidData, testToken);
                log("✗ Failed to catch invalid submission", 'error');
            } catch (e) {
                log("✓ Correctly rejected invalid submission", 'success');
            }

            // Test 3: Submit Evaluation (Success)
            log("Test 3: Submit Valid Evaluation");
            const validData = {
                assignmentId: "test-assignment-123",
                expertId: "expert-001",
                modelVersionId: "model-v1",
                scores: {
                    legalCorrectness: { value: 5, notes: "Excellent" },
                    jurisdictionalPrecision: { value: 5 },
                    linguisticAccessibility: { value: 4 },
                    temporalValidity: { value: 5 }
                },
                distressDetection: { applicable: false, result: "N/A" }
            };

            await makeRequest('/expert/submit', 'POST', validData, testToken);
            log("✓ Evaluation submitted successfully", 'success');

            log("All tests passed!", 'success');

        } catch (error) {
            log(`Test failed: ${error.message}`, 'error');
        } finally {
            log("Stopping server...");
            serverProcess.kill();
            process.exit(0);
        }
    }
}

function makeRequest(path, method, body, token) {
    return new Promise((resolve, reject) => {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: headers
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

runTests();
