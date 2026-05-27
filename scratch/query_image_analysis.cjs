const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nhueyaeyutfmadbgghfe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odWV5YWV5dXRmbWFkYmdnaGZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODgzNzA1NiwiZXhwIjoyMDg0NDEzMDU2fQ.sk_hZ5mkw6aKg6_y4h5bOq3hH7t4E9KKNX8bL0kxkMw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: agent, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', 'image_analysis')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('AGENT DETAILS:', JSON.stringify({
    id: agent.id,
    name: agent.name,
    provider: agent.provider,
    model: agent.model,
    is_active: agent.is_active,
    api_key_length: agent.api_key ? agent.api_key.length : 0,
    api_key_preview: agent.api_key ? agent.api_key.substring(0, 10) + '...' : 'none',
    temperature: agent.temperature
  }, null, 2));
}

run();
