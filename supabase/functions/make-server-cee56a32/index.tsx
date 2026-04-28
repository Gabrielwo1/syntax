import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ─── Auth helper ─────────────────────────────────────────────────────────────
// Extracts the user JWT from the Authorization header and validates it.
// Returns the authenticated user or an error response.
// IMPORTANT: The anon key JWT does NOT have a `sub` claim, so passing it to
// `supabase.auth.getUser()` crashes with "missing sub claim". We detect this
// early and return a clear error instead.
async function requireAdmin(c: any): Promise<{ user: any; supabase: any } | Response> {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return c.json({ error: "Unauthorized: token ausente" }, 401);
  }

  // Quick JWT decode to check for `sub` claim — anon keys don't have one.
  // JWTs use base64URL encoding: must replace - → + and _ → / before atob(),
  // then restore the stripped padding. Without this, atob() throws on many
  // real-world JWTs (Deno's atob() is strict about the base64 alphabet).
  try {
    const part = accessToken.split('.')[1] ?? '';
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    if (!payload.sub) {
      console.warn("[Auth] Received anon-key instead of user JWT. User must sign in.");
      return c.json({
        error: "Sessão expirada. Faça logout e login novamente.",
        code: "SESSION_EXPIRED",
      }, 401);
    }
  } catch {
    return c.json({ error: "Token inválido ou malformado" }, 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    console.error("[Auth] getUser error:", error?.message);
    // Detect expired token — message varies across Supabase versions
    const isExpired =
      error?.message?.toLowerCase().includes('expired') ||
      error?.message?.toLowerCase().includes('invalid jwt') ||
      error?.status === 401;
    return c.json({
      error: `Unauthorized: ${error?.message || "token inválido ou expirado"}`,
      code: isExpired ? 'SESSION_EXPIRED' : 'INVALID_TOKEN',
    }, 401);
  }

  if (user.user_metadata?.role !== 'admin') {
    return c.json({ error: "Forbidden: apenas administradores" }, 403);
  }

  return { user, supabase };
}

// ─── Lightweight auth check (non-admin routes) ────────────────────────────────
// Like requireAdmin but only verifies the user exists — doesn't check role.
// Returns the user or a Response (caller must check with instanceof Response).
async function requireAuth(c: any): Promise<{ user: any } | Response> {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return c.json({ error: 'Unauthorized: token ausente' }, 401);
  }

  // Reject anon-key JWTs (no sub claim)
  try {
    const part = accessToken.split('.')[1] ?? '';
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    if (!payload.sub) {
      return c.json({ error: 'Sessão expirada. Faça login novamente.', code: 'SESSION_EXPIRED' }, 401);
    }
  } catch {
    return c.json({ error: 'Token inválido ou malformado' }, 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    const isExpired =
      error?.message?.toLowerCase().includes('expired') ||
      error?.message?.toLowerCase().includes('invalid jwt') ||
      error?.status === 401;
    return c.json({
      error: `Unauthorized: ${error?.message ?? 'token inválido ou expirado'}`,
      code: isExpired ? 'SESSION_EXPIRED' : 'INVALID_TOKEN',
    }, 401);
  }

  return { user };
}

// ─── Storage bucket initialization ───────────────────────────────────────────
const BUCKET_PDFS = "make-cee56a32-pdfs";
const BUCKET_REPO = "make-cee56a32-repo";
const BUCKET_SOCIAL = "make-cee56a32-social";

async function ensureBucket(
  supabase: any,
  name: string,
  opts: Record<string, any> = {},
) {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) { console.error(`[Storage] listBuckets error:`, error); return; }
    if (!buckets?.some((b: any) => b.name === name)) {
      await supabase.storage.createBucket(name, { public: false, ...opts });
      console.log(`[Storage] Bucket "${name}" created.`);
    }
  } catch (e) {
    console.error(`[Storage] ensureBucket("${name}") error:`, e);
  }
}

try {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (supabaseUrl && supabaseKey) {
    const adminClient = createClient(supabaseUrl, supabaseKey);
    await ensureBucket(adminClient, BUCKET_PDFS, { allowedMimeTypes: ['application/pdf'] });
    await ensureBucket(adminClient, BUCKET_REPO);
    await ensureBucket(adminClient, BUCKET_SOCIAL, { allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] });
  }
} catch (error) {
  console.error("[Storage] Initialization error:", error);
}

// Health check endpoint
app.get("/make-server-cee56a32/health", (c) => {
  return c.json({ 
    status: "ok", 
    supabaseUrl: Deno.env.get('SUPABASE_URL'),
    supabaseKeyStart: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.substring(0, 10) 
  });
});

// Analytics endpoint - Track page views and events
app.post("/make-server-cee56a32/track", async (c) => {
  try {
    const body = await c.req.json();
    const { siteId, event, page, referrer, userAgent, screenSize } = body;

    if (!siteId || !event) {
      return c.json({ error: "siteId and event are required" }, 400);
    }

    const timestamp = new Date().toISOString();
    const eventId = `${siteId}:event:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;

    // Store the event
    await kv.set(eventId, {
      siteId,
      event,
      page,
      referrer,
      userAgent,
      screenSize,
      timestamp,
    });

    // Update site stats
    const statsKey = `${siteId}:stats`;
    const stats = await kv.get(statsKey) || {
      totalVisits: 0,
      uniqueVisitors: 0,
      pageViews: {},
      devices: { desktop: 0, mobile: 0, tablet: 0 },
      lastUpdated: timestamp,
    };

    if (event === "pageview") {
      stats.totalVisits++;
      stats.pageViews[page] = (stats.pageViews[page] || 0) + 1;

      // Detect device type from screen size
      if (screenSize) {
        const width = parseInt(screenSize.split('x')[0]);
        if (width < 768) stats.devices.mobile++;
        else if (width < 1024) stats.devices.tablet++;
        else stats.devices.desktop++;
      }
    }

    stats.lastUpdated = timestamp;
    await kv.set(statsKey, stats);

    return c.json({ success: true, eventId });
  } catch (error) {
    console.error("Error tracking event:", error);
    return c.json({ error: "Failed to track event", details: error.message }, 500);
  }
});

// Get analytics for a specific site
app.get("/make-server-cee56a32/analytics/:siteId", async (c) => {
  try {
    const { siteId } = c.req.param();
    const statsKey = `${siteId}:stats`;
    const stats = await kv.get(statsKey);

    if (!stats) {
      return c.json({
        totalVisits: 0,
        uniqueVisitors: 0,
        pageViews: {},
        devices: { desktop: 0, mobile: 0, tablet: 0 },
      });
    }

    return c.json(stats);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return c.json({ error: "Failed to fetch analytics", details: error.message }, 500);
  }
});

// Get recent events for a site
app.get("/make-server-cee56a32/events/:siteId", async (c) => {
  try {
    const { siteId } = c.req.param();
    const limit = parseInt(c.req.query("limit") || "100");
    
    // Get all events for this site
    const allEvents = await kv.getByPrefix(`${siteId}:event:`);
    
    // Sort by timestamp and limit
    const sortedEvents = allEvents
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return c.json({ events: sortedEvents, count: sortedEvents.length });
  } catch (error) {
    console.error("Error fetching events:", error);
    return c.json({ error: "Failed to fetch events", details: error.message }, 500);
  }
});

// Manage sites - Create or update site
app.post("/make-server-cee56a32/sites", async (c) => {
  try {
    const body = await c.req.json();
    const { name, url, clientName, clientEmail, clientPhone } = body;

    if (!name || !url) {
      return c.json({ error: "name and url are required" }, 400);
    }

    const siteId = `site:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    const site = {
      id: siteId,
      name,
      url,
      status: "active",
      client: {
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
      },
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    await kv.set(siteId, site);
    
    // Also add to sites list
    const sitesList = await kv.get("sites:list") || [];
    sitesList.push(siteId);
    await kv.set("sites:list", sitesList);

    return c.json({ success: true, site });
  } catch (error: any) {
    console.error("Error creating site:", error);
    return c.json({ error: "Failed to create site", details: error?.message || String(error) }, 500);
  }
});

// Get all sites
app.get("/make-server-cee56a32/sites", async (c) => {
  // Require authenticated user (not just gateway-level JWT validation)
  const authResult = await requireAuth(c);
  if (authResult instanceof Response) return authResult;

  try {
    const sitesList = await kv.get("sites:list") || [];
    
    if (!Array.isArray(sitesList) || sitesList.length === 0) {
      return c.json({ sites: [] });
    }
    
    let sites = [];
    try {
      sites = await kv.mget(sitesList);
    } catch (mgetError) {
      console.error("Error in mget:", mgetError);
      // Se falhar o mget, tentamos pegar individualmente como fallback
      sites = await Promise.all(sitesList.map(id => kv.get(id).catch(() => null)));
    }
    
    const validSites = sites.filter(Boolean);
    
    // Get stats for each site
    const sitesWithStats = await Promise.all(
      validSites.map(async (site) => {
        try {
          const stats = await kv.get(`${site.id}:stats`) || {
            totalVisits: 0,
            uniqueVisitors: 0,
            pageViews: {},
            devices: { desktop: 0, mobile: 0, tablet: 0 },
          };
          
          return {
            ...site,
            analytics: {
              totalVisits: stats.totalVisits || 0,
              uniqueVisitors: stats.uniqueVisitors || 0,
              bounceRate: 0,
              avgSessionDuration: "0m 0s",
              trend: 0,
            },
          };
        } catch (e) {
          return {
            ...site,
            analytics: {
              totalVisits: 0, uniqueVisitors: 0, bounceRate: 0, avgSessionDuration: "0m 0s", trend: 0
            }
          };
        }
      })
    );

    return c.json({ sites: sitesWithStats });
  } catch (error: any) {
    console.error("Error fetching sites:", error);
    return c.json({ error: "Failed to fetch sites", details: error?.message || String(error) }, 500);
  }
});

// Get a single site by ID
app.get("/make-server-cee56a32/sites/:siteId", async (c) => {
  try {
    const { siteId } = c.req.param();
    const site = await kv.get(siteId);

    if (!site) {
      return c.json({ error: "Site not found" }, 404);
    }

    const stats = await kv.get(`${siteId}:stats`) || {
      totalVisits: 0,
      uniqueVisitors: 0,
      pageViews: {},
      devices: { desktop: 0, mobile: 0, tablet: 0 },
    };

    return c.json({
      ...site,
      analytics: {
        totalVisits: stats.totalVisits || 0,
        uniqueVisitors: stats.uniqueVisitors || 0,
        bounceRate: 0,
        avgSessionDuration: "0m 0s",
        trend: 0,
        pageViews: stats.pageViews || {},
        devices: stats.devices || { desktop: 0, mobile: 0, tablet: 0 },
        lastUpdated: stats.lastUpdated,
      },
    });
  } catch (error: any) {
    console.error("Error fetching site:", error);
    return c.json({ error: "Failed to fetch site", details: error?.message || String(error) }, 500);
  }
});

// ─── CRM ENDPOINTS ────────────────────────────────────────────────────────────

// Copy Prospect endpoints
app.get("/make-server-cee56a32/crm/copy-prospect", async (c) => {
  try {
    const data = (await kv.get("crm:copy_prospect:groups")) || [];
    return c.json({ groups: data });
  } catch (error) {
    console.error("[CRM] Error fetching copy prospect groups:", error);
    return c.json({ error: "Failed to fetch groups", details: String(error) }, 500);
  }
});

app.post("/make-server-cee56a32/crm/copy-prospect", async (c) => {
  try {
    const body = await c.req.json();
    const { groups } = body;
    await kv.set("crm:copy_prospect:groups", groups || []);
    return c.json({ success: true, groups: groups || [] });
  } catch (error) {
    console.error("[CRM] Error saving copy prospect groups:", error);
    return c.json({ error: "Failed to save groups", details: String(error) }, 500);
  }
});

// Create lead
app.post("/make-server-cee56a32/crm/leads", async (c) => {
  try {
    const body = await c.req.json();
    const { name, company, email, phone, website, service, budget, source, priority, notes, responsible, nextFollowUp, folderId } = body;

    if (!name || !email) {
      return c.json({ error: "name and email are required" }, 400);
    }

    const id = `crm-lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const lead = {
      id,
      name,
      company: company || "",
      email,
      phone: phone || "",
      website: website || "",
      service: service || "",
      budget: budget || "",
      source: source || "Outro",
      priority: priority || "media",
      notes: notes || "",
      responsible: responsible || "",
      nextFollowUp: nextFollowUp || null,
      folderId: folderId || "geral",
      stage: "novo",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activities: [],
    };

    await kv.set(id, lead);

    const list = (await kv.get("crm:leads:list")) || [];
    list.push(id);
    await kv.set("crm:leads:list", list);

    console.log("[CRM] Lead created:", id);
    return c.json({ success: true, lead });
  } catch (error) {
    console.error("[CRM] Error creating lead:", error);
    return c.json({ error: "Failed to create lead", details: String(error) }, 500);
  }
});

// List all leads
app.get("/make-server-cee56a32/crm/leads", async (c) => {
  try {
    const list = (await kv.get("crm:leads:list")) || [];
    if (list.length === 0) return c.json({ leads: [] });
    const leads = (await kv.mget(list)).filter(Boolean);
    leads.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ leads });
  } catch (error) {
    console.error("[CRM] Error listing leads:", error);
    return c.json({ error: "Failed to list leads", details: String(error) }, 500);
  }
});

// Update lead
app.put("/make-server-cee56a32/crm/leads/:id", async (c) => {
  try {
    const rawId = c.req.param("id");
    const id = decodeURIComponent(rawId);
    const body = await c.req.json();

    const existing = await kv.get(id);
    if (!existing) return c.json({ error: "Lead not found" }, 404);

    // Append activity if stage changed
    const activities = existing.activities || [];
    if (body.stage && body.stage !== existing.stage) {
      activities.push({
        type: "stage_change",
        from: existing.stage,
        to: body.stage,
        at: new Date().toISOString(),
        note: body.activityNote || "",
      });
    }
    if (body.activityNote && !body.stage) {
      activities.push({
        type: "note",
        text: body.activityNote,
        at: new Date().toISOString(),
      });
    }

    const updated = { ...existing, ...body, activities, updatedAt: new Date().toISOString() };
    delete updated.activityNote;
    await kv.set(id, updated);

    return c.json({ success: true, lead: updated });
  } catch (error) {
    console.error("[CRM] Error updating lead:", error);
    return c.json({ error: "Failed to update lead", details: String(error) }, 500);
  }
});

// Delete lead
app.delete("/make-server-cee56a32/crm/leads/:id", async (c) => {
  try {
    const id = decodeURIComponent(c.req.param("id"));
    await kv.del(id);
    const list = ((await kv.get("crm:leads:list")) || []).filter((lid: string) => lid !== id);
    await kv.set("crm:leads:list", list);
    return c.json({ success: true });
  } catch (error) {
    console.error("[CRM] Error deleting lead:", error);
    return c.json({ error: "Failed to delete lead", details: String(error) }, 500);
  }
});

// Bulk create leads (avoids race condition on crm:leads:list)
app.post("/make-server-cee56a32/crm/leads/bulk", async (c) => {
  try {
    const body = await c.req.json();
    const { leads: leadsData, folderId: bulkFolderId } = body;

    if (!Array.isArray(leadsData) || leadsData.length === 0) {
      return c.json({ error: "leads array is required" }, 400);
    }

    // Read the list once
    const list: string[] = (await kv.get("crm:leads:list")) || [];
    const createdLeads: any[] = [];

    for (const leadData of leadsData) {
      const name =
        leadData.name ||
        (leadData.email ? leadData.email.split("@")[0] : "Lead Sem Nome");
      const email =
        leadData.email ||
        `${name.toLowerCase().replace(/\s+/g, "")}_${Date.now()}@exemplo.com`;

      const id = `crm-lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const lead = {
        id,
        name,
        company: leadData.company || "",
        email,
        phone: leadData.phone || "",
        website: leadData.website || "",
        service: leadData.service || "",
        budget: leadData.budget || "",
        source: leadData.source || "Outro",
        priority: leadData.priority || "media",
        notes: leadData.notes || "",
        responsible: leadData.responsible || "",
        nextFollowUp: leadData.nextFollowUp || null,
        folderId: bulkFolderId || leadData.folderId || "geral",
        stage: leadData.stage || "novo",
        isClient: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activities: [],
      };

      await kv.set(id, lead);
      list.push(id);
      createdLeads.push(lead);
    }

    // Single atomic write to the list after all leads are stored
    await kv.set("crm:leads:list", list);

    console.log(`[CRM] Bulk created ${createdLeads.length} leads`);
    return c.json({ success: true, leads: createdLeads, count: createdLeads.length });
  } catch (error) {
    console.error("[CRM] Error bulk creating leads:", error);
    return c.json({ error: "Failed to bulk create leads", details: String(error) }, 500);
  }
});

// ─── CRM FOLDERS ENDPOINTS ──────────────────────────────────────────────────

app.get("/make-server-cee56a32/crm/folders", async (c) => {
  try {
    const defaultFolders = [
      { id: "geral", name: "Geral" },
      { id: "b2b", name: "Leads B2B" },
      { id: "e-commerce", name: "E-commerce" },
      { id: "clinicas-sudoeste", name: "Clínicas Sudoeste" }
    ];
    const folders = await kv.get("crm:folders");
    if (!folders) {
      await kv.set("crm:folders", defaultFolders);
      return c.json({ folders: defaultFolders });
    }
    return c.json({ folders });
  } catch (error) {
    console.error("[CRM] Error fetching folders:", error);
    return c.json({ error: "Failed to fetch folders", details: String(error) }, 500);
  }
});

app.put("/make-server-cee56a32/crm/folders", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.folders) {
      return c.json({ error: "folders array is required" }, 400);
    }
    await kv.set("crm:folders", body.folders);
    return c.json({ success: true, folders: body.folders });
  } catch (error) {
    console.error("[CRM] Error updating folders:", error);
    return c.json({ error: "Failed to update folders", details: String(error) }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────

// PageSpeed proxy — avoids CORS issues when calling Google API from the browser
app.get("/make-server-cee56a32/pagespeed", async (c) => {
  try {
    const url = c.req.query("url");
    const strategy = c.req.query("strategy") || "mobile";

    if (!url) {
      return c.json({ error: "url query param is required" }, 400);
    }

    const apiUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    apiUrl.searchParams.set("url", url);
    apiUrl.searchParams.set("strategy", strategy);
    apiUrl.searchParams.set("category", "performance");
    
    const apiKey = Deno.env.get("PAGESPEED_API_KEY");
    if (apiKey) {
      apiUrl.searchParams.set("key", apiKey);
    }

    console.log(`[PageSpeed] Fetching: ${strategy} / ${url}`);
    const res = await fetch(apiUrl.toString());
    const data = await res.json();

    if (!res.ok) {
      console.log("[PageSpeed] Google API error:", JSON.stringify(data?.error));
      return c.json(
        { error: data?.error?.message || `Google API error ${res.status}`, details: data?.error },
        res.status as any
      );
    }

    return c.json(data);
  } catch (error) {
    console.error("[PageSpeed] Unexpected error:", error);
    return c.json({ error: "Failed to fetch PageSpeed data", details: String(error) }, 500);
  }
});

// ─── FINANCEIRO ENDPOINTS ─────────────────────────────────────────────────────

// List all financial entries
app.get("/make-server-cee56a32/financeiro/entries", async (c) => {
  try {
    const list = (await kv.get("financeiro:entries:list")) || [];
    if (list.length === 0) return c.json({ entries: [] });
    const entries = (await kv.mget(list)).filter(Boolean);
    entries.sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return c.json({ entries });
  } catch (error) {
    console.error("[Financeiro] Error listing entries:", error);
    return c.json({ error: "Failed to list entries", details: String(error) }, 500);
  }
});

// Create financial entry
app.post("/make-server-cee56a32/financeiro/entries", async (c) => {
  try {
    const body = await c.req.json();
    const { type, description, amount, dueDate, category, clientOrSupplier, notes, recurrence } = body;

    if (!type || !description || amount === undefined || !dueDate) {
      return c.json({ error: "type, description, amount and dueDate are required" }, 400);
    }

    const id = `fin-entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const entry = {
      id,
      type, // "receivable" | "payable"
      description,
      amount: parseFloat(amount),
      dueDate,
      category: category || "Outros",
      clientOrSupplier: clientOrSupplier || "",
      notes: notes || "",
      recurrence: recurrence || "none",
      status: "pending", // "pending" | "paid"
      paidAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(id, entry);
    const list = (await kv.get("financeiro:entries:list")) || [];
    list.push(id);
    await kv.set("financeiro:entries:list", list);

    console.log("[Financeiro] Entry created:", id);
    return c.json({ success: true, entry });
  } catch (error) {
    console.error("[Financeiro] Error creating entry:", error);
    return c.json({ error: "Failed to create entry", details: String(error) }, 500);
  }
});

// Update financial entry (also used to mark as paid)
app.put("/make-server-cee56a32/financeiro/entries/:id", async (c) => {
  try {
    const id = decodeURIComponent(c.req.param("id"));
    const body = await c.req.json();

    const existing = await kv.get(id);
    if (!existing) return c.json({ error: "Entry not found" }, 404);

    const updated = {
      ...existing,
      ...body,
      id, // ensure id is not overwritten
      updatedAt: new Date().toISOString(),
    };

    // Auto-set paidAt when marking as paid
    if (body.status === "paid" && existing.status !== "paid") {
      updated.paidAt = new Date().toISOString();
    }
    if (body.status === "pending") {
      updated.paidAt = null;
    }

    await kv.set(id, updated);
    return c.json({ success: true, entry: updated });
  } catch (error) {
    console.error("[Financeiro] Error updating entry:", error);
    return c.json({ error: "Failed to update entry", details: String(error) }, 500);
  }
});

// Delete financial entry
app.delete("/make-server-cee56a32/financeiro/entries/:id", async (c) => {
  try {
    const id = decodeURIComponent(c.req.param("id"));
    await kv.del(id);
    const list = ((await kv.get("financeiro:entries:list")) || []).filter((eid: string) => eid !== id);
    await kv.set("financeiro:entries:list", list);
    return c.json({ success: true });
  } catch (error) {
    console.error("[Financeiro] Error deleting entry:", error);
    return c.json({ error: "Failed to delete entry", details: String(error) }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────

// ─── AUTH ENDPOINTS ───────────────────────────────────────────────────────────

// Check if system has any users (for first-time setup)
app.get("/make-server-cee56a32/auth/check-init", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ initialized: data && data.users.length > 0 });
  } catch (error) {
    console.error("[Auth] Error checking init:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Create first admin user (only if no users exist)
app.post("/make-server-cee56a32/auth/init", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    if (existingUsers && existingUsers.users.length > 0) {
      return c.json({ error: "Sistema já inicializado. Use o painel admin para criar mais usuários." }, 400);
    }
    const body = await c.req.json();
    const { email, password, name } = body;
    if (!email || !password) {
      return c.json({ error: "email and password are required" }, 400);
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || email.split('@')[0], role: 'admin' },
      email_confirm: true,
    });
    if (error) return c.json({ error: error.message }, 400);
    console.log("[Auth] First admin created:", email);
    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.error("[Auth] Error initializing admin:", error);
    return c.json({ error: "Failed to initialize admin", details: String(error) }, 500);
  }
});

// Create user (admin only)
app.post("/make-server-cee56a32/auth/signup", async (c) => {
  const adminCheck = await requireAdmin(c);
  if (adminCheck instanceof Response) return adminCheck;

  try {
    const body = await c.req.json();
    const { email, password, name, role, permissions } = body;

    console.log("[Auth] Creating user - email:", email, "role:", role, "permissions count:", Array.isArray(permissions) ? permissions.length : 'N/A');

    if (!email || !password) return c.json({ error: "E-mail e senha são obrigatórios" }, 400);
    if (!email.includes('@')) return c.json({ error: "Formato de e-mail inválido" }, 400);
    if (password.length < 6) return c.json({ error: "A senha deve ter pelo menos 6 caracteres" }, 400);

    const safePermissions = Array.isArray(permissions)
      ? permissions.filter((p: any) => typeof p === 'string')
      : [];

    const { data, error } = await adminCheck.supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      user_metadata: {
        name: (name || '').trim() || email.split('@')[0],
        role: role || 'member',
        permissions: safePermissions,
      },
      email_confirm: true,
    });

    if (error) {
      const errMsg = error.message || (error as any).code || JSON.stringify(error);
      console.error("[Auth] Supabase createUser error:", errMsg, JSON.stringify(error));
      return c.json({ error: errMsg || "Erro ao criar usuário no Supabase", details: JSON.stringify(error) }, 400);
    }

    console.log("[Auth] User created by admin:", email, "role:", role);
    return c.json({ success: true, user: data.user });
  } catch (error: any) {
    console.error("[Auth] Error creating user:", error);
    return c.json({ error: "Failed to create user", details: String(error) }, 500);
  }
});

// List users (admin only)
app.get("/make-server-cee56a32/auth/users", async (c) => {
  const adminCheck = await requireAdmin(c);
  if (adminCheck instanceof Response) return adminCheck;

  try {
    const { data, error } = await adminCheck.supabase.auth.admin.listUsers();
    if (error) return c.json({ error: error.message }, 500);

    return c.json({ users: data.users });
  } catch (error) {
    console.error("[Auth] Error listing users:", error);
    return c.json({ error: "Failed to list users", details: String(error) }, 500);
  }
});

// Update user role/name (admin only)
app.put("/make-server-cee56a32/auth/users/:id", async (c) => {
  const adminCheck = await requireAdmin(c);
  if (adminCheck instanceof Response) return adminCheck;

  try {
    const userId = c.req.param('id');
    const body = await c.req.json();
    const { name, role, password, permissions } = body;

    // Fetch existing metadata to merge
    const { data: existingUser } = await adminCheck.supabase.auth.admin.getUserById(userId);
    const existingMeta = existingUser?.user?.user_metadata || {};

    const updateData: any = {
      user_metadata: {
        ...existingMeta,
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(permissions !== undefined && { permissions }),
      }
    };
    if (password) updateData.password = password;

    const { data, error } = await adminCheck.supabase.auth.admin.updateUserById(userId, updateData);
    if (error) return c.json({ error: error.message }, 500);

    console.log("[Auth] User updated:", userId, "role:", role);
    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.error("[Auth] Error updating user:", error);
    return c.json({ error: "Failed to update user", details: String(error) }, 500);
  }
});

// Delete user (admin only)
app.delete("/make-server-cee56a32/auth/users/:id", async (c) => {
  const adminCheck = await requireAdmin(c);
  if (adminCheck instanceof Response) return adminCheck;

  try {
    const userId = c.req.param('id');
    if (userId === adminCheck.user.id) {
      return c.json({ error: "Você não pode excluir sua própria conta" }, 400);
    }

    const { error } = await adminCheck.supabase.auth.admin.deleteUser(userId);
    if (error) return c.json({ error: error.message }, 500);

    console.log("[Auth] User deleted:", userId);
    return c.json({ success: true });
  } catch (error) {
    console.error("[Auth] Error deleting user:", error);
    return c.json({ error: "Failed to delete user", details: String(error) }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────

// ─── TASKS ENDPOINTS ──────────────────────────────────────────────────────────

// ─── TASKS ENDPOINTS ─────────────────────────────────────────────────────────
// NOTE: Specific routes (sprints, ai-generate) MUST be registered before the
// wildcard /tasks/:id routes to avoid Hono matching them as an :id param.

// List all tasks
app.get("/make-server-cee56a32/tasks", async (c) => {
  try {
    const list = (await kv.get("tasks:list")) || [];
    if (list.length === 0) return c.json({ tasks: [] });
    const tasks = (await kv.mget(list)).filter(Boolean);
    tasks.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ tasks });
  } catch (error) {
    console.error("[Tasks] Error listing tasks:", error);
    return c.json({ error: "Failed to list tasks", details: String(error) }, 500);
  }
});

// Create task
app.post("/make-server-cee56a32/tasks", async (c) => {
  try {
    const body = await c.req.json();
    const { name, project, assignee, due, status, attachments, sprintId, description, priority, tags, estimatedHours } = body;

    if (!name) {
      return c.json({ error: "name is required" }, 400);
    }

    // Use hyphens in ID to avoid URL-encoding issues with colons
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const task = {
      id,
      name,
      project: project || "",
      assignee: assignee || "",
      due: due || "",
      status: status || "not_started",
      attachments: attachments || [],
      sprintId: sprintId || "",
      description: description || "",
      priority: priority || "medium",
      tags: tags || [],
      estimatedHours: estimatedHours ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(id, task);
    const list = (await kv.get("tasks:list")) || [];
    list.push(id);
    await kv.set("tasks:list", list);

    console.log("[Tasks] Task created:", id);
    return c.json({ success: true, task });
  } catch (error) {
    console.error("[Tasks] Error creating task:", error);
    return c.json({ error: "Failed to create task", details: String(error) }, 500);
  }
});

// ─── TASK SPRINT ENDPOINTS (must be before PUT/DELETE /tasks/:id) ────────────

app.get("/make-server-cee56a32/tasks/sprints", async (c) => {
  try {
    const sprints = (await kv.get("tasks:sprints")) || [];
    return c.json({ sprints });
  } catch (error) {
    return c.json({ error: "Failed to list sprints", details: String(error) }, 500);
  }
});

app.post("/make-server-cee56a32/tasks/sprints", async (c) => {
  try {
    const body = await c.req.json();
    const { name, startDate, endDate } = body;
    if (!name?.trim()) return c.json({ error: "name is required" }, 400);
    const id = `sprint-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const sprint = { id, name, startDate: startDate || "", endDate: endDate || "", createdAt: new Date().toISOString() };
    const sprints = (await kv.get("tasks:sprints")) || [];
    sprints.push(sprint);
    await kv.set("tasks:sprints", sprints);
    return c.json({ success: true, sprint });
  } catch (error) {
    return c.json({ error: "Failed to create sprint", details: String(error) }, 500);
  }
});

app.put("/make-server-cee56a32/tasks/sprints", async (c) => {
  try {
    const body = await c.req.json();
    await kv.set("tasks:sprints", body.sprints || []);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to update sprints", details: String(error) }, 500);
  }
});

app.delete("/make-server-cee56a32/tasks/sprints/:id", async (c) => {
  try {
    const id = decodeURIComponent(c.req.param("id"));
    const sprints = ((await kv.get("tasks:sprints")) || []).filter((s: any) => s.id !== id);
    await kv.set("tasks:sprints", sprints);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to delete sprint", details: String(error) }, 500);
  }
});

// Update task (wildcard — must be after all specific /tasks/* routes)
app.put("/make-server-cee56a32/tasks/:id", async (c) => {
  try {
    const id = decodeURIComponent(c.req.param("id"));
    const body = await c.req.json();

    const existing = await kv.get(id);
    if (!existing) return c.json({ error: "Task not found" }, 404);

    const updated = { ...existing, ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(id, updated);

    return c.json({ success: true, task: updated });
  } catch (error) {
    console.error("[Tasks] Error updating task:", error);
    return c.json({ error: "Failed to update task", details: String(error) }, 500);
  }
});

// Delete task (wildcard — must be after all specific /tasks/* routes)
app.delete("/make-server-cee56a32/tasks/:id", async (c) => {
  try {
    const id = decodeURIComponent(c.req.param("id"));
    await kv.del(id);
    const list = ((await kv.get("tasks:list")) || []).filter((tid: string) => tid !== id);
    await kv.set("tasks:list", list);
    return c.json({ success: true });
  } catch (error) {
    console.error("[Tasks] Error deleting task:", error);
    return c.json({ error: "Failed to delete task", details: String(error) }, 500);
  }
});

// AI task generation — proxies Gemini so the API key stays server-side
app.post("/make-server-cee56a32/tasks/ai-generate", async (c) => {
  try {
    const body = await c.req.json();
    const { text } = body;

    if (!text?.trim()) {
      return c.json({ error: "text is required" }, 400);
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return c.json({ error: "GEMINI_API_KEY not configured on the server" }, 500);
    }

    const today = new Date().toISOString().split("T")[0];
    const prompt = `Você é um assistente de extração de tarefas de sistema B2B. Analise o seguinte texto e extraia 1 ou mais tarefas contidas nele. Se o texto mencionar várias tarefas, extraia todas elas.
Retorne estritamente um JSON de array contendo objetos com as seguintes propriedades:
- name (string, o nome ou título limpo da tarefa. Remova palavras de comando como 'criar', 'adicionar tarefa', etc.)
- project (string, o nome do projeto se mencionado, senão string vazia)
- assignee (string, o nome da pessoa responsável se mencionado, senão string vazia)
- due (string, a data de entrega no formato YYYY-MM-DD, baseando-se que a data atual é ${today}. Se for amanhã, adicione 1 dia, se não mencionado, string vazia)
- status (string, sempre "not_started")
- attachments (array vazio [])

Exemplo esperado de resposta JSON:
[{"name":"Revisar design do login","project":"App Beta","assignee":"João","due":"2024-12-25","status":"not_started","attachments":[]}]

Texto a ser analisado: "${text.replace(/"/g, "'")}"`;

    console.log("[Tasks AI] Calling Gemini for text length:", text.length);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 },
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("[Tasks AI] Gemini error:", JSON.stringify(errData));
      return c.json(
        { error: `Gemini API error ${response.status}`, details: errData },
        500
      );
    }

    const data = await response.json();
    let extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    // Strip markdown code fences if present
    extractedText = extractedText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    // Extract JSON array from the response
    const jsonMatch = extractedText.match(/\[[\s\S]*\]/);
    extractedText = jsonMatch ? jsonMatch[0] : extractedText;

    let tasks = JSON.parse(extractedText);
    if (!Array.isArray(tasks)) tasks = [tasks];

    console.log("[Tasks AI] Generated", tasks.length, "task(s)");
    return c.json({ success: true, tasks });
  } catch (error) {
    console.error("[Tasks AI] Error generating tasks:", error);
    return c.json({ error: "Failed to generate tasks with AI", details: String(error) }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// QUOTES ENDPOINTS

app.get("/make-server-cee56a32/quotes", async (c) => {
  try {
    const list = (await kv.get("quotes:list")) || [];
    if (list.length === 0) return c.json({ quotes: [] });
    const quotes = (await kv.mget(list)).filter(Boolean);
    quotes.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ quotes });
  } catch (error) {
    return c.json({ error: "Failed to list quotes", details: String(error) }, 500);
  }
});

app.post("/make-server-cee56a32/quotes", async (c) => {
  try {
    const body = await c.req.json();
    const id = `quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const quote = { ...body, id, createdAt: body.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    await kv.set(id, quote);
    const list = (await kv.get("quotes:list")) || [];
    list.push(id);
    await kv.set("quotes:list", list);
    return c.json({ success: true, quote });
  } catch (error) {
    return c.json({ error: "Failed to create quote", details: String(error) }, 500);
  }
});

app.put("/make-server-cee56a32/quotes/:id", async (c) => {
  try {
    const id = decodeURIComponent(c.req.param("id"));
    const body = await c.req.json();
    const existing = await kv.get(id);
    if (!existing) return c.json({ error: "Quote not found" }, 404);
    const updated = { ...existing, ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(id, updated);
    return c.json({ success: true, quote: updated });
  } catch (error) {
    return c.json({ error: "Failed to update quote", details: String(error) }, 500);
  }
});

app.delete("/make-server-cee56a32/quotes/:id", async (c) => {
  try {
    const id = decodeURIComponent(c.req.param("id"));
    await kv.del(id);
    const list = ((await kv.get("quotes:list")) || []).filter((qid: string) => qid !== id);
    await kv.set("quotes:list", list);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to delete quote", details: String(error) }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PDF SYNTAX ENDPOINTS

// Upload PDF
app.post("/make-server-cee56a32/pdfs", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'] as File;
    const title = body['title'] as string;

    if (!file || !title) {
      return c.json({ error: "file and title are required" }, 400);
    }

    if (file.type !== "application/pdf") {
      return c.json({ error: "Only PDF files are allowed" }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return c.json({ error: "Storage not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('make-cee56a32-pdfs')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error("[PDFs] Upload error:", uploadError);
      return c.json({ error: "Failed to upload file", details: uploadError.message }, 500);
    }

    // Save record to KV
    const id = `pdf:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    const pdfRecord = {
      id,
      title,
      fileName: file.name,
      filePath,
      size: file.size,
      createdAt: new Date().toISOString(),
    };

    await kv.set(id, pdfRecord);
    const list = (await kv.get("pdfs:list")) || [];
    list.push(id);
    await kv.set("pdfs:list", list);

    return c.json({ success: true, pdf: pdfRecord });
  } catch (error) {
    console.error("[PDFs] Error uploading pdf:", error);
    return c.json({ error: "Failed to upload pdf", details: String(error) }, 500);
  }
});

// List PDFs
app.get("/make-server-cee56a32/pdfs", async (c) => {
  try {
    const list = (await kv.get("pdfs:list")) || [];
    if (list.length === 0) return c.json({ pdfs: [] });
    
    const pdfs = (await kv.mget(list)).filter(Boolean);
    pdfs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return c.json({ pdfs });
  } catch (error) {
    console.error("[PDFs] Error listing pdfs:", error);
    return c.json({ error: "Failed to list pdfs", details: String(error) }, 500);
  }
});

// Get PDF Signed URL
app.get("/make-server-cee56a32/pdfs/:id/url", async (c) => {
  try {
    const id = decodeURIComponent(c.req.param("id"));
    const pdfRecord = await kv.get(id);
    
    if (!pdfRecord) {
      return c.json({ error: "PDF not found" }, 404);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Generate signed URL valid for 1 hour
    const { data, error } = await supabase.storage
      .from('make-cee56a32-pdfs')
      .createSignedUrl(pdfRecord.filePath, 3600);

    if (error) {
      return c.json({ error: "Failed to generate URL", details: error.message }, 500);
    }

    return c.json({ url: data.signedUrl });
  } catch (error) {
    console.error("[PDFs] Error getting signed url:", error);
    return c.json({ error: "Failed to get signed url", details: String(error) }, 500);
  }
});

// Delete PDF
app.delete("/make-server-cee56a32/pdfs/:id", async (c) => {
  try {
    const id = decodeURIComponent(c.req.param("id"));
    const pdfRecord = await kv.get(id);
    
    if (!pdfRecord) {
      return c.json({ error: "PDF not found" }, 404);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('make-cee56a32-pdfs')
      .remove([pdfRecord.filePath]);

    if (deleteError) {
      console.error("[PDFs] Storage delete error:", deleteError);
      // We continue to delete the record even if file deletion fails
    }

    // Delete from KV
    await kv.del(id);
    const list = ((await kv.get("pdfs:list")) || []).filter((pid: string) => pid !== id);
    await kv.set("pdfs:list", list);

    return c.json({ success: true });
  } catch (error) {
    console.error("[PDFs] Error deleting pdf:", error);
    return c.json({ error: "Failed to delete pdf", details: String(error) }, 500);
  }
});

// ────────────────────────────────────────────────────────────────────────────

// ─── SOCIAL MEDIA REPOSITORY ENDPOINTS ──────────────────────────────────────

// List repo items
app.get("/make-server-cee56a32/repo", async (c) => {
  try {
    const list = (await kv.get("repo:list")) || [];
    if (list.length === 0) return c.json({ items: [] });
    const items = (await kv.mget(list)).filter(Boolean);
    items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ items });
  } catch (error) {
    console.error("[Repo] Error listing items:", error);
    return c.json({ error: "Failed to list items", details: String(error) }, 500);
  }
});

// Upload repo image
app.post("/make-server-cee56a32/repo", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"] as File;
    const title = (body["title"] as string) || "";
    const tagsRaw = body["tags"] as string;
    const tags = tagsRaw ? JSON.parse(tagsRaw) : [];

    if (!file) return c.json({ error: "file is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) return c.json({ error: "Storage not configured" }, 500);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `repo/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_REPO)
      .upload(filePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("[Repo] Upload error:", uploadError);
      return c.json({ error: "Failed to upload file", details: uploadError.message }, 500);
    }

    const id = `repo:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    const item = { id, title, fileName: file.name, path: filePath, tags, createdAt: new Date().toISOString() };

    await kv.set(id, item);
    const list = (await kv.get("repo:list")) || [];
    list.push(id);
    await kv.set("repo:list", list);

    console.log("[Repo] Item added:", id);
    return c.json({ success: true, item });
  } catch (error) {
    console.error("[Repo] Error uploading:", error);
    return c.json({ error: "Failed to upload item", details: String(error) }, 500);
  }
});

// Get signed URL for repo attachment
app.get("/make-server-cee56a32/repo/attachment", async (c) => {
  try {
    const path = c.req.query("path");
    if (!path) return c.json({ error: "path query param required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.storage
      .from(BUCKET_REPO)
      .createSignedUrl(path, 3600);

    if (error) return c.json({ error: "Failed to generate URL", details: error.message }, 500);
    return c.json({ signedUrl: data.signedUrl });
  } catch (error) {
    console.error("[Repo] Error getting signed URL:", error);
    return c.json({ error: "Failed to get signed URL", details: String(error) }, 500);
  }
});

// Delete repo item
app.delete("/make-server-cee56a32/repo/:id", async (c) => {
  try {
    const id = decodeURIComponent(c.req.param("id"));
    const item = await kv.get(id);
    if (!item) return c.json({ error: "Item not found" }, 404);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.storage.from(BUCKET_REPO).remove([item.path]);
    await kv.del(id);
    const list = ((await kv.get("repo:list")) || []).filter((rid: string) => rid !== id);
    await kv.set("repo:list", list);

    return c.json({ success: true });
  } catch (error) {
    console.error("[Repo] Error deleting item:", error);
    return c.json({ error: "Failed to delete item", details: String(error) }, 500);
  }
});

// ─── GENERIC FILE UPLOAD (for AI task attachments) ───────────────────────────

app.post("/make-server-cee56a32/upload", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"] as File;
    if (!file) return c.json({ error: "file is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) return c.json({ error: "Storage not configured" }, 500);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const fileExt = file.name.split(".").pop() || "bin";
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `attachments/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_REPO)
      .upload(filePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("[Upload] Error:", uploadError);
      return c.json({ error: "Upload failed", details: uploadError.message }, 500);
    }

    console.log("[Upload] File uploaded:", filePath);
    return c.json({ success: true, name: file.name, path: filePath });
  } catch (error) {
    console.error("[Upload] Unexpected error:", error);
    return c.json({ error: "Failed to upload file", details: String(error) }, 500);
  }
});

// ─── Social Media ─────────────────────────────────────────────────────────────

// GET /social/requests — list all art requests
app.get("/make-server-cee56a32/social/requests", async (c) => {
  try {
    const authResult = await requireAuth(c);
    if (authResult instanceof Response) return authResult;
    const items = await kv.getByPrefix("social:req:");
    items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ requests: items });
  } catch (err) {
    console.error("[Social] GET requests error:", err);
    return c.json({ error: "Erro ao buscar solicitações" }, 500);
  }
});

// POST /social/requests — create a new art request
app.post("/make-server-cee56a32/social/requests", async (c) => {
  try {
    const authResult = await requireAuth(c);
    if (authResult instanceof Response) return authResult;
    const body = await c.req.json();
    const { client, format, deadline, description } = body;
    if (!client || !format) return c.json({ error: "client e format são obrigatórios" }, 400);
    const id = `social:req:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    const request = {
      id,
      client,
      format,
      deadline: deadline || null,
      description: description || null,
      status: "pendente",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(id, request);
    return c.json({ request });
  } catch (err) {
    console.error("[Social] POST request error:", err);
    return c.json({ error: "Erro ao criar solicitação" }, 500);
  }
});

// PUT /social/requests/:id — update a request
app.put("/make-server-cee56a32/social/requests/:id", async (c) => {
  try {
    const authResult = await requireAuth(c);
    if (authResult instanceof Response) return authResult;
    const id = decodeURIComponent(c.req.param("id"));
    const existing = await kv.get(id);
    if (!existing) return c.json({ error: "Solicitação não encontrada" }, 404);
    const body = await c.req.json();
    const updated = { ...existing, ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(id, updated);
    return c.json({ request: updated });
  } catch (err) {
    console.error("[Social] PUT request error:", err);
    return c.json({ error: "Erro ao atualizar solicitação" }, 500);
  }
});

// DELETE /social/requests/:id — delete a request
app.delete("/make-server-cee56a32/social/requests/:id", async (c) => {
  try {
    const authResult = await requireAuth(c);
    if (authResult instanceof Response) return authResult;
    const id = decodeURIComponent(c.req.param("id"));
    const existing = await kv.get(id);
    if (!existing) return c.json({ error: "Solicitação não encontrada" }, 404);
    await kv.del(id);
    return c.json({ success: true });
  } catch (err) {
    console.error("[Social] DELETE request error:", err);
    return c.json({ error: "Erro ao excluir solicitação" }, 500);
  }
});

// GET /social/arts — list all delivered arts
app.get("/make-server-cee56a32/social/arts", async (c) => {
  try {
    const authResult = await requireAuth(c);
    if (authResult instanceof Response) return authResult;
    const items = await kv.getByPrefix("social:art:");
    items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ arts: items });
  } catch (err) {
    console.error("[Social] GET arts error:", err);
    return c.json({ error: "Erro ao buscar artes" }, 500);
  }
});

// POST /social/arts — upload art file
app.post("/make-server-cee56a32/social/arts", async (c) => {
  try {
    const authResult = await requireAuth(c);
    if (authResult instanceof Response) return authResult;
    const body = await c.req.parseBody();
    const file = body["file"] as File;
    if (!file) return c.json({ error: "file é obrigatório" }, 400);
    const title = body["title"] as string | undefined;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `arts/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_SOCIAL)
      .upload(filePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("[Social] Upload error:", uploadError);
      return c.json({ error: "Falha ao fazer upload", details: uploadError.message }, 500);
    }

    const id = `social:art:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    const art = {
      id,
      title: title || file.name,
      path: filePath,
      mimeType: file.type,
      createdAt: new Date().toISOString(),
    };
    await kv.set(id, art);
    return c.json({ art });
  } catch (err) {
    console.error("[Social] POST art error:", err);
    return c.json({ error: "Erro ao entregar arte" }, 500);
  }
});

// GET /social/arts/url — get signed URL for an art
app.get("/make-server-cee56a32/social/arts/url", async (c) => {
  try {
    const authResult = await requireAuth(c);
    if (authResult instanceof Response) return authResult;
    const path = c.req.query("path");
    if (!path) return c.json({ error: "path query param obrigatório" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.storage
      .from(BUCKET_SOCIAL)
      .createSignedUrl(path, 3600);

    if (error) return c.json({ error: "Falha ao gerar URL", details: error.message }, 500);
    return c.json({ signedUrl: data.signedUrl });
  } catch (err) {
    console.error("[Social] GET art URL error:", err);
    return c.json({ error: "Erro ao obter URL" }, 500);
  }
});

// DELETE /social/arts/:id — delete an art
app.delete("/make-server-cee56a32/social/arts/:id", async (c) => {
  try {
    const authResult = await requireAuth(c);
    if (authResult instanceof Response) return authResult;
    const id = decodeURIComponent(c.req.param("id"));
    const art = await kv.get(id);
    if (!art) return c.json({ error: "Arte não encontrada" }, 404);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.storage.from(BUCKET_SOCIAL).remove([art.path]);
    await kv.del(id);
    return c.json({ success: true });
  } catch (err) {
    console.error("[Social] DELETE art error:", err);
    return c.json({ error: "Erro ao excluir arte" }, 500);
  }
});

// ─── CRM AI EXTRACT LEADS ────────────────────────────────────────────────────

app.post("/make-server-cee56a32/crm/ai-extract", async (c) => {
  try {
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return c.json({ error: "GEMINI_API_KEY não configurada no servidor" }, 500);
    }

    const body = await c.req.json();
    const { type, content, base64, mimeType } = body;

    let parts: any[];

    if (type === "image") {
      if (!base64 || !mimeType) {
        return c.json({ error: "base64 e mimeType são obrigatórios para imagens" }, 400);
      }
      parts = [
        { inlineData: { mimeType, data: base64 } },
        { text: `Analise esta imagem e extraia todos os contatos/leads encontrados. Retorne um array JSON com objetos contendo: name (obrigatório), phone, email, company, service, notes (todos opcionais). Retorne APENAS o array JSON, sem markdown.` },
      ];
    } else {
      if (!content?.trim()) {
        return c.json({ error: "content é obrigatório para texto" }, 400);
      }
      parts = [
        { text: `Analise o texto abaixo e extraia todos os contatos/leads. Retorne um array JSON com objetos contendo: name (obrigatório), phone, email, company, service, notes (todos opcionais). Retorne APENAS o array JSON, sem markdown.\n\nTexto:\n${content}` },
      ];
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.1 } }),
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("[CRM AI] Gemini error:", response.status, JSON.stringify(errData));
      if (response.status === 429) {
        const retryDelay = errData?.error?.details?.find((d: any) => d?.metadata?.retryDelay)?.metadata?.retryDelay;
        const seconds = retryDelay ? parseInt(retryDelay) : 60;
        return c.json({ error: `Limite da API de IA atingido. Tente novamente em ${seconds} segundos.` }, 429);
      }
      return c.json({ error: `Gemini API error ${response.status}`, details: errData }, 500);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    text = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const match = text.match(/\[[\s\S]*\]/);
    text = match ? match[0] : "[]";

    let leads = JSON.parse(text);
    if (!Array.isArray(leads)) leads = [leads].filter(Boolean);

    console.log("[CRM AI] Extracted", leads.length, "lead(s)");
    return c.json({ leads });
  } catch (err) {
    console.error("[CRM AI] Error:", err);
    return c.json({ error: "Erro ao processar com IA", details: String(err) }, 500);
  }
});

// ─── Activity Log ─────────────────────────────────────────────────────────────

// POST /activity-log — record an action (any authenticated user)
app.post("/make-server-cee56a32/activity-log", async (c) => {
  try {
    const authResult = await requireAuth(c);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;
    const body = await c.req.json();
    const { action, module, description, metadata } = body;
    if (!action || !module) return c.json({ error: "action and module required" }, 400);
    const now = Date.now();
    const key = `activity-log:${String(now).padStart(16, '0')}:${user.id}`;
    await kv.set(key, {
      id: key,
      userId: user.id,
      userEmail: user.email ?? "",
      userName: user.user_metadata?.name || user.email || "Desconhecido",
      action,
      module,
      description: description || "",
      metadata: metadata ?? null,
      createdAt: new Date().toISOString(),
    });
    return c.json({ ok: true });
  } catch (err) {
    console.error("[ActivityLog] POST error:", err);
    return c.json({ ok: false }, 500);
  }
});

// GET /activity-log — list all logs (admin-only)
app.get("/make-server-cee56a32/activity-log", async (c) => {
  try {
    const authResult = await requireAdmin(c);
    if (authResult instanceof Response) return authResult;
    const logs = await kv.getByPrefix("activity-log:");
    logs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ logs });
  } catch (err) {
    console.error("[ActivityLog] GET error:", err);
    return c.json({ error: "Erro ao buscar logs" }, 500);
  }
});

// DELETE /activity-log — clear all logs (admin-only)
app.delete("/make-server-cee56a32/activity-log", async (c) => {
  try {
    const authResult = await requireAdmin(c);
    if (authResult instanceof Response) return authResult;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);
    await sb.from("kv_store_cee56a32").delete().like("key", "activity-log:%");
    return c.json({ ok: true });
  } catch (err) {
    console.error("[ActivityLog] DELETE error:", err);
    return c.json({ error: "Erro ao limpar logs" }, 500);
  }
});

// ─── COPY MODULE ─────────────────────────────────────────────────────────────

// GET /copy/groups — list all groups with their texts
app.get("/make-server-cee56a32/copy/groups", async (c) => {
  const auth = await requireAuth(c);
  if (auth instanceof Response) return auth;
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: groups, error } = await sb.from('copy_groups').select('*').order('created_at', { ascending: true });
  if (error) return c.json({ error: error.message }, 500);
  const { data: texts } = await sb.from('copy_texts').select('*').order('created_at', { ascending: true });
  const result = (groups || []).map((g: any) => ({
    ...g,
    texts: (texts || []).filter((t: any) => t.group_id === g.id),
  }));
  return c.json({ groups: result });
});

// POST /copy/groups — create group
app.post("/make-server-cee56a32/copy/groups", async (c) => {
  const auth = await requireAuth(c);
  if (auth instanceof Response) return auth;
  const { name } = await c.req.json();
  if (!name?.trim()) return c.json({ error: 'name obrigatório' }, 400);
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await sb.from('copy_groups').insert({ name: name.trim() }).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ group: { ...data, texts: [] } });
});

// PUT /copy/groups/:id — rename group
app.put("/make-server-cee56a32/copy/groups/:id", async (c) => {
  const auth = await requireAuth(c);
  if (auth instanceof Response) return auth;
  const id = c.req.param('id');
  const { name } = await c.req.json();
  if (!name?.trim()) return c.json({ error: 'name obrigatório' }, 400);
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await sb.from('copy_groups').update({ name: name.trim() }).eq('id', id).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ group: data });
});

// DELETE /copy/groups/:id
app.delete("/make-server-cee56a32/copy/groups/:id", async (c) => {
  const auth = await requireAuth(c);
  if (auth instanceof Response) return auth;
  const id = c.req.param('id');
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await sb.from('copy_groups').delete().eq('id', id);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

// POST /copy/texts — add text to group
app.post("/make-server-cee56a32/copy/texts", async (c) => {
  const auth = await requireAuth(c);
  if (auth instanceof Response) return auth;
  const { group_id, title, content } = await c.req.json();
  if (!group_id || !title?.trim() || !content?.trim()) return c.json({ error: 'group_id, title e content obrigatórios' }, 400);
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await sb.from('copy_texts').insert({ group_id, title: title.trim(), content: content.trim() }).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ text: data });
});

// PUT /copy/texts/:id — edit text
app.put("/make-server-cee56a32/copy/texts/:id", async (c) => {
  const auth = await requireAuth(c);
  if (auth instanceof Response) return auth;
  const id = c.req.param('id');
  const { title, content } = await c.req.json();
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const updates: any = {};
  if (title?.trim()) updates.title = title.trim();
  if (content?.trim()) updates.content = content.trim();
  const { data, error } = await sb.from('copy_texts').update(updates).eq('id', id).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ text: data });
});

// DELETE /copy/texts/:id
app.delete("/make-server-cee56a32/copy/texts/:id", async (c) => {
  const auth = await requireAuth(c);
  if (auth instanceof Response) return auth;
  const id = c.req.param('id');
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await sb.from('copy_texts').delete().eq('id', id);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

// ─── REUNIÕES ─────────────────────────────────────────────────────────────────

app.get("/make-server-cee56a32/meetings", async (c) => {
  const auth = await requireAuth(c);
  if (auth instanceof Response) return auth;
  const list = (await kv.get("meetings:list")) || [];
  if (list.length === 0) return c.json({ meetings: [] });
  const meetings = (await kv.mget(list)).filter(Boolean);
  meetings.sort((a: any, b: any) => {
    const da = `${a.date}T${a.time}`;
    const db = `${b.date}T${b.time}`;
    return da.localeCompare(db);
  });
  return c.json({ meetings });
});

app.post("/make-server-cee56a32/meetings", async (c) => {
  const auth = await requireAuth(c);
  if (auth instanceof Response) return auth;
  const body = await c.req.json();
  const { title, date, time, notes, createdBy } = body;
  if (!title?.trim() || !date || !time) return c.json({ error: "title, date e time são obrigatórios" }, 400);
  const id = `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const meeting = {
    id, title: title.trim(), date, time,
    notes: notes || "", createdBy: createdBy || "",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  await kv.set(id, meeting);
  const list = (await kv.get("meetings:list")) || [];
  list.push(id);
  await kv.set("meetings:list", list);
  return c.json({ meeting });
});

app.put("/make-server-cee56a32/meetings/:id", async (c) => {
  const auth = await requireAuth(c);
  if (auth instanceof Response) return auth;
  const id = decodeURIComponent(c.req.param("id"));
  const existing = await kv.get(id);
  if (!existing) return c.json({ error: "Reunião não encontrada" }, 404);
  const body = await c.req.json();
  const updated = { ...existing, ...body, id, updatedAt: new Date().toISOString() };
  await kv.set(id, updated);
  return c.json({ meeting: updated });
});

app.delete("/make-server-cee56a32/meetings/:id", async (c) => {
  const auth = await requireAuth(c);
  if (auth instanceof Response) return auth;
  const id = decodeURIComponent(c.req.param("id"));
  await kv.del(id);
  const list = ((await kv.get("meetings:list")) || []).filter((mid: string) => mid !== id);
  await kv.set("meetings:list", list);
  return c.json({ ok: true });
});

// ─── AGENTE CEO ──────────────────────────────────────────────────────────────

function isAgentRequest(c: any): boolean {
  const key = c.req.header('X-Agent-Key');
  const expected = Deno.env.get('AGENT_API_KEY');
  return !!expected && key === expected;
}

// GET /make-server-cee56a32/agent/summary — snapshot consolidado
app.get("/make-server-cee56a32/agent/summary", async (c) => {
  if (!isAgentRequest(c)) return c.json({ error: 'Unauthorized' }, 401);

  const [taskIds, leadIds, meetingIds, finIds, quoteIds] = await Promise.all([
    kv.get("tasks:list"),
    kv.get("crm:leads:list"),
    kv.get("meetings:list"),
    kv.get("financeiro:entries:list"),
    kv.get("quotes:list"),
  ]);

  const [tasks, leads, meetings, finEntries, quotes] = await Promise.all([
    taskIds?.length ? kv.mget(taskIds).then((r: any[]) => r.filter(Boolean)) : Promise.resolve([]),
    leadIds?.length ? kv.mget(leadIds).then((r: any[]) => r.filter(Boolean)) : Promise.resolve([]),
    meetingIds?.length ? kv.mget(meetingIds).then((r: any[]) => r.filter(Boolean)) : Promise.resolve([]),
    finIds?.length ? kv.mget(finIds).then((r: any[]) => r.filter(Boolean)) : Promise.resolve([]),
    quoteIds?.length ? kv.mget(quoteIds).then((r: any[]) => r.filter(Boolean)) : Promise.resolve([]),
  ]);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthFin = finEntries.filter((e: any) => e.dueDate?.startsWith(currentMonth));
  const receitas = monthFin.filter((e: any) => e.type === 'receita' && e.status === 'paid').reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const despesas = monthFin.filter((e: any) => e.type === 'despesa' && e.status === 'paid').reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const pendentes = monthFin.filter((e: any) => e.status === 'pending').reduce((s: number, e: any) => s + (e.amount || 0), 0);

  const nowStr = new Date().toISOString();
  const upcoming = meetings
    .filter((m: any) => `${m.date}T${m.time}` >= nowStr.slice(0, 16))
    .sort((a: any, b: any) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    .slice(0, 5);

  const leadsByStatus = leads.reduce((acc: any, l: any) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  return c.json({
    generatedAt: new Date().toISOString(),
    financeiro: {
      mes: currentMonth,
      receitas,
      despesas,
      resultado: receitas - despesas,
      pendentes,
      totalEntradas: finEntries.length,
    },
    tarefas: {
      total: tasks.length,
      todo: tasks.filter((t: any) => t.status === 'todo').length,
      inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
      done: tasks.filter((t: any) => t.status === 'done').length,
    },
    crm: {
      total: leads.length,
      porStatus: leadsByStatus,
    },
    reunioes: {
      proximas: upcoming,
      total: meetings.length,
    },
    orcamentos: {
      total: quotes.length,
      aprovados: quotes.filter((q: any) => q.status === 'approved').length,
      pendentes: quotes.filter((q: any) => q.status === 'pending').length,
    },
  });
});

// POST /make-server-cee56a32/agent/action — cria recursos via agente
app.post("/make-server-cee56a32/agent/action", async (c) => {
  if (!isAgentRequest(c)) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const { action, data } = body;

  if (action === 'create_task') {
    // Normalize status: agente pode enviar 'todo' mas o sistema usa 'not_started'
    const rawStatus = data?.status ?? 'not_started'
    const normalizedStatus = rawStatus === 'todo' ? 'not_started' : rawStatus === 'completed' ? 'done' : rawStatus
    const { title, assignedTo, dueDate } = data || {}
    const status = normalizedStatus
    if (!title?.trim()) return c.json({ error: 'title obrigatório' }, 400);
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const task = { id, title: title.trim(), status, assignedTo: assignedTo || '', dueDate: dueDate || '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await kv.set(id, task);
    const list = (await kv.get("tasks:list")) || [];
    list.push(id);
    await kv.set("tasks:list", list);
    return c.json({ ok: true, task });
  }

  if (action === 'create_lead') {
    const { name, company, email, phone, status = 'novo', folderId } = data || {};
    if (!name?.trim()) return c.json({ error: 'name obrigatório' }, 400);
    const id = `crm-lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const lead = { id, name: name.trim(), company: company || '', email: email || '', phone: phone || '', status, folderId: folderId || '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await kv.set(id, lead);
    const list = (await kv.get("crm:leads:list")) || [];
    list.push(id);
    await kv.set("crm:leads:list", list);
    return c.json({ ok: true, lead });
  }

  if (action === 'create_lancamento') {
    const { title, type, amount, category = 'Outros', dueDate, status = 'pending', recurrence } = data || {};
    if (!title?.trim() || !type || amount == null || !dueDate) return c.json({ error: 'title, type, amount e dueDate obrigatórios' }, 400);
    if (!['receita', 'despesa'].includes(type)) return c.json({ error: 'type deve ser receita ou despesa' }, 400);
    const id = `fin-entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const entry = { id, title: title.trim(), type, amount: Number(amount), category, dueDate, status, recurrence: recurrence || '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await kv.set(id, entry);
    const list = (await kv.get("financeiro:entries:list")) || [];
    list.push(id);
    await kv.set("financeiro:entries:list", list);
    return c.json({ ok: true, entry });
  }

  if (action === 'create_meeting') {
    const { title, date, time, notes, createdBy } = data || {};
    if (!title?.trim() || !date || !time) return c.json({ error: 'title, date e time obrigatórios' }, 400);
    const id = `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const meeting = { id, title: title.trim(), date, time, notes: notes || '', createdBy: createdBy || 'Agente CEO', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await kv.set(id, meeting);
    const list = (await kv.get("meetings:list")) || [];
    list.push(id);
    await kv.set("meetings:list", list);
    return c.json({ ok: true, meeting });
  }

  return c.json({ error: `Ação desconhecida: ${action}. Ações válidas: create_task, create_lead, create_lancamento, create_meeting` }, 400);
});

// ────────────────────────────────────────────────────────────────────────────

Deno.serve(app.fetch);