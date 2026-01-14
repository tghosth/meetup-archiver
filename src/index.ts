#!/usr/bin/env node

// Main entry point for the Meetup Archiver CLI

import * as dotenv from 'dotenv';
import * as path from 'path';
import { MeetupClient } from './meetupClient';
import {
  ensureOutputDirectory,
  generateFilename,
  saveToJson,
  createMetadata,
  displaySummary,
} from './utils';

// Load environment variables
dotenv.config();

const OUTPUT_DIR = 'output';

/**
 * Main function
 */
async function main() {
  try {
    // Get group URL name from command line arguments
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.error('\n❌ Error: Group URL name is required\n');
      console.log('Usage: npm run dev -- <group-urlname>');
      console.log('   or: npm start <group-urlname>');
      console.log('\nExample: npm run dev -- typescript-oslo\n');
      console.log('The group URL name is the part after meetup.com/');
      console.log('For example, for https://www.meetup.com/typescript-oslo/');
      console.log('use: typescript-oslo\n');
      process.exit(1);
    }

    const groupUrlname = args[0];

    // Check for access token
    const accessToken = process.env.MEETUP_ACCESS_TOKEN;
    if (!accessToken || accessToken === 'your_token_here') {
      console.error('\n❌ Error: MEETUP_ACCESS_TOKEN not configured\n');
      console.log('Please follow these steps:\n');
      console.log('1. Copy .env.example to .env:');
      console.log('   cp .env.example .env\n');
      console.log('2. Get your access token from browser cookies:');
      console.log('   - Visit https://www.meetup.com and log in');
      console.log('   - Open DevTools (F12)');
      console.log('   - Go to Application/Storage → Cookies');
      console.log('   - Find __meetup_auth_access_token');
      console.log('   - Copy its value\n');
      console.log('3. Edit .env and paste your token:');
      console.log('   MEETUP_ACCESS_TOKEN=your_token_value\n');
      process.exit(1);
    }

    console.log('🚀 Meetup Archiver\n');
    console.log(`Group: ${groupUrlname}\n`);

    // Initialize client
    console.log('Initializing Meetup API client...');
    const client = new MeetupClient(accessToken);

    // Test authentication
    console.log('Testing authentication...');
    const isAuthenticated = await client.testAuthentication();
    if (!isAuthenticated) {
      console.error('\n❌ Authentication failed!');
      console.error('Please check that your MEETUP_ACCESS_TOKEN is valid.\n');
      process.exit(1);
    }
    console.log('✅ Authentication successful\n');

    // Fetch all events
    console.log('Fetching events...\n');
    const result = await client.fetchAllGroupEvents(groupUrlname);

    if (result.events.length === 0) {
      console.log('⚠️  No events found for this group.');
      process.exit(0);
    }

    // Create metadata
    const metadata = createMetadata(
      groupUrlname,
      result.groupId,
      result.groupName,
      result.events.length,
      result.pastCount,
      result.upcomingCount
    );

    // Ensure output directory exists
    ensureOutputDirectory(OUTPUT_DIR);

    // Generate filename and save
    const filename = generateFilename(groupUrlname);
    const outputPath = path.join(OUTPUT_DIR, filename);

    console.log('Saving to file...');
    saveToJson(result.events, metadata, outputPath);

    // Display summary
    displaySummary(metadata, outputPath);

    console.log('✅ Done!\n');
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the main function
main();
