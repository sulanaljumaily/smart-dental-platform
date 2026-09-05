from PIL import Image
import os

src_512 = Image.open('public/icons/icon-512x512.png').convert('RGBA')

configs = {
    'mdpi': {'fg_canvas': 108, 'fg_logo': 68, 'legacy': 48, 'legacy_logo': 42},
    'hdpi': {'fg_canvas': 162, 'fg_logo': 102, 'legacy': 72, 'legacy_logo': 64},
    'xhdpi': {'fg_canvas': 216, 'fg_logo': 136, 'legacy': 96, 'legacy_logo': 84},
    'xxhdpi': {'fg_canvas': 324, 'fg_logo': 204, 'legacy': 144, 'legacy_logo': 126},
    'xxxhdpi': {'fg_canvas': 432, 'fg_logo': 272, 'legacy': 192, 'legacy_logo': 168}
}

base_out = 'public/icons/android'

for density, cfg in configs.items():
    folder = os.path.join(base_out, f'mipmap-{density}')
    os.makedirs(folder, exist_ok=True)
    
    # 1. Foreground icon: canvas fg_canvas with fg_logo centered on transparent
    fg = Image.new('RGBA', (cfg['fg_canvas'], cfg['fg_canvas']), (0, 0, 0, 0))
    logo_fg = src_512.resize((cfg['fg_logo'], cfg['fg_logo']), Image.Resampling.LANCZOS)
    offset_fg = (cfg['fg_canvas'] - cfg['fg_logo']) // 2
    fg.paste(logo_fg, (offset_fg, offset_fg), logo_fg)
    fg.save(os.path.join(folder, 'ic_launcher_foreground.png'), format='PNG')
    
    # 2. Legacy icons (launcher and round): canvas legacy with legacy_logo centered
    leg = Image.new('RGBA', (cfg['legacy'], cfg['legacy']), (0, 0, 0, 0))
    logo_leg = src_512.resize((cfg['legacy_logo'], cfg['legacy_logo']), Image.Resampling.LANCZOS)
    offset_leg = (cfg['legacy'] - cfg['legacy_logo']) // 2
    leg.paste(logo_leg, (offset_leg, offset_leg), logo_leg)
    leg.save(os.path.join(folder, 'ic_launcher.png'), format='PNG')
    leg.save(os.path.join(folder, 'ic_launcher_round.png'), format='PNG')
    print('Generated icons for', density)

# 3. Generate solid #030f21 splash image (1080x1920) with NO icon
splash_solid = Image.new('RGBA', (1080, 1920), (3, 15, 33, 255))
splash_solid.save('public/splash.png', format='PNG')
print('Generated solid public/splash.png without any cropped icon')
