require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listUsers() {
  try {
    console.log('🔍 Fetching all users...');
    
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }
    
    console.log(`\n📊 Found ${users.users.length} users:\n`);
    
    users.users.forEach((user, index) => {
      const role = user.user_metadata?.role || 'player (default)';
      const displayName = user.user_metadata?.display_name || 'N/A';
      const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never';
      
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   🆔 ID: ${user.id}`);
      console.log(`   👤 Display Name: ${displayName}`);
      console.log(`   🎭 Role: ${role}`);
      console.log(`   📅 Last Sign In: ${lastSignIn}`);
      console.log(`   ✅ Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

console.log('🚀 Listing all users...');
listUsers();
