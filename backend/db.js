const { Sequelize, DataTypes } = require("sequelize");
require("pg"); // Explicit require so the Vercel bundler includes the driver.

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Hosted databases (Neon) require TLS; a local Postgres usually doesn't offer it.
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL);

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectOptions: isLocal ? {} : { ssl: { require: true } },
  pool: { max: 2, min: 0, acquire: 30000, idle: 10000 },
  logging: false,
});

const User = sequelize.define(
  "User",
  {
    email: { type: DataTypes.STRING(120), unique: true, allowNull: false },
    name: DataTypes.STRING(100),
    password_hash: DataTypes.STRING(200),
    google_id: { type: DataTypes.STRING(200), unique: true },
    role: { type: DataTypes.STRING(20), defaultValue: "student" },
    phone: DataTypes.STRING(20),
    bio: DataTypes.TEXT,
    profile_photo: DataTypes.STRING(500),
    read_notifications: { type: DataTypes.TEXT, defaultValue: "[]" },
    trust_score: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { tableName: "user", timestamps: false }
);

const Item = sequelize.define(
  "Item",
  {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.STRING(20), allowNull: false }, // "lost" | "found"
    description: { type: DataTypes.TEXT, allowNull: false },
    location: { type: DataTypes.STRING(200), allowNull: false },
    date_lost: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    image_url: DataTypes.STRING(500),
    image_data: DataTypes.TEXT, // legacy rows only; new uploads use image_url
    status: { type: DataTypes.STRING(20), defaultValue: "unresolved" },
    contact_info: DataTypes.STRING(200),
    category: DataTypes.STRING(50),
    color: DataTypes.STRING(50),
    brand: DataTypes.STRING(50),
    distinctive_features: DataTypes.TEXT, // JSON-encoded string[]
  },
  { tableName: "item", timestamps: false }
);

const Claim = sequelize.define(
  "Claim",
  {
    item_id: { type: DataTypes.INTEGER, allowNull: false },
    claimant_id: { type: DataTypes.INTEGER, allowNull: false },
    message: DataTypes.TEXT,
    status: { type: DataTypes.STRING(20), defaultValue: "pending" },
    response_message: DataTypes.TEXT,
    meeting_location: DataTypes.STRING(200),
    meeting_time: DataTypes.DATE,
    qr_code: DataTypes.STRING(500), // 6-digit handoff code
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: "claim", timestamps: false }
);

User.hasMany(Item, { foreignKey: "user_id" });
Item.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(Claim, { foreignKey: "claimant_id" });
Claim.belongsTo(User, { foreignKey: "claimant_id", as: "claimant" });
Item.hasMany(Claim, { foreignKey: "item_id" });
Claim.belongsTo(Item, { foreignKey: "item_id" });

module.exports = { sequelize, User, Item, Claim };
