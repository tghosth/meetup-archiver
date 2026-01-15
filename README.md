# Meetup Archiver

A TypeScript CLI tool to archive all events from a Meetup.com group using the Meetup GraphQL API. Exports comprehensive event data including venue information, RSVPs, hosts, photos, and more to a well-formatted JSON file.

## Features

- ✅ Fetches **all** historic events (past & upcoming) from any Meetup group
- ✅ Uses Meetup's official GraphQL API
- ✅ Automatic pagination to retrieve complete event history
- ✅ Comprehensive event data extraction:
  - Event details (title, description, date, duration, URL)
  - Venue information (name, address, coordinates)
  - RSVP counts and attendee lists
  - Event hosts
  - Featured photos
  - Event type (in-person, online, hybrid)
- ✅ Clean JSON output with metadata
- ✅ HTML rendering of archived events with formatted descriptions
- ✅ Rate limiting protection
- ✅ Progress indicators

## Prerequisites

- Node.js (v18 or higher)
- npm
- A Meetup.com account
- Access token from Meetup.com

## Installation

1. **Clone or navigate to this directory:**
   ```bash
   cd meetup-archiver
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

## Getting Your Access Token

You need an access token from Meetup.com to use this tool. Here's the easiest way to get it:

### Method 1: Extract from Browser Cookies (Recommended)

1. **Log in to Meetup.com:**
   - Visit https://www.meetup.com and log in to your account

2. **Open Browser DevTools:**
   - Press `F12` (Windows/Linux) or `Cmd+Option+I` (Mac)

3. **Find the Cookie:**
   - Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
   - Navigate to **Cookies** → `https://www.meetup.com`
   - Look for a cookie named: `__meetup_auth_access_token`
   - Copy the **Value** of this cookie

4. **Add to .env file:**
   - Open the `.env` file in your text editor
   - Replace `your_token_here` with your copied token:
   ```
   MEETUP_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Method 2: Extract from Network Request

1. **Log in to Meetup.com:**
   - Visit https://www.meetup.com and log in

2. **Open DevTools and go to Network tab:**
   - Press `F12` and click the **Network** tab

3. **Visit the API Playground:**
   - Go to https://www.meetup.com/api/playground/

4. **Run any test query:**
   - Execute a simple query in the playground

5. **Find the API request:**
   - In the Network tab, find a request to `api.meetup.com/gql-ext`
   - Click on it and look at the **Request Headers**
   - Find the `Authorization` header
   - Copy the token after `Bearer ` (everything after "Bearer ")

6. **Add to .env file:**
   ```
   MEETUP_ACCESS_TOKEN=your_copied_token
   ```

### Verify Your Token Works

Test your token with this PowerShell command:

```powershell
$token = "YOUR_TOKEN_HERE"
$body = '{"query": "query { self { id name } }"}'
Invoke-RestMethod -Uri "https://api.meetup.com/gql-ext" -Method Post -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} -Body $body
```

If it works, you'll see your user ID and name. If it fails, you'll get an authentication error.

## Usage

### Basic Usage

Archive all events from a Meetup group:

```bash
npm run dev -- <group-urlname>
```

Or after building:

```bash
npm run build
npm start <group-urlname>
```

### Render HTML from an existing JSON archive

Convert a generated archive JSON into a nicely formatted HTML report (most recent first):

```bash
# Example: render the OWASP Israel archive you just created
npm run render -- output/owasp-israel-2026-01-14T07-02-25-976Z.json

# Optional: specify a custom output path
npm run render -- output/owasp-israel-2026-01-14T07-02-25-976Z.json ./output-html/owasp-israel.html
```

The HTML will be written to `output-html/<archive-name>.html` by default.

### Finding the Group URL Name

The group URL name is the identifier in the Meetup.com URL. For example:

- URL: `https://www.meetup.com/typescript-oslo/`
- Group URL name: `typescript-oslo`

- URL: `https://www.meetup.com/london-javascript-community/`
- Group URL name: `london-javascript-community`

### Example

```bash
npm run dev -- typescript-oslo
```

This will:
1. Authenticate with Meetup.com
2. Fetch all past events for the group
3. Fetch all upcoming events for the group
4. Combine and sort them chronologically
5. Save to `output/typescript-oslo-2026-01-14T12-30-45-123Z.json`

### Output

The tool creates a JSON file in the `output/` directory with this structure:

```json
{
  "metadata": {
    "archivedAt": "2026-01-14T12:30:45.123Z",
    "groupUrlname": "typescript-oslo",
    "groupId": "12345678",
    "groupName": "TypeScript Oslo",
    "totalEvents": 150,
    "pastEvents": 145,
    "upcomingEvents": 5
  },
  "events": [
    {
      "id": "276754274",
      "title": "TypeScript Workshop",
      "description": "Learn TypeScript basics...",
      "dateTime": "2025-03-15T18:00:00+01:00",
      "duration": "PT2H",
      "eventUrl": "https://www.meetup.com/typescript-oslo/events/276754274/",
      "eventType": "IN_PERSON",
      "going": 45,
      "maxTickets": 50,
      "venue": {
        "name": "Tech Hub Oslo",
        "address": "123 Main St",
        "city": "Oslo",
        "state": "Oslo",
        "country": "NO",
        "lat": 59.9139,
        "lng": 10.7522
      },
      "featuredEventPhoto": {
        "id": "495693322",
        "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"
      },
      "eventHosts": [
        {
          "memberId": "123456",
          "name": "John Doe"
        }
      ],
      "rsvps": {
        "totalCount": 45,
        "edges": [
          {
            "node": {
              "id": "rsvp_123",
              "member": {
                "id": "789012",
                "name": "Jane Smith"
              }
            }
          }
        ]
      }
    }
  ]
}
```

## Project Structure

```
meetup-archiver/
├── src/
│   ├── index.ts          # Main CLI entry point
│   ├── meetupClient.ts   # GraphQL API client with pagination
│   ├── queries.ts        # GraphQL query definitions
│   ├── renderHtml.ts     # HTML rendering for archived events
│   ├── types.ts          # TypeScript type definitions
│   ├── utils.ts          # File operations and utilities
│   └── __tests__/        # Unit and integration tests
│       ├── meetupClient.test.ts
│       ├── renderHtml.test.ts
│       └── utils.test.ts
├── output/               # Generated JSON files (created automatically)
├── output-html/          # Generated HTML files (created automatically)
├── .env                  # Your access token (DO NOT COMMIT)
├── .env.example          # Template for .env
├── .gitignore           # Git ignore rules
├── jest.config.js       # Jest configuration
├── package.json         # Project dependencies
├── tsconfig.json        # TypeScript configuration
└── README.md            # This file
```

## API Rate Limiting

The Meetup API has rate limits:
- **500 points per 60 seconds**
- The tool includes basic rate limit protection and will wait if approaching limits

## Troubleshooting

### "Authentication failed"
- Check that your `MEETUP_ACCESS_TOKEN` in `.env` is correct
- Try getting a fresh token from your browser
- Make sure you're logged into Meetup.com in your browser

### "Group not found"
- Verify the group URL name is correct
- Check that the group is public (private groups may not be accessible)
- Ensure you have permission to view the group

### Token Expiration
- Access tokens from cookies may expire
- If you get authentication errors, get a fresh token from your browser
- Some tokens expire after a few hours, others last longer

## Development

### Build the project:
```bash
npm run build
```

### Run in development mode:
```bash
npm run dev -- <group-urlname>
```

### Run compiled version:
```bash
npm start <group-urlname>
```

### Running Tests

This project includes comprehensive unit tests to ensure functionality works correctly.

**Run all tests:**
```bash
npm test
```

**Run tests in watch mode (for development):**
```bash
npm run test:watch
```

The test suite includes:
- **Unit tests** for utility functions (file operations, formatting, metadata)
- **Integration tests** for the Meetup API client (with mocked requests)
- **Tests** for HTML rendering and sanitization

### Continuous Integration

The project uses GitHub Actions to automatically run tests on:
- Every push to `main` or `develop` branches
- Every pull request targeting `main` or `develop` branches

Tests run on multiple Node.js versions (18.x and 20.x) to ensure compatibility.

## Technologies Used

- **TypeScript** - Type-safe JavaScript
- **Node.js** - Runtime environment
- **Axios** - HTTP client for GraphQL requests
- **Meetup GraphQL API** - Official Meetup API
- **dotenv** - Environment variable management
- **marked** - Markdown parser for rendering event descriptions
- **sanitize-html** - HTML sanitization for secure rendering
- **Jest** - Testing framework
- **ts-jest** - TypeScript support for Jest
- **ts-jest** - TypeScript support for Jest

## License

MIT

## Contributing

Feel free to open issues or submit pull requests!

## Notes

- The tool fetches **all available event data** from the Meetup API
- Events are sorted chronologically in the output
- RSVP lists may be truncated for very large events (API limitation)
- The tool respects Meetup's API rate limits

## Support

For issues with:
- **This tool**: Open an issue in this repository
- **Meetup API**: Visit https://www.meetup.com/api/support/
- **Getting your token**: See "Getting Your Access Token" section above
