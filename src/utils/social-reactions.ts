import type { EmojiReaction } from 'src/types/social';

type ReactionRow = {
  post_id?: string | null;
  emoji?: string | null;
  tenant_id?: string | null;
};

export function computeReactionAggregates(
  rows: ReactionRow[] | null | undefined,
  currentUserId?: string | null
): {
  reactionMap: Map<string, EmojiReaction[]>;
  userReactionMap: Map<string, string>;
} {
  const reactionMap = new Map<string, EmojiReaction[]>();
  const userReactionMap = new Map<string, string>();

  if (!rows || rows.length === 0) {
    return { reactionMap, userReactionMap };
  }

  const grouped = new Map<string, Map<string, { count: number; userReacted: boolean }>>();

  for (const row of rows) {
    if (!row.post_id || !row.emoji) {
      continue;
    }
    const postId = row.post_id;
    const emoji = row.emoji;
    const isUser = !!currentUserId && row.tenant_id === currentUserId;
    const emojiMap = grouped.get(postId) ?? new Map();
    const existing = emojiMap.get(emoji) ?? { count: 0, userReacted: false };

    emojiMap.set(emoji, {
      count: existing.count + 1,
      userReacted: existing.userReacted || isUser,
    });
    grouped.set(postId, emojiMap);

    if (isUser) {
      userReactionMap.set(postId, emoji);
    }
  }

  grouped.forEach((emojiMap, postId) => {
    const reactions: EmojiReaction[] = Array.from(emojiMap.entries()).map(([emoji, info]) => ({
      emoji,
      count: info.count,
      userReacted: info.userReacted,
    }));
    reactionMap.set(postId, reactions);
  });

  return { reactionMap, userReactionMap };
}
