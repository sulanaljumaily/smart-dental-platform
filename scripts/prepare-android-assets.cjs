const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const resDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');

if (!fs.existsSync(resDir)) {
  console.log('[prepare-android-assets] Android res directory not found at:', resDir);
  process.exit(0);
}

console.log('[prepare-android-assets] Configuring Android icons and native splash in:', resDir);

// 1. Mipmap Icon mappings
const iconMappings = [
  { folder: 'mipmap-mdpi', icon: 'icon-48x48.png' },
  { folder: 'mipmap-hdpi', icon: 'icon-72x72.png' },
  { folder: 'mipmap-xhdpi', icon: 'icon-96x96.png' },
  { folder: 'mipmap-xxhdpi', icon: 'icon-144x144.png' },
  { folder: 'mipmap-xxxhdpi', icon: 'icon-192x192.png' },
];

for (const { folder, icon } of iconMappings) {
  const targetFolder = path.join(resDir, folder);
  const srcIcon = path.join(projectRoot, 'public', 'icons', icon);

  if (fs.existsSync(srcIcon)) {
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }
    fs.copyFileSync(srcIcon, path.join(targetFolder, 'ic_launcher.png'));
    fs.copyFileSync(srcIcon, path.join(targetFolder, 'ic_launcher_round.png'));
    fs.copyFileSync(srcIcon, path.join(targetFolder, 'ic_launcher_foreground.png'));
    console.log(`[prepare-android-assets] Updated icons for ${folder}`);
  } else {
    console.warn(`[prepare-android-assets] Source icon not found: ${srcIcon}`);
  }
}

// 2. Splash screen mappings
const splashSrc = path.join(projectRoot, 'public', 'splash.png');
if (fs.existsSync(splashSrc)) {
  // Check all drawable directories in res
  const entries = fs.readdirSync(resDir);
  for (const entry of entries) {
    if (entry.startsWith('drawable')) {
      const drawableDir = path.join(resDir, entry);
      if (fs.statSync(drawableDir).isDirectory()) {
        const targetSplash = path.join(drawableDir, 'splash.png');
        fs.copyFileSync(splashSrc, targetSplash);
        console.log(`[prepare-android-assets] Updated splash in ${entry}`);
      }
    }
  }

  // Ensure default drawable folder has splash.png
  const defaultDrawable = path.join(resDir, 'drawable');
  if (!fs.existsSync(defaultDrawable)) {
    fs.mkdirSync(defaultDrawable, { recursive: true });
  }
  fs.copyFileSync(splashSrc, path.join(defaultDrawable, 'splash.png'));
}

// 3. Update colors.xml to match #030f21
const colorsXmlPath = path.join(resDir, 'values', 'colors.xml');
if (fs.existsSync(colorsXmlPath)) {
  let colorsContent = fs.readFileSync(colorsXmlPath, 'utf8');
  if (colorsContent.includes('splashBackground')) {
    colorsContent = colorsContent.replace(
      /<color name="splashBackground">.*?<\/color>/,
      '<color name="splashBackground">#030f21</color>'
    );
  } else {
    colorsContent = colorsContent.replace(
      '</resources>',
      '    <color name="splashBackground">#030f21</color>\n</resources>'
    );
  }
  fs.writeFileSync(colorsXmlPath, colorsContent, 'utf8');
  console.log('[prepare-android-assets] Updated colors.xml with #030f21');
}

console.log('[prepare-android-assets] Android assets configuration completed successfully.');
