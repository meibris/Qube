// import "dotenv/config";
// import type { Config } from "drizzle-kit";

// export default {
//   schema: "./db/schema.ts",
//   out: "./drizzle",
//   dialect: "postgresql",
//   driver: "pg",
//   dbCredentials: {
//     connectionString: process.env.DATABASE_URL!, // only works for driver: "pg"
//   },
// }; satisfies Config

// export default config;

//----------------------------------
// import "dotenv/config";

// export default {
//     schema: "./db/schema.ts",
//     out: "./drizzle",
//     dialect: "postgresql",
//     dbCredentials: {
//         connectionString: process.env.DATABASE_URL!,
//     },
// } //satisfies Config;


//-----------------------
import type { Config } from "drizzle-kit";
import "dotenv/config";

const config: Config = {
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
};

export default config;