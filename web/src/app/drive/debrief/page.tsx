import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { eq, desc, and } from "drizzle-orm";
import { BarChart3 } from "lucide-react";
import SessionSelector from "./SessionSelector";
import SessionSummaryCard from "./SessionSummaryCard";
import LapTimeline from "./LapTimeline";
import CommentaryReplay from "./CommentaryReplay";
import BehavioralRadar from "./BehavioralRadar";
import PatternDetection from "./PatternDetection";

// ── Types ──────────────────────────────────────────────────────────────────────

type RaceSession = {
  id: string;
  carModel: string;
  manufacturer: string | null;
  trackName: string | null;
  finishPosition: number | null;
  incidentCount: number | null;
  sessionType: string | null;
  category: string;
  metadata: Record<string, any> | null;
  createdAt: Date;
};

type LapTelemetryData = {
  id: string;
  lapNumber: number;
  lapTime: number | null;
  incidentCount: number;
  rageScore: number | null;
  throttleAggression: number | null;
  steeringErraticism: number | null;
  brakingAggression: number | null;
  proximityChasing: number | null;
};

type SessionBehaviorData = {
  id: string;
  hardBrakingEvents: number;
  closePassCount: number;
  tailgatingSeconds: number;
  offTrackCount: number;
  spinCount: number;
  cleanLaps: number;
  totalLaps: number;
  peakRageScore: number;
  avgRageScore: number;
  rageSpikes: number;
  cooldownsTriggered: number;
  retaliationAttempts: number;
  incidentsByPhase: Record<string, any> | null;
  commentaryLog: Array<{
    lap: number;
    topic: string;
    severity: number;
    sentiment?: string;
    text: string;
  }> | null;
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function DebriefPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/drive");

  const user_ext = session.user as Record<string, unknown>;
  const discordId = user_ext.discordId as string;
  const displayName =
    (user_ext.discordDisplayName as string) || session.user.name || "Racer";

  // ── Fetch user from DB ─────────────────────────────────────────────────────
  let dbUser: { id: string } | null = null;
  if (discordId) {
    const users = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.discordId, discordId))
      .limit(1);
    if (users.length > 0) {
      dbUser = users[0];
    }
  }

  if (!dbUser) {
    return (
      <div className="p-4 text-center text-[var(--text-muted)]">
        User not found. Please refresh and try again.
      </div>
    );
  }

  // ── Fetch recent sessions (last 20) ────────────────────────────────────────
  const recentSessions = await db
    .select()
    .from(schema.raceSessions)
    .where(eq(schema.raceSessions.userId, dbUser.id))
    .orderBy(desc(schema.raceSessions.createdAt))
    .limit(20);

  if (recentSessions.length === 0) {
    return (
      <div className="p-4 text-center text-[var(--text-muted)]">
        <p className="text-sm">No sessions found. Race to populate debrief data.</p>
      </div>
    );
  }

  // ── Get selected session from URL params ────────────────────────────────────
  const params = await searchParams;
  const selectedSessionId = params.session || recentSessions[0].id;
  const selectedSession = recentSessions.find((s) => s.id === selectedSessionId) || recentSessions[0];

  // ── Fetch detailed data for selected session ──────────────────────────────
  const lapTelemetries = await db
    .select()
    .from(schema.lapTelemetry)
    .where(
      and(
        eq(schema.lapTelemetry.sessionId, selectedSession.id),
        eq(schema.lapTelemetry.userId, dbUser.id),
      ),
    )
    .orderBy(schema.lapTelemetry.lapNumber);

  const sessionBehaviors = await db
    .select()
    .from(schema.sessionBehavior)
    .where(
      and(
        eq(schema.sessionBehavior.sessionId, selectedSession.id),
        eq(schema.sessionBehavior.userId, dbUser.id),
      ),
    )
    .limit(1);

  const sessionBehavior = sessionBehaviors.length > 0 ? sessionBehaviors[0] : null;

  // ── Fetch all sessions for the same track (for pattern detection) ─────────
  const allSessionsForTrack = await db
    .select()
    .from(schema.raceSessions)
    .where(
      and(
        eq(schema.raceSessions.userId, dbUser.id),
        ...(selectedSession.trackName ? [eq(schema.raceSessions.trackName, selectedSession.trackName)] : []),
      ),
    )
    .orderBy(desc(schema.raceSessions.createdAt))
    .limit(20);

  // ── Fetch behavioral data for all sessions at this track ──────────────────
  const allBehaviorForTrack = await db
    .select()
    .from(schema.sessionBehavior)
    .where(
      and(
        eq(schema.sessionBehavior.userId, dbUser.id),
      ),
    )
    .limit(50);

  // Map behavior back to session
  const behaviorBySessionId = new Map(
    allBehaviorForTrack.map((b) => [b.sessionId, b]),
  );

  const allSessionsForTrackWithBehavior = allSessionsForTrack.map((s) => ({
    ...s,
    behavior: behaviorBySessionId.get(s.id),
  }));

  // ── Fetch all sessions for behavioral profile (last-session behavior comparison) ──
  const allUserSessions = await db
    .select()
    .from(schema.raceSessions)
    .where(eq(schema.raceSessions.userId, dbUser.id))
    .orderBy(desc(schema.raceSessions.createdAt))
    .limit(100);

  const allUserBehaviors = await db
    .select()
    .from(schema.sessionBehavior)
    .where(eq(schema.sessionBehavior.userId, dbUser.id))
    .limit(100);

  const behaviorByUserSessionId = new Map(
    allUserBehaviors.map((b) => [b.sessionId, b]),
  );

  // ── Calculate all-time behavioral averages ─────────────────────────────────
  const allTimeBehavioralAverage = {
    throttleAggression: 0,
    steeringErraticism: 0,
    brakingAggression: 0,
    proximityChasing: 0,
  };

  if (allUserBehaviors.length > 0) {
    // Get all lap telemetry for user
    const allUserLapTelemetry = await db
      .select()
      .from(schema.lapTelemetry)
      .where(eq(schema.lapTelemetry.userId, dbUser.id))
      .limit(1000);

    if (allUserLapTelemetry.length > 0) {
      allTimeBehavioralAverage.throttleAggression =
        allUserLapTelemetry.reduce((sum, lt) => sum + (lt.throttleAggression || 0), 0) /
        allUserLapTelemetry.length;
      allTimeBehavioralAverage.steeringErraticism =
        allUserLapTelemetry.reduce((sum, lt) => sum + (lt.steeringErraticism || 0), 0) /
        allUserLapTelemetry.length;
      allTimeBehavioralAverage.brakingAggression =
        allUserLapTelemetry.reduce((sum, lt) => sum + (lt.brakingAggression || 0), 0) /
        allUserLapTelemetry.length;
      allTimeBehavioralAverage.proximityChasing =
        allUserLapTelemetry.reduce((sum, lt) => sum + (lt.proximityChasing || 0), 0) /
        allUserLapTelemetry.length;
    }
  }

  // ── Map data to component types ─────────────────────────────────────────────
  const mappedSessions: RaceSession[] = recentSessions.map(s => ({
    id: s.id,
    carModel: s.carModel,
    manufacturer: s.manufacturer,
    trackName: s.trackName,
    finishPosition: s.finishPosition,
    incidentCount: s.incidentCount,
    sessionType: s.sessionType,
    category: s.category,
    metadata: (s.metadata as Record<string, any>) ?? null,
    createdAt: s.createdAt,
  }))

  const mappedSelected: RaceSession = {
    id: selectedSession.id,
    carModel: selectedSession.carModel,
    manufacturer: selectedSession.manufacturer,
    trackName: selectedSession.trackName,
    finishPosition: selectedSession.finishPosition,
    incidentCount: selectedSession.incidentCount,
    sessionType: selectedSession.sessionType,
    category: selectedSession.category,
    metadata: (selectedSession.metadata as Record<string, any>) ?? null,
    createdAt: selectedSession.createdAt,
  }

  const mappedLaps: LapTelemetryData[] = lapTelemetries.map(l => ({
    id: l.id,
    lapNumber: l.lapNumber,
    lapTime: l.lapTime,
    incidentCount: l.incidentCount ?? 0,
    rageScore: l.rageScore,
    throttleAggression: l.throttleAggression,
    steeringErraticism: l.steeringErraticism,
    brakingAggression: l.brakingAggression,
    proximityChasing: l.proximityChasing,
  }))

  const mappedBehavior: SessionBehaviorData | null = sessionBehavior ? {
    id: sessionBehavior.id,
    hardBrakingEvents: sessionBehavior.hardBrakingEvents ?? 0,
    closePassCount: sessionBehavior.closePassCount ?? 0,
    tailgatingSeconds: sessionBehavior.tailgatingSeconds ?? 0,
    offTrackCount: sessionBehavior.offTrackCount ?? 0,
    spinCount: sessionBehavior.spinCount ?? 0,
    cleanLaps: sessionBehavior.cleanLaps ?? 0,
    totalLaps: sessionBehavior.totalLaps ?? 0,
    peakRageScore: sessionBehavior.peakRageScore ?? 0,
    avgRageScore: sessionBehavior.avgRageScore ?? 0,
    rageSpikes: sessionBehavior.rageSpikes ?? 0,
    cooldownsTriggered: sessionBehavior.cooldownsTriggered ?? 0,
    retaliationAttempts: sessionBehavior.retaliationAttempts ?? 0,
    incidentsByPhase: (sessionBehavior.incidentsByPhase as Record<string, any>) ?? null,
    commentaryLog: (sessionBehavior.commentaryLog as SessionBehaviorData['commentaryLog']) ?? null,
  } : null

  type SessionWithBehavior = typeof allSessionsForTrackWithBehavior[number]

  // ── Render Page ─────────────────────────────────────────────────────────────
  return (
    <main className="bg-[var(--bg)] min-h-screen">
      {/* Hero */}
      <div className="px-6 pt-12 pb-0">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-xl bg-[var(--bg-panel)] p-8 sm:p-12 overflow-hidden relative mb-8">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tl from-rose-400 to-red-400 rounded-full blur-3xl" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <BarChart3 size={40} className="text-amber-400" />
                <h1 className="text-4xl sm:text-5xl font-bold" style={{ fontFamily: 'var(--ff-display)' }}>
                  Post-Session Debrief
                </h1>
              </div>
              <p className="text-lg text-[var(--text-secondary)] max-w-2xl">
                Review your session behavior and identify recurring patterns
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pb-12 space-y-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Session Selector */}
          <div className="max-w-md">
            <SessionSelector
              sessions={mappedSessions}
              selectedSessionId={selectedSession.id}
            />
          </div>

          {/* Session Summary */}
          <SessionSummaryCard
            session={mappedSelected}
            sessionBehavior={mappedBehavior}
            lapTelemetries={mappedLaps}
          />

          {/* Lap Timeline */}
          {mappedLaps.length > 0 && (
            <LapTimeline lapTelemetries={mappedLaps} />
          )}

          {/* Commentary Replay */}
          {mappedBehavior?.commentaryLog &&
            Array.isArray(mappedBehavior.commentaryLog) &&
            mappedBehavior.commentaryLog.length > 0 && (
              <CommentaryReplay
                commentaryLog={mappedBehavior.commentaryLog}
              />
            )}

          {/* Behavioral Radar */}
          {mappedLaps.length > 0 && (
            <BehavioralRadar
              lapTelemetries={mappedLaps}
              allTimeAverage={allTimeBehavioralAverage}
            />
          )}

          {/* Pattern Detection */}
          {allSessionsForTrackWithBehavior.length > 1 && (
            <PatternDetection
              trackName={selectedSession.trackName || "Unknown"}
              allSessions={allSessionsForTrackWithBehavior as any}
              currentSession={mappedSelected}
            />
          )}

          {/* Empty states */}
          {mappedLaps.length === 0 && (
            <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] p-6 text-center">
              <p className="text-sm text-[var(--text-dim)]">
                No lap telemetry available for this session. Enable the plugin to
                capture detailed behavioral data.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
