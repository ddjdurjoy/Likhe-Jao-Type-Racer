# Design Guidelines: Likhe Jao Type Racer

## Design Approach

**Reference-Based Gaming Design** - Drawing inspiration from NitroType, Typeracer, and modern racing games while creating a unique Bengali-friendly competitive typing experience. Focus on clarity during gameplay, excitement, and cultural inclusivity.

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16** for consistent rhythm
- Micro spacing (gaps, padding): 2, 4
- Component spacing: 6, 8
- Section spacing: 12, 16
- Screen padding: 6 (mobile), 8 (desktop)

**Container Strategy**:
- Game screens: Full viewport height (h-screen) with fixed layouts
- Race area: 60-70% viewport for track/cars, 30-40% for input/stats
- Modal overlays: max-w-2xl centered
- Mobile: Stack vertically, full-width components

## Typography

**Font Families**:
- **Primary (English)**: 'Inter' or 'DM Sans' - clean, readable at speed
- **Bangla**: 'Noto Sans Bengali' or 'Kalpurush' - proper Unicode rendering
- **Display/Headers**: 'Orbitron' or 'Rajdhani' - gaming aesthetic for titles

**Hierarchy**:
- **Screen Titles**: text-4xl md:text-5xl font-bold
- **Section Headers**: text-2xl md:text-3xl font-semibold
- **Stats (WPM/Accuracy)**: text-3xl md:text-4xl font-bold (high visibility)
- **Body/Instructions**: text-base md:text-lg
- **Typing Input**: text-xl md:text-2xl (critical readability)
- **Word Display**: text-2xl md:text-3xl font-medium (racing text)

## Core Screen Layouts

### Home Screen
- **Hero Section**: Full-screen centered layout (h-screen flex items-center justify-center)
- Game logo/title at top third
- Primary CTA buttons in center (Play Solo, Multiplayer, Practice)
- Quick stats bar at bottom (Total Races, Best WPM, Rank)
- Background: Subtle animated gradient or racing track perspective

### Race Screen (Critical Layout)
**Top Bar** (h-16, fixed):
- Countdown timer (center)
- Current position indicator (left)
- Exit race button (right)

**Race Track Area** (60% height):
- 4 horizontal lanes (perspective CSS transform)
- Car icons positioned by progress (0-100%)
- Finish line on right edge
- Lane numbers/player names on left

**Typing Interface** (40% height, bottom fixed):
- **Text Display**: Large, center-aligned, current word highlighted
- **Input Field**: Underneath text, full-width, minimal border
- **Stats Bar**: WPM, Accuracy, Progress (horizontal flex, space-between)
- Completed/incorrect character indicators

### Garage/Car Selection
- Grid layout: grid-cols-2 md:grid-cols-3 lg:grid-cols-4
- Card-based car showcase with hover lift effect
- Selected car: border highlight + checkmark
- Car details panel (right sidebar on desktop, bottom sheet on mobile)

### Leaderboard Screen
- Tabbed interface: All-Time, Daily, Weekly, Friends
- Table layout with alternating row backgrounds
- Top 3: Special styling (larger, medals/icons)
- Current user: Sticky highlight row
- Filters: Language toggle, Difficulty selector (top bar)

### Practice Mode
- Left sidebar (30%): Category selection (Common Words, Quotes, Code, etc.)
- Main area (70%): Typing interface (similar to race but simplified)
- Stats panel: Session summary (right overlay or bottom)

## Component Library

### Buttons
**Primary Action** (Race Start, Join Room):
- px-8 py-4, text-lg font-semibold
- Rounded-lg, full shadow
- Width: w-full (mobile), w-auto (desktop)

**Secondary** (Settings, Back):
- px-6 py-3, text-base
- Rounded-md, subtle border

**Icon Buttons** (Volume, Theme Toggle):
- p-3, rounded-full, square (w-12 h-12)

### Cards
**Standard Card** (Achievements, Stats):
- p-6, rounded-xl, shadow-lg
- Border: 2px solid (transparent by default)

**Car Selection Card**:
- p-4, rounded-lg, aspect-square
- Hover: scale-105 transform, shadow-xl

### Input Fields
**Typing Input** (Race/Practice):
- Border: 3px solid (thick for visibility)
- Rounded-lg, px-6 py-4
- Focus: No ring (distracting), border accent change only
- Font size: text-xl minimum, monospace option for accuracy

**Form Inputs** (Username, Room Code):
- Standard height: h-12
- Rounded-md, px-4

### Progress Indicators
**Race Progress Bar**:
- Height: h-2 or h-3 (thin but visible)
- Rounded-full
- Positioned: Absolute within race track or above stats

**WPM Meter**:
- Circular gauge or horizontal bar with threshold markers
- Size: w-24 h-24 (circular), w-full h-8 (bar)

### Modals/Overlays
**Race Results**:
- Full-screen overlay with backdrop blur
- Centered card: max-w-lg, p-8
- Podium layout for multiplayer (3 columns)
- Action buttons at bottom

**Settings Panel**:
- Slide-in from right (desktop) or bottom sheet (mobile)
- w-80 (desktop), full-width (mobile)

## Race-Specific Design Patterns

### Car Animations
- **Movement**: Smooth translate-x transitions (duration-300)
- **Positioning**: Absolute positioning within lanes, left percentage based on progress
- **Visual Feedback**: Slight bounce on position change, exhaust particles when boosting

### Text Display System
**Current Word**:
- Large, center-aligned
- Correct characters: opacity-100
- Incorrect: specific styling (underline red)
- Upcoming words: opacity-50, smaller size

**Completed Words**:
- Fade out or scroll up effect
- Keep last 2-3 visible for context

### Countdown Sequence
- Full-screen overlay
- Numbers: text-9xl font-bold
- Animation: Scale from 0 to 1.2 to 1, fade out
- Duration: 1 second per number (3-2-1-GO!)

### Position Indicators
- Player positions: Badges (1st, 2nd, 3rd, 4th) next to car names
- Size: w-8 h-8 rounded-full
- Placement: Floating above car or in lane label

## Multi-Language Support

**Bangla Specifics**:
- Font loading: Noto Sans Bengali (400, 600, 700 weights)
- Increased line-height for proper rendering (leading-relaxed)
- Text alignment: Center for typing display
- Input field: lang="bn" attribute, proper Unicode support

**Language Toggle**:
- Prominent position (top navigation)
- Flag icons or EN/বাং text
- Instant switching without reload

## Mobile Optimization

**Responsive Breakpoints**:
- Mobile: < 768px (stack all elements)
- Tablet: 768px-1024px (hybrid layouts)
- Desktop: > 1024px (full racing view)

**Mobile-Specific Adjustments**:
- Race track: Vertical orientation option (cars move up instead of right)
- Stats: Condensed horizontal bar (icons + numbers only)
- Touch targets: Minimum 44px height for all interactive elements
- Virtual keyboard consideration: Input field fixed at bottom, content scrollable

## Sound & Feedback

**Visual Feedback** (since sounds are separate):
- Keypress: Subtle flash on input border (duration-75)
- Correct word: Green checkmark animation
- Error: Red shake animation (animate-shake)
- Power-up: Glow effect around car (duration-500)

## Images

**Hero Section**: Large background image of racing track perspective (aerial view) with motion blur effect, overlaid with semi-transparent gradient. Place primary CTAs on top with backdrop-blur-md bg-white/20 treatment.

**Car Designs**: Vector-style SVG illustrations of 5 distinct car types (sports car, vintage racer, truck, formula 1, futuristic). Each 200x100px minimum, side profile view.

**Empty States**: Illustration for "No races yet" in leaderboard, "Select a car" in garage - friendly, minimalist line art style.

**Achievement Badges**: Icon-based designs (trophy, lightning, target) in circular containers, 64x64px.

## Accessibility Notes

- Maintain WCAG AA contrast for all text over backgrounds
- Keyboard navigation: Tab through all interactive elements, Enter/Space to activate
- Focus indicators: 2px solid outline with offset
- Screen reader: Proper ARIA labels for race progress, position updates
- Reduce motion: Respect prefers-reduced-motion for all animations