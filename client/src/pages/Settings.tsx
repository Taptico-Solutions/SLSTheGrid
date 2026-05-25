import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader, GoldButton } from "@/components/SLSComponents";
import { User, Shield, Bell, Info } from "lucide-react";

export default function Settings() {
  const { user, logout } = useAuth();

  return (
    <div className="page-enter">
      <PageHeader title="Settings" subtitle="Account preferences and portal configuration" />
      <div className="p-6 space-y-4 max-w-2xl">
        {/* Profile */}
        <div className="sls-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <User size={16} style={{ color: "#d29c3c" }} />
            <h3 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Profile</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-semibold" style={{ background: "#d29c3c" }}>
              {user?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: "15px", color: "#1b110b" }}>{user?.name ?? "—"}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#7a6e62" }}>{user?.email ?? "—"}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#a09080", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Role: {user?.role?.replace(/_/g," ") ?? "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Access */}
        <div className="sls-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Shield size={16} style={{ color: "#d29c3c" }} />
            <h3 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Access Level</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: "SLS Admin", desc: "Full access to all projects, users, and settings", active: user?.role === "sls_admin" || user?.role === "admin" },
              { label: "SLS Sales Rep", desc: "Access to assigned projects and client communications", active: user?.role === "sls_rep" },
              { label: "SLS Project Manager", desc: "Manage timelines, budgets, and orders", active: user?.role === "sls_pm" },
              { label: "Client Architect/Designer", desc: "View projects and approve submittals", active: user?.role === "client_architect" },
              { label: "Client GC", desc: "View timelines, deliveries, and field notes", active: user?.role === "client_gc" },
            ].map(item => (
              <div key={item.label} className={`flex items-center gap-3 px-4 py-3 rounded-md ${item.active ? "bg-[#f5e9cc]" : "bg-[#fafaf8]"}`} style={{ border: `1px solid ${item.active ? "#d29c3c" : "#f0ebe0"}` }}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.active ? "bg-[#d29c3c]" : "bg-[#e8e3d8]"}`} />
                <div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: item.active ? 600 : 400, color: item.active ? "#1b110b" : "#7a6e62" }}>{item.label}</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#a09080" }}>{item.desc}</div>
                </div>
                {item.active && <span className="ml-auto" style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#d29c3c", textTransform: "uppercase", letterSpacing: "0.06em" }}>Your Role</span>}
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="sls-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Info size={16} style={{ color: "#d29c3c" }} />
            <h3 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em" }}>About This Portal</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: "Portal", value: "Southern Lighting Source Client Portal" },
              { label: "Version", value: "1.0.0" },
              { label: "Built by", value: "Taptico Solutions" },
              { label: "Tagline", value: "On Time. On Budget. Beautiful." },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-4 py-1.5 border-b" style={{ borderColor: "#f0ebe0" }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#a09080", textTransform: "uppercase", letterSpacing: "0.08em", minWidth: "80px" }}>{item.label}</span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#262b2e" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <div className="pt-2">
          <GoldButton onClick={logout}>Sign Out</GoldButton>
        </div>
      </div>
    </div>
  );
}
