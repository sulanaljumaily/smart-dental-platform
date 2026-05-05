const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Define your app's base URL (Update this in production)
const BASE_URL = process.env.VITE_APP_URL || 'https://dental-platform.com';

async function generateSitemap() {
  console.log("Generating sitemap.xml...");

  try {
    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, created_at, date')
      .eq('is_published', true);

    if (error) {
      console.error("Error fetching articles for sitemap", error);
      return;
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Add Home page
    xml += `  <url>\n    <loc>${BASE_URL}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

    // Add generic static pages
    const staticPages = ['/services', '/community', '/store', '/jobs', '/booking'];
    for (const page of staticPages) {
      xml += `  <url>\n    <loc>${BASE_URL}${page}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    }

    // Add Dynamic Articles
    for (const article of articles) {
      const lastMod = article.created_at || article.date || new Date().toISOString();
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/article/${article.id}</loc>\n`;
      xml += `    <lastmod>${lastMod.split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.9</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    const publicPath = path.join(__dirname, '../public', 'sitemap.xml');
    fs.writeFileSync(publicPath, xml);
    console.log(`Successfully generated sitemap.xml at ${publicPath} with ${articles.length} articles.`);
  } catch (err) {
    console.error("Failed to generate sitemap", err);
  }
}

generateSitemap();
