import * as fs from 'fs';
import * as path from 'path';
import {
  ensureOutputDirectory,
  generateFilename,
  saveToJson,
  createMetadata,
  formatFileSize,
  getFileSize,
  displaySummary,
} from '../utils';
import { Event, ArchiveMetadata } from '../types';

describe('Utils', () => {
  const TEST_DIR = path.join(__dirname, '__test_output__');

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('ensureOutputDirectory', () => {
    it('should create a directory if it does not exist', () => {
      ensureOutputDirectory(TEST_DIR);
      expect(fs.existsSync(TEST_DIR)).toBe(true);
    });

    it('should not throw an error if directory already exists', () => {
      fs.mkdirSync(TEST_DIR);
      expect(() => ensureOutputDirectory(TEST_DIR)).not.toThrow();
    });

    it('should create nested directories recursively', () => {
      const nestedDir = path.join(TEST_DIR, 'sub1', 'sub2');
      ensureOutputDirectory(nestedDir);
      expect(fs.existsSync(nestedDir)).toBe(true);
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with group name and timestamp', () => {
      const groupUrlname = 'test-group';
      const filename = generateFilename(groupUrlname);
      
      expect(filename).toMatch(/^test-group-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/);
    });

    it('should generate unique filenames for different calls', () => {
      const filename1 = generateFilename('group1');
      const filename2 = generateFilename('group2');
      
      expect(filename1).not.toBe(filename2);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(2048)).toBe('2.00 KB');
      expect(formatFileSize(1536)).toBe('1.50 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.50 MB');
    });
  });

  describe('createMetadata', () => {
    it('should create metadata with all fields', () => {
      const metadata = createMetadata(
        'test-group',
        'group123',
        'Test Group',
        100,
        80,
        20
      );

      expect(metadata).toMatchObject({
        groupUrlname: 'test-group',
        groupId: 'group123',
        groupName: 'Test Group',
        totalEvents: 100,
        pastEvents: 80,
        upcomingEvents: 20,
      });
      expect(metadata.archivedAt).toBeDefined();
      expect(new Date(metadata.archivedAt).getTime()).not.toBeNaN();
    });

    it('should include current timestamp', () => {
      const before = new Date().toISOString();
      const metadata = createMetadata('group', 'id', 'name', 10, 5, 5);
      const after = new Date().toISOString();

      expect(metadata.archivedAt >= before).toBe(true);
      expect(metadata.archivedAt <= after).toBe(true);
    });
  });

  describe('saveToJson and getFileSize', () => {
    it('should save events and metadata to JSON file', () => {
      ensureOutputDirectory(TEST_DIR);
      const outputPath = path.join(TEST_DIR, 'test.json');

      const metadata: ArchiveMetadata = {
        archivedAt: new Date().toISOString(),
        groupUrlname: 'test-group',
        groupId: 'group123',
        groupName: 'Test Group',
        totalEvents: 1,
        pastEvents: 1,
        upcomingEvents: 0,
      };

      const events: Event[] = [
        {
          id: 'event1',
          title: 'Test Event',
          eventUrl: 'https://meetup.com/test',
          dateTime: '2000-01-15T10:00:00.000Z',
          endTime: '2000-01-15T12:00:00.000Z',
          status: 'PAST',
          going: 10,
          description: 'Test description',
        } as Event,
      ];

      saveToJson(events, metadata, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      expect(content.metadata).toEqual(metadata);
      expect(content.events).toEqual(events);
    });

    it('should get file size correctly', () => {
      ensureOutputDirectory(TEST_DIR);
      const outputPath = path.join(TEST_DIR, 'test.json');
      const testContent = { test: 'data' };
      fs.writeFileSync(outputPath, JSON.stringify(testContent));

      const size = getFileSize(outputPath);
      expect(size).toBeGreaterThan(0);
      expect(size).toBe(fs.statSync(outputPath).size);
    });
  });

  describe('displaySummary', () => {
    it('should not throw error when displaying summary', () => {
      ensureOutputDirectory(TEST_DIR);
      const outputPath = path.join(TEST_DIR, 'test.json');
      fs.writeFileSync(outputPath, JSON.stringify({ test: 'data' }));

      const metadata: ArchiveMetadata = {
        archivedAt: new Date().toISOString(),
        groupUrlname: 'test-group',
        groupId: 'group123',
        groupName: 'Test Group',
        totalEvents: 100,
        pastEvents: 80,
        upcomingEvents: 20,
      };

      // Capture console output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      expect(() => displaySummary(metadata, outputPath)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
