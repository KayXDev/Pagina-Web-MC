export type RewardStats = {
  hasMinecraftLinked: boolean;
  votesCount: number;
  paidOrdersCount: number;
  loyaltyLifetimePoints: number;
  forumPostsCount: number;
  forumLikesReceived: number;
  wishlistCount: number;
};

export type RewardDefinition = {
  key: string;
  icon: string;
  titleEs: string;
  titleEn: string;
  descriptionEs: string;
  descriptionEn: string;
  rewardLabelEs: string;
  rewardLabelEn: string;
  pointsAwarded: number;
  balanceAwarded: number;
  target: number;
  getCurrent: (stats: RewardStats) => number;
};

export const REWARD_DEFINITIONS: RewardDefinition[] = [
  {
    key: 'minecraft_linked',
    icon: 'PICKAXE',
    titleEs: 'Cuenta enlazada',
    titleEn: 'Linked account',
    descriptionEs: 'Enlaza tu cuenta de Minecraft para activar recompensas y entregas seguras.',
    descriptionEn: 'Link your Minecraft account to unlock rewards and secure deliveries.',
    rewardLabelEs: '+40 puntos loyalty',
    rewardLabelEn: '+40 loyalty points',
    pointsAwarded: 40,
    balanceAwarded: 0,
    target: 1,
    getCurrent: (stats) => (stats.hasMinecraftLinked ? 1 : 0),
  },
  {
    key: 'first_vote',
    icon: 'VOTE',
    titleEs: 'Tu primer voto',
    titleEn: 'First vote',
    descriptionEs: 'Vota una vez por el servidor y reclama tu bonus inicial.',
    descriptionEn: 'Vote once for the server and claim your starter bonus.',
    rewardLabelEs: '+25 puntos loyalty',
    rewardLabelEn: '+25 loyalty points',
    pointsAwarded: 25,
    balanceAwarded: 0,
    target: 1,
    getCurrent: (stats) => stats.votesCount,
  },
  {
    key: 'first_purchase',
    icon: 'SHOP',
    titleEs: 'Primera compra',
    titleEn: 'First purchase',
    descriptionEs: 'Completa tu primera compra pagada en la tienda.',
    descriptionEn: 'Complete your first paid purchase in the shop.',
    rewardLabelEs: '+1,00 € de saldo',
    rewardLabelEn: '+€1.00 balance',
    pointsAwarded: 0,
    balanceAwarded: 1,
    target: 1,
    getCurrent: (stats) => stats.paidOrdersCount,
  },
  {
    key: 'community_voice',
    icon: 'FORUM',
    titleEs: 'Voz de la comunidad',
    titleEn: 'Community voice',
    descriptionEs: 'Publica 3 mensajes en el foro y participa en la comunidad.',
    descriptionEn: 'Publish 3 forum posts and take part in the community.',
    rewardLabelEs: '+35 puntos loyalty',
    rewardLabelEn: '+35 loyalty points',
    pointsAwarded: 35,
    balanceAwarded: 0,
    target: 3,
    getCurrent: (stats) => stats.forumPostsCount,
  },
  {
    key: 'loyalty_hundred',
    icon: 'STAR',
    titleEs: 'Nivel inicial loyalty',
    titleEn: 'Starter loyalty tier',
    descriptionEs: 'Acumula 100 puntos históricos de loyalty.',
    descriptionEn: 'Reach 100 lifetime loyalty points.',
    rewardLabelEs: '+2,00 € de saldo',
    rewardLabelEn: '+€2.00 balance',
    pointsAwarded: 0,
    balanceAwarded: 2,
    target: 100,
    getCurrent: (stats) => stats.loyaltyLifetimePoints,
  },
  {
    key: 'wishlist_curator',
    icon: 'HEART',
    titleEs: 'Curador de wishlist',
    titleEn: 'Wishlist curator',
    descriptionEs: 'Guarda al menos 3 productos en tu wishlist.',
    descriptionEn: 'Save at least 3 products to your wishlist.',
    rewardLabelEs: '+20 puntos loyalty',
    rewardLabelEn: '+20 loyalty points',
    pointsAwarded: 20,
    balanceAwarded: 0,
    target: 3,
    getCurrent: (stats) => stats.wishlistCount,
  },
  {
    key: 'forum_appreciated',
    icon: 'LIKE',
    titleEs: 'Apreciado en el foro',
    titleEn: 'Forum appreciation',
    descriptionEs: 'Recibe 10 likes acumulados en tus publicaciones del foro.',
    descriptionEn: 'Receive 10 total likes on your forum posts.',
    rewardLabelEs: '+30 puntos loyalty',
    rewardLabelEn: '+30 loyalty points',
    pointsAwarded: 30,
    balanceAwarded: 0,
    target: 10,
    getCurrent: (stats) => stats.forumLikesReceived,
  },
];

export function buildRewardsProgress(stats: RewardStats, claimedKeys: Set<string>) {
  return REWARD_DEFINITIONS.map((reward) => {
    const current = Math.max(0, Math.floor(Number(reward.getCurrent(stats) || 0)));
    const target = Math.max(1, Math.floor(Number(reward.target || 1)));
    const unlocked = current >= target;
    const claimed = claimedKeys.has(reward.key);
    return {
      ...reward,
      current,
      target,
      unlocked,
      claimed,
      claimable: unlocked && !claimed,
      progressPercent: Math.min(100, Math.round((current / target) * 100)),
    };
  });
}