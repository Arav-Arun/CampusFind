const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Item = sequelize.define("Item", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.STRING(20), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    location: { type: DataTypes.STRING(200), allowNull: false },
    date_lost: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    image_url: { type: DataTypes.STRING(500), allowNull: true },
    image_data: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(20), defaultValue: "unresolved" },
    finder_name: { type: DataTypes.STRING(100), allowNull: true },
    finder_phone: { type: DataTypes.STRING(20), allowNull: true },
    contact_info: { type: DataTypes.STRING(200), allowNull: true },
    is_with_finder: { type: DataTypes.BOOLEAN, defaultValue: true },
    category: { type: DataTypes.STRING(50), allowNull: true },
    color: { type: DataTypes.STRING(50), allowNull: true },
    brand: { type: DataTypes.STRING(50), allowNull: true },
    distinctive_features: { type: DataTypes.TEXT, allowNull: true },
    verification_question: { type: DataTypes.STRING(500), allowNull: true },
    verification_answer: { type: DataTypes.STRING(500), allowNull: true },
    verification_answer_type: { type: DataTypes.STRING(50), allowNull: true },
  }, {
    tableName: 'item',
    timestamps: false
  });

  return Item;
};
