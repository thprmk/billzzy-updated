// test-race-condition.mjs
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/billing/online'; // <-- Updated URL
const NUM_REQUESTS = 5;

// IMPORTANT: Get a fresh session token from your browser's developer tools
const SESSION_COOKIE = 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..06lRM_0_i8aErgc0.QZCOngRh0F-hpuUF48f6qK9tGY8WXSclU7mUOjsofCMl-tnBAoSs30bYTAIVkAG7wHK71bR99RwxqlUsMR44zkK-2RXp9tyOR5xOenxozB1XJ7SAQ_aIAKJtnkZAaShDXG7ruH6EoUSuJpH64FMVpiPzz0usvtOLa2hyXmm_fWZGBXVixGxy4OM-vFrVLb3-hIEJ_3GfqMODuzIgHB3aRypsST0v27vcPhjEtwJMfmQaS0Rz5SPlCINelHqFCOdMgGhfzkhkeSS2QF_MCtMmvoeiho4KL5SHwqf3jMe15Oqc4U3IKYRxhTx_AWBaqWAlr7TttAfLS99F4N3U.gzvD2LGBiikyzSeYwCHW-g';

const billPayload = {
    customerId: 1, // Make sure customer with ID 1 exists
    items: [
        {
            productId: 1, // Make sure product with ID 1 exists and has >= 5 stock
            productVariantId: null,
            quantity: 1,
            price: 100,
            total: 100,
            productWeight: 0.5 // Add weight if your shipping logic needs it
        },
    ],
    billingMode: 'online',
    shippingMethodId: 1, // Make sure a shipping method with ID 1 exists
    taxAmount: 18,
    // ... any other required fields for an online bill
};

async function runTest() {
    console.log(`Sending ${NUM_REQUESTS} concurrent requests to ${API_URL}...`);

    const promises = [];
    for (let i = 0; i < NUM_REQUESTS; i++) {
        const promise = fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `next-auth.session-token=${SESSION_COOKIE}`
            },
            body: JSON.stringify(billPayload),
        }).then(async (res) => {
            // Handle potential non-JSON responses gracefully
            if (res.headers.get('content-type')?.includes('application/json')) {
                const data = await res.json();
                console.log(`Request ${i + 1}: Status ${res.status}, Bill No: ${data.bill_details?.bill_no}, Message: ${data.message || data.error}`);
            } else {
                const text = await res.text();
                console.log(`Request ${i + 1}: Status ${res.status}, Response: ${text}`);
            }
            return res.status;
        });
        promises.push(promise);
    }

    const results = await Promise.all(promises);
    const successCount = results.filter(status => status === 200).length; // Online route returns 200
    console.log(`\nTest Complete. ${successCount} out of ${NUM_REQUESTS} requests succeeded.`);

    if (successCount === NUM_REQUESTS) {
        console.log("✅ PASSED: The race condition appears to be fixed!");
    } else {
        console.log("❌ FAILED: Some requests failed. Check the logs.");
    }
}

runTest();