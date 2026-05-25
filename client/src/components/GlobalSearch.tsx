import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Search, FileText, CheckSquare, FolderOpen, X, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Status badge colours ──────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:          { bg: "#dcfce7", text: "#166534" },
  complete:        { bg: "#dbeafe", text: "#1e40af" },
  approved:        { bg: "#dcfce7", text: "#166534" },
  rejected:        { bg: "#fee2e2", text: "#991b1b" },
  draft:           { bg: "#f3f4f6", text: "#6b7280" },
  submitted:       { bg: "#fef9c3", text: "#854d0e" },
  under_review:    { bg: "#fef9c3", text: "#854d0e" },
  needs_revision:  { bg: "#ffedd5", text: "#9a3412" },
  intake:          { bg: "#f3f4f6", text: "#6b7280" },
  archived:        { bg: "#f3f4f6", text: "#6b7280" },
};

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const c = STATUS_COLORS[status] ?? { bg: "#f3f4f6", text: "#6b7280" };
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ml-1.5 shrink-0"
      style={{ background: c.bg, color: c.text }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 280);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery("");
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const { data, isFetching } = trpc.search.global.useQuery(
    { query: debouncedQuery },
    {
      enabled: debouncedQuery.length >= 2,
      staleTime: 10_000,
    }
  );

  const totalResults =
    (data?.projects.length ?? 0) +
    (data?.documents.length ?? 0) +
    (data?.submittals.length ?? 0);

  const hasQuery = debouncedQuery.length >= 2;

  function go(path: string) {
    navigate(path);
    onClose();
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: "rgba(27,17,11,0.55)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed z-50 left-1/2 top-[12vh] w-full max-w-xl -translate-x-1/2 rounded-xl overflow-hidden"
        style={{
          background: "#fff",
          boxShadow: "0 24px 64px rgba(27,17,11,0.22), 0 4px 16px rgba(27,17,11,0.10)",
          border: "1.5px solid #e6dec2",
          fontFamily: "Inter, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input row */}
        <div
          className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: "1px solid #e6dec2" }}
        >
          {isFetching ? (
            <Loader2 size={17} className="shrink-0 animate-spin" style={{ color: "#d29c3c" }} />
          ) : (
            <Search size={17} className="shrink-0" style={{ color: "#d29c3c" }} />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, documents, submittals…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "#1b110b" }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-0.5 rounded hover:bg-[#f5f0e8] transition-colors"
            >
              <X size={14} style={{ color: "#7a6e62" }} />
            </button>
          )}
          <kbd
            className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
            style={{ background: "#f5f0e8", color: "#7a6e62", border: "1px solid #e6dec2" }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!hasQuery && (
            <div className="px-5 py-8 text-center text-sm" style={{ color: "#7a6e62" }}>
              Type at least 2 characters to search across projects, documents, and submittals.
            </div>
          )}

          {hasQuery && !isFetching && totalResults === 0 && (
            <div className="px-5 py-8 text-center text-sm" style={{ color: "#7a6e62" }}>
              No results found for <strong style={{ color: "#1b110b" }}>"{debouncedQuery}"</strong>
            </div>
          )}

          {/* Projects */}
          {(data?.projects.length ?? 0) > 0 && (
            <section>
              <div
                className="px-4 py-2 text-[10px] font-semibold tracking-widest uppercase"
                style={{ background: "#fdf8ef", color: "#7a6e62", borderBottom: "1px solid #f0ece3" }}
              >
                Projects
              </div>
              {data!.projects.map((p) => (
                <button
                  key={p.id}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#fdf8ef] transition-colors"
                  style={{ borderBottom: "1px solid #f8f5ee" }}
                  onClick={() => go(`/projects/${p.id}`)}
                >
                  <FolderOpen size={15} className="shrink-0" style={{ color: "#d29c3c" }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-medium text-sm truncate" style={{ color: "#1b110b" }}>
                        {p.name}
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                    {(p.city || p.buildingType) && (
                      <div className="text-xs mt-0.5 truncate" style={{ color: "#7a6e62" }}>
                        {[p.buildingType, p.city, p.state].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </section>
          )}

          {/* Documents */}
          {(data?.documents.length ?? 0) > 0 && (
            <section>
              <div
                className="px-4 py-2 text-[10px] font-semibold tracking-widest uppercase"
                style={{ background: "#fdf8ef", color: "#7a6e62", borderBottom: "1px solid #f0ece3" }}
              >
                Documents
              </div>
              {data!.documents.map((d) => (
                <button
                  key={d.id}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#fdf8ef] transition-colors"
                  style={{ borderBottom: "1px solid #f8f5ee" }}
                  onClick={() => go(d.projectId ? `/projects/${d.projectId}?tab=documents` : "/documents")}
                >
                  <FileText size={15} className="shrink-0" style={{ color: "#d29c3c" }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-medium text-sm truncate" style={{ color: "#1b110b" }}>
                        {d.name}
                      </span>
                      <StatusBadge status={d.status} />
                    </div>
                    {d.projectName && (
                      <div className="text-xs mt-0.5 truncate" style={{ color: "#7a6e62" }}>
                        {d.projectName} · {d.type?.replace(/_/g, " ")}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </section>
          )}

          {/* Submittals */}
          {(data?.submittals.length ?? 0) > 0 && (
            <section>
              <div
                className="px-4 py-2 text-[10px] font-semibold tracking-widest uppercase"
                style={{ background: "#fdf8ef", color: "#7a6e62", borderBottom: "1px solid #f0ece3" }}
              >
                Submittals
              </div>
              {data!.submittals.map((s) => (
                <button
                  key={s.id}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#fdf8ef] transition-colors"
                  style={{ borderBottom: "1px solid #f8f5ee" }}
                  onClick={() => go(s.projectId ? `/projects/${s.projectId}?tab=submittals` : "/submittals")}
                >
                  <CheckSquare size={15} className="shrink-0" style={{ color: "#d29c3c" }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-medium text-sm truncate" style={{ color: "#1b110b" }}>
                        {s.title}
                      </span>
                      <StatusBadge status={s.status} />
                    </div>
                    {s.projectName && (
                      <div className="text-xs mt-0.5 truncate" style={{ color: "#7a6e62" }}>
                        {s.projectName}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </section>
          )}

          {/* Footer hint */}
          {hasQuery && totalResults > 0 && (
            <div
              className="px-4 py-2 text-[10px] text-center"
              style={{ color: "#b0a898", borderTop: "1px solid #f0ece3" }}
            >
              Click a result to navigate · Press ESC to close
            </div>
          )}
        </div>
      </div>
    </>
  );
}
