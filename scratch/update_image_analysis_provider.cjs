const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nhueyaeyutfmadbgghfe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odWV5YWV5dXRmbWFkYmdnaGZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODgzNzA1NiwiZXhwIjoyMDg0NDEzMDU2fQ.sk_hZ5mkw6aKg6_y4h5bOq3hH7t4E9KKNX8bL0kxkMw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching AI agent config for image_analysis...');
  const { data: agent, error } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', 'image_analysis')
    .single();

  if (error) {
    console.error('Error fetching agent:', error);
    return;
  }

  console.log(`Current config: Provider=${agent.provider}, Model=${agent.model}`);

  // Update image_analysis to use openai provider and gpt-4o model
  console.log('Updating provider to openai and model to gpt-4o...');
  const { error: updateError } = await supabase
    .from('ai_agents')
    .update({
      provider: 'openai',
      model: 'gpt-4o'
    })
    .eq('id', 'image_analysis');

  if (updateError) {
    console.error('Error updating config:', updateError);
  } else {
    console.log('Update successful! image_analysis is now configured to use OpenAI (gpt-4o).');
  }
}

run();
