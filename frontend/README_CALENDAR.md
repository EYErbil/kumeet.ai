# Calendar Integration - Frontend

This document provides information about the calendar integration feature in the frontend, which allows users to connect their Google and Outlook calendars and add meetings and action items to them.

## Features

- Connect to Google Calendar and Microsoft Outlook Calendar
- Add meetings to connected calendars
- Add action items to connected calendars as tasks
- Manage calendar connections in the Settings page

## Components

### Calendar API Service

The calendar API service (`src/services/api/calendar.js`) provides functions to interact with the backend calendar API. For development purposes, it includes mock implementations that can be used without a backend.

```javascript
import { getCalendarStatus, getGoogleCalendarAuthUrl, getOutlookCalendarAuthUrl } from './services/api/calendar';
```

### Calendar Integration Service

The calendar integration service (`src/services/calendarIntegration.js`) provides higher-level functions to integrate meetings and action items with calendars.

```javascript
import { isCalendarAvailable, addMeetingToCalendar, addActionItemToCalendar } from './services/calendarIntegration';
```

### Calendar Components

- `AddToCalendarButton`: A button component that can be used to add meetings and action items to calendars.
- `CalendarCallback`: A component that handles OAuth callbacks from Google and Outlook.

```javascript
import { AddToCalendarButton, CalendarCallback } from './components/calendar';
```

## Usage

### Adding the Calendar Button to a Meeting

```jsx
import { AddToCalendarButton } from '../components/calendar';

// In your component
return (
  <div>
    <h2>{meeting.title}</h2>
    <AddToCalendarButton 
      item={meeting} 
      type="meeting" 
    />
  </div>
);
```

### Adding the Calendar Button to an Action Item

```jsx
import { AddToCalendarButton } from '../components/calendar';

// In your component
return (
  <div>
    <p>{actionItem.text}</p>
    <AddToCalendarButton 
      item={actionItem} 
      type="action-item" 
    />
  </div>
);
```

### Required Item Properties

#### Meeting

```javascript
const meeting = {
  id: "123",
  title: "Weekly Team Meeting",
  startTime: "2024-04-29T15:00:00", // ISO date string
  endTime: "2024-04-29T16:00:00",   // ISO date string
  description: "Weekly team sync meeting",
  attendees: [
    { email: "user1@example.com", name: "User 1" },
    { email: "user2@example.com", name: "User 2" }
  ]
};
```

#### Action Item

```javascript
const actionItem = {
  id: "456",
  title: "Complete project proposal",
  dueDate: "2024-05-01" // Date string or Date object
};
```

## Integration Settings

Users can connect and manage their calendar integrations in the Settings page under the "Integrations" tab. The integration settings component (`src/components/settings/IntegrationSettings.js`) provides a user interface for connecting and disconnecting calendars.

## OAuth Flow

1. User clicks "Connect" for Google or Outlook calendar in the Settings page
2. User is redirected to the authorization page for the selected calendar provider
3. After authorization, the user is redirected back to the application
4. The `CalendarCallback` component handles the callback and exchanges the authorization code for access and refresh tokens
5. The tokens are stored in the backend for future use

## Development Mode

For development purposes, the calendar integration can be used with mock data by setting the `useMock` parameter to `true` in the API calls:

```javascript
const calendarStatus = await getCalendarStatus(true); // Use mock data
const authUrl = await getGoogleCalendarAuthUrl(true); // Use mock data
const result = await addMeetingToCalendar(meeting, 'google', true); // Use mock data
``` 