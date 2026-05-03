const { Sequelize } = require("sequelize");
require("pg"); // Explicitly require pg for Vercel bundler

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("FATAL: DATABASE_URL environment variable is not set.");
}

// Setup Sequelize instance
let sequelize = null;
let initializationError = null;

try {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is missing");
  }

  sequelize = new Sequelize(DATABASE_URL, {
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Required for Neon
      },
    },
    pool: {
      max: 2,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    logging: false,
  });
} catch (err) {
  console.error("Sequelize initialization error:", err.message);
  initializationError = err.message;
  sequelize = null;
}

const connectDB = async () => {
  if (!sequelize) throw new Error("DATABASE_URL is not configured correctly: " + initializationError);
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL (Neon) connected successfully");
  } catch (error) {
    console.error("NeonDB connection failed:", error.message);
    throw error;
  }
};

module.exports = { sequelize, connectDB, initializationError };
