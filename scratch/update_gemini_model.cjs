const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nhueyaeyutfmadbgghfe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odWV5YWV5dXRmbWFkYmdnaGZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODgzNzA1NiwiZXhwIjoyMDg0NDEzMDU2fQ.sk_hZ5mkw6aKg6_y4h5bOq3hH7t4E9KKNX8bL0kxkMw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching AI agents from Supabase...');
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

  const outdatedModel = 'gemini-3.1-flash-lite-preview';
  const targetAgent = agents.find(a => a.model === outdatedModel);

  if (targetAgent) {
    console.log(`\nFound agent using outdated model: ${targetAgent.name} (ID: ${targetAgent.id})`);
    
    // We will update it to gemini-2.0-flash (stable, fast, multimodal)
    const newModel = 'gemini-2.0-flash';
    console.log(`Updating model to: ${newModel}...`);
    
    const { error: updateError } = await supabase
      .from('ai_agents')
      .update({ model: newModel })
      .eq('id', targetAgent.id);

    if (updateError) {
      console.error('Error updating model:', updateError);
    } else {
      console.log('Update successful! Model has been updated to gemini-2.0-flash.');
    }
  } else {
    // Check if there are other outdated models or if we should check general models
    console.log('\nNo agent explicitly using gemini-3.1-flash-lite-preview.');
    
    // Let's search if any agent has 'gemini-3.1' in the model name
    const anyGemini3 = agents.find(a => a.model && a.model.includes('gemini-3.1'));
    if (anyGemini3) {
      console.log(`Found agent using: ${anyGemini3.model} (ID: ${anyGemini3.id})`);
      const { error: updateError } = await supabase
        .from('ai_agents')
        .update({ model: 'gemini-2.0-flash' })
        .eq('id', anyGemini3.id);
      if (updateError) {
        console.error('Error updating:', updateError);
      } else {
        console.log('Update successful! Model updated to gemini-2.0-flash.');
      }
    }
  }
}

run();
