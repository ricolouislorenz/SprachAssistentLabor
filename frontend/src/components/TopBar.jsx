import { CircleDot, Mic, LogOut, ShieldCheck, ShieldAlert } from "lucide-react";

function StatusPill({ tone = "muted", icon: Icon, label }) {
  return (
    <span className={`pill pill-${tone}`}>
      {Icon ? <Icon size={13} aria-hidden="true" /> : null}
      <span>{label}</span>
    </span>
  );
}

export function TopBar({
  listening,
  recording,
  transcribing,
  structuring,
  backendHealthy,
  authEnabled,
  onSignOut
}) {
  return (
    <div className="topbar no-print">
      <div className="topbar-brand">
        <div className="topbar-logo" aria-hidden="true">LK</div>
        <div className="topbar-title-block">
          <div className="topbar-title">Laborassistent · Konrad</div>
          <div className="topbar-subtitle">Sprachgenerierte Prüfberichte</div>
        </div>
      </div>

      <div className="topbar-status">
        {recording ? (
          <StatusPill tone="recording" icon={Mic} label="Aufnahme" />
        ) : listening ? (
          <StatusPill tone="ok" icon={CircleDot} label="Bereit" />
        ) : (
          <StatusPill tone="muted" icon={CircleDot} label="Inaktiv" />
        )}

        {transcribing && <StatusPill tone="busy" label="Transkribiere" />}
        {structuring && <StatusPill tone="busy" label="Strukturiere" />}

        <StatusPill
          tone={backendHealthy ? "ok" : backendHealthy === false ? "danger" : "muted"}
          label={
            backendHealthy === null
              ? "Backend prüfen …"
              : backendHealthy
              ? "Backend ok"
              : "Backend offline"
          }
        />

        {authEnabled && (
          <StatusPill
            tone="ok"
            icon={ShieldCheck}
            label="Geschützt"
          />
        )}
        {authEnabled === false && (
          <StatusPill
            tone="warn"
            icon={ShieldAlert}
            label="Ungeschützt"
          />
        )}

        {onSignOut && (
          <button
            type="button"
            className="ghost"
            onClick={onSignOut}
            aria-label="Abmelden"
          >
            <LogOut size={14} />
            Abmelden
          </button>
        )}
      </div>
    </div>
  );
}
