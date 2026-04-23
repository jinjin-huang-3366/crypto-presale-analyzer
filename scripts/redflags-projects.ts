import "dotenv/config";
import { db } from "../lib/db";
import { detectAndStoreAllRedFlags } from "../lib/redflags/service";
import { scoreAndStoreAllProjects } from "../lib/scoring/service";

async function main() {
  const updated = await detectAndStoreAllRedFlags();
  const flaggedProjects = updated.filter((item) => item.flags.length > 0);
  const totalFlags = flaggedProjects.reduce((sum, item) => sum + item.flags.length, 0);

  console.log(
    `Detected and stored ${totalFlags} flags across ${flaggedProjects.length}/${updated.length} projects.`,
  );

  for (const project of flaggedProjects.slice(0, 8)) {
    const flagNames = project.flags.map((flag) => flag.type).join(", ");
    console.log(`${project.slug.padEnd(20)} ${flagNames}`);
  }

  await scoreAndStoreAllProjects();
  console.log("Scores refreshed after red flag detection.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
