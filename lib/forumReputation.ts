import ForumPost from '@/models/ForumPost';
import ForumReply from '@/models/ForumReply';

export type ForumReputationTier = 'NEW' | 'REGULAR' | 'TRUSTED' | 'ELITE';

export type ForumReputation = {
  score: number;
  tier: ForumReputationTier;
  rootPosts: number;
  replies: number;
  likesReceived: number;
  views: number;
};

type ForumIdentity = {
  id?: string | null;
  username?: string | null;
};

const DEFAULT_REPUTATION: ForumReputation = {
  score: 0,
  tier: 'NEW',
  rootPosts: 0,
  replies: 0,
  likesReceived: 0,
  views: 0,
};

function toTier(score: number): ForumReputationTier {
  if (score >= 220) return 'ELITE';
  if (score >= 100) return 'TRUSTED';
  if (score >= 30) return 'REGULAR';
  return 'NEW';
}

function toScore(stats: Omit<ForumReputation, 'score' | 'tier'>): number {
  return Math.max(
    0,
    stats.rootPosts * 12 +
      stats.replies * 6 +
      stats.likesReceived * 4 +
      Math.floor(stats.views / 20)
  );
}

function normalizeIdentity(identity: ForumIdentity) {
  return {
    id: String(identity.id || '').trim(),
    username: String(identity.username || '').trim().toLowerCase(),
  };
}

export function buildForumReputation(stats?: Partial<ForumReputation> | null): ForumReputation {
  const base = {
    rootPosts: Number(stats?.rootPosts || 0),
    replies: Number(stats?.replies || 0),
    likesReceived: Number(stats?.likesReceived || 0),
    views: Number(stats?.views || 0),
  };
  const score = toScore(base);
  return {
    ...base,
    score,
    tier: toTier(score),
  };
}

export async function getForumReputationMap(identities: ForumIdentity[]) {
  const normalized = identities.map(normalizeIdentity);
  const ids = Array.from(new Set(normalized.map((entry) => entry.id).filter(Boolean)));
  const usernames = Array.from(new Set(normalized.map((entry) => entry.username).filter(Boolean)));

  const matchPosts: Record<string, any> = {};
  if (ids.length && usernames.length) {
    matchPosts.$or = [
      { authorId: { $in: ids } },
      { authorUsername: { $in: usernames } },
    ];
  } else if (ids.length) {
    matchPosts.authorId = { $in: ids };
  } else if (usernames.length) {
    matchPosts.authorUsername = { $in: usernames };
  } else {
    return new Map<string, ForumReputation>();
  }

  const matchLegacyReplies: Record<string, any> = {};
  if (ids.length && usernames.length) {
    matchLegacyReplies.$or = [
      { userId: { $in: ids } },
      { username: { $in: usernames } },
    ];
  } else if (ids.length) {
    matchLegacyReplies.userId = { $in: ids };
  } else if (usernames.length) {
    matchLegacyReplies.username = { $in: usernames };
  }

  const [postStats, legacyReplyStats] = await Promise.all([
    ForumPost.aggregate([
      { $match: matchPosts },
      {
        $group: {
          _id: {
            authorId: '$authorId',
            authorUsername: '$authorUsername',
          },
          rootPosts: {
            $sum: {
              $cond: [{ $eq: ['$parentId', null] }, 1, 0],
            },
          },
          replies: {
            $sum: {
              $cond: [{ $ne: ['$parentId', null] }, 1, 0],
            },
          },
          likesReceived: { $sum: { $ifNull: ['$likesCount', 0] } },
          views: { $sum: { $ifNull: ['$views', 0] } },
        },
      },
    ]),
    Object.keys(matchLegacyReplies).length
      ? ForumReply.aggregate([
          { $match: matchLegacyReplies },
          {
            $group: {
              _id: {
                userId: '$userId',
                username: '$username',
              },
              replies: { $sum: 1 },
            },
          },
        ])
      : Promise.resolve([]),
  ]);

  const combined = new Map<string, ForumReputation>();

  const merge = (id: string, username: string, patch: Partial<ForumReputation>) => {
    const key = id || `u:${username}`;
    const current = combined.get(key) || DEFAULT_REPUTATION;
    combined.set(
      key,
      buildForumReputation({
        rootPosts: current.rootPosts + Number(patch.rootPosts || 0),
        replies: current.replies + Number(patch.replies || 0),
        likesReceived: current.likesReceived + Number(patch.likesReceived || 0),
        views: current.views + Number(patch.views || 0),
      })
    );
  };

  for (const row of postStats as any[]) {
    const id = String(row?._id?.authorId || '').trim();
    const username = String(row?._id?.authorUsername || '').trim().toLowerCase();
    merge(id, username, {
      rootPosts: Number(row?.rootPosts || 0),
      replies: Number(row?.replies || 0),
      likesReceived: Number(row?.likesReceived || 0),
      views: Number(row?.views || 0),
    });
  }

  for (const row of legacyReplyStats as any[]) {
    const id = String(row?._id?.userId || '').trim();
    const username = String(row?._id?.username || '').trim().toLowerCase();
    merge(id, username, {
      replies: Number(row?.replies || 0),
    });
  }

  const result = new Map<string, ForumReputation>();
  for (const identity of normalized) {
    const byId = identity.id ? combined.get(identity.id) : undefined;
    const byUsername = identity.username ? combined.get(`u:${identity.username}`) : undefined;
    const reputation = byId || byUsername || DEFAULT_REPUTATION;
    if (identity.id) result.set(identity.id, reputation);
    if (identity.username) result.set(`u:${identity.username}`, reputation);
  }

  return result;
}