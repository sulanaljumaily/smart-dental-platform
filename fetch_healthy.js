const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://nhueyaeyutfmadbgghfe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odWV5YWV5dXRmbWFkYmdnaGZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MzcwNTYsImV4cCI6MjA4NDQxMzA1Nn0.56MIbpOtVu9b_fwEyo-hvlxGxA_E5c-nU7q1MSfTg-g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Fetching healthy templates...');
  const { data, error } = await supabase
    .from('odontogram_templates')
    .select('tooth_number, state, svg_content')
    .eq('state', 'healthy');

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log(`Fetched ${data.length} templates.`);
  
  // Sort them by tooth number
  data.sort((a, b) => a.tooth_number - b.tooth_number);

  const output = {};
  data.forEach(row => {
    output[row.tooth_number] = row.svg_content;
  });

  fs.writeFileSync(
    path.join(__dirname, 'healthy_svgs.json'),
    JSON.stringify(output, null, 2),
    'utf8'
  );
  console.log('Saved to healthy_svgs.json');
}

run();
