# Club Statistics Feature

## Overview

The Club Statistics feature provides comprehensive analytics and insights for padel clubs, allowing users to analyze club performance, player statistics, and compare clubs side-by-side.

## Features

### 1. General Information
- **Club Name**: Displayed prominently at the top
- **Total Players**: Count of all licensed players in the club
- **Gender Distribution**: Breakdown of male vs female players
- **Average Age**: Calculated from birth years of all players
- **Top Nationalities**: Top 3 most represented nationalities

### 2. Player Rankings
- **Top 10 Male Players**: Ranked by current ranking with evolution indicators
- **Top 10 Female Players**: Ranked by current ranking with evolution indicators
- **Complete Player List**: Table with all players including:
  - Name and license number
  - Current ranking and points
  - Best historical ranking
  - Nationality and age
  - Number of tournaments played
  - **Sortable Columns**: Click on any column header to sort by that field

### 3. Club Performance Metrics
- **Average Ranking**: Mean ranking of all club players
- **Top Players Count**: Number of players in Top 10, Top 50, Top 100
- **Most Active Male Player**: Male player with highest tournament participation
- **Most Active Female Player**: Female player with highest tournament participation
- **Most Efficient Male Player**: Male player with best points per tournament ratio
- **Most Efficient Female Player**: Female player with best points per tournament ratio

### 4. Time Evolution (Last 12 Months)
- **Dynamic Period**: Automatically shows last 12 months from the latest data available in database
- **Total Points**: Monthly club points progression
- **Total Tournaments**: Monthly tournament participation
- **Active Players**: Monthly count of active players
- **Gender-based Analysis**: Points evolution by gender (Male/Female)

### 5. Club Comparison
- **Side-by-side Analysis**: Compare two clubs simultaneously
- **Visual Charts**: Overlay comparison data on all charts
- **Enhanced Comparison View**: 
  - KPI comparisons (Total Players, Average Ranking, Top 10/100 counts)
  - Top 10 Male/Female players comparison (showing top 5 from each club)
- **Club Selection**: Search and select from available clubs
- **Clear Comparison**: Easy toggle to remove comparison data

## Technical Implementation

### API Structure
```typescript
interface ClubStatistics {
  club_name: string;
  total_players: number;
  male_players: number;
  female_players: number;
  average_age: number;
  top_nationalities: Array<{ nationality: string; count: number }>;
  players: Array<PlayerData>;
  top_10_male: Array<TopPlayerData>;
  top_10_female: Array<TopPlayerData>;
  average_ranking: number;
  top_10_count: number;
  top_50_count: number;
  top_100_count: number;
  most_active_male_player: ActivePlayerData;
  most_active_female_player: ActivePlayerData;
  most_efficient_male_player: EfficientPlayerData;
  most_efficient_female_player: EfficientPlayerData;
  monthly_evolution: Array<MonthlyData>;
}
```

### Database Queries
- **Club Data**: Extracted from `rankings_latest` view (ensuring current club affiliations)
- **Monthly Evolution**: Aggregated data for last 12 months from `rankings` table
- **Player Statistics**: Real-time calculations from current rankings via `rankings_latest` view

### Navigation
- **Access**: Click on club names from the Players page
- **Route**: `/dashboard/clubs/[clubName]`
- **Back Navigation**: Returns to Players page

## Usage

### Viewing Club Statistics
1. Navigate to Players page (`/dashboard/players`)
2. Click on any club name in the Club column
3. View comprehensive club analytics

### Comparing Clubs
1. On any club details page, click "Compare with Another Club"
2. Search and select a club from the dropdown
3. View side-by-side comparison on all charts
4. Use "Clear Comparison" to remove comparison data

### Data Interpretation
- **Green Rankings**: Top 25 players
- **Blue Rankings**: Top 100 players
- **Purple Rankings**: Top 250 players
- **Orange Rankings**: Top 500 players
- **Red Rankings**: Top 1000 players
- **Gray Rankings**: Beyond top 1000

## Performance Considerations

- **Data Caching**: Club statistics are calculated on-demand
- **Efficient Queries**: Uses indexed fields for fast data retrieval
- **Responsive Charts**: SVG-based charts with optimized rendering
- **Lazy Loading**: Comparison data loaded only when needed

## Future Enhancements

- **Historical Comparisons**: Compare clubs across different time periods
- **Export Functionality**: Download club statistics as PDF/Excel
- **Advanced Analytics**: Machine learning insights and predictions
- **Club Rankings**: Overall club performance rankings
- **Player Transfers**: Track player movement between clubs

## Dependencies

- **UI Components**: shadcn/ui components (Card, Table, Badge, etc.)
- **Charts**: Custom SVG-based chart components
- **Icons**: Lucide React icons
- **Database**: Supabase with row-level security
- **Framework**: Next.js 15 with TypeScript
