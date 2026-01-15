import axios from 'axios';
import { MeetupClient } from '../meetupClient';
import { EventStatus } from '../types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MeetupClient', () => {
  let client: MeetupClient;
  const mockAccessToken = 'test-token-123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios.create to return a mocked instance
    mockedAxios.create.mockReturnValue({
      post: jest.fn(),
    } as any);
    
    client = new MeetupClient(mockAccessToken);
  });

  describe('constructor', () => {
    it('should throw error for invalid access token', () => {
      expect(() => new MeetupClient('')).toThrow('Invalid access token');
      expect(() => new MeetupClient('your_token_here')).toThrow('Invalid access token');
    });

    it('should create client with valid token', () => {
      expect(() => new MeetupClient('valid-token')).not.toThrow();
    });

    it('should initialize axios client with correct headers', () => {
      new MeetupClient('test-token');
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.meetup.com/gql-ext',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('testAuthentication', () => {
    it('should return true for successful authentication', async () => {
      const mockResponse = {
        data: {
          data: {
            self: {
              id: 'user123',
              name: 'Test User',
            },
          },
        },
      };

      const mockPost = jest.fn().mockResolvedValue(mockResponse);
      mockedAxios.create.mockReturnValue({ post: mockPost } as any);
      
      client = new MeetupClient(mockAccessToken);
      const result = await client.testAuthentication();

      expect(result).toBe(true);
      expect(mockPost).toHaveBeenCalled();
    });

    it('should return false for failed authentication', async () => {
      const mockPost = jest.fn().mockRejectedValue(new Error('Unauthorized'));
      mockedAxios.create.mockReturnValue({ post: mockPost } as any);
      
      // Mock console.error to avoid test output pollution
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      client = new MeetupClient(mockAccessToken);
      const result = await client.testAuthentication();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('fetchAllEvents', () => {
    it('should fetch events with pagination', async () => {
      const mockPage1Response = {
        data: {
          data: {
            groupByUrlname: {
              id: 'group123',
              name: 'Test Group',
              events: {
                totalCount: 2,
                pageInfo: {
                  hasNextPage: true,
                  endCursor: 'cursor1',
                },
                edges: [
                  {
                    node: {
                      id: 'event1',
                      title: 'Event 1',
                      eventUrl: 'https://meetup.com/event1',
                      dateTime: '2026-01-01T10:00:00.000Z',
                      status: 'PAST',
                      going: 10,
                      eventHosts: [],
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const mockPage2Response = {
        data: {
          data: {
            groupByUrlname: {
              id: 'group123',
              name: 'Test Group',
              events: {
                totalCount: 2,
                pageInfo: {
                  hasNextPage: false,
                  endCursor: 'cursor2',
                },
                edges: [
                  {
                    node: {
                      id: 'event2',
                      title: 'Event 2',
                      eventUrl: 'https://meetup.com/event2',
                      dateTime: '2026-01-02T10:00:00.000Z',
                      status: 'PAST',
                      going: 15,
                      eventHosts: [],
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const mockPost = jest.fn()
        .mockResolvedValueOnce(mockPage1Response)
        .mockResolvedValueOnce(mockPage2Response);
      
      mockedAxios.create.mockReturnValue({ post: mockPost } as any);
      
      // Mock console.log to avoid test output pollution
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      client = new MeetupClient(mockAccessToken);
      const result = await client.fetchAllEvents('test-group', 'PAST');

      expect(result.events).toHaveLength(2);
      expect(result.groupId).toBe('group123');
      expect(result.groupName).toBe('Test Group');
      expect(result.events[0].id).toBe('event1');
      expect(result.events[1].id).toBe('event2');
      expect(mockPost).toHaveBeenCalledTimes(2);
      
      consoleLogSpy.mockRestore();
    });

    it('should filter out events hosted by OWASP Foundation', async () => {
      const mockResponse = {
        data: {
          data: {
            groupByUrlname: {
              id: 'group123',
              name: 'Test Group',
              events: {
                totalCount: 2,
                pageInfo: {
                  hasNextPage: false,
                  endCursor: 'cursor1',
                },
                edges: [
                  {
                    node: {
                      id: 'event1',
                      title: 'Event 1',
                      eventUrl: 'https://meetup.com/event1',
                      dateTime: '2026-01-01T10:00:00.000Z',
                      status: 'PAST',
                      going: 10,
                      eventHosts: [{ name: 'Regular Host', memberId: '123' }],
                    },
                  },
                  {
                    node: {
                      id: 'event2',
                      title: 'Event 2',
                      eventUrl: 'https://meetup.com/event2',
                      dateTime: '2026-01-02T10:00:00.000Z',
                      status: 'PAST',
                      going: 15,
                      eventHosts: [{ name: 'OWASP® Foundation', memberId: '456' }],
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const mockPost = jest.fn().mockResolvedValue(mockResponse);
      mockedAxios.create.mockReturnValue({ post: mockPost } as any);
      
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      client = new MeetupClient(mockAccessToken);
      const result = await client.fetchAllEvents('test-group', 'PAST');

      expect(result.events).toHaveLength(1);
      expect(result.events[0].id).toBe('event1');
      
      consoleLogSpy.mockRestore();
    });

    it('should throw error for non-existent group', async () => {
      const mockResponse = {
        data: {
          data: {
            groupByUrlname: null,
          },
        },
      };

      const mockPost = jest.fn().mockResolvedValue(mockResponse);
      mockedAxios.create.mockReturnValue({ post: mockPost } as any);
      
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      client = new MeetupClient(mockAccessToken);
      
      await expect(
        client.fetchAllEvents('non-existent-group', 'PAST')
      ).rejects.toThrow('Group not found: non-existent-group');
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('fetchAllGroupEvents', () => {
    it('should fetch both past and upcoming events', async () => {
      const mockPastResponse = {
        data: {
          data: {
            groupByUrlname: {
              id: 'group123',
              name: 'Test Group',
              events: {
                totalCount: 1,
                pageInfo: { hasNextPage: false, endCursor: 'cursor1' },
                edges: [
                  {
                    node: {
                      id: 'event-past',
                      title: 'Past Event',
                      status: 'PAST',
                      eventHosts: [],
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const mockUpcomingResponse = {
        data: {
          data: {
            groupByUrlname: {
              id: 'group123',
              name: 'Test Group',
              events: {
                totalCount: 1,
                pageInfo: { hasNextPage: false, endCursor: 'cursor2' },
                edges: [
                  {
                    node: {
                      id: 'event-upcoming',
                      title: 'Upcoming Event',
                      status: 'UPCOMING',
                      eventHosts: [],
                    },
                  },
                ],
              },
            },
          },
        },
      };

      const mockPost = jest.fn()
        .mockResolvedValueOnce(mockPastResponse)
        .mockResolvedValueOnce(mockUpcomingResponse);
      
      mockedAxios.create.mockReturnValue({ post: mockPost } as any);
      
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      client = new MeetupClient(mockAccessToken);
      const result = await client.fetchAllGroupEvents('test-group');

      expect(result.events).toHaveLength(2);
      expect(result.pastCount).toBe(1);
      expect(result.upcomingCount).toBe(1);
      expect(mockPost).toHaveBeenCalledTimes(2);
      
      consoleLogSpy.mockRestore();
    });
  });
});
