// Utility functions for file operations and data formatting

import * as fs from 'fs';
import * as path from 'path';
import { Event, ArchiveOutput, ArchiveMetadata } from './types';

/**
 * Ensure output directory exists
 */
export function ensureOutputDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Generate a filename for the archive with timestamp
 */
export function generateFilename(groupUrlname: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${groupUrlname}-${timestamp}.json`;
}

/**
 * Save events to a JSON file
 */
export function saveToJson(
  events: Event[],
  metadata: ArchiveMetadata,
  outputPath: string
): void {
  const output: ArchiveOutput = {
    metadata,
    events,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
}

/**
 * Create archive metadata
 */
export function createMetadata(
  groupUrlname: string,
  groupId: string,
  groupName: string,
  totalEvents: number,
  pastCount: number,
  upcomingCount: number
): ArchiveMetadata {
  return {
    archivedAt: new Date().toISOString(),
    groupUrlname,
    groupId,
    groupName,
    totalEvents,
    pastEvents: pastCount,
    upcomingEvents: upcomingCount,
  };
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Get file size
 */
export function getFileSize(filePath: string): number {
  const stats = fs.statSync(filePath);
  return stats.size;
}

/**
 * Display summary statistics
 */
export function displaySummary(
  metadata: ArchiveMetadata,
  filePath: string
): void {
  const fileSize = formatFileSize(getFileSize(filePath));

  console.log('\n' + '='.repeat(60));
  console.log('Archive Complete!');
  console.log('='.repeat(60));
  console.log(`Group Name:       ${metadata.groupName}`);
  console.log(`Group URL:        ${metadata.groupUrlname}`);
  console.log(`Total Events:     ${metadata.totalEvents}`);
  console.log(`  - Past:         ${metadata.pastEvents}`);
  console.log(`  - Upcoming:     ${metadata.upcomingEvents}`);
  console.log(`Archived At:      ${metadata.archivedAt}`);
  console.log(`Output File:      ${filePath}`);
  console.log(`File Size:        ${fileSize}`);
  console.log('='.repeat(60) + '\n');
}
