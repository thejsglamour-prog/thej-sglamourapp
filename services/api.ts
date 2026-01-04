import { BookingFormData, Stylist, ContactFormData } from '../types';
import { SERVICES, STYLISTS as INITIAL_STYLISTS } from '../constants';

const STORAGE_KEY = 'js_glamour_v11_master_state';

export interface BookingRecord extends BookingFormData {
  id: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  createdAt: string;
  aiInsight?: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'ai' | 'system';
}

export interface SystemMetrics {
  latency: number;
  uptime: string;
  activeConnections: number;
  dbStatus: 'Optimal' | 'Maintenance';
  load: number;
}

export interface AnalyticsSummary {
  totalBookings: number;
  pendingCount: number;
  estimatedRevenue: number;
  serviceDistribution: Record<string, number>;
  vipCount: number;
  systemHealth: number;
  activeStylists: number;
}

class VirtualBackend {
  private startTime = Date.now();

  private async getDB() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const db = data ? JSON.parse(data) : {
        bookings: [],
        memberships: [],
        logs: [],
        stylists: INITIAL_STYLISTS,
        messages: []
      };

      // ensure stylist master data kept in sync with constants
      db.stylists = INITIAL_STYLISTS;
      return db;
    } catch (e) {
      return { bookings: [], memberships: [], logs: [], stylists: INITIAL_STYLISTS, messages: [] };
    }
  }

  private async saveDB(db: any) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error("Critical Persistence Failure:", e);
    }
  }

  async addLog(message: string, type: SystemLog['type'] = 'info') {
    const db = await this.getDB();
    const log: SystemLog = {
      id: `LOG-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      message,
      type
    };
    db.logs = [log, ...(db.logs || [])].slice(0, 100);
    await this.saveDB(db);
    return log;
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const uptimeSecs = Math.floor((Date.now() - this.startTime) / 1000);
    const h = Math.floor(uptimeSecs / 3600);
    const m = Math.floor((uptimeSecs % 3600) / 60);
    const s = uptimeSecs % 60;

    return {
      latency: Math.floor(Math.random() * 10) + 5,
      uptime: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      activeConnections: 10 + Math.floor(Math.random() * 5),
      dbStatus: 'Optimal',
      load: 10 + Math.random() * 10
    };
  }

  async getStylists(): Promise<Stylist[]> {
    const db = await this.getDB();
    return db.stylists;
  }

  async processBooking(data: BookingFormData): Promise<BookingRecord> {
    await this.addLog(`NODE_LINK: Registry request from [${data.name}]`, 'system');

    let aiInsight = "Geometric analysis pending.";
    try {
      const prompt = `Aesthetic analysis for client ${data.name} requesting ${data.service}. Mention the specific master-class detailing required for Favour Tamuno Bright (Jerroo) to execute this task at the Abuloma node. Keep it technical and extremely short.`;

      const resp = await fetch('/api/genai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptOverride: prompt })
      });

      if (resp.ok) {
        const payload = await resp.json();
        aiInsight = payload.text || aiInsight;
        await this.addLog(`NEURAL_HANDSHAKE: Analysis complete for ${data.name}.`, 'ai');
      } else {
        await this.addLog(`AI_OFFLINE: Standard protocols active.`, 'warning');
      }
    } catch (e) {
      await this.addLog(`AI_OFFLINE: Standard protocols active.`, 'warning');
    }

    const record: BookingRecord = {
      ...data,
      id: `JG-${Math.floor(10000 + Math.random() * 89999)}`,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      aiInsight
    };

    const db = await this.getDB();
    db.bookings = [record, ...(db.bookings || [])];
    await this.saveDB(db);
    await this.addLog(`COMMIT_SUCCESS: Registry updated. Entry ID: ${record.id}`, 'success');
    return record;
  }

  async processContactMessage(data: ContactFormData): Promise<void> {
    await this.addLog(`INQUIRY_RECVD: Message from [${data.name}] on [${data.subject}]`, 'info');
    const db = await this.getDB();
    const messageRecord = {
      ...data,
      id: `MSG-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    db.messages = [messageRecord, ...(db.messages || [])];
    await this.saveDB(db);
    await this.addLog(`MESSAGE_LOGGED: Inquiry stored in node archive.`, 'success');
  }

  async getBookings(): Promise<BookingRecord[]> {
    const db = await this.getDB();
    return db.bookings;
  }

  async getLogs(): Promise<SystemLog[]> {
    const db = await this.getDB();
    return db.logs || [];
  }

  async updateBookingStatus(id: string, status: BookingRecord['status']): Promise<void> {
    const db = await this.getDB();
    const idx = db.bookings.findIndex((b: BookingRecord) => b.id === id);
    if (idx !== -1) {
      db.bookings[idx].status = status;
      await this.saveDB(db);
      await this.addLog(`PROTOCOL_SHIFT: Registry entry ${id} moved to ${status.toUpperCase()}`, 'info');
    }
  }

  async getAnalytics(): Promise<AnalyticsSummary> {
    const db = await this.getDB();
    const activeBookings = db.bookings.filter((b: any) => b.status !== 'Cancelled');
    const distribution: Record<string, number> = {};
    let totalRev = 0;

    activeBookings.forEach((b: BookingRecord) => {
      distribution[b.service] = (distribution[b.service] || 0) + 1;
      const svc = SERVICES.find(s => s.name === b.service);
      if (svc?.price) {
        totalRev += parseInt(svc.price.replace(/[^0-9]/g, '')) || 0;
      }
    });

    return {
      totalBookings: db.bookings.length,
      pendingCount: db.bookings.filter((b: any) => b.status === 'Pending').length,
      estimatedRevenue: totalRev,
      serviceDistribution: distribution,
      vipCount: Math.ceil(db.bookings.length * 0.1),
      systemHealth: 100,
      activeStylists: INITIAL_STYLISTS.length
    };
  }
}

export const API = new VirtualBackend();
