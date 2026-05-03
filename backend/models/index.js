const { sequelize } = require("../config/neon");

let User = null;
let Item = null;
let Claim = null;

if (sequelize) {
  try {
    User = require("./User")(sequelize);
    Item = require("./Item")(sequelize);
    Claim = require("./Claim")(sequelize);

    // Setup Associations (equivalent to SQLAlchemy backrefs)
    User.hasMany(Item, { foreignKey: 'user_id' });
    Item.belongsTo(User, { foreignKey: 'user_id' });

    User.hasMany(Claim, { foreignKey: 'claimant_id' });
    Claim.belongsTo(User, { foreignKey: 'claimant_id', as: 'claimant' });

    Item.hasMany(Claim, { foreignKey: 'item_id' });
    Claim.belongsTo(Item, { foreignKey: 'item_id' });
  } catch (err) {
    console.error("Failed to initialize models:", err.message);
  }
}

module.exports = {
  sequelize,
  User,
  Item,
  Claim
};
