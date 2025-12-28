// Migrate images from AWS S3 to Cloudinary
const { createClient } = require('@supabase/supabase-js');
const cloudinary = require('cloudinary').v2;
const https = require('https');
const http = require('http');

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dyeoimvfv',
  api_key: '821331692237622',
  api_secret: 'umNeQLfXBub09lHkHJubz9kLWMI'
});

// Configure Supabase
const supabase = createClient(
  'https://mhbmpxbagybspznyoiru.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oYm1weGJhZ3lic3B6bnlvaXJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkxMTUyMSwiZXhwIjoyMDgyNDg3NTIxfQ.fjnxAc3QjPQjE7saSNCRuzizlw0RVzycdLtFxG5_78c'
);

const S3_PREFIX = 'https://hp-blog-contents.s3.eu-north-1.amazonaws.com/';

// Extract all S3 URLs from posts
async function getS3Urls() {
  const { data: posts, error } = await supabase.from('posts').select('id, image_url, enclosure, content');
  if (error) throw error;

  const urlMap = new Map(); // S3 URL -> { postIds, inContent }

  for (const post of posts) {
    // Check image_url
    if (post.image_url?.includes('hp-blog-contents')) {
      if (!urlMap.has(post.image_url)) {
        urlMap.set(post.image_url, { postIds: [], inContent: false });
      }
      urlMap.get(post.image_url).postIds.push({ id: post.id, field: 'image_url' });
    }

    // Check enclosure
    if (post.enclosure?.includes('hp-blog-contents')) {
      if (!urlMap.has(post.enclosure)) {
        urlMap.set(post.enclosure, { postIds: [], inContent: false });
      }
      urlMap.get(post.enclosure).postIds.push({ id: post.id, field: 'enclosure' });
    }

    // Check content for embedded images
    if (post.content) {
      const matches = post.content.match(/https:\/\/hp-blog-contents[^"'\s<>]+/g) || [];
      for (const url of matches) {
        if (!urlMap.has(url)) {
          urlMap.set(url, { postIds: [], inContent: true });
        } else {
          urlMap.get(url).inContent = true;
        }
      }
    }
  }

  return { urlMap, posts };
}

// Upload image to Cloudinary
async function uploadToCloudinary(s3Url) {
  try {
    const result = await cloudinary.uploader.upload(s3Url, {
      folder: 'blog',
      resource_type: 'auto'
    });
    return result.secure_url;
  } catch (error) {
    console.error(`Failed to upload ${s3Url}:`, error.message);
    return null;
  }
}

// Main migration function
async function migrate() {
  console.log('Starting image migration from S3 to Cloudinary...\n');

  const { urlMap, posts } = await getS3Urls();
  console.log(`Found ${urlMap.size} unique S3 images to migrate\n`);

  const urlMapping = {}; // old URL -> new URL
  let migrated = 0;
  let failed = 0;

  // Upload each image to Cloudinary
  for (const [s3Url, info] of urlMap) {
    process.stdout.write(`[${migrated + failed + 1}/${urlMap.size}] Migrating... `);

    const cloudinaryUrl = await uploadToCloudinary(s3Url);

    if (cloudinaryUrl) {
      urlMapping[s3Url] = cloudinaryUrl;
      console.log('✓');
      migrated++;
    } else {
      console.log('✗');
      failed++;
    }
  }

  console.log(`\nUploaded: ${migrated} | Failed: ${failed}\n`);

  // Update posts in Supabase
  console.log('Updating posts with new Cloudinary URLs...\n');

  for (const post of posts) {
    let updated = false;
    const updates = {};

    // Update image_url
    if (post.image_url && urlMapping[post.image_url]) {
      updates.image_url = urlMapping[post.image_url];
      updated = true;
    }

    // Update enclosure
    if (post.enclosure && urlMapping[post.enclosure]) {
      updates.enclosure = urlMapping[post.enclosure];
      updated = true;
    }

    // Update content
    if (post.content) {
      let newContent = post.content;
      for (const [oldUrl, newUrl] of Object.entries(urlMapping)) {
        if (newContent.includes(oldUrl)) {
          newContent = newContent.split(oldUrl).join(newUrl);
          updated = true;
        }
      }
      if (newContent !== post.content) {
        updates.content = newContent;
      }
    }

    if (updated && Object.keys(updates).length > 0) {
      const { error } = await supabase.from('posts').update(updates).eq('id', post.id);
      if (error) {
        console.error(`Failed to update post ${post.id}:`, error.message);
      } else {
        console.log(`Updated post ${post.id}: ${post.title?.substring(0, 40)}...`);
      }
    }
  }

  console.log('\n✓ Image migration complete!');
  console.log(`\nURL Mapping saved. ${Object.keys(urlMapping).length} URLs migrated.`);
}

migrate().catch(console.error);
