const { execSync } = require('child_process');
const fs = require('fs');

try {
    const out1 = execSync('node scripts/inspect_schema.cjs suppliers');
    fs.writeFileSync('suppliers_schema.txt', out1.toString());
    console.log("Written suppliers_schema.txt successfully.");
} catch (e) {
    console.error("Failed executing tests:", e);
}
