// TypeScript interfaces for Meetup GraphQL API responses

export interface MeetupApiResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: {
      code: string;
      consumedPoints?: number;
      resetAt?: string;
    };
  }>;
}

export interface PageInfo {
  endCursor: string;
  hasNextPage: boolean;
}

export interface Venue {
  id?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface EventHost {
  memberId: string;
  name: string;
}

export interface Photo {
  id: string;
  baseUrl: string;
}

export interface Member {
  id: string;
  name: string;
}

export interface RsvpNode {
  id: string;
  member: Member;
}

export interface RsvpEdge {
  node: RsvpNode;
}

export interface RsvpConnection {
  totalCount: number;
  edges: RsvpEdge[];
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  dateTime: string;
  duration?: string;
  eventUrl: string;
  eventType?: string;
  venue?: Venue;
  featuredEventPhoto?: Photo;
  eventHosts?: EventHost[];
  rsvps?: RsvpConnection;
  going?: number;
  maxTickets?: number;
  isOnline?: boolean;
}

export interface EventEdge {
  node: Event;
}

export interface EventsConnection {
  totalCount: number;
  pageInfo: PageInfo;
  edges: EventEdge[];
}

export interface Group {
  id: string;
  name: string;
  urlname: string;
  events?: EventsConnection;
}

export interface GroupByUrlnameData {
  groupByUrlname: Group;
}

export interface ArchiveMetadata {
  archivedAt: string;
  groupUrlname: string;
  groupId: string;
  groupName: string;
  totalEvents: number;
  pastEvents: number;
  upcomingEvents: number;
}

export interface ArchiveOutput {
  metadata: ArchiveMetadata;
  events: Event[];
}

export type EventStatus = 'PAST' | 'UPCOMING';
