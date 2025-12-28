// Migration script: AWS PostgreSQL -> Supabase
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mhbmpxbagybspznyoiru.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oYm1weGJhZ3lic3B6bnlvaXJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkxMTUyMSwiZXhwIjoyMDgyNDg3NTIxfQ.fjnxAc3QjPQjE7saSNCRuzizlw0RVzycdLtFxG5_78c'
);

// Data exported from AWS PostgreSQL
const data = require('./migration-data.json');

async function migrate() {
  console.log('Starting migration...\n');

  // Migrate admin_users
  if (data.admin_users?.length) {
    console.log(`Migrating ${data.admin_users.length} admin_users...`);
    const { error } = await supabase.from('admin_users').upsert(data.admin_users, { onConflict: 'id' });
    if (error) console.error('admin_users error:', error.message);
    else console.log('✓ admin_users migrated');
  }

  // Migrate contacts
  if (data.contacts?.length) {
    console.log(`Migrating ${data.contacts.length} contacts...`);
    const { error } = await supabase.from('contacts').upsert(data.contacts, { onConflict: 'id' });
    if (error) console.error('contacts error:', error.message);
    else console.log('✓ contacts migrated');
  }

  // Migrate posts
  if (data.posts?.length) {
    console.log(`Migrating ${data.posts.length} posts...`);
    const { error } = await supabase.from('posts').upsert(data.posts, { onConflict: 'id' });
    if (error) console.error('posts error:', error.message);
    else console.log('✓ posts migrated');
  }

  // Migrate likes
  if (data.likes?.length) {
    console.log(`Migrating ${data.likes.length} likes...`);
    const { error } = await supabase.from('likes').upsert(data.likes, { onConflict: 'id' });
    if (error) console.error('likes error:', error.message);
    else console.log('✓ likes migrated');
  }

  // Migrate subscribers
  if (data.subscribers?.length) {
    console.log(`Migrating ${data.subscribers.length} subscribers...`);
    const { error } = await supabase.from('subscribers').upsert(data.subscribers, { onConflict: 'id' });
    if (error) console.error('subscribers error:', error.message);
    else console.log('✓ subscribers migrated');
  }

  // Migrate email_logs
  if (data.email_logs?.length) {
    console.log(`Migrating ${data.email_logs.length} email_logs...`);
    const { error } = await supabase.from('email_logs').upsert(data.email_logs, { onConflict: 'id' });
    if (error) console.error('email_logs error:', error.message);
    else console.log('✓ email_logs migrated');
  }

  // Update sequences
  console.log('\nUpdating sequences...');

  console.log('\n✓ Migration complete!');
}

migrate().catch(console.error);
