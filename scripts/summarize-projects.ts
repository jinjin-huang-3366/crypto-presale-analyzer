import "dotenv/config";
import { db } from "../lib/db";
import { summarizeAndStoreAllProjects } from "../lib/ai/service";

async function main() {
  const summaries = await summarizeAndStoreAllProjects();

  console.log(`Generated and stored ${summaries.length} AI project summaries.`);

  const providerCounts = summaries.reduce(
    (acc, item) => {
      acc[item.summary.provider] = (acc[item.summary.provider] ?? 0) + 1;
      return acc;
    },
    { openai: 0, rules: 0 } as Record<"openai" | "rules", number>,
  );

  console.log(
    `Provider usage: openai=${providerCounts.openai} rules=${providerCounts.rules}`,
  );

  console.log("Sample output:");
  for (const item of summaries.slice(0, 3)) {
    console.log(
      `${item.slug.padEnd(20)} ${item.summary.provider} | ${item.summary.aiSummary}`,
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
