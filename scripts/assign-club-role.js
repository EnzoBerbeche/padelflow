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

async function assignClubRole(userEmail) {
  try {
    console.log(`🔍 Looking for user with email: ${userEmail}`);
    
    // Get user by email
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();
    
    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError);
      return;
    }
    
    const user = users.users.find(u => u.email === userEmail);
    
    if (!user) {
      console.error(`❌ User with email ${userEmail} not found`);
      return;
    }
    
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    console.log(`📋 Current role: ${user.user_metadata?.role || 'none'}`);
    
    // Update user metadata to assign club role
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        role: 'club'
      }
    });
    
    if (error) {
      console.error('❌ Error updating user role:', error);
      return;
    }
    
    console.log('✅ Successfully assigned club role!');
    console.log(`📋 New role: ${data.user.user_metadata?.role}`);
    console.log(`📧 User email: ${data.user.email}`);
    console.log(`🆔 User ID: ${data.user.id}`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Get email from command line arguments
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('❌ Please provide a user email as an argument');
  console.error('Usage: node scripts/assign-club-role.js user@example.com');
  process.exit(1);
}

console.log('🚀 Starting club role assignment...');
assignClubRole(userEmail);
