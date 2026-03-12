# TIEF-12: Blog Post View, Library & Editor

> Create the blog post reading experience, the library screen with filtering, and the blog post editor with markdown export.

## Prerequisites
- TIEF-11 completed (edge functions for blog generation exist)

## Reference
- Product spec §2.0.6 (Blog Post Rendering), §4.6 (Blog Post View), §4.7 (Library Screen), §8.1 (Markdown Export)

## Available Tools
Use these tools proactively throughout this phase:
- **context7 MCP** (`/context7`): Look up `react-native-markdown-display` for custom style rules and rendering config. Look up `expo-file-system` for `writeAsStringAsync` and `cacheDirectory`. Look up `expo-sharing` for `shareAsync` API.
- **Skill: `expo-app-design:building-native-ui`**: Invoke for editorial typography patterns, SectionList usage, search UI, and pull-to-refresh.

---

- [x] **Create blog post view screen at `src/app/post/[id].tsx`.** ✅ Implemented at `src/app/post/[id]/index.tsx` (directory route). Includes full editorial reading layout, markdown rendering with custom serif typography, generating/error states, transcript modal, and header with back/edit/share actions. This is the editorial reading experience — the blog post should feel like a beautifully typeset article, per spec §2.0.6:

**Layout** — `ScrollView` with centered content column:

1. **Header:**
   - Back button (← Back) top-left, `uiSmall` secondary text
   - Action buttons top-right: "Edit" and "Share" as ghost buttons with icons

2. **Title section** (generous top margin, 48px below header):
   - Title in `display` serif typography (32px), warm near-black
   - Thin divider line below (16px gap)
   - Metadata: "March 12, 2026 · 12 min talk" in `caption` textTertiary
   - Tags: `#creativity #constraints #art` in `caption` with accent color, tappable (for filtering later)

3. **Body content** — The actual blog post, rendered as rich markdown:
   - Use `react-native-markdown-display` with custom style rules:
     - Body text: serif font, 17px, lineHeight 1.6 (spec §2.0.6)
     - Paragraphs: generous spacing (marginBottom 24px, ~ 1.5em)
     - Headings: serif font, scaled (h2: 22px, h3: 19px), with 32px top margin
     - **Pull quotes / blockquotes:** larger text (20px), italic, with left border (3px accent color), 24px left padding. These should feel special.
     - Bold/italic: proper weight/style
     - Links: accent color, underlined
   - Max content width: 640px (`maxWidth: 640, alignSelf: 'center'`)
   - Horizontal padding: 24px
   - Think: "The reading experience of a Substack post or a well-designed personal blog"

4. **Footer section** (below blog content, separated by 48px):
   - "From this conversation" section header in `uiSmall` secondary
   - "📄 View full transcript" — navigable link that expands inline or opens a modal
   - Export button: "📤 Export as Markdown" — Card-style button

**Data loading:**
- Get `id` from route params
- Load blog post from local DB: `getBlogPost(db, id)`
- If post status is 'generating', show a warm message: "Your post is still being written..." with a gentle animation
- If post not found, show error state

**Transcript view:**
- When "View full transcript" is tapped, show the conversation messages in a modal or expandable section
- Each message: role label ("You:" / "tief.:"), content, timestamp
- Simple list, no bubbles — just clean formatted text

- [x] **Create the library screen at `src/app/(tabs)/library.tsx`.** ✅ Full library implementation with SectionList grouped by time period (This Week/Last Week/This Month/Older), horizontal category filter chips, debounced search mode, BlogCard component at `src/components/blog/BlogCard.tsx`, pull-to-refresh with haptic feedback, empty state with CTA, and navigation to post view. Replace the placeholder with the full library per spec §4.7:

**Layout:**

1. **Header:**
   - "Your Library" in `title` serif, left-aligned
   - Search icon (🔍) top-right, opens search mode

2. **Category filter chips** — Horizontal ScrollView:
   - "All" chip (always first, selected by default)
   - One chip per TopicCategory from constants, using category colors when selected
   - Use `Chip` component from UI primitives
   - Tapping a chip filters the list

3. **Search mode** (when search icon tapped):
   - TextInput slides in from top, replacing the title
   - Search across blog post titles and content
   - Results update as user types (debounced 300ms)
   - "✕" to close search and return to normal view

4. **Blog post list** — `SectionList` grouped by time period:
   - Sections: "This Week", "Last Week", "This Month", "Older"
   - Use date-fns to compute sections: `isThisWeek()`, `isLastWeek()` (custom), `isThisMonth()`
   - Section headers: `uiSmall` textSecondary, uppercase

5. **Blog card** (list item) — Create `src/components/blog/BlogCard.tsx`:
   ```typescript
   interface BlogCardProps {
     post: BlogPost;
     onPress: () => void;
   }
   ```
   - Title in `titleSmall` serif
   - Metadata: date + tags in `caption` textTertiary
   - First line preview: first ~80 chars of content in `body` textSecondary, truncated with ellipsis
   - Left border accent using category color (thin 3px bar)
   - Padding: 16px vertical
   - Bottom separator: thin border

6. **Empty state** (no posts yet):
   - Centered content
   - "No posts yet" in `title` serif
   - "Start a conversation and your thoughts will appear here." in `body` secondary
   - Primary button: "Start a Conversation →" navigates to home

**Data loading:**
- `getAllBlogPosts(db, selectedCategory)` — filtered by category if not "All"
- `searchBlogPosts(db, query)` — when in search mode
- Refresh on focus with `useFocusEffect`
- Pull-to-refresh: sync blog posts from Supabase, haptic at threshold

Tap on card navigates to `post/[id]`.

- [ ] **Create blog post editor at `src/app/post/[id]/edit.tsx` and markdown export/sharing.**

**Editor (`post/[id]/edit.tsx`):**
- Simple markdown editor — NOT a WYSIWYG rich text editor. Just a large TextInput with markdown syntax.
- Layout:
  - Header: "← Cancel" (left), "Save" button (right, primary)
  - Title input: large serif text, editable
  - Content: full-screen multiline TextInput, monospace or serif font, 16px
  - Tags: editable text input below content, comma-separated
- On Save:
  1. Update blog post in local DB: `updateBlogPost(db, id, { title, content, tags, edited_at, status: 'edited' })`
  2. Mark for sync (synced_at = null)
  3. Navigate back to post view
  4. Haptic: `impactAsync(Light)`

**Markdown export (in post/[id].tsx share action):**
When user taps "Share" on the blog post view:
1. Generate markdown string per spec §8.1:
   ```
   # {title}\n\n*{date} · tief.*\n*Tags: {tags}*\n\n---\n\n{content}
   ```
2. Write to a temp file using `expo-file-system`:
   ```typescript
   import * as FileSystem from 'expo-file-system';
   import * as Sharing from 'expo-sharing';

   const fileUri = FileSystem.cacheDirectory + `${slugify(title)}.md`;
   await FileSystem.writeAsStringAsync(fileUri, markdownContent);
   await Sharing.shareAsync(fileUri, { mimeType: 'text/markdown', dialogTitle: 'Share your post' });
   ```
3. This opens the iOS share sheet with the .md file
4. Haptic: `impactAsync(Light)` on share

Create a `slugify` utility in `src/lib/text-utils.ts`: converts title to lowercase, replaces spaces with hyphens, removes special chars.

Verify all blog screens render and the edit flow saves correctly. `npx tsc --noEmit` should pass.
