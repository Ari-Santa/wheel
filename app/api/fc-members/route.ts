import { NextResponse } from "next/server";
import { decode } from "he";

const LODESTONE_URL = "https://eu.finalfantasyxiv.com/lodestone/freecompany/9234631035923366072/member/";
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

// In-memory cache
let cachedData: {
  names: string[];
  timestamp: number;
} | null = null;

export async function GET() {
  try {
    // Check if cache is valid
    const now = Date.now();
    if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
      console.log(`[FC Members API] Cache HIT - Serving ${cachedData.names.length} members from cache`);
      return NextResponse.json({
        names: cachedData.names,
        cached: true,
        cachedAt: new Date(cachedData.timestamp).toISOString(),
        count: cachedData.names.length,
        source: "lodestone",
      }, {
        headers: {
          "Cache-Control": "s-maxage=7200, stale-while-revalidate=86400, public",
        },
      });
    }

    // Fetch fresh data from Lodestone
    console.log('[FC Members API] Cache MISS - Fetching fresh data from Lodestone');
    const response = await fetch(LODESTONE_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Parse HTML to extract character names from member list entries only
    // Pattern: <li class="entry"> ... <a href="/lodestone/character/[ID]/"> ... <p class="entry__name">Name</p>
    // This ensures we only capture actual FC members, not activity feed or rankings
    const nameRegex = /<li class="entry">[\s\S]*?<a[^>]+href="\/lodestone\/character\/\d+\/"[^>]*>[\s\S]*?<p class="entry__name">([^<]+)<\/p>/g;
    const namesSet = new Set<string>(); // Use Set to avoid duplicates
    let match;

    while ((match = nameRegex.exec(html)) !== null) {
      const name = decode(match[1].trim());
      if (name) {
        namesSet.add(name);
      }
    }

    const names = Array.from(namesSet);

    // Fallback: If no names found with primary pattern, try simpler pattern
    // But still require member list entry context
    if (names.length === 0) {
      const altRegex = /<li class="entry">[\s\S]*?<p class="entry__name">([^<]+)<\/p>/g;
      while ((match = altRegex.exec(html)) !== null) {
        const name = decode(match[1].trim());
        if (name) {
          namesSet.add(name);
        }
      }
    }

    // Update cache
    cachedData = {
      names,
      timestamp: now,
    };
    console.log(`[FC Members API] Cache updated - Stored ${names.length} members`);

    return NextResponse.json({
      names,
      cached: false,
      fetchedAt: new Date(now).toISOString(),
      count: names.length,
      source: "lodestone",
    }, {
      headers: {
        "Cache-Control": "s-maxage=7200, stale-while-revalidate=86400, public",
      },
    });

  } catch (error) {
    console.error("Error fetching FC members:", error);

    // Return cached data if available, even if expired
    if (cachedData) {
      console.log('[FC Members API] Returning STALE cache due to error');
      return NextResponse.json({
        names: cachedData.names,
        cached: true,
        stale: true,
        cachedAt: new Date(cachedData.timestamp).toISOString(),
        count: cachedData.names.length,
        source: "lodestone",
        error: error instanceof Error ? error.message : "Unknown error",
      }, {
        headers: {
          "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400, public",
        },
      });
    }

    // Fallback to env var if API fails completely
    const envPlayers = process.env.NEXT_PUBLIC_PRESET_PLAYERS
      ? process.env.NEXT_PUBLIC_PRESET_PLAYERS.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    console.log(`[FC Members API] Using FALLBACK - Returning ${envPlayers.length} players from environment variables`);

    return NextResponse.json({
      names: envPlayers,
      cached: false,
      fallback: true,
      error: error instanceof Error ? error.message : "Unknown error",
    }, {
      status: 500,
      headers: {
        "Cache-Control": "s-maxage=300, public",
      },
    });
  }
}
