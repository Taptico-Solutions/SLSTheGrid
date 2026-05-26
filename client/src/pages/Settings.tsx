import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader, GoldButton } from "@/components/SLSComponents";
import { trpc } from "@/lib/trpc";
import { User, Shield, Info, Save, CheckCircle2, AlertCircle, Camera, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// ── Role display helpers ──────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  sls_admin:        { label: "SLS Admin",                  desc: "Full access to all projects, users, and settings",         color: "#d29c3c" },
  admin:            { label: "SLS Admin",                  desc: "Full access to all projects, users, and settings",         color: "#d29c3c" },
  sls_rep:          { label: "SLS Sales Rep",              desc: "Access to assigned projects and client communications",    color: "#6b8fa3" },
  sls_pm:           { label: "SLS Project Manager",        desc: "Manage timelines, budgets, and orders",                   color: "#7a9a6b" },
  client_architect: { label: "Client Architect / Designer", desc: "View projects and approve submittals",                   color: "#9a7ab5" },
  client_gc:        { label: "Client GC",                  desc: "View timelines, deliveries, and field notes",             color: "#b58a4a" },
  taptico:          { label: "Taptico Team",               desc: "Internal Taptico workspace access",                       color: "#e05a5a" },
  user:             { label: "Portal User",                desc: "Read-only access to assigned content",                    color: "#888"    },
};

export function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}

// ── Shared AvatarDisplay — used here and importable by sidebar ────────────────
export function AvatarDisplay({
  name,
  avatarUrl,
  size = 56,
  className = "",
}: {
  name?: string | null;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const showImage = avatarUrl && !imgError;

  return (
    <div
      className={`rounded-full flex-shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={avatarUrl}
          alt="Avatar"
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center text-white font-bold select-none"
          style={{
            background: "linear-gradient(135deg, #d29c3c 0%, #b8832a 100%)",
            fontSize: size * 0.36,
          }}
        >
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}

// ── Clickable avatar with upload overlay ─────────────────────────────────────
function UploadableAvatar({
  name,
  avatarUrl,
  previewUrl,
  uploading,
  onFileSelected,
  onRemove,
  size = 72,
}: {
  name?: string | null;
  avatarUrl?: string | null;
  previewUrl?: string | null;
  uploading: boolean;
  onFileSelected: (file: File) => void;
  onRemove: () => void;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayUrl = previewUrl || avatarUrl;
  const [imgError, setImgError] = useState(false);
  const showImage = displayUrl && !imgError;

  // Reset error when URL changes
  useEffect(() => setImgError(false), [displayUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be under 4 MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Please upload a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    onFileSelected(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  return (
    <div className="relative flex-shrink-0 group" style={{ width: size, height: size }}>
      {/* Avatar image / initials */}
      <div
        className="rounded-full overflow-hidden w-full h-full cursor-pointer"
        onClick={() => inputRef.current?.click()}
        title="Click to change photo"
      >
        {showImage ? (
          <img
            src={displayUrl!}
            alt="Avatar"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white font-bold select-none"
            style={{
              background: "linear-gradient(135deg, #d29c3c 0%, #b8832a 100%)",
              fontSize: size * 0.36,
            }}
          >
            {getInitials(name)}
          </div>
        )}
      </div>

      {/* Hover overlay */}
      {!uploading && (
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-150"
          style={{ background: "rgba(27,17,11,0.55)" }}
          onClick={() => inputRef.current?.click()}
        >
          <Camera size={size * 0.28} color="white" />
        </div>
      )}

      {/* Upload spinner */}
      {uploading && (
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center"
          style={{ background: "rgba(27,17,11,0.6)" }}
        >
          <span
            className="border-2 border-white border-t-transparent rounded-full animate-spin"
            style={{ width: size * 0.32, height: size * 0.32 }}
          />
        </div>
      )}

      {/* Remove button (only when avatar is set) */}
      {(avatarUrl || previewUrl) && !uploading && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title="Remove photo"
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white transition-colors duration-150"
          style={{ background: "#c0392b", border: "2px solid white" }}
        >
          <Trash2 size={10} />
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="sls-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <span style={{ color: "#d29c3c" }}>{icon}</span>
        <h3 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "13px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

// ── Field row ─────────────────────────────────────────────────────────────────
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {label}
      </Label>
      {children}
    </div>
  );
}

// ── Main Settings page ────────────────────────────────────────────────────────
export default function Settings() {
  const { user, logout } = useAuth();
  const utils = trpc.useUtils();

  // ── Profile form state ────────────────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState((user as any)?.phone ?? "");
  const [company, setCompany] = useState((user as any)?.company ?? "");
  const [title, setTitle] = useState((user as any)?.title ?? "");
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // ── Avatar state ──────────────────────────────────────────────────────────
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Populate fields once user data loads
  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhone((user as any).phone ?? "");
      setCompany((user as any).company ?? "");
      setTitle((user as any).title ?? "");
    }
  }, [user?.id]);

  const handleChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setIsDirty(true);
    setSaveState("idle");
  };

  // ── Profile save mutation ─────────────────────────────────────────────────
  const updateProfile = trpc.users.updateProfile.useMutation({
    onMutate: () => setSaveState("saving"),
    onSuccess: () => {
      setSaveState("saved");
      setIsDirty(false);
      utils.auth.me.invalidate();
      toast.success("Profile updated successfully.");
      setTimeout(() => setSaveState("idle"), 2500);
    },
    onError: (err) => {
      setSaveState("error");
      toast.error(`Failed to save: ${err.message}`);
    },
  });

  const handleSave = () => {
    updateProfile.mutate({
      name: name.trim() || undefined,
      phone: phone.trim() || undefined,
      company: company.trim() || undefined,
      title: title.trim() || undefined,
    });
  };

  // ── Avatar upload mutation ────────────────────────────────────────────────
  const uploadAvatar = trpc.users.uploadAvatar.useMutation({
    onSuccess: (data) => {
      setAvatarUploading(false);
      setPreviewUrl(null);
      utils.auth.me.invalidate();
      toast.success("Profile photo updated.");
    },
    onError: (err) => {
      setAvatarUploading(false);
      setPreviewUrl(null);
      toast.error(`Upload failed: ${err.message}`);
    },
  });

  const removeAvatar = trpc.users.removeAvatar.useMutation({
    onSuccess: () => {
      setPreviewUrl(null);
      utils.auth.me.invalidate();
      toast.success("Profile photo removed.");
    },
    onError: (err) => toast.error(`Failed to remove photo: ${err.message}`),
  });

  const handleFileSelected = (file: File) => {
    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setAvatarUploading(true);

    // Read as base64 and upload
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // Strip the "data:image/xxx;base64," prefix
      const base64 = dataUrl.split(",")[1];
      uploadAvatar.mutate({
        base64,
        mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    removeAvatar.mutate();
  };

  const roleInfo = ROLE_LABELS[user?.role ?? "user"] ?? ROLE_LABELS.user;

  return (
    <div className="page-enter">
      <PageHeader title="Settings" subtitle="Manage your profile and account preferences" />
      <div className="p-6 space-y-5 max-w-2xl">

        {/* ── Profile Card ─────────────────────────────────────────────────── */}
        <Section icon={<User size={15} />} title="Your Profile">
          {/* Avatar + identity header */}
          <div className="flex items-center gap-5 mb-6 pb-5" style={{ borderBottom: "1px solid #f0ebe0" }}>
            <div className="flex flex-col items-center gap-1.5">
              <UploadableAvatar
                name={name || user?.name}
                avatarUrl={(user as any)?.avatarUrl}
                previewUrl={previewUrl}
                uploading={avatarUploading}
                onFileSelected={handleFileSelected}
                onRemove={handleRemoveAvatar}
                size={72}
              />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#a09080" }}>
                Click to change
              </span>
            </div>
            <div className="min-w-0">
              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: "17px", color: "#1b110b" }}>
                {name || user?.name || "Unnamed User"}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#7a6e62", marginTop: "2px" }}>
                {user?.email ?? "—"}
              </div>
              <span
                className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-white"
                style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", background: roleInfo.color }}
              >
                {roleInfo.label}
              </span>
              <p className="mt-2" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#a09080" }}>
                JPEG, PNG, WebP or GIF · max 4 MB
              </p>
            </div>
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="Full Name">
              <Input
                value={name}
                onChange={handleChange(setName)}
                placeholder="Your full name"
                style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }}
              />
            </FieldRow>

            <FieldRow label="Email Address">
              <Input
                value={user?.email ?? ""}
                readOnly
                disabled
                className="bg-[#fafaf8] cursor-not-allowed opacity-60"
                style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }}
              />
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#a09080" }}>
                Managed by your Manus account.
              </p>
            </FieldRow>

            <FieldRow label="Job Title">
              <Input
                value={title}
                onChange={handleChange(setTitle)}
                placeholder="e.g. Project Manager"
                style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }}
              />
            </FieldRow>

            <FieldRow label="Phone">
              <Input
                value={phone}
                onChange={handleChange(setPhone)}
                placeholder="e.g. 404-555-0100"
                type="tel"
                style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }}
              />
            </FieldRow>

            <FieldRow label="Company / Organization">
              <Input
                value={company}
                onChange={handleChange(setCompany)}
                placeholder="e.g. Southern Lighting Source"
                style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }}
              />
            </FieldRow>
          </div>

          {/* Save button row */}
          <div className="flex items-center gap-3 mt-5 pt-4" style={{ borderTop: "1px solid #f0ebe0" }}>
            <button
              onClick={handleSave}
              disabled={!isDirty || saveState === "saving"}
              className="flex items-center gap-2 px-5 py-2 rounded-md text-white font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "13px",
                background: isDirty ? "#d29c3c" : "#c8bba8",
                border: "none",
              }}
            >
              {saveState === "saving" ? (
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : saveState === "saved" ? (
                <CheckCircle2 size={15} />
              ) : saveState === "error" ? (
                <AlertCircle size={15} />
              ) : (
                <Save size={15} />
              )}
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Error — Retry" : "Save Changes"}
            </button>
            {isDirty && saveState === "idle" && (
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#a09080" }}>
                You have unsaved changes.
              </span>
            )}
          </div>
        </Section>

        {/* ── Access Level ─────────────────────────────────────────────────── */}
        <Section icon={<Shield size={15} />} title="Access Level">
          <div className="space-y-2">
            {Object.entries(ROLE_LABELS)
              .filter(([key]) => key !== "admin" && key !== "taptico")
              .map(([key, info]) => {
                const isActive = user?.role === key || (key === "sls_admin" && user?.role === "admin");
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 px-4 py-3 rounded-md"
                    style={{
                      background: isActive ? "#fdf4e3" : "#fafaf8",
                      border: `1px solid ${isActive ? "#d29c3c" : "#f0ebe0"}`,
                    }}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isActive ? info.color : "#e8e3d8" }} />
                    <div className="min-w-0">
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: isActive ? 600 : 400, color: isActive ? "#1b110b" : "#7a6e62" }}>
                        {info.label}
                      </div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#a09080" }}>
                        {info.desc}
                      </div>
                    </div>
                    {isActive && (
                      <span className="ml-auto flex-shrink-0" style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 700, color: info.color, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        Your Role
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
          <p className="mt-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#a09080" }}>
            Role changes must be made by an SLS Admin.
          </p>
        </Section>

        {/* ── About ────────────────────────────────────────────────────────── */}
        <Section icon={<Info size={15} />} title="About This Portal">
          <div className="space-y-0">
            {[
              { label: "Portal",   value: "The GRID by Southern Lighting Source" },
              { label: "Version",  value: "1.0.0" },
              { label: "Built by", value: "Taptico Solutions" },
              { label: "Tagline",  value: "On Time. On Budget. Beautiful." },
            ].map((item, i, arr) => (
              <div key={item.label} className="flex items-center gap-4 py-2" style={{ borderBottom: i < arr.length - 1 ? "1px solid #f0ebe0" : "none" }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#a09080", textTransform: "uppercase", letterSpacing: "0.08em", minWidth: "80px" }}>
                  {item.label}
                </span>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#262b2e" }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Sign Out ─────────────────────────────────────────────────────── */}
        <div className="pt-1">
          <GoldButton onClick={logout}>Sign Out</GoldButton>
        </div>
      </div>
    </div>
  );
}
