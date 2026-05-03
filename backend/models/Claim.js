const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Claim = sequelize.define("Claim", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    item_id: { type: DataTypes.INTEGER, allowNull: false },
    claimant_id: { type: DataTypes.INTEGER, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: true },
    proof_image: { type: DataTypes.STRING(500), allowNull: true },
    proof_image_data: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(20), defaultValue: "pending" },
    response_message: { type: DataTypes.TEXT, allowNull: true },
    meeting_location: { type: DataTypes.STRING(200), allowNull: true },
    meeting_time: { type: DataTypes.DATE, allowNull: true },
    qr_code: { type: DataTypes.STRING(500), allowNull: true },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'claim',
    timestamps: false
  });

  return Claim;
};
