-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "twitter" TEXT,
    "whitepaper" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "fdv" DECIMAL(65,30),
    "sale_price" DECIMAL(65,30),
    "total_supply" DECIMAL(65,30),
    "vesting_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectScore" (
    "project_id" TEXT NOT NULL,
    "total_score" INTEGER NOT NULL,
    "tokenomics_score" INTEGER NOT NULL,
    "credibility_score" INTEGER NOT NULL,
    "narrative_score" INTEGER NOT NULL,
    "liquidity_score" INTEGER NOT NULL,
    "transparency_score" INTEGER NOT NULL,
    "hype_score" INTEGER NOT NULL,

    CONSTRAINT "ProjectScore_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "RedFlag" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "RedFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSummary" (
    "project_id" TEXT NOT NULL,
    "ai_summary" TEXT NOT NULL,
    "ai_risk_explanation" TEXT NOT NULL,

    CONSTRAINT "ProjectSummary_pkey" PRIMARY KEY ("project_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "RedFlag_project_id_idx" ON "RedFlag"("project_id");

-- AddForeignKey
ALTER TABLE "ProjectScore" ADD CONSTRAINT "ProjectScore_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedFlag" ADD CONSTRAINT "RedFlag_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSummary" ADD CONSTRAINT "ProjectSummary_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

