# Meetup archive JSON format

Use this document when implementing a parser for archives produced by this repository. The implementation references are `src/types.ts`, `src/queries.ts`, `src/meetupClient.ts`, and `src/utils.ts`.

## File structure

The archive is one UTF-8 JSON object, with `metadata` and `events` properties. It is not JSON Lines and has no schema-version field. Events are plain objects in an array; they are not wrapped in GraphQL edges at the top level.

```json
{
  "metadata": {
    "archivedAt": "2026-10-26T12:00:00.000Z",
    "groupUrlname": "example-group",
    "groupId": "12345",
    "groupName": "Example Group",
    "totalEvents": 1,
    "pastEvents": 1,
    "upcomingEvents": 0
  },
  "events": [
    {
      "id": "98765",
      "title": "Example event",
      "dateTime": "2026-10-01T18:00:00+03:00",
      "eventUrl": "https://www.meetup.com/example-group/events/98765/",
      "description": "An example **Markdown** description.",
      "venues": [],
      "eventHosts": [],
      "rsvps": { "totalCount": 0, "edges": [] }
    }
  ]
}
```

This is an illustrative minimal example. Actual events have additional fields and may contain nulls.

## Metadata

`archivedAt` is the archive creation timestamp in UTC ISO 8601 format. `groupUrlname` is the group's URL slug; `groupId` and `groupName` identify the group. The three count fields are numbers describing exported events, after the app's filtering. Upcoming-event retrieval can fail while an archive is still produced, so zero upcoming events does not establish that none exist on Meetup.

## Event fields

Keep IDs as strings. Handle optional fields as missing or null: API data is saved without runtime schema validation, and the TypeScript interfaces do not describe every possible API null.

| Field | Shape and meaning |
| --- | --- |
| `id`, `title`, `eventUrl` | Strings identifying and describing the event. |
| `dateTime` | Start date/time string; preserve any timezone offset when parsing. |
| `endTime`, `createdTime` | Optional date/time strings. |
| `description` | Optional text; the included renderer interprets it as Markdown. May contain escaped characters and HTML entities. |
| `duration` | Declared as a string; passed through from the API. The exporter does not normalize or document its units. |
| `eventType`, `status` | API strings; do not assume an exhaustive enum. |
| `maxTickets` | Optional numeric capacity. |
| `howToFindUs` | Optional directions text. |
| `venues` | Array of venue objects: `id`, `name`, `address`, `city`, `state`, `country`, `postalCode`, `lat`, `lon`, `venueType`. Coordinates are numbers; other listed fields are strings. |
| `eventHosts` | Array of `{ "memberId": "...", "name": "..." }`. |
| `rsvps` | `{ "totalCount": number, "edges": [{ "node": { "id": string, "member": { "id": string, "name": string } } }] }`. Do not assume the returned edges contain every attendee; the exporter does not paginate RSVPs. |
| `topics` | `{ "edges": [{ "node": { "id": string, "name": string } }] }`. |
| `speakerDetails` | Object containing `name`, optional `description`, and optional `photo` (`id`, `baseUrl`). Speaker photos are passed through without downloading. |
| `featuredEventPhoto` | Photo object with `id` and `baseUrl`; see below. |
| `photoAlbum` | Object with optional `id`, `title`, `photoCount`, and downloaded `photos`; see below. |

The interfaces also allow `venue` (singular, using `lng` for longitude), `going`, `isOnline`, and speaker `socialNetworks` (`network`, `url`). The current event query does not request these fields; tolerate them in other archives without requiring them.

## Photos and extracting image files

The exporter downloads the featured image at 676 x 380 and attempts to download up to **20 photos per event album** using the API's high-resolution URLs.

On successful download, a photo's `baseUrl` contains a complete data URI:

```text
data:image/jpeg;base64,<base64-encoded image bytes>
```

The MIME type comes from the response and need not be JPEG. Split the data URI at its first comma and base64-decode the part after it to recover bytes. Choose a file extension from the MIME type. Do not append an ID or dimensions to a data URI.

For a downloaded featured photo, `id` becomes an empty string. Album photos keep their IDs and are nested as:

```text
event.photoAlbum.photos.edges[i].node.id
event.photoAlbum.photos.edges[i].node.baseUrl
```

`photoAlbum.photoCount` is the API-reported album size, not the number of downloaded photos. Count the actual `photos.edges` entries for that. Album data may be absent even when `photoCount` is positive, because retrieval or downloads failed.

If the featured image download fails, its original `baseUrl` and `id` remain. For that URL-prefix representation, the current featured-image URL construction is `baseUrl + id + "/676x380.jpg"`. The HTML renderer also supports URL-prefix album photos with `/800x600.jpg` for the full image. These remain remote references, not embedded bytes. Images linked inside descriptions are not downloaded by the image-embedding routine.

## Parser guidance

- Parse with a standard JSON parser; allow unknown properties for compatibility.
- Iterate `archive.events`; unwrap `edges[].node` only for nested connections such as photos, topics, and RSVPs.
- Use empty arrays for missing/null collections, and check objects before reading nested properties.
- The current exporter sorts events from oldest to newest. Sort explicitly if a consumer needs a particular order, and do not assume IDs are unique without checking.
- Metadata counts describe the export, not a guarantee of complete Meetup history. The exporter excludes events hosted by `OWASP® Foundation`.
- Avoid printing entire photo data URIs in logs or prompts: they can make archives very large. Inspect field names, counts, and short prefixes instead.
- If rendering descriptions into HTML, sanitize the rendered output, as the app's renderer does.
