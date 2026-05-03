import { db } from "@workspace/db";
import {
  usersTable, workspacesTable, workspaceMembersTable,
  socialAccountsTable, postsTable, inboxMessagesTable,
  leadsTable, campaignsTable, listeningKeywordsTable,
  listeningMentionsTable, automationsTable, notificationsTable
} from "@workspace/db";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Clean up existing data in order
  await db.delete(notificationsTable);
  await db.delete(listeningMentionsTable);
  await db.delete(listeningKeywordsTable);
  await db.delete(automationsTable);
  await db.delete(leadsTable);
  await db.delete(campaignsTable);
  await db.delete(inboxMessagesTable);
  await db.delete(postsTable);
  await db.delete(socialAccountsTable);
  await db.delete(workspaceMembersTable);
  await db.delete(workspacesTable);
  await db.delete(usersTable);

  // Create users
  const passwordHash = await bcrypt.hash("password123", 10);
  const [alex] = await db.insert(usersTable).values({
    name: "Alex Chen",
    email: "alex@socify.io",
    passwordHash,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
    role: "user",
  }).returning();

  const [sarah] = await db.insert(usersTable).values({
    name: "Sarah Kim",
    email: "sarah@socify.io",
    passwordHash,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
    role: "user",
  }).returning();

  const [marcus] = await db.insert(usersTable).values({
    name: "Marcus Reeves",
    email: "marcus@socify.io",
    passwordHash,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=marcus",
    role: "user",
  }).returning();

  // Create workspace
  const [workspace] = await db.insert(workspacesTable).values({
    id: 1,
    name: "Socify Demo",
    slug: "socify-demo",
    plan: "pro",
    ownerId: alex.id,
  }).returning();

  // Add members
  await db.insert(workspaceMembersTable).values([
    { workspaceId: workspace.id, userId: alex.id, role: "owner" },
    { workspaceId: workspace.id, userId: sarah.id, role: "editor" },
    { workspaceId: workspace.id, userId: marcus.id, role: "viewer" },
  ]);

  // Update users with workspace
  await db.update(usersTable).set({ currentWorkspaceId: workspace.id });

  // Social accounts
  await db.insert(socialAccountsTable).values([
    {
      workspaceId: workspace.id,
      platform: "instagram",
      accountType: "business",
      name: "Socify Brand",
      handle: "@socify",
      avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=instagram",
      followers: 48200,
      following: 612,
      avgEngagementRate: "4.20",
      isActive: true,
    },
    {
      workspaceId: workspace.id,
      platform: "twitter",
      accountType: "profile",
      name: "Socify",
      handle: "@socifyHQ",
      avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=twitter",
      followers: 31500,
      following: 890,
      avgEngagementRate: "3.10",
      isActive: true,
    },
    {
      workspaceId: workspace.id,
      platform: "linkedin",
      accountType: "company",
      name: "Socify Inc.",
      handle: "socify",
      avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=linkedin",
      followers: 12800,
      following: 230,
      avgEngagementRate: "5.80",
      isActive: true,
    },
    {
      workspaceId: workspace.id,
      platform: "tiktok",
      accountType: "creator",
      name: "Socify",
      handle: "@socify.io",
      avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=tiktok",
      followers: 87400,
      following: 120,
      avgEngagementRate: "8.40",
      isActive: true,
    },
  ]);

  // Campaigns
  const now = new Date();
  const [campaign1] = await db.insert(campaignsTable).values({
    workspaceId: workspace.id,
    name: "Summer Launch 2025",
    description: "Full-funnel summer campaign across all platforms",
    objective: "awareness",
    status: "active",
    startDate: new Date(now.getTime() - 7 * 86400000),
    endDate: new Date(now.getTime() + 23 * 86400000),
    budget: "15000",
    currency: "USD",
    targetPlatforms: ["instagram", "tiktok", "twitter"],
    totalReach: 284000,
    totalEngagement: 18600,
    roi: "3.20",
    color: "#6366F1",
    tags: ["summer", "launch", "brand"],
  }).returning();

  const [campaign2] = await db.insert(campaignsTable).values({
    workspaceId: workspace.id,
    name: "Product Feature Reveal",
    description: "Announce our new AI composer feature",
    objective: "engagement",
    status: "scheduled",
    startDate: new Date(now.getTime() + 5 * 86400000),
    endDate: new Date(now.getTime() + 35 * 86400000),
    budget: "8500",
    currency: "USD",
    targetPlatforms: ["linkedin", "twitter"],
    totalReach: 0,
    totalEngagement: 0,
    color: "#22C55E",
    tags: ["product", "feature", "ai"],
  }).returning();

  await db.insert(campaignsTable).values({
    workspaceId: workspace.id,
    name: "Q1 Brand Awareness",
    description: "Broad awareness campaign for Q1",
    objective: "reach",
    status: "completed",
    startDate: new Date(now.getTime() - 90 * 86400000),
    endDate: new Date(now.getTime() - 2 * 86400000),
    budget: "20000",
    currency: "USD",
    targetPlatforms: ["instagram", "facebook", "tiktok"],
    totalReach: 920000,
    totalEngagement: 64800,
    roi: "4.80",
    color: "#F59E0B",
    tags: ["q1", "brand", "awareness"],
  });

  // Posts
  const postData = [
    {
      caption: "The future of social media management is here. AI-powered scheduling, smart inbox, and analytics that actually tell you what to do next. This is SOCIFY. 🚀",
      platforms: ["instagram", "twitter"],
      status: "published",
      publishedAt: new Date(now.getTime() - 2 * 86400000),
      totalReach: 28400,
      totalEngagement: 1840,
      hashtags: ["#socialmedia", "#saas", "#marketing"],
    },
    {
      caption: "We analyzed 10,000 posts to find the best time to post on Instagram in 2025. The answer will surprise you. Thread below 👇",
      platforms: ["twitter"],
      status: "published",
      publishedAt: new Date(now.getTime() - 4 * 86400000),
      totalReach: 42100,
      totalEngagement: 3260,
      hashtags: ["#instagram", "#marketing", "#data"],
    },
    {
      caption: "Your brand's voice matters more than ever. Here's how top brands maintain consistency across 5+ social channels without losing authenticity.",
      platforms: ["linkedin"],
      status: "published",
      publishedAt: new Date(now.getTime() - 6 * 86400000),
      totalReach: 18900,
      totalEngagement: 2140,
      hashtags: ["#branding", "#content", "#linkedin"],
    },
    {
      caption: "Meet your new AI content partner. Generate captions, suggest hashtags, and schedule across all platforms in seconds. Try SOCIFY free today.",
      platforms: ["instagram", "tiktok"],
      status: "scheduled",
      scheduledAt: new Date(now.getTime() + 1 * 86400000),
      hashtags: ["#aitools", "#contentcreator", "#socialmedia"],
    },
    {
      caption: "Behind every viral post is a strategy. We're breaking down the anatomy of our top 5 performing posts from this month.",
      platforms: ["instagram", "linkedin"],
      status: "scheduled",
      scheduledAt: new Date(now.getTime() + 3 * 86400000),
      hashtags: ["#viral", "#strategy", "#socialmediamarketing"],
    },
    {
      caption: "Draft: Q3 engagement is up 43% since switching to AI-assisted scheduling. Numbers don't lie.",
      platforms: ["twitter", "linkedin"],
      status: "draft",
      hashtags: ["#analytics", "#growth"],
    },
    {
      caption: "We're giving away 3 months of SOCIFY Pro to 5 lucky brands. Drop a comment below to enter! 🎁",
      platforms: ["instagram", "twitter", "tiktok"],
      status: "scheduled",
      scheduledAt: new Date(now.getTime() + 5 * 86400000),
      hashtags: ["#giveaway", "#contest", "#socialmedia"],
      campaignId: campaign1.id,
    },
    {
      caption: "The SOCIFY AI Composer learns your brand voice and gets better with every post. No more writer's block.",
      platforms: ["instagram"],
      status: "scheduled",
      scheduledAt: new Date(now.getTime() + 8 * 86400000),
      hashtags: ["#ai", "#contentcreation", "#brandvoice"],
      campaignId: campaign2.id,
    },
  ];

  for (const p of postData) {
    await db.insert(postsTable).values({
      workspaceId: workspace.id,
      authorId: alex.id,
      caption: p.caption,
      platforms: p.platforms,
      hashtags: p.hashtags,
      status: p.status,
      mediaType: "text",
      mediaUrls: [],
      scheduledAt: p.scheduledAt ?? null,
      publishedAt: p.publishedAt ?? null,
      totalReach: p.totalReach ?? 0,
      totalEngagement: p.totalEngagement ?? 0,
      campaignId: p.campaignId ?? null,
      aiGenerated: Math.random() > 0.5,
    });
  }

  // Inbox messages
  const inboxData = [
    {
      platform: "instagram",
      type: "comment",
      senderName: "Jessica Park",
      senderHandle: "@jessicap",
      senderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jessica",
      content: "This tool is absolutely incredible! My engagement has tripled since I started using SOCIFY. Love the AI features especially!",
      sentiment: "positive",
      sentimentScore: "0.92",
      status: "unread",
    },
    {
      platform: "twitter",
      type: "mention",
      senderName: "TechReview Daily",
      senderHandle: "@techreviewdaily",
      senderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=techreview",
      content: "@socifyHQ Just published our review of @socifyHQ — genuinely impressed by the unified inbox. Best in class for social media management teams.",
      sentiment: "positive",
      sentimentScore: "0.88",
      status: "unread",
      isStarred: true,
    },
    {
      platform: "instagram",
      type: "dm",
      senderName: "Brand Collab",
      senderHandle: "@brandcollab",
      senderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=brand",
      content: "Hey! We're interested in a partnership opportunity. Could we set up a call to discuss how we can work together?",
      sentiment: "neutral",
      sentimentScore: "0.50",
      status: "in_progress",
      assignedToId: sarah.id,
    },
    {
      platform: "linkedin",
      type: "comment",
      senderName: "David Okafor",
      senderHandle: "david-okafor",
      senderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=david",
      content: "Great content as always! Question — does SOCIFY support LinkedIn company page analytics? That would be a game-changer for our team.",
      sentiment: "neutral",
      sentimentScore: "0.60",
      status: "unread",
    },
    {
      platform: "twitter",
      type: "comment",
      senderName: "Frustrated User",
      senderHandle: "@frustrated_user",
      senderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=frustrated",
      content: "The scheduling sometimes doesn't work as expected. Had 3 posts not go out on time this week. Need to fix this ASAP.",
      sentiment: "negative",
      sentimentScore: "0.15",
      status: "unread",
    },
    {
      platform: "instagram",
      type: "comment",
      senderName: "Maria Santos",
      senderHandle: "@mariasantos",
      senderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=maria",
      content: "Obsessed with the analytics dashboard 😍 Finally makes sense of all our social data. Switched from Hootsuite and never looking back.",
      sentiment: "positive",
      sentimentScore: "0.95",
      status: "done",
      repliedAt: new Date(now.getTime() - 86400000),
    },
    {
      platform: "tiktok",
      type: "comment",
      senderName: "Growth Hacker",
      senderHandle: "@growthhacker",
      senderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=growth",
      content: "Used SOCIFY for our product launch last month — 2.4M impressions, 180K engagements. The scheduling and hashtag suggestions are S-tier.",
      sentiment: "positive",
      sentimentScore: "0.97",
      status: "unread",
      isStarred: true,
    },
    {
      platform: "twitter",
      type: "mention",
      senderName: "Social Media Today",
      senderHandle: "@smtoday",
      senderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=smtoday",
      content: "Top 10 social media tools for 2025 — @socifyHQ makes the cut at #3. Exceptional AI features and pricing.",
      sentiment: "positive",
      sentimentScore: "0.89",
      status: "unread",
    },
    {
      platform: "instagram",
      type: "comment",
      senderName: "Creative Agency NYC",
      senderHandle: "@creativenyc",
      senderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=creative",
      content: "We manage 40+ client accounts and SOCIFY has been a life-saver. The workspace feature is exactly what agencies need.",
      sentiment: "positive",
      sentimentScore: "0.91",
      status: "in_progress",
      assignedToId: marcus.id,
    },
    {
      platform: "linkedin",
      type: "dm",
      senderName: "Enterprise Sales Lead",
      senderHandle: "enterprise-sales",
      senderAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=enterprise",
      content: "We're evaluating social media management tools for our 200-person marketing team. Does SOCIFY offer enterprise pricing and SSO?",
      sentiment: "neutral",
      sentimentScore: "0.55",
      status: "unread",
    },
  ];

  for (const m of inboxData) {
    await db.insert(inboxMessagesTable).values({
      workspaceId: workspace.id,
      ...m,
      sentimentScore: m.sentimentScore,
      receivedAt: new Date(now.getTime() - Math.random() * 7 * 86400000),
      repliedAt: m.repliedAt ?? null,
      isStarred: m.isStarred ?? false,
      assignedToId: m.assignedToId ?? null,
    });
  }

  // Leads
  const stages = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];
  const leadData = [
    { name: "Priya Sharma", email: "priya@fashionbrand.com", company: "FashionForward Inc.", position: "Head of Marketing", stage: "qualified", score: 82, source: "instagram", estimatedValue: "8400", tags: ["fashion", "mid-market"] },
    { name: "Carlos Rivera", email: "carlos@techstartup.io", company: "TechStartup Co.", position: "CMO", stage: "proposal", score: 91, source: "linkedin", estimatedValue: "24000", tags: ["saas", "enterprise"] },
    { name: "Emma Hoffman", email: "emma@retailco.com", company: "RetailCo Group", position: "Social Media Manager", stage: "new", score: 45, source: "twitter", estimatedValue: "3600", tags: ["retail", "smb"] },
    { name: "James Wright", email: "james@mediaagency.co", company: "Wright Media Agency", position: "Founder", stage: "negotiation", score: 94, source: "referral", estimatedValue: "36000", tags: ["agency", "high-value"] },
    { name: "Ling Wei", email: "ling@ecommerce.cn", company: "Global Commerce Ltd.", position: "Digital Director", stage: "contacted", score: 67, source: "instagram", estimatedValue: "15000", tags: ["ecommerce", "global"] },
    { name: "Sophie Martin", email: "sophie@luxurygoods.fr", company: "Luxury Maison", position: "Brand Manager", stage: "won", score: 98, source: "linkedin", estimatedValue: "42000", tags: ["luxury", "enterprise"] },
    { name: "Ahmed Hassan", email: "ahmed@foodchain.ae", company: "Saveur Restaurants", position: "Marketing VP", stage: "qualified", score: 76, source: "referral", estimatedValue: "12000", tags: ["food", "franchise"] },
    { name: "Naomi Brooks", email: "naomi@fitnessbrand.com", company: "FitLife Brand", position: "Community Manager", stage: "contacted", score: 58, source: "tiktok", estimatedValue: "6000", tags: ["fitness", "d2c"] },
    { name: "Oliver Müller", email: "oliver@techagency.de", company: "Digital Kraft GmbH", position: "CEO", stage: "new", score: 52, source: "twitter", estimatedValue: "18000", tags: ["agency", "eu"] },
    { name: "Isabella Torres", email: "isabella@beauty.co", company: "Glow Beauty Co.", position: "Marketing Director", stage: "proposal", score: 87, source: "instagram", estimatedValue: "9600", tags: ["beauty", "dtc"] },
    { name: "Ryan O'Brien", email: "ryan@fintech.io", company: "FinFlow Technologies", position: "Growth Lead", stage: "lost", score: 31, source: "linkedin", estimatedValue: "28000", tags: ["fintech", "enterprise"] },
    { name: "Yuki Tanaka", email: "yuki@gaming.jp", company: "PlayTime Studios", position: "Social Director", stage: "won", score: 96, source: "twitter", estimatedValue: "19200", tags: ["gaming", "creator"] },
  ];

  for (const lead of leadData) {
    await db.insert(leadsTable).values({
      workspaceId: workspace.id,
      name: lead.name,
      email: lead.email,
      company: lead.company,
      position: lead.position,
      stage: lead.stage,
      score: lead.score,
      source: lead.source,
      estimatedValue: lead.estimatedValue,
      tags: lead.tags,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${lead.name.split(" ")[0].toLowerCase()}`,
      assignedToId: Math.random() > 0.5 ? alex.id : sarah.id,
    });
  }

  // Listening keywords
  const [kw1] = await db.insert(listeningKeywordsTable).values({
    workspaceId: workspace.id,
    keyword: "SOCIFY",
    platforms: ["instagram", "twitter", "tiktok", "linkedin"],
    isActive: true,
    mentionsCount: 284,
  }).returning();

  const [kw2] = await db.insert(listeningKeywordsTable).values({
    workspaceId: workspace.id,
    keyword: "social media management",
    platforms: ["twitter", "linkedin"],
    isActive: true,
    mentionsCount: 1840,
  }).returning();

  const [kw3] = await db.insert(listeningKeywordsTable).values({
    workspaceId: workspace.id,
    keyword: "#socialmediatools",
    platforms: ["instagram", "tiktok"],
    isActive: true,
    mentionsCount: 5620,
  }).returning();

  // Mentions
  const mentionData = [
    { keywordId: kw1.id, keyword: "SOCIFY", platform: "twitter", authorName: "TechBeat", authorHandle: "@techbeat", authorFollowers: 142000, content: "Just tried SOCIFY for the first time and honestly blown away by how polished it is. The AI features are actually useful unlike most tools.", sentiment: "positive", sentimentScore: "0.92", likes: 486, shares: 124, comments: 38, reach: 68000, isSpike: true },
    { keywordId: kw1.id, keyword: "SOCIFY", platform: "instagram", authorName: "Marketing Maven", authorHandle: "@marketingmaven", authorFollowers: 89000, content: "Switched to SOCIFY last week — the calendar view and scheduling is next level. Zero missed posts since then 🔥", sentiment: "positive", sentimentScore: "0.94", likes: 1240, shares: 0, comments: 86, reach: 42000, isSpike: false },
    { keywordId: kw2.id, keyword: "social media management", platform: "linkedin", authorName: "Sarah Winters", authorHandle: "sarah-winters", authorFollowers: 18400, content: "Wrote a breakdown comparing the top social media management tools. SOCIFY came out on top for analytics depth.", sentiment: "positive", sentimentScore: "0.87", likes: 284, shares: 62, comments: 44, reach: 24000, isSpike: false },
    { keywordId: kw2.id, keyword: "social media management", platform: "twitter", authorName: "AgencyLife", authorHandle: "@agencylife", authorFollowers: 72000, content: "Hot take: most social media management tools suck. But SOCIFY actually gets it right. Thread 🧵", sentiment: "positive", sentimentScore: "0.81", likes: 912, shares: 218, comments: 156, reach: 88000, isSpike: true },
    { keywordId: kw3.id, keyword: "#socialmediatools", platform: "instagram", authorName: "Digital Nomad", authorHandle: "@digitalnomad", authorFollowers: 34000, content: "My complete toolkit for managing 12 client accounts remotely. SOCIFY is non-negotiable. Full breakdown in bio.", sentiment: "positive", sentimentScore: "0.88", likes: 2840, shares: 0, comments: 194, reach: 56000, isSpike: false },
    { keywordId: kw1.id, keyword: "SOCIFY", platform: "twitter", authorName: "Disappointed User", authorHandle: "@frustrated", authorFollowers: 1200, content: "SOCIFY is down again? Third time this month. Getting tired of missing scheduled posts. Considering alternatives.", sentiment: "negative", sentimentScore: "0.12", likes: 24, shares: 8, comments: 12, reach: 1800, isSpike: false },
    { keywordId: kw3.id, keyword: "#socialmediatools", platform: "tiktok", authorName: "ContentKing", authorHandle: "@contentking", authorFollowers: 284000, content: "I tested 8 social media tools this month. Ranking them from worst to best... SOCIFY #1 🏆", sentiment: "positive", sentimentScore: "0.96", likes: 48200, shares: 6840, comments: 2140, reach: 420000, isSpike: true },
    { keywordId: kw2.id, keyword: "social media management", platform: "linkedin", authorName: "CMO Journal", authorHandle: "cmo-journal", authorFollowers: 48000, content: "State of social media management 2025: teams using AI-first tools like SOCIFY seeing 3x efficiency gains vs traditional schedulers.", sentiment: "positive", sentimentScore: "0.85", likes: 840, shares: 184, comments: 72, reach: 96000, isSpike: false },
  ];

  for (const m of mentionData) {
    await db.insert(listeningMentionsTable).values({
      workspaceId: workspace.id,
      ...m,
      publishedAt: new Date(now.getTime() - Math.random() * 14 * 86400000),
    });
  }

  // Automations
  await db.insert(automationsTable).values([
    {
      workspaceId: workspace.id,
      name: "Auto-reply to positive comments",
      description: "Automatically send a thank-you reply when sentiment score > 0.8",
      isActive: true,
      triggerType: "comment_received",
      actionTypes: ["send_reply", "add_to_crm"],
      runCount: 284,
      lastRunAt: new Date(now.getTime() - 2 * 3600000),
    },
    {
      workspaceId: workspace.id,
      name: "Notify team on negative sentiment",
      description: "Alert the team in Slack when a negative comment is detected",
      isActive: true,
      triggerType: "sentiment_negative",
      actionTypes: ["send_notification", "assign_to_team"],
      runCount: 48,
      lastRunAt: new Date(now.getTime() - 12 * 3600000),
    },
    {
      workspaceId: workspace.id,
      name: "Weekly performance digest",
      description: "Send a weekly analytics summary every Monday at 9am",
      isActive: true,
      triggerType: "scheduled_weekly",
      actionTypes: ["generate_report", "send_email"],
      runCount: 12,
      lastRunAt: new Date(now.getTime() - 4 * 86400000),
    },
    {
      workspaceId: workspace.id,
      name: "Lead capture from DMs",
      description: "Automatically add users who DM with intent keywords to the CRM",
      isActive: false,
      triggerType: "dm_received",
      actionTypes: ["create_lead", "send_reply"],
      runCount: 0,
      lastRunAt: null,
    },
    {
      workspaceId: workspace.id,
      name: "Post performance alert",
      description: "Notify when a post exceeds 10K reach within 2 hours of publishing",
      isActive: true,
      triggerType: "post_milestone",
      actionTypes: ["send_notification", "boost_post"],
      runCount: 18,
      lastRunAt: new Date(now.getTime() - 86400000),
    },
  ]);

  // Notifications
  await db.insert(notificationsTable).values([
    {
      workspaceId: workspace.id,
      userId: alex.id,
      type: "mention_spike",
      title: "Viral mention detected",
      message: "ContentKing mentioned SOCIFY — 48K likes and counting. Check it out!",
      isRead: false,
      link: "/listening",
    },
    {
      workspaceId: workspace.id,
      userId: alex.id,
      type: "campaign_milestone",
      title: "Campaign milestone reached",
      message: "Summer Launch 2025 just hit 250K reach! Great results so far.",
      isRead: false,
      link: "/campaigns",
    },
    {
      workspaceId: workspace.id,
      userId: alex.id,
      type: "inbox_urgent",
      title: "Negative sentiment spike",
      message: "3 negative comments received in the last hour. Review in inbox.",
      isRead: false,
      link: "/inbox",
    },
    {
      workspaceId: workspace.id,
      userId: alex.id,
      type: "post_published",
      title: "Post published successfully",
      message: "Your Instagram post was published and already has 480 engagements.",
      isRead: true,
      link: "/analytics",
    },
    {
      workspaceId: workspace.id,
      userId: alex.id,
      type: "lead_update",
      title: "Lead moved to Negotiation",
      message: "James Wright (Wright Media Agency) was moved to the negotiation stage.",
      isRead: true,
      link: "/crm",
    },
  ]);

  console.log("✅ Seed complete! Workspace ID:", workspace.id);
  console.log("📧 Login: alex@socify.io / password123");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
