const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const User = sequelize.define("User", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING(120), unique: true, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: true },
    password_hash: { type: DataTypes.STRING(200), allowNull: true },
    google_id: { type: DataTypes.STRING(200), unique: true, allowNull: true },
    role: { type: DataTypes.STRING(20), defaultValue: "student" },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    bio: { type: DataTypes.TEXT, allowNull: true },
    profile_photo: { type: DataTypes.STRING(500), allowNull: true },
    read_notifications: { type: DataTypes.TEXT, defaultValue: "[]" },
    fcm_token: { type: DataTypes.TEXT, allowNull: true },
    trust_score: { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    tableName: 'user',
    timestamps: false // SQLAlchemy doesn't add timestamps by default unless specified
  });

  return User;
};
