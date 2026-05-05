const { execSync } = require('child_process');
const fs = require('fs');

try {
    const out1 = execSync('node scripts/inspect_schema.cjs dental_laboratories');
    const out2 = execSync('node scripts/inspect_schema.cjs dental_lab_orders');
    fs.writeFileSync('schema_output.txt', out1.toString() + '\n\n' + out2.toString());
    console.log("Written schema_output.txt successfully.");
} catch (e) {
    console.error("Failed executing tests:", e);
}
