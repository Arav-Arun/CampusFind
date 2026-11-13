// Maintenance commands:
//   npm run db:migrate   create missing tables, the pgvector column and indexes (safe to re-run)
//   npm run db:embed     embed reports that don't have a vector yet
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const commands = {
  async migrate() {
    const { vector } = await require("./db").migrate();
    console.log(vector ? "Schema is up to date, semantic matching enabled." : "Schema is up to date. pgvector is unavailable, so matching uses keywords.");
  },
  async embed() {
    const count = await require("./services/matching").backfill();
    console.log(count ? `Embedded ${count} reports.` : "Nothing embedded: every report has a vector, or pgvector/OPENAI_API_KEY is missing.");
  },
};

const command = commands[process.argv[2]];
if (!command) {
  console.error(`Usage: node cli.js <${Object.keys(commands).join("|")}>`);
  process.exit(1);
}
command()
  .then(() => require("./db").sequelize.close())
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
