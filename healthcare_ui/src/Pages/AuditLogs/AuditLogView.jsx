import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    MdArrowBack,
    MdPerson,
    MdFingerprint,
    MdDevices,
    MdLocationOn,
    MdEventNote,
    MdCheckCircle,
    MdError,
    MdCalendarMonth,
    MdOutlineDataObject,
    MdBadge,
    MdSwapHoriz,
} from "react-icons/md";
import { useAuth } from "../../Context/AuthContext";
import { getAuditLogById } from "../../Services/AuditLogService";
import { APPRoutes } from "../../Utils/Route";
import { formatUtcToLocalDateTime } from "../../Utils/DateTime";
import { toast } from "react-toastify";

const eventLabel = (raw) => raw ? raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

const serializeValue = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === "object") return JSON.stringify(val, null, 2);
    return String(val);
};

const StatusPill = ({ status }) => {
    const ok = status?.toLowerCase() === "success";
    return (
        <span
            className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold"
            style={{
                fontSize: "0.82rem", backgroundColor: ok ? "#dcfce7" : "#fee2e2",
                color: ok ? "#166534" : "#991b1b", }} >
            {ok ? <MdCheckCircle size={15} /> : <MdError size={15} />}
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : "—"}
        </span>
    );
};

const InfoRow = ({ icon: Icon, label, value, mono = false }) => (
    <div className="d-flex align-items-start gap-3 py-3 border-bottom border-light-subtle">
        <span
            className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
            style={{ width: 36, height: 36, background: "linear-gradient(135deg, rgba(39, 89, 197, 0.08) 0%, rgba(39, 89, 197, 0.12) 100%)", color: "#2759c5", }} >
            <Icon size={16} />
        </span>
        <div className="flex-grow-1 min-w-0">
            <div className="small text-muted mb-1">{label}</div>
            <div className={`fw-medium text-dark text-break ${mono ? "font-monospace" : ""}`} style={{ fontSize: "0.9rem" }} >
                {value || "—"}
            </div>
        </div>
    </div>
);

const ValuePanel = ({ label, value, labelColor, bg, border }) => {
    const serialized = serializeValue(value);
    return (
        <div className="p-3 rounded-4 h-100" style={{ backgroundColor: bg, border: `1px solid ${border}` }}>
            <p className="small fw-semibold mb-2" style={{ color: labelColor }}>{label}</p>
            {serialized ? (
                <pre className="mb-0 text-secondary font-monospace" style={{ fontSize: "0.82rem", whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}>
                    {serialized}
                </pre>
            ) : (
                <em className="text-muted" style={{ fontSize: "0.88rem" }}>None</em>
            )}
        </div>
    );
};

const SectionCard = ({ title, icon: Icon, children, accentColor = "#1f3b8a" }) => (
    <div className="hc-surface h-100" style={{ borderTop: `3px solid ${accentColor}`, overflow: "hidden" }}>
        <div className="px-4 pt-4 pb-2 d-flex align-items-center gap-2">
            <span
                className="d-inline-flex align-items-center justify-content-center rounded-3"
                style={{ width: 34, height: 34, backgroundColor: `${accentColor}15`, color: accentColor, }} >
                <Icon size={18} />
            </span>
            <h6 className="fw-bold mb-0" style={{ color: accentColor }}>
                {title}
            </h6>
        </div>
        <div className="px-4 pb-3">{children}</div>
    </div>
);

const ViewSkeleton = () => (
    <div className="container-fluid py-4 hc-page-bg">
        <div className="d-flex gap-2 mb-3">
            <div className="skeleton" style={{ height: 40, width: 110, borderRadius: 999 }} />
        </div>
        <div className="p-4 mb-4 hc-surface">
            <div className="skeleton mb-3" style={{ height: 28, width: "55%", borderRadius: 8 }} />
            <div className="skeleton mb-2" style={{ height: 18, width: "35%", borderRadius: 6 }} />
            <div className="skeleton" style={{ height: 18, width: "20%", borderRadius: 6 }} />
        </div>
        <div className="row g-4">
            {[1, 2, 3].map((i) => (
                <div className="col-lg-4" key={i}>
                    <div className="skeleton" style={{ height: 220, borderRadius: 16, width: "100%" }} />
                </div>
            ))}
            <div className="col-12">
                <div className="skeleton" style={{ height: 160, borderRadius: 16, width: "100%" }} />
            </div>
        </div>
    </div>
);

export default function AuditLogView() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { token } = useAuth();

    const [log, setLog] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!token || !id) return;
        (async () => {
            try {
                setLoading(true);
                const res = await getAuditLogById(id, token);
                if (res?.is_success) {
                    setLog(res.data);
                } else if (res?.is_success === false && res?.status_code === 500) {
                    toast.error("Internal Server Error. Please Contact Support Team.");
                } else {
                    toast.error(res?.message || "Failed to load audit log");
                }
            } catch (err) {
                console.error(err);
                toast.error("An error occurred while loading audit log");
            } finally {
                setLoading(false);
            }
        })();
    }, [token, id]);

    if (loading) return <ViewSkeleton />;

    if (!log) {
        return (
            <div className="container-fluid py-4">
                <div className="p-4 hc-surface">
                    <h5 className="mb-2">Audit log not found</h5>
                    <p className="text-muted mb-3">The requested audit log entry could not be loaded.</p>
                    <button type="button" className="btn btn-outline-primary" onClick={() => navigate(APPRoutes.AUDIT_LOGS)} >
                        Back to Audit Logs
                    </button>
                </div>
            </div>
        );
    }

    const meta = log.Metadata || {};
    const createdLocal = formatUtcToLocalDateTime(log.CreatedOn);
    const metaTimestampLocal = formatUtcToLocalDateTime(meta.timestamp);
    const hasChange = meta.old_value || meta.new_value;

    return (
        <div className="container-fluid py-4"> 
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
                <button type="button" className="btn btn-light fw-semibold border shadow-sm d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill" onClick={() => navigate(APPRoutes.AUDIT_LOGS)} style={{ minHeight: 40 }} >
                    <MdArrowBack size={18} />
                    <span>Back</span>
                </button>

                <span className="small text-muted">
                    Log ID &nbsp;<strong className="hc-text-primary">#{log.Id}</strong>
                </span>
            </div>
 
            <div className="p-4 p-lg-5 mb-4 overflow-hidden hc-hero-banner hc-hero-banner-primary">
                <div aria-hidden="true" className="hc-hero-circle-tr" />
                <div aria-hidden="true" className="hc-hero-circle-bl" />

                <div className="row g-4 align-items-center position-relative">
                    <div className="col-lg-8">
                        <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                            <StatusPill status={meta.status} />
                            <span
                                className="px-3 py-2 rounded-pill fw-semibold"
                                style={{fontSize: "0.82rem", backgroundColor: "rgba(255,255,255,0.15)", color: "#fff", }} >
                                {log.ResourceType || "—"}
                            </span>
                            <span
                                className="px-3 py-2 rounded-pill"
                                style={{fontSize: "0.82rem", backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)", }} >
                                {log.ActorType || "—"}
                            </span>
                        </div>

                        <h2 className="fw-bold text-white mb-2" style={{ fontSize: "clamp(1.45rem, 2.2vw, 2rem)", lineHeight: 1.2 }} >
                            {eventLabel(log.Event)}
                        </h2>

                        {meta.description && (
                            <p style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.95rem", marginBottom: 0 }}>
                                {meta.description}
                            </p>
                        )}
                    </div>

                    <div className="col-lg-4">
                        <div className="p-3 rounded-4 text-center" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} >
                            <p className="mb-1 small" style={{ color: "rgba(255,255,255,0.65)" }}>
                                Performed by
                            </p>
                            <p className="fw-bold text-white mb-1" style={{ fontSize: "1.05rem" }}>
                                {log.UserName || "—"}
                            </p>
                            <p className="mb-3 small" style={{ color: "rgba(255,255,255,0.65)" }}>
                                {log.RoleName || "—"}
                            </p>
                            <hr style={{ borderColor: "rgba(255,255,255,0.15)" }} />
                            <p className="mb-1 small" style={{ color: "rgba(255,255,255,0.65)" }}>
                                <MdCalendarMonth size={13} className="me-1" />
                                Recorded at
                            </p>
                            <p className="fw-semibold text-white mb-0" style={{ fontSize: "0.88rem" }}>
                                {createdLocal}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
 
            <div className="row g-4 mb-4"> 
                <div className="col-lg-4">
                    <SectionCard title="Actor Details" icon={MdPerson} accentColor="#2759c5">
                        <InfoRow icon={MdPerson} label="User Name" value={log.UserName} />
                        <InfoRow icon={MdBadge} label="Role" value={log.RoleName} />
                        <InfoRow icon={MdBadge} label="Actor Type" value={log.ActorType} />
                        <InfoRow icon={MdFingerprint} label="Actor ID" value={log.ActorId} mono />
                    </SectionCard>
                </div>
 
                <div className="col-lg-4">
                    <SectionCard title="Resource Details" icon={MdOutlineDataObject} accentColor="#2759c5">
                        <InfoRow icon={MdEventNote} label="Event" value={eventLabel(log.Event)} />
                        <InfoRow icon={MdOutlineDataObject} label="Resource Type" value={log.ResourceType} />
                        <InfoRow icon={MdFingerprint} label="Resource ID" value={log.ResourceId} mono />
                        <InfoRow icon={MdCalendarMonth} label="Timestamp" value={metaTimestampLocal} />
                    </SectionCard>
                </div>
 
                <div className="col-lg-4">
                    <SectionCard title="Network & Client" icon={MdDevices} accentColor="#2759c5">
                        <InfoRow icon={MdLocationOn} label="IP Address" value={meta.ip_address} mono />
                        <InfoRow icon={MdDevices} label="User Agent" value={meta.user_agent} />
                    </SectionCard>
                </div>
            </div>
 
            {hasChange && (
                <div className="hc-surface hc-card-primary p-4 p-lg-5">
                    <div className="d-flex align-items-center gap-2 mb-4">
                        <span
                            className="d-inline-flex align-items-center justify-content-center rounded-3"
                            style={{ width: 34, height: 34, backgroundColor: "rgba(39, 89, 197, 0.08)", color: "#2759c5" }}
                        >
                            <MdSwapHoriz size={18} />
                        </span>
                        <h6 className="fw-bold mb-0" style={{ color: "#2759c5" }}>
                            Value Change
                        </h6>
                    </div>

                    <div className="row g-4">
                        <div className="col-md-6">
                            <ValuePanel label="Old Value" value={meta.old_value} labelColor="#991b1b" bg="#fff7f7" border="#fecaca" />
                        </div>
                        <div className="col-md-6">
                            <ValuePanel label="New Value" value={meta.new_value} labelColor="#166534" bg="#f0fdf4" border="#bbf7d0" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}