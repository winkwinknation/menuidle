// Themed vocabulary so a menu's contents actually BELONG to it: an Audio menu holds
// audio things, a Network menu holds network things. `children` lists related themes a
// submenu can branch into so you move between coherent topics, not random nouns.

export interface ThemeDef {
  title: string;
  children: string[]; // related themes a submenu may branch into
  entries: string[]; // submenu sub-topics that stay on this theme
  actions: string[]; // resource labels for LIST menus
  toggles: string[]; // resource labels for SETTINGS menus
  tiles: string[]; // resource labels for GRID menus
}

export const ROOT_THEME_ID = 'root';

export const TOP_CATEGORIES = [
  'system', 'display', 'sound', 'network', 'personalization', 'accounts',
  'privacy', 'security', 'devices', 'storage', 'power', 'accessibility',
  'notifications', 'apps',
];

export const THEMES: Record<string, ThemeDef> = {
  root: {
    title: 'Main Menu',
    children: TOP_CATEGORIES,
    entries: [],
    actions: ['Check for Updates', 'Sync Now', 'Restore Defaults'],
    toggles: [],
    tiles: [],
  },
  system: {
    title: 'System',
    children: ['storage', 'power', 'display', 'apps'],
    entries: ['About', 'Performance', 'Startup', 'Background Tasks', 'Recovery', 'Advanced', 'Remote Desktop'],
    actions: ['Restart Services', 'Clear Temp Files', 'Run Diagnostics', 'Optimize Now', 'Rebuild Index', 'Check Health'],
    toggles: ['Fast Startup', 'Telemetry', 'Auto-Restart', 'Background Apps', 'Crash Reporting', 'Hardware Acceleration'],
    tiles: ['CPU', 'Memory', 'Disk', 'Threads', 'Cache', 'Kernel'],
  },
  display: {
    title: 'Display',
    children: ['personalization', 'accessibility', 'power'],
    entries: ['Resolution', 'Brightness', 'Night Light', 'Multiple Displays', 'Scaling', 'Color Profile', 'Refresh Rate'],
    actions: ['Detect Displays', 'Calibrate Color', 'Reset Layout', 'Identify', 'Apply Profile', 'Auto-Adjust'],
    toggles: ['Night Light', 'HDR', 'Auto-Brightness', 'Adaptive Sync', 'True Tone', 'Dark Mode'],
    tiles: ['Monitor 1', 'Monitor 2', 'HDMI', 'DisplayPort', 'VGA', 'Mirror'],
  },
  sound: {
    title: 'Sound',
    children: ['devices', 'accessibility'],
    entries: ['Output', 'Input', 'Volume Mixer', 'Spatial Sound', 'Equalizer', 'Sound Effects'],
    actions: ['Mute All', 'Test Speakers', 'Calibrate Mic', 'Reset Levels', 'Detect Devices', 'Apply EQ'],
    toggles: ['Spatial Audio', 'Mono Audio', 'Enhance Bass', 'Noise Suppression', 'Auto-Gain', 'Mute on Sleep'],
    tiles: ['Speakers', 'Headphones', 'Microphone', 'Line In', 'Bluetooth', 'HDMI Audio'],
  },
  network: {
    title: 'Network',
    children: ['security', 'privacy', 'devices'],
    entries: ['Wi-Fi', 'Ethernet', 'VPN', 'Proxy', 'Hotspot', 'Data Usage', 'Airplane Mode'],
    actions: ['Reconnect', 'Flush DNS', 'Renew Lease', 'Run Speed Test', 'Forget Network', 'Diagnose'],
    toggles: ['Metered Connection', 'Auto-Connect', 'Random MAC', 'IPv6', 'Firewall', 'Captive Portal'],
    tiles: ['Wi-Fi', 'LAN', 'VPN', 'Proxy', 'DNS', 'Gateway'],
  },
  personalization: {
    title: 'Personalization',
    children: ['display', 'accessibility', 'apps'],
    entries: ['Background', 'Colors', 'Themes', 'Lock Screen', 'Fonts', 'Cursors', 'Start Menu'],
    actions: ['Apply Theme', 'Shuffle Wallpaper', 'Reset Colors', 'Save Preset', 'Import Theme', 'Randomize'],
    toggles: ['Transparency', 'Animations', 'Accent on Title Bars', 'Auto Dark', 'Show Recent', 'Live Tiles'],
    tiles: ['Wallpaper', 'Accent', 'Cursor', 'Sounds', 'Font', 'Icons'],
  },
  accounts: {
    title: 'Accounts',
    children: ['privacy', 'security'],
    entries: ['Your Info', 'Sign-in Options', 'Family', 'Sync Settings', 'Work Access', 'Other Users'],
    actions: ['Sign Out', 'Switch User', 'Verify Identity', 'Sync Now', 'Add Account', 'Refresh Token'],
    toggles: ['Stay Signed In', 'Sync Settings', 'Picture Password', 'Show Email', 'Auto-Lock', 'Roaming'],
    tiles: ['Profile', 'Email', 'Phone', 'Family', 'Keys', 'Devices'],
  },
  privacy: {
    title: 'Privacy',
    children: ['security', 'accounts', 'network'],
    entries: ['Location', 'Camera', 'Microphone', 'Activity History', 'Diagnostics', 'App Permissions'],
    actions: ['Clear History', 'Revoke Access', 'Export Data', 'Delete Activity', 'Reset Permissions', 'Audit Access'],
    toggles: ['Location Services', 'Ad Personalization', 'Activity History', 'Camera Access', 'Mic Access', 'Tracking Protection'],
    tiles: ['Location', 'Camera', 'Mic', 'Contacts', 'History', 'Tracking'],
  },
  security: {
    title: 'Security',
    children: ['privacy', 'network', 'accounts'],
    entries: ['Firewall', 'Antivirus', 'Encryption', 'Credentials', 'Sign-in Security', 'Recovery Keys'],
    actions: ['Run Scan', 'Update Definitions', 'Quarantine', 'Rotate Keys', 'Lock Down', 'Verify Integrity'],
    toggles: ['Real-time Protection', 'Firewall', 'Tamper Protection', 'Secure Boot', 'Auto-Quarantine', 'Cloud Protection'],
    tiles: ['Firewall', 'Scanner', 'Vault', 'Keys', 'Certs', 'Shield'],
  },
  devices: {
    title: 'Devices',
    children: ['sound', 'display', 'network'],
    entries: ['Bluetooth', 'Printers', 'Mouse', 'Keyboard', 'USB', 'Pen & Touch'],
    actions: ['Add Device', 'Pair', 'Remove', 'Update Driver', 'Troubleshoot', 'Detect'],
    toggles: ['Bluetooth', 'USB Notifications', 'Autoplay', 'Mouse Acceleration', 'Sticky Keys', 'Touchpad'],
    tiles: ['Mouse', 'Keyboard', 'Printer', 'Bluetooth', 'USB', 'Webcam'],
  },
  storage: {
    title: 'Storage',
    children: ['system', 'privacy'],
    entries: ['Local Disk', 'Cloud', 'Temporary Files', 'Backups', 'Drives', 'Cleanup'],
    actions: ['Clean Now', 'Empty Recycle Bin', 'Defragment', 'Backup Now', 'Analyze', 'Free Up Space'],
    toggles: ['Storage Sense', 'Auto-Backup', 'Compress Old Files', 'Cloud Sync', 'Encrypt Drive', 'Offline Files'],
    tiles: ['C:', 'D:', 'Cloud', 'Backup', 'Temp', 'Trash'],
  },
  power: {
    title: 'Power',
    children: ['system', 'display'],
    entries: ['Battery', 'Sleep', 'Power Mode', 'Screen Timeout', 'Hibernate', 'Usage'],
    actions: ['Save Power', 'Balance', 'Maximize Performance', 'Calibrate Battery', 'Sleep Now', 'Reset Plan'],
    toggles: ['Battery Saver', 'Fast Startup', 'Adaptive Brightness', 'Sleep on Idle', 'USB Power', 'Wake Timers'],
    tiles: ['Battery', 'AC', 'Sleep', 'Hibernate', 'Eco', 'Turbo'],
  },
  accessibility: {
    title: 'Accessibility',
    children: ['display', 'sound', 'personalization'],
    entries: ['Vision', 'Hearing', 'Narrator', 'Magnifier', 'Contrast', 'Captions'],
    actions: ['Read Aloud', 'Increase Contrast', 'Reset', 'Test Narrator', 'Apply', 'Calibrate'],
    toggles: ['High Contrast', 'Narrator', 'Magnifier', 'Mono Audio', 'Sticky Keys', 'Live Captions'],
    tiles: ['Narrator', 'Magnifier', 'Contrast', 'Captions', 'Keyboard', 'Pointer'],
  },
  notifications: {
    title: 'Notifications',
    children: ['privacy', 'personalization', 'apps'],
    entries: ['Banners', 'Focus Assist', 'Priority', 'Badges', 'Sounds', 'History'],
    actions: ['Clear All', 'Snooze', 'Mark Read', 'Mute Source', 'Apply', 'Dismiss'],
    toggles: ['Do Not Disturb', 'Banners', 'Sounds', 'Badges', 'Lock Screen', 'Suggestions'],
    tiles: ['Email', 'Chat', 'Calendar', 'System', 'Updates', 'Alerts'],
  },
  apps: {
    title: 'Apps',
    children: ['system', 'storage', 'notifications'],
    entries: ['Installed', 'Default Apps', 'Startup', 'Optional Features', 'Extensions', 'Updates'],
    actions: ['Update All', 'Uninstall', 'Repair', 'Clear Cache', 'Reset', 'Reinstall'],
    toggles: ['Auto-Update', 'Run at Startup', 'Background Activity', 'Install Sideloaded', 'Beta Channel', 'Telemetry'],
    tiles: ['Browser', 'Mail', 'Store', 'Editor', 'Player', 'Files'],
  },
};

export function getTheme(id: string): ThemeDef {
  return THEMES[id] ?? THEMES.system;
}
