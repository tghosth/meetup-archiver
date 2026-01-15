// GraphQL query definitions for Meetup API

import { EventStatus } from './types';

/**
 * GraphQL query to fetch events for a group with pagination
 * Includes comprehensive event data: venue, RSVPs, hosts, photos, etc.
 */
export function getGroupEventsQuery(
  urlname: string,
  first: number = 20,
  after: string | null = null,
  status: EventStatus = 'PAST'
): { query: string; variables: Record<string, any> } {
  const query = `
    query GetGroupEvents($urlname: String!, $first: Int!, $after: String, $status: EventStatus) {
      groupByUrlname(urlname: $urlname) {
        id
        name
        urlname
        events(first: $first, after: $after, status: $status) {
          totalCount
          pageInfo {
            endCursor
            hasNextPage
          }
          edges {
            node {
              id
              title
              description
              dateTime
              endTime
              createdTime
              duration
              eventUrl
              eventType
              status
              maxTickets
              howToFindUs
              featuredEventPhoto {
                id
                baseUrl
              }
              photoAlbum {
                id
                photoCount
                title
              }
              topics {
                edges {
                  node {
                    id
                    name
                  }
                }
              }
              speakerDetails {
                name
                description
                photo {
                  id
                  baseUrl
                }
              }
              venues {
                id
                name
                address
                city
                state
                country
                postalCode
                lat
                lon
                venueType
              }
              eventHosts {
                memberId
                name
              }
              rsvps {
                totalCount
                edges {
                  node {
                    id
                    member {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  return {
    query,
    variables: {
      urlname,
      first,
      after,
      status,
    },
  };
}

/**
 * Simple query to test authentication
 */
export function getSelfQuery(): { query: string } {
  return {
    query: `
      query {
        self {
          id
          name
          email
        }
      }
    `,
  };
}
