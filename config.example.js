// Copy this file to config.js and fill in your Supabase project values.
// The browser may use the anon/publishable key. NEVER use a service-role/secret key here.
// Google Drive credentials stay in Supabase Edge Function secrets; they never belong in this file.
window.VAULT_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY',
  bucket: 'documents',
  storageProvider: 'google-drive',
  driveGatewayUrl: '',
  maxFileSizeMB: 50,
  autoLockMinutes: 15
};
