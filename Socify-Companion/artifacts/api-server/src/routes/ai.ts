import { Router } from "express";
import { GenerateCaptionBody, SuggestHashtagsBody } from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

const captionTemplates: Record<string, string[]> = {
  professional: [
    "Excited to share our latest update with you! {topic} is transforming how we work.",
    "Big news in the {topic} space. Here's what you need to know.",
    "We've been working hard on {topic}. The results speak for themselves.",
  ],
  casual: [
    "Can't stop thinking about {topic} lately! Anyone else obsessed? 👀",
    "Real talk — {topic} has completely changed the game for us.",
    "Just dropped everything to share this {topic} moment with you all.",
  ],
  inspirational: [
    "Every great {topic} journey starts with a single step. We're just getting started.",
    "The future of {topic} is brighter than ever. Here's why we believe that.",
    "Success in {topic} isn't just about the destination — it's the whole journey.",
  ],
};

const platformHashtags: Record<string, string[]> = {
  instagram: ["#instadaily", "#trending", "#viral", "#explore", "#reels"],
  twitter: ["#trending", "#tech", "#innovation", "#startup"],
  linkedin: ["#professional", "#business", "#leadership", "#innovation", "#growth"],
  tiktok: ["#fyp", "#viral", "#trending", "#foryoupage"],
  facebook: ["#facebook", "#community", "#share"],
};

router.post("/ai/generate-caption", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = GenerateCaptionBody.parse(req.body);
    const templates = captionTemplates[body.tone] ?? captionTemplates.professional;
    const template = templates[Math.floor(Math.random() * templates.length)];
    const caption = template.replace("{topic}", body.topic);
    const hashtags = [
      `#${body.topic.toLowerCase().replace(/\s+/g, "")}`,
      ...(platformHashtags[body.platform] ?? platformHashtags.instagram).slice(0, 4),
    ];
    res.json({ caption: body.includeHashtags ? `${caption}\n\n${hashtags.join(" ")}` : caption, hashtags });
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to generate caption" });
  }
});

router.post("/ai/suggest-hashtags", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = SuggestHashtagsBody.parse(req.body);
    const words = body.caption.split(/\s+/).filter(w => w.length > 4).slice(0, 3);
    const topicTags = words.map(w => `#${w.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
    const platformTags = (platformHashtags[body.platform] ?? platformHashtags.instagram).slice(0, 5);
    res.json({ hashtags: [...new Set([...topicTags, ...platformTags])].slice(0, 8) });
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to suggest hashtags" });
  }
});

export default router;
