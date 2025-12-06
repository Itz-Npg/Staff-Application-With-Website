import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface GlobalMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: GlobalMongoose | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

// User Schema
const userSchema = new mongoose.Schema({
  odId: { type: String, required: true, unique: true },
  discordId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  discriminator: { type: String, default: null },
  avatar: { type: String, default: null },
  globalName: { type: String, default: null },
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  tokenExpiresAt: { type: Date, required: true },
}, { timestamps: true });

// Application Config Schema
const applicationConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  logsChannelId: { type: String, required: true },
  categoryId: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  questions: { type: [String], default: [] },
  requiredRole: { type: String, default: null },
  approvedRole: { type: String, default: null },
  rejectedRole: { type: String, default: null },
  staffAdminRole: { type: String, default: null },
  cooldown: { type: Number, default: 86400000 },
  stats: {
    totalApplications: { type: Number, default: 0 },
    approved: { type: Number, default: 0 },
    rejected: { type: Number, default: 0 },
    pending: { type: Number, default: 0 }
  }
}, { timestamps: true });

// Application Submission Schema
const applicationSubmissionSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  odId: { type: String, required: true },
  odTag: { type: String, required: true },
  applicationId: { type: String, required: true, unique: true },
  answers: [{
    question: { type: String, required: true },
    answer: { type: String, required: true }
  }],
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  reviewedBy: { type: String, default: null },
  reviewedAt: { type: Date, default: null },
  reason: { type: String, default: null },
  messageId: { type: String, default: null }
}, { timestamps: true });

// Premium Code Schema
const premiumCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  duration: { type: Number, required: true },
  maxUses: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  usedBy: [{ 
    guildId: String, 
    usedAt: Date,
    usedByUserId: String 
  }],
  createdBy: { type: String, required: true },
  expiresAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Guild Premium Schema
const guildPremiumSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  isPremium: { type: Boolean, default: false },
  premiumSince: { type: Date, default: null },
  premiumExpiry: { type: Date, default: null },
  applicationLimit: { type: Number, default: 15 },
  applicationsUsed: { type: Number, default: 0 },
  lastResetAt: { type: Date, default: Date.now },
  redeemedCodes: [{ 
    code: String, 
    redeemedAt: Date,
    duration: Number 
  }],
}, { timestamps: true });

// Session Schema
const sessionSchema = new mongoose.Schema({
  odId: { type: String, required: true },
  sessionId: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const ApplicationConfig = mongoose.models.ApplicationConfig || mongoose.model('ApplicationConfig', applicationConfigSchema);
export const ApplicationSubmission = mongoose.models.ApplicationSubmission || mongoose.model('ApplicationSubmission', applicationSubmissionSchema);
export const PremiumCode = mongoose.models.PremiumCode || mongoose.model('PremiumCode', premiumCodeSchema);
export const GuildPremium = mongoose.models.GuildPremium || mongoose.model('GuildPremium', guildPremiumSchema);
export const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);

export const FREE_TIER_LIMIT = 15;
export const PREMIUM_TIER_LIMIT = 100;
