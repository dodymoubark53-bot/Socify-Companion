import { db } from "@workspace/db";
import { influencersTable, linkInBioTable, linkInBioLinksTable } from "@workspace/db";

async function seedExtras() {
  console.log("Seeding extras (influencers, link-in-bio)...");

  const existingInfluencers = await db.select().from(influencersTable);
  if (existingInfluencers.length === 0) {
    await db.insert(influencersTable).values([
      { workspaceId: 1, name: "Ava Roselle", handle: "@avaroselle", platform: "instagram", category: "lifestyle", tier: "macro", followers: 782000, avgLikes: 34200, avgComments: 1840, engagementRate: "4.6", avgReach: 210000, location: "Los Angeles, CA", status: "active", tags: ["lifestyle", "wellness"], notes: "Top performer Q2" },
      { workspaceId: 1, name: "James Kwon", handle: "@jameskwon", platform: "tiktok", category: "technology", tier: "mid", followers: 245000, avgLikes: 18900, avgComments: 920, engagementRate: "8.1", avgReach: 89000, location: "Seoul, KR", status: "active", tags: ["tech", "gadgets"], notes: null },
      { workspaceId: 1, name: "Sofia Reyes", handle: "@sofiareyes", platform: "instagram", category: "fashion", tier: "micro", followers: 67400, avgLikes: 4100, avgComments: 310, engagementRate: "6.5", avgReach: 32000, location: "Barcelona, ES", status: "negotiating", tags: ["fashion", "travel"], notes: "Interested in collab" },
      { workspaceId: 1, name: "Marcus Lane", handle: "@marcuslane", platform: "youtube", category: "fitness", tier: "mid", followers: 312000, avgLikes: 8700, avgComments: 540, engagementRate: "2.9", avgReach: 145000, location: "Toronto, CA", status: "prospect", tags: ["fitness", "health"], notes: null },
      { workspaceId: 1, name: "Luna Park", handle: "@lunapark", platform: "twitter", category: "business", tier: "micro", followers: 89000, avgLikes: 2200, avgComments: 180, engagementRate: "2.7", avgReach: 41000, location: "New York, NY", status: "contacted", tags: ["marketing", "saas"], notes: "Follows us already" },
      { workspaceId: 1, name: "Priya Nair", handle: "@priyanair", platform: "instagram", category: "food", tier: "mega", followers: 1420000, avgLikes: 62000, avgComments: 4200, engagementRate: "4.6", avgReach: 480000, location: "Mumbai, IN", status: "completed", tags: ["food", "culture"], notes: "Campaign Q1 done" },
      { workspaceId: 1, name: "Tyler Brooks", handle: "@tylerbrooks", platform: "tiktok", category: "entertainment", tier: "macro", followers: 620000, avgLikes: 48000, avgComments: 3100, engagementRate: "8.2", avgReach: 190000, location: "Austin, TX", status: "prospect", tags: ["comedy", "viral"], notes: null },
      { workspaceId: 1, name: "Zoe Hartley", handle: "@zoehartley", platform: "linkedin", category: "business", tier: "micro", followers: 44000, avgLikes: 890, avgComments: 120, engagementRate: "2.3", avgReach: 18000, location: "London, UK", status: "contacted", tags: ["b2b", "saas"], notes: null },
    ]);
    console.log("Seeded 8 influencers");
  } else {
    console.log("Influencers already exist:", existingInfluencers.length);
  }

  const existingPages = await db.select().from(linkInBioTable);
  if (existingPages.length === 0) {
    const [page] = await db.insert(linkInBioTable).values({
      workspaceId: 1, userId: 1, slug: "socify-demo", title: "SOCIFY Demo",
      bio: "Social Media Marketing Platform", backgroundColor: "#09090B",
      accentColor: "#6366F1", fontStyle: "geist", isPublished: true, totalClicks: 142,
    }).returning();
    await db.insert(linkInBioLinksTable).values([
      { pageId: page.id, title: "Visit Our Website", url: "https://socify.app", icon: "globe", clicks: 38, sortOrder: 0 },
      { pageId: page.id, title: "Start Free Trial", url: "https://socify.app/signup", icon: "star", clicks: 57, sortOrder: 1 },
      { pageId: page.id, title: "Read Our Blog", url: "https://socify.app/blog", icon: "book", clicks: 19, sortOrder: 2 },
      { pageId: page.id, title: "Follow on Twitter", url: "https://twitter.com/socify", icon: "twitter", clicks: 28, sortOrder: 3 },
    ]);
    console.log("Seeded link-in-bio page id:", page.id);
  } else {
    console.log("Link-in-bio pages already exist:", existingPages.length);
  }

  console.log("Done!");
}

seedExtras()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
