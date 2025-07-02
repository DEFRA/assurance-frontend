# Visitor Tracking Implementation

## Overview

A clean, integrated visitor tracking solution that leverages your existing session infrastructure to track **unique visitors** and **project access** using AWS Embedded Metrics.

## What's Implemented

### ✅ **Automatic Tracking** (Zero Configuration Required)

- **Unique Visitors**: Automatically tracked when someone first visits any page
- **Page Views**: All page visits are logged with visitor context
- Uses your existing session cookie and cache infrastructure

### ✅ **Project Access Tracking** (One-Line Integration)

- Track when users view specific projects
- Includes project metadata (name, phase, status)
- Works for both authenticated and anonymous users

### ✅ **Search Tracking** (Already Integrated)

- Home page search queries and results
- Easy to extend to other search areas

## CloudWatch Metrics Generated

1. **`UniqueVisitors`** - New visitors to your site
2. **`PageViews`** - All page visits with visitor context
3. **`ProjectAccess`** - When users view specific projects
4. **`SearchQuery`** - Search terms and results

## How to Use

### Project Access Tracking

```javascript
import { trackProjectView } from '~/src/server/common/helpers/analytics.js'

// In any route handler
await trackProjectView(request, projectId, {
  projectName: project.name,
  projectPhase: project.phase,
  projectStatus: project.status
})
```

### Search Tracking

```javascript
import { trackProjectSearch } from '~/src/server/common/helpers/analytics.js'

// Track search queries
await trackProjectSearch(request, searchTerm, resultCount)
```

### Custom Tracking

```javascript
import { analytics } from '~/src/server/common/helpers/analytics.js'

// Track any custom project-related action
await analytics.trackProjectAccess(request, projectId, 'download', {
  fileName: 'project-report.pdf'
})
```

## Files Modified

1. **`src/server/auth/plugin.js`** - Added visitor session management
2. **`src/server/common/helpers/analytics.js`** - New analytics service
3. **`src/server/home/controller.js`** - Added search tracking
4. **`src/server/projects/controller.js`** - Added project view tracking

## Key Benefits

✅ **Single Cookie**: Uses existing session infrastructure  
✅ **Clean API**: Simple functions for common tracking needs  
✅ **Privacy Friendly**: Minimal data stored (anonymous IDs only)  
✅ **Production Ready**: Integrated error handling and logging  
✅ **Non-Intrusive**: Won't break requests if tracking fails

## Example CloudWatch Queries

```sql
-- Unique visitors per day
SELECT COUNT(*) FROM UniqueVisitors
WHERE timestamp >= '2024-01-01'
GROUP BY DATE(timestamp)

-- Most accessed projects
SELECT projectId, projectName, COUNT(*) as views
FROM ProjectAccess
GROUP BY projectId, projectName
ORDER BY views DESC

-- Search conversion rate
SELECT searchTerm,
       COUNT(*) as searches,
       SUM(CASE WHEN hasResults = true THEN 1 ELSE 0 END) as successful_searches
FROM SearchQuery
GROUP BY searchTerm
```

## What's NOT Included

- ❌ No separate visitor tracking plugin
- ❌ No additional database tables
- ❌ No complex configuration
- ❌ No PII collection

The solution is minimal, focused, and integrates seamlessly with your existing architecture.
