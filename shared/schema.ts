import { z } from "zod";

export const botStatsSchema = z.object({
  servers: z.number(),
  users: z.number(),
  applications: z.number(),
  uptime: z.string(),
});

export type BotStats = z.infer<typeof botStatsSchema>;

export const commandSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  usage: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  permissions: z.string().optional(),
});

export type Command = z.infer<typeof commandSchema>;

export const discordUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  discriminator: z.string().optional(),
  avatar: z.string(),
  globalName: z.string().nullable().optional(),
});

export type DiscordUser = z.infer<typeof discordUserSchema>;

export const guildSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  owner: z.boolean(),
  permissions: z.string(),
  isAdmin: z.boolean(),
  botAdded: z.boolean(),
  prefix: z.string(),
});

export type Guild = z.infer<typeof guildSchema>;

export const serverSettingsSchema = z.object({
  guildId: z.string(),
  prefix: z.string(),
  language: z.string(),
});

export type ServerSettings = z.infer<typeof serverSettingsSchema>;

export const applicationAnswerSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

export const applicationSubmissionSchema = z.object({
  _id: z.string().optional(),
  guildId: z.string(),
  odId: z.string(),
  odTag: z.string(),
  applicationId: z.string(),
  answers: z.array(applicationAnswerSchema),
  status: z.enum(['pending', 'approved', 'rejected']),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  reason: z.string().nullable(),
  messageId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ApplicationSubmission = z.infer<typeof applicationSubmissionSchema>;

export const applicationConfigSchema = z.object({
  guildId: z.string(),
  channelId: z.string().nullable(),
  logsChannelId: z.string().nullable(),
  categoryId: z.string().nullable(),
  enabled: z.boolean(),
  questions: z.array(z.string()),
  requiredRole: z.string().nullable(),
  approvedRole: z.string().nullable(),
  rejectedRole: z.string().nullable(),
  staffAdminRole: z.string().nullable(),
  cooldown: z.number(),
  stats: z.object({
    totalApplications: z.number(),
    approved: z.number(),
    rejected: z.number(),
    pending: z.number(),
  }),
});

export type ApplicationConfig = z.infer<typeof applicationConfigSchema>;

export const serverStatsSchema = z.object({
  totalApplications: z.number(),
  pending: z.number(),
  approved: z.number(),
  rejected: z.number(),
  enabled: z.boolean(),
  questionsCount: z.number(),
});

export type ServerStats = z.infer<typeof serverStatsSchema>;

export const paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  pages: z.number(),
});

export type Pagination = z.infer<typeof paginationSchema>;

export const applicationsResponseSchema = z.object({
  applications: z.array(applicationSubmissionSchema),
  pagination: paginationSchema,
});

export type ApplicationsResponse = z.infer<typeof applicationsResponseSchema>;

export const guildPremiumSchema = z.object({
  guildId: z.string(),
  isPremium: z.boolean(),
  premiumSince: z.string().nullable(),
  premiumExpiry: z.string().nullable(),
  applicationLimit: z.number(),
  applicationsUsed: z.number(),
  tier: z.enum(['free', 'premium']),
});

export type GuildPremium = z.infer<typeof guildPremiumSchema>;

export const premiumRedeemResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  premium: z.object({
    isPremium: z.boolean(),
    premiumExpiry: z.string(),
    applicationLimit: z.number(),
    applicationsUsed: z.number(),
  }),
});

export type PremiumRedeemResponse = z.infer<typeof premiumRedeemResponseSchema>;

export const applicationLimitsSchema = z.object({
  allowed: z.boolean(),
  used: z.number(),
  limit: z.number(),
  isPremium: z.boolean(),
});

export type ApplicationLimits = z.infer<typeof applicationLimitsSchema>;
