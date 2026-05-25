import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  activityLog,
  budgetItems,
  changeOrders,
  documents,
  manufacturers,
  messages,
  milestones,
  notifications,
  products,
  projectTeam,
  projects,
  submittals,
  users,
} from "../../drizzle/schema";
import { eq, like } from "drizzle-orm";

// ─── Demo data constants ──────────────────────────────────────────────────────
const DEMO_TAG = "[DEMO]";

// ─── Seed Router ──────────────────────────────────────────────────────────────
export const seedRouter = router({
  /**
   * Populate the portal with a realistic demo project.
   * Only callable by SLS Admin or admin users.
   */
  load: adminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const adminId = ctx.user.id;
    const now = new Date();

    // ── 1. Demo manufacturers ─────────────────────────────────────────────────
    const [ercoResult] = await db.insert(manufacturers).values({
      name: `${DEMO_TAG} ERCO Lighting`,
      website: "https://www.erco.com",
      repName: "Sarah Mitchell",
      repEmail: "smitchell@erco.com",
      repPhone: "(404) 555-0182",
      region: "Southeast",
      notes: "Premium architectural lighting. Lead times 8–12 weeks for custom orders.",
      createdBy: adminId,
    });
    const ercoId = ercoResult.insertId;

    const [usaiResult] = await db.insert(manufacturers).values({
      name: `${DEMO_TAG} USAI Lighting`,
      website: "https://www.usailighting.com",
      repName: "James Hartwell",
      repEmail: "jhartwell@usai.com",
      repPhone: "(404) 555-0247",
      region: "Southeast",
      notes: "Downlights and accent lighting specialist. Strong on hospitality and retail.",
      createdBy: adminId,
    });
    const usaiId = usaiResult.insertId;

    const [lumenpulseResult] = await db.insert(manufacturers).values({
      name: `${DEMO_TAG} Lumenpulse`,
      website: "https://www.lumenpulse.com",
      repName: "Dana Reeves",
      repEmail: "dreeves@lumenpulse.com",
      repPhone: "(404) 555-0319",
      region: "National",
      notes: "Linear architectural LED. Go-to for large commercial and mixed-use.",
      createdBy: adminId,
    });
    const lumenpulseId = lumenpulseResult.insertId;

    // ── 2. Demo users (virtual team) ──────────────────────────────────────────
    // Insert demo users with fake openIds so they don't conflict with real accounts
    const [repResult] = await db.insert(users).values({
      openId: `demo-rep-${Date.now()}`,
      name: "Marcus Webb",
      email: "mwebb@southernlightingsource.com",
      phone: "(404) 555-0101",
      role: "sls_rep",
      company: "Southern Lighting Source",
      title: "Senior Sales Representative",
      isActive: true,
      onboardingCompleted: true,
      lastSignedIn: now,
    });
    const repId = repResult.insertId;

    const [pmResult] = await db.insert(users).values({
      openId: `demo-pm-${Date.now()}`,
      name: "Priya Nair",
      email: "pnair@southernlightingsource.com",
      phone: "(404) 555-0102",
      role: "sls_pm",
      company: "Southern Lighting Source",
      title: "Project Manager",
      isActive: true,
      onboardingCompleted: true,
      lastSignedIn: now,
    });
    const pmId = pmResult.insertId;

    const [archResult] = await db.insert(users).values({
      openId: `demo-arch-${Date.now()}`,
      name: "Claire Fontaine",
      email: "cfontaine@bksk.com",
      phone: "(404) 555-0203",
      role: "client_architect",
      company: "BKSK Architects",
      title: "Principal Architect",
      isActive: true,
      onboardingCompleted: true,
      lastSignedIn: now,
    });
    const archId = archResult.insertId;

    const [gcResult] = await db.insert(users).values({
      openId: `demo-gc-${Date.now()}`,
      name: "Ray Tillman",
      email: "rtillman@brasfield.com",
      phone: "(404) 555-0304",
      role: "client_gc",
      company: "Brasfield & Gorrie",
      title: "Project Superintendent",
      isActive: true,
      onboardingCompleted: true,
      lastSignedIn: now,
    });
    const gcId = gcResult.insertId;

    // ── 3. Demo project ───────────────────────────────────────────────────────
    const targetDelivery = new Date(now);
    targetDelivery.setDate(targetDelivery.getDate() + 45);

    const approvedAt = new Date(now);
    approvedAt.setDate(approvedAt.getDate() - 30);

    const orderedAt = new Date(now);
    orderedAt.setDate(orderedAt.getDate() - 18);

    const [projectResult] = await db.insert(projects).values({
      name: `${DEMO_TAG} Ponce City Market — Food Hall Renovation`,
      description:
        "Complete lighting renovation of the 22,000 sq ft food hall at Ponce City Market. Scope includes architectural downlights, linear cove lighting, pendant fixtures over vendor stalls, and exterior accent lighting for the rooftop terrace. Design-build with BKSK Architects and Brasfield & Gorrie as GC.",
      status: "ordered",
      region: "georgia",
      buildingType: "Mixed-Use / Retail",
      address: "675 Ponce De Leon Ave NE",
      city: "Atlanta",
      state: "GA",
      originalBudget: "284500.00",
      currentBudget: "296200.00",
      budgetStatus: "at_risk",
      timelineStatus: "on_track",
      assignedRepId: repId,
      assignedPmId: pmId,
      approvedAt,
      orderedAt,
      targetDeliveryAt: targetDelivery,
      createdBy: adminId,
    });
    const projectId = projectResult.insertId;

    // ── 4. Project team ───────────────────────────────────────────────────────
    await db.insert(projectTeam).values([
      { projectId, userId: adminId, role: "SLS Admin" },
      { projectId, userId: repId, role: "Sales Representative" },
      { projectId, userId: pmId, role: "Project Manager" },
      { projectId, userId: archId, role: "Architect of Record" },
      { projectId, userId: gcId, role: "General Contractor" },
    ]);

    // ── 5. Products / line items ──────────────────────────────────────────────
    await db.insert(products).values([
      {
        projectId,
        manufacturerId: ercoId,
        manufacturerName: "ERCO Lighting",
        modelNumber: "ERCO-38720",
        description: "ERCO Quintessence LED Downlight — 3000K, 90 CRI, Narrow Flood, Matte White",
        category: "Downlights",
        quantity: 48,
        unitCost: "485.00",
        totalCost: "23280.00",
        status: "ordered",
        orderStatus: "In production — ETA 3/28",
        notes: "Specified for food hall main floor. Confirm ceiling height 14ft clear.",
        sortOrder: 1,
        createdBy: adminId,
      },
      {
        projectId,
        manufacturerId: usaiId,
        manufacturerName: "USAI Lighting",
        modelNumber: "USAI-BeveLED-4",
        description: "USAI BeveLED 4\" Adjustable Accent — 2700K, 95 CRI, Bronze Trim",
        category: "Accent Lighting",
        quantity: 36,
        unitCost: "320.00",
        totalCost: "11520.00",
        status: "approved",
        orderStatus: "Pending order — awaiting final count from GC",
        notes: "Over vendor stalls. GC to confirm exact stall layout by 3/15.",
        sortOrder: 2,
        createdBy: adminId,
      },
      {
        projectId,
        manufacturerId: lumenpulseId,
        manufacturerName: "Lumenpulse",
        modelNumber: "LPF-R-MICRO-1",
        description: "Lumenpulse Lumenline Micro 1\" Linear LED — 3000K, 80 CRI, Recessed, White",
        category: "Linear / Cove",
        quantity: 320,
        unitCost: "42.00",
        totalCost: "13440.00",
        status: "shipped",
        orderStatus: "Shipped 3/8 — tracking #1Z999AA10123456784",
        notes: "Cove lighting around perimeter. 320 linear feet total. Verify dimming compatibility with ETC Unison.",
        sortOrder: 3,
        createdBy: adminId,
      },
      {
        projectId,
        manufacturerId: ercoId,
        manufacturerName: "ERCO Lighting",
        modelNumber: "ERCO-57520",
        description: "ERCO Parscan LED Track Spotlight — 3000K, 90 CRI, Black, 15° Spot",
        category: "Track Lighting",
        quantity: 24,
        unitCost: "610.00",
        totalCost: "14640.00",
        status: "ordered",
        orderStatus: "Ordered 2/22 — ETA 4/5",
        notes: "Rooftop terrace accent track. Confirm IP rating for exterior use — ERCO confirmed IP65.",
        sortOrder: 4,
        createdBy: adminId,
      },
      {
        projectId,
        manufacturerId: usaiId,
        manufacturerName: "USAI Lighting",
        modelNumber: "USAI-WallWash-6",
        description: "USAI 6\" Wall Wash Module — 3000K, 90 CRI, Adjustable, Matte White",
        category: "Wall Wash",
        quantity: 18,
        unitCost: "395.00",
        totalCost: "7110.00",
        status: "approved",
        orderStatus: "Pending order",
        notes: "Feature wall wash at main entrance and bar area.",
        sortOrder: 5,
        createdBy: adminId,
      },
      {
        projectId,
        manufacturerId: lumenpulseId,
        manufacturerName: "Lumenpulse",
        modelNumber: "LPF-PENDANT-ROUND",
        description: "Lumenpulse Round Pendant — 2700K, 90 CRI, 18\" Diameter, Aged Brass",
        category: "Pendants",
        quantity: 12,
        unitCost: "875.00",
        totalCost: "10500.00",
        status: "specified",
        orderStatus: "Awaiting architect approval",
        notes: "Statement pendants over communal dining tables. Architect reviewing alternate finish options.",
        sortOrder: 6,
        createdBy: adminId,
      },
      {
        projectId,
        manufacturerName: "Lutron Electronics",
        modelNumber: "LUTRON-GRAFIK-T",
        description: "Lutron Grafik T Wireless Dimmer System — 0–10V, 8-zone, With Pico Remotes",
        category: "Controls",
        quantity: 4,
        unitCost: "1850.00",
        totalCost: "7400.00",
        status: "ordered",
        orderStatus: "Ordered — ETA 3/20",
        notes: "Dimming control for all zones. Electrician to coordinate programming schedule.",
        sortOrder: 7,
        createdBy: adminId,
      },
      {
        projectId,
        manufacturerName: "Visa Lighting",
        modelNumber: "VISA-EXTERIOR-STEP",
        description: "Visa Exterior Step Light — 3000K, IP65, Dark Bronze, 4W",
        category: "Exterior",
        quantity: 22,
        unitCost: "185.00",
        totalCost: "4070.00",
        status: "delivered",
        orderStatus: "Delivered 3/5 — stored on site",
        notes: "Rooftop terrace step and path lighting. Delivered and on site with GC.",
        sortOrder: 8,
        createdBy: adminId,
      },
    ]);

    // ── 6. Milestones ─────────────────────────────────────────────────────────
    const ms = (daysOffset: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() + daysOffset);
      return d;
    };

    await db.insert(milestones).values([
      {
        projectId,
        name: "Quote Approved by Client",
        type: "quote_approved",
        targetDate: ms(-30),
        actualDate: ms(-30),
        status: "complete",
        notes: "Claire Fontaine (BKSK) signed off on full scope and budget on 2/11.",
        sortOrder: 1,
        createdBy: adminId,
      },
      {
        projectId,
        name: "Purchase Orders Issued",
        type: "order_placed",
        targetDate: ms(-20),
        actualDate: ms(-18),
        status: "complete",
        notes: "All POs issued to ERCO, USAI, and Lumenpulse. Lutron PO issued same day.",
        sortOrder: 2,
        createdBy: adminId,
      },
      {
        projectId,
        name: "Lumenpulse Linear Delivery",
        type: "shipped",
        targetDate: ms(5),
        actualDate: ms(-5),
        status: "complete",
        notes: "Delivered early. Stored in GC's on-site storage. Ray Tillman confirmed receipt.",
        sortOrder: 3,
        createdBy: adminId,
      },
      {
        projectId,
        name: "ERCO Downlights Delivery",
        type: "delivered",
        targetDate: ms(15),
        status: "on_track",
        notes: "ERCO confirmed ship date 3/25. Expect delivery week of 3/28.",
        sortOrder: 4,
        createdBy: adminId,
      },
      {
        projectId,
        name: "Rough-In Inspection Complete",
        type: "custom",
        targetDate: ms(20),
        status: "on_track",
        notes: "Electrician (Harmon Electric) to complete rough-in by 4/2. City inspection scheduled.",
        sortOrder: 5,
        createdBy: adminId,
      },
      {
        projectId,
        name: "Fixture Installation Complete",
        type: "installed",
        targetDate: ms(38),
        status: "pending",
        notes: "Installation crew from Harmon Electric. Estimated 5-day install window starting 4/15.",
        sortOrder: 6,
        createdBy: adminId,
      },
      {
        projectId,
        name: "Final Walkthrough & Punch List",
        type: "custom",
        targetDate: ms(48),
        status: "pending",
        notes: "SLS PM, Architect, and GC walkthrough. Punch list items to be resolved within 5 business days.",
        sortOrder: 7,
        createdBy: adminId,
      },
      {
        projectId,
        name: "Project Closeout",
        type: "project_complete",
        targetDate: ms(58),
        status: "pending",
        notes: "Final invoice, as-built drawings, and warranty documentation to be submitted.",
        sortOrder: 8,
        createdBy: adminId,
      },
    ]);

    // ── 7. Budget items ───────────────────────────────────────────────────────
    await db.insert(budgetItems).values([
      {
        projectId,
        description: "Architectural Downlights (ERCO Quintessence)",
        category: "Fixtures",
        originalAmount: "23280.00",
        currentAmount: "23280.00",
        type: "original",
        createdBy: adminId,
      },
      {
        projectId,
        description: "Accent & Wall Wash Fixtures (USAI)",
        category: "Fixtures",
        originalAmount: "18630.00",
        currentAmount: "18630.00",
        type: "original",
        createdBy: adminId,
      },
      {
        projectId,
        description: "Linear Cove & Pendant Fixtures (Lumenpulse)",
        category: "Fixtures",
        originalAmount: "23940.00",
        currentAmount: "23940.00",
        type: "original",
        createdBy: adminId,
      },
      {
        projectId,
        description: "Track & Exterior Fixtures (ERCO + Visa)",
        category: "Fixtures",
        originalAmount: "18710.00",
        currentAmount: "18710.00",
        type: "original",
        createdBy: adminId,
      },
      {
        projectId,
        description: "Lutron Dimming Controls System",
        category: "Controls",
        originalAmount: "7400.00",
        currentAmount: "7400.00",
        type: "original",
        createdBy: adminId,
      },
      {
        projectId,
        description: "Electrical Labor (Harmon Electric)",
        category: "Labor",
        originalAmount: "142000.00",
        currentAmount: "142000.00",
        type: "original",
        createdBy: adminId,
      },
      {
        projectId,
        description: "SLS Project Management & Coordination",
        category: "Services",
        originalAmount: "18500.00",
        currentAmount: "18500.00",
        type: "original",
        createdBy: adminId,
      },
      {
        projectId,
        description: "Freight & Delivery",
        category: "Logistics",
        originalAmount: "3200.00",
        currentAmount: "3200.00",
        type: "original",
        createdBy: adminId,
      },
      {
        projectId,
        description: "CO-001: Added rooftop terrace step lights (22 units)",
        category: "Fixtures",
        originalAmount: "0.00",
        currentAmount: "4070.00",
        type: "change_order",
        notes: "Scope added after initial quote. Approved by owner 2/28.",
        createdBy: adminId,
      },
      {
        projectId,
        description: "CO-002: Upgraded pendant finish to Aged Brass (12 units)",
        category: "Fixtures",
        originalAmount: "0.00",
        currentAmount: "1740.00",
        type: "change_order",
        notes: "Architect requested finish upgrade. Delta $145/unit x 12.",
        createdBy: adminId,
      },
    ]);

    // ── 8. Change orders ──────────────────────────────────────────────────────
    await db.insert(changeOrders).values([
      {
        projectId,
        number: "CO-001",
        title: "Add Rooftop Terrace Step Lighting",
        description:
          "Owner requested addition of 22 Visa Exterior Step Lights along the rooftop terrace perimeter path. Not included in original scope. Adds $4,070 to contract.",
        requestedBy: gcId,
        status: "approved",
        costImpact: "4070.00",
        approvedBy: adminId,
        approvedAt: ms(-14),
      },
      {
        projectId,
        number: "CO-002",
        title: "Pendant Finish Upgrade — Aged Brass",
        description:
          "Architect (BKSK) requested upgrade from standard Matte White to Aged Brass finish on all 12 Lumenpulse pendants. Adds $145/unit ($1,740 total) to contract.",
        requestedBy: archId,
        status: "approved",
        costImpact: "1740.00",
        approvedBy: adminId,
        approvedAt: ms(-10),
      },
      {
        projectId,
        number: "CO-003",
        title: "Add Emergency Egress Lighting — Stairwell B",
        description:
          "City inspector flagged Stairwell B as requiring code-compliant emergency egress lighting. Scope and pricing TBD pending electrician walkthrough.",
        requestedBy: pmId,
        status: "pending_approval",
        costImpact: "2800.00",
      },
    ]);

    // ── 9. Submittals ─────────────────────────────────────────────────────────
    const sub1Due = ms(-5);
    const sub2Due = ms(7);
    const sub3Due = ms(14);

    const [sub1Result] = await db.insert(submittals).values({
      projectId,
      title: "Submittal 01 — ERCO Quintessence Downlights (48 units)",
      description:
        "Product submittal for ERCO Quintessence LED Downlights. Includes cut sheets, photometric data, and energy compliance documentation. Submitted for architect review and approval prior to order placement.",
      submittedBy: pmId,
      reviewedBy: archId,
      status: "approved",
      comments:
        "Approved as submitted. No substitutions. Confirm 3000K color temperature throughout — no mixing with 2700K zones.",
      revisionNumber: 1,
      dueDate: sub1Due,
      reviewedAt: ms(-8),
    });

    await db.insert(submittals).values({
      projectId,
      title: "Submittal 02 — USAI BeveLED Accent Fixtures (36 units)",
      description:
        "Product submittal for USAI BeveLED 4\" adjustable accent fixtures over vendor stalls. Includes cut sheets, aiming diagrams, and trim finish samples. Pending architect review.",
      submittedBy: pmId,
      reviewedBy: archId,
      status: "under_review",
      revisionNumber: 1,
      dueDate: sub2Due,
    });

    await db.insert(submittals).values({
      projectId,
      title: "Submittal 03 — Lumenpulse Pendant Fixtures (12 units)",
      description:
        "Product submittal for Lumenpulse Round Pendant fixtures in Aged Brass finish. Includes updated cut sheets reflecting CO-002 finish change, dimensional drawings, and wiring diagrams.",
      submittedBy: pmId,
      status: "draft",
      revisionNumber: 1,
      dueDate: sub3Due,
    });

    // ── 10. Messages ──────────────────────────────────────────────────────────
    await db.insert(messages).values([
      {
        projectId,
        content:
          "Project kickoff confirmed. BKSK and Brasfield & Gorrie both on board. Marcus, please circulate the updated fixture schedule to Claire by EOD Friday so she can begin submittal review.",
        authorId: pmId,
        createdAt: ms(-28),
      },
      {
        projectId,
        content:
          "Fixture schedule sent to Claire this morning. Also flagged the pendant finish question — she may want to see physical samples before we lock in the order. I'll set up a showroom visit next week.",
        authorId: repId,
        createdAt: ms(-26),
      },
      {
        projectId,
        content:
          "Showroom visit confirmed for 2/20 at 10am. Claire and her associate will be there. Marcus, please have the Lumenpulse and ERCO reps present if possible.",
        authorId: pmId,
        createdAt: ms(-22),
      },
      {
        projectId,
        content:
          "Lumenpulse linear has arrived on site and is stored in the east stairwell storage room. Boxes are labeled and intact. Let me know when you need access for install.",
        authorId: gcId,
        createdAt: ms(-5),
      },
      {
        projectId,
        content:
          "Ray — thanks for the confirmation. Priya, can you update the milestone for Lumenpulse delivery? Also, CO-003 (emergency egress) needs a decision by end of next week or it'll push the rough-in inspection.",
        authorId: repId,
        createdAt: ms(-3),
      },
      {
        projectId,
        content:
          "Milestone updated. On CO-003 — I've requested a scope walkthrough with Harmon Electric for Monday. Will have pricing to the owner by Wednesday. The $2,800 estimate is rough; actual could be higher depending on conduit runs.",
        authorId: pmId,
        createdAt: ms(-2),
      },
    ]);

    // ── 11. Notifications for the current user ────────────────────────────────
    await db.insert(notifications).values([
      {
        userId: adminId,
        projectId,
        type: "submittal_decision",
        title: "Submittal 01 Approved",
        body: "Claire Fontaine (BKSK) approved Submittal 01 — ERCO Quintessence Downlights. Ready to order.",
        isRead: false,
        actionUrl: `/projects/${projectId}?tab=submittals`,
      },
      {
        userId: adminId,
        projectId,
        type: "submittal_decision",
        title: "Submittal 02 Under Review",
        body: "Submittal 02 — USAI BeveLED Accents is now under review by the architect. Due in 7 days.",
        isRead: false,
        actionUrl: `/projects/${projectId}?tab=submittals`,
      },
      {
        userId: adminId,
        projectId,
        type: "change_order",
        title: "CO-003 Pending Approval",
        body: "Change Order 003 (Emergency Egress — Stairwell B, est. $2,800) is awaiting owner approval.",
        isRead: false,
        actionUrl: `/projects/${projectId}?tab=changeorders`,
      },
      {
        userId: adminId,
        projectId,
        type: "milestone_update",
        title: "Milestone Complete: Lumenpulse Delivery",
        body: "Lumenpulse linear fixtures delivered to site and confirmed by GC Ray Tillman.",
        isRead: true,
        actionUrl: `/projects/${projectId}?tab=timeline`,
      },
      {
        userId: adminId,
        projectId,
        type: "budget_change",
        title: "Budget Updated: CO-001 + CO-002 Approved",
        body: "Two change orders approved. Project budget updated from $284,500 to $296,200.",
        isRead: true,
        actionUrl: `/projects/${projectId}?tab=budget`,
      },
    ]);

    // ── 12. Activity log ──────────────────────────────────────────────────────
    await db.insert(activityLog).values([
      { userId: adminId, projectId, action: "demo_seed", entityType: "project", entityId: projectId, details: "Demo data loaded by admin" },
    ]);

    return {
      success: true,
      projectId,
      summary: {
        project: "Ponce City Market — Food Hall Renovation",
        manufacturers: 3,
        teamMembers: 5,
        products: 8,
        milestones: 8,
        budgetItems: 10,
        changeOrders: 3,
        submittals: 3,
        messages: 6,
        notifications: 5,
        totalBudget: "$296,200",
      },
    };
  }),

  /**
   * Remove all demo data (anything tagged with [DEMO] or created by the seed).
   */
  clear: adminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    // Find all demo projects
    const demoProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(like(projects.name, `${DEMO_TAG}%`));

    for (const p of demoProjects) {
      const pid = p.id;
      // Delete all related records
      await db.delete(activityLog).where(eq(activityLog.projectId, pid));
      await db.delete(notifications).where(eq(notifications.projectId, pid));
      await db.delete(messages).where(eq(messages.projectId, pid));
      await db.delete(submittals).where(eq(submittals.projectId, pid));
      await db.delete(changeOrders).where(eq(changeOrders.projectId, pid));
      await db.delete(budgetItems).where(eq(budgetItems.projectId, pid));
      await db.delete(milestones).where(eq(milestones.projectId, pid));
      await db.delete(documents).where(eq(documents.projectId, pid));
      await db.delete(products).where(eq(products.projectId, pid));
      await db.delete(projectTeam).where(eq(projectTeam.projectId, pid));
      await db.delete(projects).where(eq(projects.id, pid));
    }

    // Remove demo manufacturers
    await db.delete(manufacturers).where(like(manufacturers.name, `${DEMO_TAG}%`));

    // Remove demo users (fake openIds starting with "demo-")
    await db.delete(users).where(like(users.openId, "demo-%"));

    return { success: true, removedProjects: demoProjects.length };
  }),

  /**
   * Check if demo data is already loaded.
   */
  status: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const demoProjects = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(like(projects.name, `${DEMO_TAG}%`));
    return { loaded: demoProjects.length > 0, count: demoProjects.length };
  }),
});
