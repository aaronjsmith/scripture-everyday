/** Suggested writing prompts for personal impressions */
export const WRITING_PROMPTS = [
  'Where do you see Christ in this verse?',
  'What is the Spirit teaching you?',
  'How does this apply to your life today?',
  'What does this reveal about Heavenly Father’s character?',
  'What covenant invitation do you hear here?',
  'What question would you take to the Lord about this verse?',
  'Who needs the hope of this verse, and how might you share it?',
  'What will you do differently because of this verse?',
] as const

export type WritingPrompt = (typeof WRITING_PROMPTS)[number]
