-- Add game_name column to race_sessions (schema has it, DB does not)
ALTER TABLE "race_sessions" ADD COLUMN IF NOT EXISTS "game_name" varchar(64) DEFAULT 'iracing';

--> statement-breakpoint

-- Create lap_telemetry table
CREATE TABLE IF NOT EXISTS "lap_telemetry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"lap_number" integer NOT NULL,
	"lap_time" double precision,
	"sector_1" double precision,
	"sector_2" double precision,
	"sector_3" double precision,
	"incident_count" integer DEFAULT 0,
	"incident_points" integer DEFAULT 0,
	"is_clean_lap" boolean DEFAULT true,
	"incident_track_position" double precision,
	"rage_score" double precision,
	"throttle_aggression" double precision,
	"steering_erraticism" double precision,
	"braking_aggression" double precision,
	"proximity_chasing" double precision,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint

-- Create session_behavior table
CREATE TABLE IF NOT EXISTS "session_behavior" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"hard_braking_events" integer DEFAULT 0,
	"close_pass_count" integer DEFAULT 0,
	"tailgating_seconds" double precision DEFAULT 0,
	"off_track_count" integer DEFAULT 0,
	"spin_count" integer DEFAULT 0,
	"clean_laps" integer DEFAULT 0,
	"total_laps" integer DEFAULT 0,
	"peak_rage_score" double precision,
	"avg_rage_score" double precision,
	"rage_spikes" integer DEFAULT 0,
	"cooldowns_triggered" integer DEFAULT 0,
	"retaliation_attempts" integer DEFAULT 0,
	"total_rage_recovery_seconds" double precision DEFAULT 0,
	"rage_recovery_count" integer DEFAULT 0,
	"incidents_by_phase" jsonb,
	"incident_locations" jsonb,
	"threat_ledger" jsonb,
	"commentary_log" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint

-- Foreign keys for lap_telemetry
ALTER TABLE "lap_telemetry" ADD CONSTRAINT "lap_telemetry_session_id_race_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."race_sessions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lap_telemetry" ADD CONSTRAINT "lap_telemetry_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint

-- Foreign keys for session_behavior
ALTER TABLE "session_behavior" ADD CONSTRAINT "session_behavior_session_id_race_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."race_sessions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "session_behavior" ADD CONSTRAINT "session_behavior_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
