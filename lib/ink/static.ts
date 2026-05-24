export type InkArcState = "active" | "slow" | "dormant" | "closed";

export type InkChapterDirection = "newest-first" | "oldest-first";

export type InkSource = {
  id: string;
  publication: string;
  title: string;
  url: string;
  retrievedAt: string;
  excerpt?: string;
};

export type InkRelatedArc = {
  slug: string;
  label: string;
};

export type InkChapter = {
  id: string;
  arcSlug: string;
  date: string;
  displayDate?: string;
  title: string;
  body: string[];
  cast?: string[];
  elsewhere?: InkRelatedArc[];
  sourceIds: string[];
};

export type InkArc = {
  slug: string;
  number: number;
  title: string;
  dek: string;
  state: InkArcState;
  shelfRank?: number;
  openedAt: string;
  updatedAt: string;
  chapterIds: string[];
};

export type InkBriefingMovement = {
  arcSlug: string;
  body: string[];
  sourceIds: string[];
};

export type InkBriefingElsewhere = {
  title: string;
  body: string[];
  sourceIds: string[];
};

export type InkBriefingPointer = {
  arcSlug: string;
  text: string;
};

export type InkBriefing = {
  date: string;
  edition: string;
  lead: {
    title: string;
    body: string[];
    sourceIds: string[];
  };
  whatChanged: InkBriefingMovement[];
  elsewhere: InkBriefingElsewhere[];
  kicker?: string[];
  alsoToday: InkBriefingPointer[];
};

export type InkArcWithChapters = InkArc & {
  chapters: InkChapter[];
};

export const inkSources: InkSource[] = [
  {
    id: "src-alpine-bonds-1",
    publication: "Reuters",
    title: "Eurozone borrowing costs settle after a tense auction week",
    url: "https://example.com/reuters/alpine-bonds",
    retrievedAt: "2026-05-22T21:15:00.000Z",
  },
  {
    id: "src-alpine-bonds-2",
    publication: "Financial Times",
    title: "Finance ministers search for a quieter debt language",
    url: "https://example.com/ft/debt-language",
    retrievedAt: "2026-05-23T10:20:00.000Z",
  },
  {
    id: "src-grain-corridor-1",
    publication: "AP",
    title: "Insurers return cautiously to Black Sea grain routes",
    url: "https://example.com/ap/grain-routes",
    retrievedAt: "2026-05-23T08:45:00.000Z",
  },
  {
    id: "src-sahel-grid-1",
    publication: "Al Jazeera",
    title: "Sahel power pool talks restart after months of outages",
    url: "https://example.com/aj/sahel-grid",
    retrievedAt: "2026-05-22T18:10:00.000Z",
  },
  {
    id: "src-strait-cables-1",
    publication: "BBC",
    title: "Cable repair crews wait for a calmer strait",
    url: "https://example.com/bbc/strait-cables",
    retrievedAt: "2026-05-21T12:00:00.000Z",
  },
  {
    id: "src-coral-court-1",
    publication: "Times of India",
    title: "Island states prepare final climate court filing",
    url: "https://example.com/toi/coral-court",
    retrievedAt: "2026-05-20T14:30:00.000Z",
  },
];

export const inkArcs: InkArc[] = [
  {
    slug: "alpine-bond-weather",
    number: 14,
    title: "Alpine bond weather",
    dek: "Europe's debt argument has moved from crisis language to the slower grammar of auctions, spreads, and coalition nerves.",
    state: "active",
    shelfRank: 1,
    openedAt: "2026-05-11",
    updatedAt: "2026-05-23",
    chapterIds: [
      "alpine-bond-weather-2026-05-11",
      "alpine-bond-weather-2026-05-16",
      "alpine-bond-weather-2026-05-19",
      "alpine-bond-weather-2026-05-23",
    ],
  },
  {
    slug: "grain-corridor-insurance",
    number: 15,
    title: "Grain corridor insurance",
    dek: "The export route is reopening through paperwork first: premiums, escort rules, and the cautious return of underwriters.",
    state: "active",
    shelfRank: 2,
    openedAt: "2026-05-18",
    updatedAt: "2026-05-23",
    chapterIds: ["grain-corridor-insurance-2026-05-23"],
  },
  {
    slug: "sahel-grid-clock",
    number: 16,
    title: "Sahel grid clock",
    dek: "Power-sharing talks are becoming a test of whether regional institutions can keep time when national grids cannot.",
    state: "slow",
    openedAt: "2026-05-17",
    updatedAt: "2026-05-22",
    chapterIds: ["sahel-grid-clock-2026-05-22"],
  },
  {
    slug: "strait-cable-repairs",
    number: 17,
    title: "Strait cable repairs",
    dek: "A technical repair job is carrying more geopolitical weight than anyone wants to say in public.",
    state: "dormant",
    openedAt: "2026-05-09",
    updatedAt: "2026-05-21",
    chapterIds: ["strait-cable-repairs-2026-05-21"],
  },
  {
    slug: "coral-court-filing",
    number: 18,
    title: "Coral court filing",
    dek: "The legal phase has closed for now; the political argument is waiting outside the courtroom.",
    state: "closed",
    openedAt: "2026-05-01",
    updatedAt: "2026-05-20",
    chapterIds: ["coral-court-filing-2026-05-20"],
  },
];

export const inkChapters: InkChapter[] = [
  {
    id: "alpine-bond-weather-2026-05-11",
    arcSlug: "alpine-bond-weather",
    date: "2026-05-11",
    displayDate: "early May",
    title: "The spread becomes the story",
    body: [
      "The first turn was not a speech but a number. Two auctions cleared, neither comfortably, and the gap between the safer paper and the nervous paper became the day's real paragraph.",
      "Officials treated it as weather: measurable, unpleasant, and not yet a storm. Markets heard the same sentence and underlined the word yet.",
    ],
    cast: ["Eurozone finance ministries", "primary dealers", "ratings desks"],
    elsewhere: [{ slug: "sahel-grid-clock", label: "Sahel grid clock" }],
    sourceIds: ["src-alpine-bonds-1"],
  },
  {
    id: "alpine-bond-weather-2026-05-16",
    arcSlug: "alpine-bond-weather",
    date: "2026-05-16",
    title: "Coalition arithmetic enters the auction room",
    body: [
      "The market question became a parliamentary one. Buyers were still asking about debt service, but the answer now depended on which coalition partners could live with another season of restraint.",
      "That made every denial sound over-rehearsed. The finance ministers kept saying funding plans were intact; traders began watching who was willing to stand beside them while they said it.",
    ],
    cast: ["coalition whips", "finance ministers", "sovereign debt desks"],
    elsewhere: [],
    sourceIds: ["src-alpine-bonds-1", "src-alpine-bonds-2"],
  },
  {
    id: "alpine-bond-weather-2026-05-19",
    arcSlug: "alpine-bond-weather",
    date: "2026-05-19",
    title: "A calmer sale, with a louder footnote",
    body: [
      "The next sale went better, which helped the day but did not erase the week. Demand returned at a price that still recorded the argument.",
      "The useful signal was not panic. It was selectivity. Investors were willing to buy the story, but only after editing the adjectives.",
    ],
    cast: ["debt management offices", "pension funds"],
    elsewhere: [{ slug: "grain-corridor-insurance", label: "Grain corridor insurance" }],
    sourceIds: ["src-alpine-bonds-2"],
  },
  {
    id: "alpine-bond-weather-2026-05-23",
    arcSlug: "alpine-bond-weather",
    date: "2026-05-23",
    title: "The vocabulary softens",
    body: [
      "By the weekend, the official language had shifted from reassurance to calibration. That is a small change, but small words are how debt stories usually confess movement.",
      "The arc is no longer about whether buyers appear. They do. It is about how much political quiet they demand before arriving.",
    ],
    cast: ["Eurogroup aides", "auction desks", "budget committees"],
    elsewhere: [
      { slug: "grain-corridor-insurance", label: "Grain corridor insurance" },
      { slug: "coral-court-filing", label: "Coral court filing" },
    ],
    sourceIds: ["src-alpine-bonds-1", "src-alpine-bonds-2"],
  },
  {
    id: "grain-corridor-insurance-2026-05-23",
    arcSlug: "grain-corridor-insurance",
    date: "2026-05-23",
    title: "Premiums move before ships do",
    body: [
      "The route is reopening in ledgers before it reopens on the water. Insurers trimmed some quotes after a new escort protocol, but the discounts are cautious and reversible.",
      "For grain traders, that is enough to plan. For governments, it is only enough to stop calling the corridor closed.",
    ],
    cast: ["marine insurers", "grain exporters", "port authorities"],
    elsewhere: [{ slug: "alpine-bond-weather", label: "Alpine bond weather" }],
    sourceIds: ["src-grain-corridor-1"],
  },
  {
    id: "sahel-grid-clock-2026-05-22",
    arcSlug: "sahel-grid-clock",
    date: "2026-05-22",
    title: "The timetable is the concession",
    body: [
      "The technical teams did not announce a breakthrough. They announced a calendar, which may be the more honest instrument here.",
      "A shared grid asks governments to trust each other before the lights come on. This week, they agreed mostly to meet again before the next outage season.",
    ],
    cast: ["regional grid operators", "energy ministries"],
    elsewhere: [],
    sourceIds: ["src-sahel-grid-1"],
  },
  {
    id: "strait-cable-repairs-2026-05-21",
    arcSlug: "strait-cable-repairs",
    date: "2026-05-21",
    title: "The repair window narrows",
    body: [
      "The crews are still waiting for weather, permits, and a silence that no navy has quite offered. The damaged cable is a technical problem sitting inside a diplomatic room.",
    ],
    cast: ["repair crews", "maritime authorities"],
    elsewhere: [],
    sourceIds: ["src-strait-cables-1"],
  },
  {
    id: "coral-court-filing-2026-05-20",
    arcSlug: "coral-court-filing",
    date: "2026-05-20",
    title: "The last brief leaves the shore",
    body: [
      "The filing window closed with the island states still making the same bet: that a court can give legal grammar to a loss already visible at high tide.",
    ],
    cast: ["island state lawyers", "climate envoys"],
    elsewhere: [{ slug: "alpine-bond-weather", label: "Alpine bond weather" }],
    sourceIds: ["src-coral-court-1"],
  },
];

export const inkBriefings: InkBriefing[] = [
  {
    date: "2026-05-21",
    edition: "Evening briefing",
    lead: {
      title: "A repair story waits for a diplomatic weather window",
      body: [
        "The day's lead is the strait cable repair, mostly because nothing about it is only technical anymore. A ship can fix the line; a government has to make the water feel ordinary enough for the ship to linger.",
      ],
      sourceIds: ["src-strait-cables-1"],
    },
    whatChanged: [
      {
        arcSlug: "strait-cable-repairs",
        body: [
          "Repair crews are still staged nearby, but the timeline has narrowed around permits and naval signaling rather than equipment.",
        ],
        sourceIds: ["src-strait-cables-1"],
      },
    ],
    elsewhere: [
      {
        title: "Court filings close",
        body: [
          "Island states completed the last climate filing, moving that argument from submission to waiting.",
        ],
        sourceIds: ["src-coral-court-1"],
      },
    ],
    kicker: [
      "The quieter a technical story tries to be, the more carefully everyone reads the map.",
    ],
    alsoToday: [
      {
        arcSlug: "strait-cable-repairs",
        text: "Cable repair crews wait for their window.",
      },
    ],
  },
  {
    date: "2026-05-22",
    edition: "Evening briefing",
    lead: {
      title: "The calendar becomes the concession",
      body: [
        "The Sahel grid talks produced no grand bargain, but they did produce a timetable. In a region where outages are both infrastructure and politics, a calendar is not nothing.",
      ],
      sourceIds: ["src-sahel-grid-1"],
    },
    whatChanged: [
      {
        arcSlug: "sahel-grid-clock",
        body: [
          "Energy officials agreed to another technical round before the next outage season, keeping the regional power-sharing idea alive but slow.",
        ],
        sourceIds: ["src-sahel-grid-1"],
      },
    ],
    elsewhere: [
      {
        title: "Bond markets exhale selectively",
        body: [
          "European debt desks treated a calmer auction as useful evidence, not a settled verdict.",
        ],
        sourceIds: ["src-alpine-bonds-2"],
      },
    ],
    kicker: [
      "Sometimes the news is not that the lights came back. It is that everyone agreed to check the switch together.",
    ],
    alsoToday: [
      {
        arcSlug: "sahel-grid-clock",
        text: "Grid talks turn a little of the argument into dates.",
      },
      {
        arcSlug: "alpine-bond-weather",
        text: "Debt desks keep editing Europe's reassurances.",
      },
    ],
  },
  {
    date: "2026-05-23",
    edition: "Morning briefing",
    lead: {
      title: "Europe's debt language gets quieter, which is not the same as calm",
      body: [
        "The most useful signal in Europe this morning is a change in vocabulary. Officials are no longer speaking as if the bond market merely needs reassurance. They are talking about calibration, which means the argument has survived long enough to require instruments.",
        "That does not make this a crisis. It makes it a story with a pulse: auctions clearing, buyers returning, and politics learning how much silence the market now charges for.",
      ],
      sourceIds: ["src-alpine-bonds-1", "src-alpine-bonds-2"],
    },
    whatChanged: [
      {
        arcSlug: "alpine-bond-weather",
        body: [
          "The latest auction was calmer, but demand came with sharper conditions. The arc is shifting from whether buyers appear to how much political quiet they require.",
        ],
        sourceIds: ["src-alpine-bonds-1", "src-alpine-bonds-2"],
      },
      {
        arcSlug: "grain-corridor-insurance",
        body: [
          "Marine insurers trimmed some quotes after a new escort protocol, reopening the corridor first in spreadsheets and only later on the water.",
        ],
        sourceIds: ["src-grain-corridor-1"],
      },
    ],
    elsewhere: [
      {
        title: "Climate filing enters its waiting phase",
        body: [
          "Island states have finished their court submissions, leaving the legal argument to harden while the political one keeps moving.",
        ],
        sourceIds: ["src-coral-court-1"],
      },
    ],
    kicker: [
      "The day is full of institutions trying to buy time: with auctions, insurance tables, court briefs, and calendars. Time is expensive because everyone knows what it is being spent against.",
    ],
    alsoToday: [
      {
        arcSlug: "alpine-bond-weather",
        text: "Debt language softens from reassurance to calibration.",
      },
      {
        arcSlug: "grain-corridor-insurance",
        text: "Insurance quotes move before the grain ships do.",
      },
    ],
  },
];

export function getLatestBriefing() {
  return [...inkBriefings].sort(compareDatesDesc)[0] ?? null;
}

export function getBriefingByDate(date: string) {
  return inkBriefings.find((briefing) => briefing.date === date) ?? null;
}

export function getBriefingDates() {
  return [...inkBriefings].map((briefing) => briefing.date).sort().reverse();
}

export function getAdjacentBriefings(date: string) {
  const briefings = [...inkBriefings].sort(compareDatesAsc);
  const index = briefings.findIndex((briefing) => briefing.date === date);

  if (index === -1) {
    return { previous: null, next: null };
  }

  return {
    previous: briefings[index - 1] ?? null,
    next: briefings[index + 1] ?? null,
  };
}

export function getArcBySlug(slug: string): InkArcWithChapters | null {
  const arc = inkArcs.find((item) => item.slug === slug);
  if (!arc) return null;

  return {
    ...arc,
    chapters: getChaptersForArc(slug),
  };
}

export function getShelfArcs() {
  return inkArcs
    .filter((arc) => arc.state !== "closed")
    .map((arc) => ({ ...arc, chapters: getChaptersForArc(arc.slug) }))
    .sort((a, b) => {
      const rankA = a.shelfRank ?? Number.POSITIVE_INFINITY;
      const rankB = b.shelfRank ?? Number.POSITIVE_INFINITY;
      if (rankA !== rankB) return rankA - rankB;
      return compareDatesDesc(a.updatedAt, b.updatedAt);
    });
}

export function getAllArcs() {
  return inkArcs
    .map((arc) => ({ ...arc, chapters: getChaptersForArc(arc.slug) }))
    .sort((a, b) => {
      const rankA = a.shelfRank ?? Number.POSITIVE_INFINITY;
      const rankB = b.shelfRank ?? Number.POSITIVE_INFINITY;
      if (rankA !== rankB) return rankA - rankB;
      return compareDatesDesc(a.updatedAt, b.updatedAt);
    });
}

export function getChaptersForArc(
  slug: string,
  direction: InkChapterDirection = "newest-first",
) {
  const arc = inkArcs.find((item) => item.slug === slug);
  if (!arc) return [];

  const chapterById = new Map(inkChapters.map((chapter) => [chapter.id, chapter]));
  const chapters = arc.chapterIds
    .map((id) => chapterById.get(id))
    .filter((chapter): chapter is InkChapter => Boolean(chapter));

  return sortChapters(chapters, direction);
}

export function sortChapters(
  chapters: InkChapter[],
  direction: InkChapterDirection,
) {
  const sorted = [...chapters].sort((a, b) => compareDatesDesc(a.date, b.date));
  return direction === "newest-first" ? sorted : sorted.reverse();
}

export function formatArcLabel(arc: Pick<InkArc, "number">) {
  return `arc ${arc.number}`;
}

export function getMovementArc(movement: InkBriefingMovement) {
  return inkArcs.find((arc) => arc.slug === movement.arcSlug) ?? null;
}

function compareDatesAsc(a: InkBriefing, b: InkBriefing) {
  return a.date.localeCompare(b.date);
}

function compareDatesDesc(a: string | InkBriefing, b: string | InkBriefing) {
  const dateA = typeof a === "string" ? a : a.date;
  const dateB = typeof b === "string" ? b : b.date;
  return dateB.localeCompare(dateA);
}
