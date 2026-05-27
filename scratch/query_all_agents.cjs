const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nhueyaeyutfmadbgghfe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odWV5YWV5dXRmbWFkYmdnaGZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODgzNzA1NiwiZXhwIjoyMDg0NDEzMDU2fQ.sk_hZ5mkw6aKg6_y4h5bOq3hH7t4E9KKNX8bL0kxkMw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: agents, error } = await supabase
    .from('ai_agents')
    .select('*');

  if (error) {
    console.error('Error:', error);
    return;
  }

  agents.forEach(agent => {
    console.log(`AGENT ID: ${agent.id}`);
    console.log(`- Provider: ${agent.provider}`);
    console.log(`- Model: ${agent.model}`);
    console.log(`- Is Active: ${agent.is_active}`);
    console.log(`- API Key Preview: ${agent.api_key ? agent.api_key.substring(0, 15) + '...' : 'none'}`);
    console.log(`- API Key Length: ${agent.api_key ? agent.api_key.length : 0}`);
    console.log('-----------------------------------');
  });
}

run();
