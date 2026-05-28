const fs = require('fs');
const path = require('path');

const rawData = JSON.parse(fs.readFileSync(path.join(__dirname, 'healthy_svgs.json'), 'utf8'));

const cleanData = {};
for (const [key, value] of Object.entries(rawData)) {
  let svg = value;
  
  // Remove XML declaration
  svg = svg.replace(/<\?xml[^>]*\?>/gi, '');
  
  // Remove DOCTYPE
  svg = svg.replace(/<!DOCTYPE[^>]*>/gi, '');
  
  // Remove comment tags
  svg = svg.replace(/<!--[\s\S]*?-->/g, '');
  
  // Collapse whitespace/newlines
  svg = svg.replace(/\s+/g, ' ');
  
  // Trim
  svg = svg.trim();
  
  cleanData[key] = svg;
}

// Generate TS content
let tsContent = `// Automatically generated healthy teeth SVG templates.
// Storing SVGs locally drastically minimizes database load times and makes odontogram render instantly.

export const HEALTHY_TEETH_SVGS: Record<number, string> = {\n`;

for (const [toothNum, svg] of Object.entries(cleanData)) {
  tsContent += `  ${toothNum}: ${JSON.stringify(svg)},\n`;
}

tsContent += `};\n`;

const targetDir = path.join(__dirname, 'src', 'constants');
fs.mkdirSync(targetDir, { recursive: true });

fs.writeFileSync(
  path.join(targetDir, 'healthyTeeth.ts'),
  tsContent,
  'utf8'
);

console.log('Successfully generated src/constants/healthyTeeth.ts');
