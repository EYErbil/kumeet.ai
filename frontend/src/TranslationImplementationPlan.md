# Kumeet.ai Translation Implementation Plan

This document outlines the strategy for implementing translations throughout the application using react-i18next.

## Core Components to Update

Implement translations in these key components first to have the most impact:

1. **Layout Components**
   - MainLayout.js - Navigation, sidebar, header
   - Footer components
   
2. **Page Components**
   - Dashboard.js
   - MeetingList.js
   - MeetingDetail.js
   - ActionItems.js
   - Notes.js
   
3. **UI Components**
   - Buttons, forms, modals, etc.
   - Notification components
   - Card components

## Implementation Process

For each component:

1. **Import the translation hook**
   ```javascript
   import { useTranslation } from 'react-i18next';
   
   function YourComponent() {
     const { t } = useTranslation();
     // ...
   }
   ```

2. **Replace hardcoded strings**
   ```javascript
   // Before
   <h1>Dashboard</h1>
   
   // After
   <h1>{t('dashboard.title')}</h1>
   ```

3. **Add dynamic content with parameters**
   ```javascript
   // For strings with variables
   <p>{t('dashboard.welcomeMessage', { username: user.name })}</p>
   ```

4. **Add translations to JSON files**
   - Add all keys to `en.json` first
   - Then add translations for other supported languages

## Example Implementation

**MainLayout.js**
```javascript
import { useTranslation } from 'react-i18next';

function MainLayout() {
  const { t } = useTranslation();
  
  return (
    <div>
      <nav>
        <a href="/dashboard">{t('navigation.dashboard')}</a>
        <a href="/meetings">{t('navigation.meetings')}</a>
        <a href="/notes">{t('navigation.notes')}</a>
        <a href="/action-items">{t('navigation.actionItems')}</a>
        <a href="/settings">{t('navigation.settings')}</a>
      </nav>
      {/* ... */}
    </div>
  );
}
```

## Priority Order

Implement translations in this order:

1. Navigation and common UI elements
2. Dashboard page
3. Meeting pages
4. Action Items and Notes
5. Settings pages
6. Login/Registration pages
7. Error pages

## Testing

After implementing translations for each component:

1. Test in all supported languages
2. Check for missing translations
3. Verify text fits in UI elements (some languages have longer words)
4. Test special characters and RTL languages

## Common Gotchas

- Text expansion: Some languages require more space than English
- Pluralization: Use i18next's pluralization for count-based text
- Date/time formats: Use i18next's formatting for dates and times
- Button labels: Ensure they fit within buttons
- Input placeholders: Keep them concise

## Best Practices

1. Use dot notation for key hierarchy (e.g., `dashboard.welcomeMessage`)
2. Group related translations together
3. Use parameters for dynamic content
4. Add comments in translation files for context
5. Keep translations concise where possible 