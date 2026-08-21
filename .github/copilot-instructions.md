# Copilot Instructions for SOLIDAkanri

## Project Overview

**SOLIDAkanri** is a kanban-board-based book inventory management system. It tracks books through a 5-stage workflow (積読 → 読了 → 搬入する → 搬入済み → 売れた) and automatically calculates profit margins based on cost and selling price. All data persists in browser localStorage.

## Architecture

### Core Structure
- **Single-Page Application (SPA)** using vanilla JavaScript (no frameworks)
- **Kanban board**: 5 columns, each with its own `data-status` attribute matching stage names (all in Japanese)
- **Data model**: Book objects with `{title, cost, price, status, createdAt}`
- **Profit calculation**: Automatically derived as `price - cost` when both values exist

### Data Flow
1. **Input** → Form collects title, cost, price
2. **Storage** → `getBooks()`/`saveBooks()` handle localStorage serialization/deserialization
3. **Rendering** → `renderKanban()` filters books by status and calls `createCard()` for each
4. **Drag & Drop** → Cards update their `status` property when dropped into different lists
5. **Persistence** → All changes immediately save to localStorage via `saveBooks()`

### Key Modules
- **Data Access**: `getBooks()`, `saveBooks()`
- **Rendering**: `renderKanban()`, `createCard()`
- **Business Logic**: `addBook()`, `deleteBook()`, `escapeHtml()`
- **Drag Handlers**: `handleDragStart()`, `handleDragEnd()`, `setupDropZones()`
- **Form Handler**: DOMContentLoaded event listener processes form submissions

## Code Conventions

### Naming
- Japanese status names are canonical (積読, 読了, 搬入する, 搬入済み, 売れた); do not translate
- CSS class names use kebab-case (`kanban-card`, `card-title`, `drag-over`)
- Function names are camelCase; prefixed descriptively (`add*`, `delete*`, `render*`, `handle*`)
- DOM element IDs match input names (`#title`, `#cost`, `#price`)

### Numbers & Currency
- Input amounts use `type="number"` with `step="0.01"` for yen precision
- Display uses `Number.toLocaleString()` for comma-separated thousands (Japanese locale)
- Null/undefined values display as `¥—` (em-dash) for missing data
- Profit color-coding: green (positive) with class `.positive`, red (negative) with class `.negative`

### HTML & Security
- Use `escapeHtml()` for all user-input display to prevent XSS
- Event handlers use `e.stopPropagation()` where needed to prevent bubbling
- Form validation uses built-in HTML5 `required` attribute; title is the only required field

### Storage
- `STORAGE_KEY = 'kanban_books_v2'` (version suffix supports schema migrations)
- Errors in localStorage parsing fall back gracefully to empty array
- No explicit error handling for full localStorage quota

### Drag & Drop
- Global `draggedCard` variable tracks the active drag source
- `.drag-over` class added to drop target for visual feedback
- Dragged card gets `.dragging` class for opacity reduction
- Drop handler re-indexes all books after status change (potential inefficiency for large datasets)

### Responsive Design
- CSS Grid: 5 columns on desktop, 1 column on mobile (<768px)
- No external UI framework; all styles use CSS custom properties (--bg, --card, --accent, --border)
- Overflow-x handled at kanban-board level for horizontal scrolling on small screens

## Adding Features

### Add a New Field to Books
1. Update form in `index.html` with new `<input>`
2. Extract value in DOMContentLoaded form handler
3. Add to book object passed to `addBook()`
4. Update `createCard()` to display in card UI
5. Add CSS for new element if needed
6. No migration needed; old books will have undefined values (handle gracefully)

### Add a New Kanban Status
1. Update the `statuses` array in `renderKanban()` (line ~17)
2. Add corresponding `<div class="kanban-list">` in `index.html`
3. Update `addBook()` default status if necessary
4. No other changes required; drag/drop works generically on `data-status`

### Handle Large Datasets
- Current implementation filters books on every render (`renderKanban()`)
- For 1000+ books, consider:
  - Caching filtered results
  - Virtual scrolling within columns
  - IndexedDB instead of localStorage (localStorage ~5MB limit)
  - Remove the `books.indexOf(b)` lookup in `renderKanban()` (O(n²) complexity)

### Improve Profit Tracking
- Profit is ephemeral (not stored); consider adding `profitHistory` array
- For analytics, track when books transition to "売れた" with timestamp
- Current profit calculation assumes single cost/price; doesn't handle restocks

## Debugging

### localStorage Issues
```javascript
// Check current data
JSON.parse(localStorage.getItem('kanban_books_v2'))

// Clear all data
localStorage.removeItem('kanban_books_v2')

// Manually inspect a book
const books = getBooks()
console.log(books[0])
```

### Drag & Drop Not Working
- Verify `setupDropZones()` is called in DOMContentLoaded
- Check browser console for errors in event handlers
- Ensure `draggable="true"` is set on cards in `createCard()`
- Test with different browsers (some have quirky drag/drop implementations)

### Display Issues
- If profit shows `¥—`, check that both `cost` and `price` are non-null (not just falsy)
- For missing money values, verify form is capturing numbers correctly (type="number")
- CSS Grid columns: ensure 5 columns fit viewport; mobile fallback hides overflow

## Language & Localization

This project is Japanese-only (UI, status names, class names). All hardcoded strings are in Japanese; do not translate them. If internationalization is needed in the future, externalize strings to a `i18n.js` module.

## Performance Notes

- No performance critical operations for typical user volumes (<100 books)
- Drag handler `e.dataTransfer.effectAllowed = 'move'` is set but functionally equivalent to copy for this app
- Re-rendering entire board on each change is acceptable; optimize only if user reports lag with 1000+ books
