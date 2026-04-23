import "dotenv/config";
import { db } from "../lib/db";
import { scoreAndStoreAllProjects } from "../lib/scoring/service";

async function main() {
  const scored = await scoreAndStoreAllProjects();
  const ordered = [...scored].sort(
    (a, b) => b.result.totalScore - a.result.totalScore,
  );

  console.log(`Scored and stored ${ordered.length} projects.`);
  console.log("Top 5:");
  for (const project of ordered.slice(0, 5)) {
    console.log(
      `${project.slug.padEnd(20)} total=${project.result.totalScore} tokenomics=${project.result.categoryScores.tokenomics} credibility=${project.result.categoryScores.credibility}`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
