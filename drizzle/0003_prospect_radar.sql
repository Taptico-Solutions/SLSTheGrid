CREATE TYPE "prospect_lead_status" AS ENUM (
  'new',
  'researching',
  'contacted',
  'qualified',
  'proposal',
  'won',
  'lost',
  'nurture'
);

CREATE TYPE "prospect_buying_stage" AS ENUM (
  'early_planning',
  'design',
  'pricing',
  'bidding',
  'awarded',
  'procurement'
);

CREATE TYPE "prospect_signal_type" AS ENUM (
  'permit',
  'plan_room',
  'construction_start',
  'architect_activity',
  'gc_award',
  'budget_approved',
  'renovation',
  'tenant_improvement',
  'hospitality_pipeline',
  'municipal_bid',
  'relationship',
  'news'
);

CREATE TABLE "prospect_leads" (
  "id" serial PRIMARY KEY NOT NULL,
  "company_name" varchar(255) NOT NULL,
  "project_name" varchar(255) NOT NULL,
  "project_type" varchar(128) NOT NULL,
  "market_sector" varchar(128),
  "location" varchar(255) NOT NULL,
  "status" "prospect_lead_status" DEFAULT 'new' NOT NULL,
  "buying_stage" "prospect_buying_stage" DEFAULT 'early_planning' NOT NULL,
  "heat_score" integer DEFAULT 50 NOT NULL,
  "confidence_score" integer DEFAULT 50 NOT NULL,
  "estimated_project_value" numeric(14, 2),
  "estimated_lighting_value" numeric(14, 2),
  "decision_window" varchar(128),
  "expected_bid_date" date,
  "expected_award_date" date,
  "construction_start_date" date,
  "owner_name" varchar(255),
  "architect_name" varchar(255),
  "general_contractor_name" varchar(255),
  "electrical_engineer_name" varchar(255),
  "primary_contact_name" varchar(255),
  "primary_contact_title" varchar(255),
  "primary_contact_email" varchar(320),
  "primary_contact_phone" varchar(64),
  "primary_signal" varchar(255) NOT NULL,
  "source_name" varchar(255),
  "source_url" text,
  "summary" text,
  "recommended_next_step" text,
  "notes" text,
  "assigned_rep_id" integer,
  "created_by" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "prospect_signals" (
  "id" serial PRIMARY KEY NOT NULL,
  "prospect_id" integer NOT NULL,
  "type" "prospect_signal_type" NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "signal_date" date,
  "source_name" varchar(255),
  "source_url" text,
  "confidence_score" integer DEFAULT 50 NOT NULL,
  "impact_score" integer DEFAULT 50 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "prospect_leads" ADD CONSTRAINT "prospect_leads_assigned_rep_id_users_id_fk" FOREIGN KEY ("assigned_rep_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "prospect_leads" ADD CONSTRAINT "prospect_leads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "prospect_signals" ADD CONSTRAINT "prospect_signals_prospect_id_prospect_leads_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospect_leads"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "prospect_leads_heat_score_idx" ON "prospect_leads" ("heat_score");
CREATE INDEX "prospect_leads_status_idx" ON "prospect_leads" ("status");
CREATE INDEX "prospect_leads_buying_stage_idx" ON "prospect_leads" ("buying_stage");
CREATE INDEX "prospect_leads_assigned_rep_idx" ON "prospect_leads" ("assigned_rep_id");
CREATE INDEX "prospect_signals_prospect_id_idx" ON "prospect_signals" ("prospect_id");
CREATE INDEX "prospect_signals_type_idx" ON "prospect_signals" ("type");
