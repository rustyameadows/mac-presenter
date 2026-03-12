import { promises as fs } from "node:fs";
import path from "node:path";

import {
  createInitialPersistedState,
  updateRecentSessions,
  type PersistedSessionState,
  type RecentSessionSummary,
  type SessionRecord
} from "@presenter/core";

export class SessionStore {
  private state: PersistedSessionState = createInitialPersistedState();

  constructor(private readonly stateFilePath: string) {}

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.stateFilePath, "utf8");
      this.state = JSON.parse(raw) as PersistedSessionState;
    } catch {
      this.state = createInitialPersistedState();
    }
  }

  getCurrentSession(): SessionRecord | null {
    return this.state.currentSession;
  }

  getRecentSessions(): RecentSessionSummary[] {
    return this.state.recentSessions;
  }

  getRecentSession(id: string): RecentSessionSummary | undefined {
    return this.state.recentSessions.find((session) => session.id === id);
  }

  async setCurrentSession(session: SessionRecord | null): Promise<void> {
    this.state = {
      currentSession: session,
      recentSessions: session
        ? updateRecentSessions(this.state.recentSessions, session)
        : this.state.recentSessions
    };
    await this.save();
  }

  async updateCurrentSession(
    updater: (session: SessionRecord) => SessionRecord
  ): Promise<SessionRecord | null> {
    if (!this.state.currentSession) {
      return null;
    }

    const nextSession = updater(this.state.currentSession);
    await this.setCurrentSession(nextSession);
    return nextSession;
  }

  private async save(): Promise<void> {
    await fs.mkdir(path.dirname(this.stateFilePath), { recursive: true });
    await fs.writeFile(
      this.stateFilePath,
      JSON.stringify(this.state, null, 2),
      "utf8"
    );
  }
}
