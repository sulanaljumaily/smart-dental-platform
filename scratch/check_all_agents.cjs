const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nhueyaeyutfmadbgghfe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odWV5YWV5dXRmbWFkYmdnaGZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODgzNzA1NiwiZXhwIjoyMDg0NDEzMDU2fQ.sk_hZ5mkw6aKg6_y4h5bOq3hH7t4E9KKNX8bL0kxkMw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching ALL agents from Supabase...');
  const { data: agents, error } = await supabase
    .from('ai_agents')
    .select('*');

  if (error) {
    console.error('Error fetching agents:', error);
    return;
  }

  console.log('Current agents:');
  agents.forEach(agent => {
    console.log(`- ID: ${agent.id}, Name: ${agent.name}, Provider: ${agent.provider}, Model: ${agent.model}`);
  });
}

run();
