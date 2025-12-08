# TaskDetailModal Refactoring Guide

## Overview
The `TaskDetailModal.tsx` file is very large (2872 lines) and needs to be broken down into smaller, more manageable components.

## Components Created

### 1. TaskDetailHeader
- **Location**: `TaskDetailComponents/TaskDetailHeader.tsx`
- **Purpose**: Header section with epic navigation, viewed by, share, fullscreen, and close buttons
- **Props**: All header-related props including epic management, viewers, and action handlers

### 2. TaskTitleSection
- **Location**: `TaskDetailComponents/TaskTitleSection.tsx`
- **Purpose**: Title and description section with editing capabilities
- **Props**: Task data, expansion state, editing state, and handlers

### 3. Types
- **Location**: `TaskDetailComponents/types.ts`
- **Purpose**: Shared types for all TaskDetail components

## Components Still Needed

### 4. TaskSubtasksSection
- Extract lines ~932-1031 (subtasks section)
- Should include: subtasks table, progress bar, add subtask functionality

### 5. TaskRelatedTicketsSection
- Extract lines ~1033-1100 (related tickets section)
- Should include: parent, children, siblings, epic tickets display

### 6. TaskActivitySection
- Extract lines ~1122-1370 (activity section)
- Should include: activity tabs, comment input, comments list, history list
- This is a large section and will significantly reduce file size

### 7. TaskSidebar
- Extract lines ~1370-1792 (entire sidebar)
- Should include: status dropdown, details settings, and all detail fields

### 8. TaskDetailFields
- Extract the fields section from sidebar (Priority, Assignee, Tags, Parent, Dates, Branches)
- Can be used within TaskSidebar component

## Integration Steps

1. Import the new components in `TaskDetailModal.tsx`
2. Replace the corresponding JSX sections with component calls
3. Pass necessary props and handlers
4. Test each section after integration
5. Remove unused code and imports

## Example Integration

```tsx
// Before
<div className="flex items-center justify-between px-4 sm:px-6 py-3...">
  {/* Header content */}
</div>

// After
<TaskDetailHeader
  editedTask={editedTask}
  epicTicket={epicTicket}
  viewers={viewers}
  linkCopied={linkCopied}
  fullPage={fullPage}
  availableEpics={availableEpics}
  loadingEpics={loadingEpics}
  updatingEpic={updatingEpic}
  onNavigateToTask={onNavigateToTask}
  onClose={handleClose}
  onShare={handleShareTicket}
  onFullscreen={handleFullscreen}
  onLoadEpics={loadEpics}
  onSelectEpic={handleSelectEpic}
/>
```

## Benefits

- **Maintainability**: Smaller, focused components are easier to understand and modify
- **Reusability**: Components can be reused in other contexts
- **Testability**: Smaller components are easier to test
- **Performance**: Better code splitting opportunities
- **Collaboration**: Multiple developers can work on different components simultaneously

