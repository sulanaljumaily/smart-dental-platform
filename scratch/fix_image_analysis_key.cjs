const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nhueyaeyutfmadbgghfe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odWV5YWV5dXRmbWFkYmdnaGZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODgzNzA1NiwiZXhwIjoyMDg0NDEzMDU2fQ.sk_hZ5mkw6aKg6_y4h5bOq3hH7t4E9KKNX8bL0kxkMw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching doctor_assistant config to get OpenAI API key...');
  const { data: docAgent, error: docError } = await supabase
    .from('ai_agents')
    .select('api_key')
    .eq('id', 'doctor_assistant')
    .single();

  if (docError || !docAgent || !docAgent.api_key) {
    console.error('Failed to get OpenAI API key:', docError);
    return;
  }

  const openAiKey = docAgent.api_key;
  console.log(`Found OpenAI key of length ${openAiKey.length}. Updating image_analysis config...`);

  const { error: updateError } = await supabase
    .from('ai_agents')
    .update({
      provider: 'openai',
      model: 'gpt-4o',
      api_key: openAiKey,
      is_active: true
    })
    .eq('id', 'image_analysis');

  if (updateError) {
    console.error('Failed to update image_analysis config:', updateError);
  } else {
    console.log('SUCCESS! image_analysis updated with OpenAI provider, gpt-4o model, and the correct OpenAI API key.');
  }
}

run();
