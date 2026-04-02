-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('owner', 'analyst', 'reviewer', 'viewer');

-- CreateEnum
CREATE TYPE "ProjectDomain" AS ENUM ('automotive', 'general_system_security');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('queued', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('text');

-- CreateEnum
CREATE TYPE "CveMatchTier" AS ENUM ('exact', 'near', 'contextual');

-- CreateEnum
CREATE TYPE "RiskSourceType" AS ENUM ('threat', 'cve', 'attack_path');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('critical', 'high', 'medium', 'low', 'info');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('json', 'md', 'pdf');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('queued', 'running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'analyst',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" "ProjectDomain" NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'active',
    "system_context" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "initiated_by" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'queued',
    "failed_step" TEXT,
    "error_message" TEXT,
    "steps" JSONB NOT NULL DEFAULT '{"ingestion":"pending","threats":"pending","cves":"pending","attack_paths":"pending","risk":"pending","mitigations":"pending"}',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "model_version" TEXT,
    "retrieval_index_version" TEXT,
    "config_snapshot" JSONB,

    CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "input_artifacts" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "type" "ArtifactType" NOT NULL,
    "content" TEXT NOT NULL,
    "filename" TEXT,
    "content_hash" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "input_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interfaces" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "protocol" TEXT,
    "metadata" JSONB,

    CONSTRAINT "interfaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_boundaries" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "trust_boundaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software_instances" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "cpe" TEXT,
    "metadata" JSONB,

    CONSTRAINT "software_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_flows" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "protocol" TEXT,
    "data_classification" TEXT,
    "metadata" JSONB,

    CONSTRAINT "data_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_functions" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "asil_level" TEXT,
    "metadata" JSONB,

    CONSTRAINT "safety_functions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threats" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "title" TEXT,
    "category" TEXT NOT NULL,
    "framework" TEXT NOT NULL DEFAULT 'stride',
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "impact_breakdown" JSONB,
    "evidence_refs" JSONB,

    CONSTRAINT "threats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threat_entry_points" (
    "threat_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,

    CONSTRAINT "threat_entry_points_pkey" PRIMARY KEY ("threat_id","asset_id")
);

-- CreateTable
CREATE TABLE "threat_impacted_assets" (
    "threat_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,

    CONSTRAINT "threat_impacted_assets_pkey" PRIMARY KEY ("threat_id","asset_id")
);

-- CreateTable
CREATE TABLE "cve_matches" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "cve_identifier" TEXT NOT NULL,
    "description" TEXT,
    "match_tier" "CveMatchTier" NOT NULL,
    "match_score" DOUBLE PRECISION NOT NULL,
    "cvss_score" DOUBLE PRECISION,
    "affected_versions" JSONB,
    "why_relevant" TEXT,
    "published_date" TIMESTAMP(3),
    "matched_software_instance_id" TEXT,

    CONSTRAINT "cve_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cve_match_assets" (
    "cve_match_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,

    CONSTRAINT "cve_match_assets_pkey" PRIMARY KEY ("cve_match_id","asset_id")
);

-- CreateTable
CREATE TABLE "attack_paths" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "start_surface" TEXT NOT NULL,
    "target_asset_id" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "feasibility_score" DOUBLE PRECISION NOT NULL,
    "impact_score" DOUBLE PRECISION NOT NULL,
    "overall_path_risk" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT,
    "trust_boundary_crossings" INTEGER NOT NULL DEFAULT 0,
    "evidence_refs" JSONB,

    CONSTRAINT "attack_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_items" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "source_type" "RiskSourceType" NOT NULL,
    "threat_id" TEXT,
    "cve_match_id" TEXT,
    "attack_path_id" TEXT,
    "likelihood" DOUBLE PRECISION NOT NULL,
    "impact" DOUBLE PRECISION NOT NULL,
    "exploitability" DOUBLE PRECISION NOT NULL,
    "exposure_modifier" DOUBLE PRECISION NOT NULL,
    "final_score" DOUBLE PRECISION NOT NULL,
    "severity" "RiskSeverity" NOT NULL,
    "factor_breakdown" JSONB,

    CONSTRAINT "risk_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mitigations" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "title" TEXT,
    "control_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimated_effort" TEXT,
    "expected_risk_reduction" DOUBLE PRECISION,
    "validation_steps" JSONB,

    CONSTRAINT "mitigations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mitigation_risks" (
    "mitigation_id" TEXT NOT NULL,
    "risk_item_id" TEXT NOT NULL,

    CONSTRAINT "mitigation_risks_pkey" PRIMARY KEY ("mitigation_id","risk_item_id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "format" "ReportFormat" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'queued',
    "error_message" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "download_url" TEXT,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "input_artifacts" ADD CONSTRAINT "input_artifacts_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interfaces" ADD CONSTRAINT "interfaces_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_boundaries" ADD CONSTRAINT "trust_boundaries_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software_instances" ADD CONSTRAINT "software_instances_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software_instances" ADD CONSTRAINT "software_instances_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_flows" ADD CONSTRAINT "data_flows_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_flows" ADD CONSTRAINT "data_flows_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_flows" ADD CONSTRAINT "data_flows_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_functions" ADD CONSTRAINT "safety_functions_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_functions" ADD CONSTRAINT "safety_functions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threats" ADD CONSTRAINT "threats_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threat_entry_points" ADD CONSTRAINT "threat_entry_points_threat_id_fkey" FOREIGN KEY ("threat_id") REFERENCES "threats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threat_entry_points" ADD CONSTRAINT "threat_entry_points_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threat_impacted_assets" ADD CONSTRAINT "threat_impacted_assets_threat_id_fkey" FOREIGN KEY ("threat_id") REFERENCES "threats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threat_impacted_assets" ADD CONSTRAINT "threat_impacted_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cve_matches" ADD CONSTRAINT "cve_matches_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cve_matches" ADD CONSTRAINT "cve_matches_matched_software_instance_id_fkey" FOREIGN KEY ("matched_software_instance_id") REFERENCES "software_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cve_match_assets" ADD CONSTRAINT "cve_match_assets_cve_match_id_fkey" FOREIGN KEY ("cve_match_id") REFERENCES "cve_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cve_match_assets" ADD CONSTRAINT "cve_match_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attack_paths" ADD CONSTRAINT "attack_paths_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attack_paths" ADD CONSTRAINT "attack_paths_target_asset_id_fkey" FOREIGN KEY ("target_asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_items" ADD CONSTRAINT "risk_items_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_items" ADD CONSTRAINT "risk_items_threat_id_fkey" FOREIGN KEY ("threat_id") REFERENCES "threats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_items" ADD CONSTRAINT "risk_items_cve_match_id_fkey" FOREIGN KEY ("cve_match_id") REFERENCES "cve_matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_items" ADD CONSTRAINT "risk_items_attack_path_id_fkey" FOREIGN KEY ("attack_path_id") REFERENCES "attack_paths"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mitigations" ADD CONSTRAINT "mitigations_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mitigation_risks" ADD CONSTRAINT "mitigation_risks_mitigation_id_fkey" FOREIGN KEY ("mitigation_id") REFERENCES "mitigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mitigation_risks" ADD CONSTRAINT "mitigation_risks_risk_item_id_fkey" FOREIGN KEY ("risk_item_id") REFERENCES "risk_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
