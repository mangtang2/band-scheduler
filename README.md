# Band Practice Scheduling Web App

A mobile-first web application for coordinating band practice schedules based on member availability and song requirements.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **State Management**: Zustand
- **UI Components**: Shadcn/UI

## Features

- **Room Creation**: Admin creates rooms with date ranges, members, and songs
- **Availability Input**: Members select their availability via touch/click-and-drag
- **Smart Recommendations**: Algorithm finds best practice times based on:
  - Member availability overlap
  - Song-specific member requirements
  - Minimum duration filtering
  - Participant count prioritization

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Setup

Run the SQL schema in your Supabase dashboard (see `supabase/schema.sql`)

### 4. Run Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
/app
  /create-room          # Room creation flow
  /room/[id]            # Member availability input
  /room/[id]/results    # Results and recommendations
/components
  /ui                   # Shadcn/UI components
  /availability-grid    # Touch/drag selection grid
  /results-heatmap      # Availability visualization
/lib
  /supabase             # Supabase client
  /store                # Zustand state management
  /utils                # Helper functions & algorithm
```

## Core Algorithm

The recommendation system:
1. Calculates time block intersections for members assigned to each song
2. Filters out blocks shorter than minimum duration
3. Sorts by participant count (descending) then duration (descending)
4. Presents ranked list of optimal practice times per song

## Mobile-First Design

- Touch and drag support for time selection
- Responsive grid layout (30-minute intervals)
- Optimized for smartphone screens
- No login required - name-based identification
