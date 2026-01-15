// Meetup GraphQL API Client

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  MeetupApiResponse,
  GroupByUrlnameData,
  Event,
  EventStatus,
} from './types';
import { getGroupEventsQuery, getSelfQuery } from './queries';

const MEETUP_GRAPHQL_ENDPOINT = 'https://api.meetup.com/gql-ext';
const RATE_LIMIT_POINTS = 500;
const RATE_LIMIT_WINDOW = 60000; // 60 seconds in milliseconds

export class MeetupClient {
  private client: AxiosInstance;
  private accessToken: string;
  private requestCount: number = 0;
  private windowStart: number = Date.now();

  constructor(accessToken: string) {
    if (!accessToken || accessToken === 'your_token_here') {
      throw new Error(
        'Invalid access token. Please set MEETUP_ACCESS_TOKEN in .env file'
      );
    }

    this.accessToken = accessToken;
    this.client = axios.create({
      baseURL: MEETUP_GRAPHQL_ENDPOINT,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Execute a GraphQL query
   */
  private async executeQuery<T>(
    query: string,
    variables?: Record<string, any>
  ): Promise<MeetupApiResponse<T>> {
    // Simple rate limiting: wait if we're approaching the limit
    this.checkRateLimit();

    try {
      const response = await this.client.post<MeetupApiResponse<T>>('', {
        query,
        variables,
      });

      this.requestCount++;

      // Check for GraphQL errors
      if (response.data.errors) {
        const error = response.data.errors[0];
        
        // Handle rate limiting
        if (error.extensions?.code === 'RATE_LIMITED') {
          const resetAt = error.extensions.resetAt;
          throw new Error(
            `Rate limited. Please wait until ${resetAt} before retrying.`
          );
        }

        throw new Error(`GraphQL Error: ${error.message}`);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 401) {
          throw new Error(
            'Authentication failed. Please check your MEETUP_ACCESS_TOKEN is valid.'
          );
        }
        throw new Error(
          `API request failed: ${axiosError.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Simple rate limit check
   */
  private checkRateLimit(): void {
    const now = Date.now();
    const elapsed = now - this.windowStart;

    // Reset counter if window has passed
    if (elapsed > RATE_LIMIT_WINDOW) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    // If approaching limit, wait for the window to reset
    if (this.requestCount >= RATE_LIMIT_POINTS - 10) {
      const waitTime = RATE_LIMIT_WINDOW - elapsed;
      if (waitTime > 0) {
        console.log(
          `Approaching rate limit. Waiting ${Math.ceil(waitTime / 1000)}s...`
        );
        // In a real implementation, you'd use a proper sleep/delay here
        // For now, we'll just reset the counter
        this.requestCount = 0;
        this.windowStart = Date.now();
      }
    }
  }

  /**
   * Test authentication by fetching user info
   */
  async testAuthentication(): Promise<boolean> {
    try {
      const { query } = getSelfQuery();
      const response = await this.executeQuery(query);
      return !!response.data;
    } catch (error) {
      console.error('Authentication test failed:', error);
      return false;
    }
  }

  /**
   * Fetch all events for a group with pagination
   */
  async fetchAllEvents(
    groupUrlname: string,
    status: EventStatus = 'PAST'
  ): Promise<{ events: Event[]; groupId: string; groupName: string }> {
    const allEvents: Event[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;
    let groupId = '';
    let groupName = '';
    let pageCount = 0;

    console.log(`Fetching ${status} events for group: ${groupUrlname}`);

    while (hasNextPage) {
      pageCount++;
      const { query, variables } = getGroupEventsQuery(
        groupUrlname,
        20,
        cursor,
        status
      );

      const response = await this.executeQuery<GroupByUrlnameData>(
        query,
        variables
      );

      if (!response.data.groupByUrlname) {
        throw new Error(
          `Group not found: ${groupUrlname}. Please check the group URL name.`
        );
      }

      const group = response.data.groupByUrlname;
      groupId = group.id;
      groupName = group.name;

      const events = group.events;
      if (!events) {
        break;
      }

      const fetchedEvents = events.edges.map((edge) => edge.node);
      
      // Filter out events hosted by "OWASP® Foundation"
      const filteredEvents = fetchedEvents.filter(event => {
        const hasFoundationHost = event.eventHosts?.some(
          host => host.name === 'OWASP® Foundation'
        );
        return !hasFoundationHost;
      });
      
      allEvents.push(...filteredEvents);

      console.log(
        `  Page ${pageCount}: Fetched ${fetchedEvents.length} events, ${filteredEvents.length} after filtering (Total: ${allEvents.length}/${events.totalCount})`
      );

      hasNextPage = events.pageInfo.hasNextPage;
      cursor = events.pageInfo.endCursor;

      // Small delay to be nice to the API
      if (hasNextPage) {
        await this.delay(100);
      }
    }

    console.log(`Completed: ${allEvents.length} ${status} events fetched\n`);

    return { events: allEvents, groupId, groupName };
  }

  /**
   * Fetch both past and upcoming events
   */
  async fetchAllGroupEvents(groupUrlname: string): Promise<{
    events: Event[];
    groupId: string;
    groupName: string;
    pastCount: number;
    upcomingCount: number;
  }> {
    // Fetch past events
    const pastResult = await this.fetchAllEvents(groupUrlname, 'PAST');

    // Try to fetch upcoming events, but if it fails just continue with past events only
    let upcomingResult = { events: [] as Event[], groupId: pastResult.groupId, groupName: pastResult.groupName };
    try {
      upcomingResult = await this.fetchAllEvents(groupUrlname, 'UPCOMING');
    } catch (error) {
      console.log('Note: Could not fetch upcoming events (may not be available for this API version)\n');
    }

    // Combine and sort by date
    const allEvents = [...pastResult.events, ...upcomingResult.events];
    allEvents.sort(
      (a, b) =>
        new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    );

    // Download and embed images as base64
    const eventsWithImages = await this.embedEventImages(allEvents);

    return {
      events: eventsWithImages,
      groupId: pastResult.groupId,
      groupName: pastResult.groupName,
      pastCount: pastResult.events.length,
      upcomingCount: upcomingResult.events.length,
    };
  }

  /**
   * Simple delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Download image and convert to base64 data URI
   */
  private async downloadImageAsBase64(url: string): Promise<string | null> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      
      const contentType = response.headers['content-type'] || 'image/jpeg';
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      console.warn(`  ⚠️  Failed to download image: ${url}`);
      return null;
    }
  }

  /**
   * Fetch photo album images via GraphQL persisted query
   */
  private async fetchPhotoAlbumImages(eventId: string, photoCount: number): Promise<Array<{url: string, id: string}>> {
    try {
      // Full GraphQL query for photo album - uses different endpoint (gql2)
      const query = `
        query getEventByIdPhotoAlbum($eventId: ID!, $number: Int!) {
          event(id: $eventId) {
            id
            photoAlbum {
              id
              photoCount
              photoSample(number: $number) {
                id
                baseUrl
                highResUrl
              }
            }
          }
        }
      `;

      const response = await axios.post(
        'https://www.meetup.com/gql2',
        {
          query: query,
          operationName: 'getEventByIdPhotoAlbum',
          variables: {
            eventId: eventId,
            number: photoCount,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.data.errors) {
        return [];
      }

      const photoAlbumData = response.data.data?.event?.photoAlbum;
      if (!photoAlbumData?.photoSample) {
        return [];
      }

      const photos: Array<{url: string, id: string}> = [];
      for (const photo of photoAlbumData.photoSample) {
        if (photo?.highResUrl && photo?.id) {
          photos.push({ url: photo.highResUrl, id: photo.id });
        }
      }

      return photos;
    } catch (error) {
      console.warn(`  ⚠️  Failed to fetch photo album for event ${eventId}`);
      if (error instanceof Error) {
        console.warn(`    Error: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Download images for events and embed them as base64
   */
  private async embedEventImages(events: Event[]): Promise<Event[]> {
    console.log('\nDownloading and embedding images...');
    let featuredCount = 0;
    let albumPhotoCount = 0;
    
    for (const event of events) {
      // Download featured event photo
      if (event.featuredEventPhoto?.baseUrl && event.featuredEventPhoto?.id) {
        const imageUrl = `${event.featuredEventPhoto.baseUrl}${event.featuredEventPhoto.id}/676x380.jpg`;
        const base64Image = await this.downloadImageAsBase64(imageUrl);
        
        if (base64Image) {
          event.featuredEventPhoto.baseUrl = base64Image;
          event.featuredEventPhoto.id = '';
          featuredCount++;
        }
        
        await this.delay(50);
      }
      
      // Fetch and download photo album images if album exists
      if (event.photoAlbum?.id && event.photoAlbum.photoCount > 0) {
        const expectedCount = event.photoAlbum.photoCount;
        console.log(`  Fetching ${expectedCount} album photos for: ${event.title.substring(0, 50)}...`);
        const photos = await this.fetchPhotoAlbumImages(event.id, expectedCount);
        
        if (photos.length > 0) {
          console.log(`    Found ${photos.length} photos (expected ${expectedCount})`);
          
          const albumPhotos: EventPhoto[] = [];
          const limit = Math.min(photos.length, 20); // Limit to 20 photos per album
          
          for (let i = 0; i < limit; i++) {
            const photo = photos[i];
            const base64Image = await this.downloadImageAsBase64(photo.url);
            if (base64Image) {
              albumPhotos.push({
                id: photo.id,
                baseUrl: base64Image,
              });
              albumPhotoCount++;
            }
            await this.delay(50);
          }
          
          // Add photos to the album structure
          if (albumPhotos.length > 0) {
            (event.photoAlbum as any).photos = { edges: albumPhotos.map(p => ({ node: p })) };
            
            if (albumPhotos.length < expectedCount) {
              console.log(`    ⚠️  Only retrieved ${albumPhotos.length}/${expectedCount} photos`);
            }
          }
        } else {
          console.log(`    ⚠️  No photos found (expected ${expectedCount})`);
        }
        
        await this.delay(100);
      }
    }
    
    console.log(`✅ Downloaded and embedded ${featuredCount} featured images and ${albumPhotoCount} album photos\n`);
    return events;
  }
}
