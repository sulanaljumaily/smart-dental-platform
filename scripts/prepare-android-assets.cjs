const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const resDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');

if (!fs.existsSync(resDir)) {
  console.log('[prepare-android-assets] Android res directory not found at:', resDir);
  process.exit(0);
}

console.log('[prepare-android-assets] Configuring Android icons and native splash in:', resDir);

// 1. Copy pre-scaled Adaptive Icons for each density
const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
const androidIconsBase = path.join(projectRoot, 'public', 'icons', 'android');

for (const density of densities) {
  const srcDensityDir = path.join(androidIconsBase, `mipmap-${density}`);
  const targetDensityDir = path.join(resDir, `mipmap-${density}`);

  if (fs.existsSync(srcDensityDir)) {
    if (!fs.existsSync(targetDensityDir)) {
      fs.mkdirSync(targetDensityDir, { recursive: true });
    }
    for (const file of ['ic_launcher_foreground.png', 'ic_launcher.png', 'ic_launcher_round.png']) {
      const srcFile = path.join(srcDensityDir, file);
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, path.join(targetDensityDir, file));
      }
    }
    console.log(`[prepare-android-assets] Installed adaptive icons for mipmap-${density}`);
  }
}

// 2. Remove default Capacitor vector foreground if present so PNG foreground takes effect
const vectorFg = path.join(resDir, 'drawable-v24', 'ic_launcher_foreground.xml');
if (fs.existsSync(vectorFg)) {
  fs.unlinkSync(vectorFg);
  console.log('[prepare-android-assets] Removed default vector foreground override');
}

// 3. Set adaptive icon background color to dark navy (#051329)
const bgXmlPath = path.join(resDir, 'values', 'ic_launcher_background.xml');
if (fs.existsSync(bgXmlPath)) {
  const bgContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#051329</color>
</resources>
`;
  fs.writeFileSync(bgXmlPath, bgContent, 'utf8');
  console.log('[prepare-android-assets] Updated ic_launcher_background.xml to #051329');
}

// 4. Install splash_icon.png drawable for Android 12+ SplashScreen API
const splashIconSrc = path.join(androidIconsBase, 'splash_icon.png');
for (const dirName of ['drawable', 'drawable-v24', 'drawable-nodpi']) {
  const targetDir = path.join(resDir, dirName);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  if (fs.existsSync(splashIconSrc)) {
    fs.copyFileSync(splashIconSrc, path.join(targetDir, 'splash_icon.png'));
  }
}
console.log('[prepare-android-assets] Installed splash_icon.png into drawables');

// 5. Splash screen mappings: install centered logo #030f21 splash images across all drawables
const splashSrc = path.join(projectRoot, 'public', 'splash.png');
if (fs.existsSync(splashSrc)) {
  const entries = fs.readdirSync(resDir);
  for (const entry of entries) {
    if (entry.startsWith('drawable')) {
      const drawableDir = path.join(resDir, entry);
      if (fs.statSync(drawableDir).isDirectory()) {
        const targetSplash = path.join(drawableDir, 'splash.png');
        fs.copyFileSync(splashSrc, targetSplash);
      }
    }
  }
  console.log('[prepare-android-assets] Installed seamless splash.png across all drawable folders');
}

// 6. Update styles.xml to use #030f21 and splash_icon for Theme.SplashScreen
const stylesXmlPath = path.join(resDir, 'values', 'styles.xml');
if (fs.existsSync(stylesXmlPath)) {
  let stylesContent = fs.readFileSync(stylesXmlPath, 'utf8');
  
  // Replace AppTheme.NoActionBarLaunch style
  const launchStyleRegex = /<style name="AppTheme\.NoActionBarLaunch"[\s\S]*?<\/style>/;
  const newLaunchStyle = `<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">#030f21</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/splash_icon</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
        <item name="android:background">#030f21</item>
    </style>`;

  if (launchStyleRegex.test(stylesContent)) {
    stylesContent = stylesContent.replace(launchStyleRegex, newLaunchStyle);
  } else {
    stylesContent = stylesContent.replace('</resources>', `    ${newLaunchStyle}\n</resources>`);
  }
  fs.writeFileSync(stylesXmlPath, stylesContent, 'utf8');
  console.log('[prepare-android-assets] Updated styles.xml with seamless logo splash screen config');
}

// 7. Update colors.xml to match #030f21
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
