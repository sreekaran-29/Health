import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
    MdArrowBack,
    MdEdit,
    MdCheckCircle,
    MdPauseCircle,
    MdCalendarMonth,
    MdBusiness,
    MdDescription,
    MdPerson,
} from "react-icons/md";
import { useAuth } from "../../Context/AuthContext";
import { getServiceById } from "../../Services/ServicesService";
import { APPRoutes } from "../../Utils/Route";
import { formatUtcToLocalDateTime } from "../../Utils/DateTime";
import { toast } from "react-toastify";


const STATUS_STYLE = {
    Active: { backgroundColor: "#dcfce7", color: "#16a34a" },
    Inactive: { backgroundColor: "#f1f3f5", color: "#6b7280" },
};

export default function ServicesView() {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const { token } = useAuth();

    const [service, setService] = React.useState(location.state?.service || null);
    const [loading, setLoading] = React.useState(!location.state?.service);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await getServiceById(token, id);
            if (res?.is_success) {
                setService(res.data);
            } else if(res?.is_success === false && res?.status_code === 500) {
                toast.error('Internal Server Error. Please Contact Support Team.');
                setService(null);
            } else {
                toast.error(res?.message || "Failed to load service");
                setService(null);
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || "Failed to load service");
            setService(null);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (!token || !id) return;
        if (!location.state?.service) {
            loadData();
        }
    }, [token, id]);

    const statusName = service?.Status || "Unknown";
    const createdOnLocal = React.useMemo(
        () => formatUtcToLocalDateTime(service?.CreatedOn),
        [service?.CreatedOn]
    );
    const modifiedOnLocal = React.useMemo(
        () => formatUtcToLocalDateTime(service?.ModifiedOn),
        [service?.ModifiedOn]
    );

    if (loading) {
        return (
            <div className="container-fluid py-4">
                <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
                    <div className="skeleton" style={{ height: 40, width: 110, borderRadius: 999 }} />
                    <div className="skeleton" style={{ height: 40, width: 120, borderRadius: 10 }} />
                </div>
                <div className="p-3 p-lg-4 mb-4 hc-surface overflow-hidden">
                    <div className="row g-4 g-xl-5 align-items-stretch">
                        <div className="col-xl-9">
                            <div className="d-flex flex-column flex-md-row align-items-center align-items-md-start gap-4 h-100">
                                <div className="skeleton" style={{ width: 124, height: 124, borderRadius: 28 }} />
                                <div className="flex-grow-1 w-100">
                                    <div className="d-flex gap-2 mb-3">
                                        <div className="skeleton" style={{ height: 28, width: 86, borderRadius: 8 }} />
                                        <div className="skeleton" style={{ height: 28, width: 64, borderRadius: 8 }} />
                                    </div>
                                    <div className="skeleton mb-2" style={{ height: 38, width: "72%", borderRadius: 10 }} />
                                    <div className="skeleton mb-1" style={{ height: 16, width: "86%", borderRadius: 8 }} />
                                    <div className="skeleton mb-3" style={{ height: 16, width: "58%", borderRadius: 8 }} />
                                    <div className="skeleton mb-2" style={{ height: 20, width: 110, borderRadius: 8 }} />
                                    <div className="row g-3">
                                        <div className="col-12 col-md-6">
                                            <div className="skeleton" style={{ height: 86, width: "100%", borderRadius: 16 }} />
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <div className="skeleton" style={{ height: 86, width: "100%", borderRadius: 16 }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-3">
                            <div className="skeleton h-100" style={{ borderRadius: 16, minHeight: 220 }} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!service) {
        return (
            <div className="container-fluid py-4">
                <div className="p-4 hc-surface">
                    <h5 className="mb-2">Service not found</h5>
                    <p className="text-muted mb-3">The requested service details could not be loaded.</p>
                    <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={() => navigate(APPRoutes.SERVICES)}
                    >
                        Back to Services
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4">
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
                <button
                    type="button"
                    className="btn btn-light fw-semibold border shadow-sm d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill"
                    onClick={() => navigate(APPRoutes.SERVICES)}
                    style={{ minHeight: 40 }}
                >
                    <MdArrowBack size={18} />
                    <span>Back</span>
                </button>
            </div>

            <div className="p-4 p-lg-5 mb-4 overflow-hidden hc-hero-banner hc-hero-banner-primary">
                <div aria-hidden="true" className="hc-hero-circle-tr" />
                <div aria-hidden="true" className="hc-hero-circle-bl" />
                <div className="row g-4 align-items-center position-relative">
                    <div className="col-lg-8">
                        <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                            <span
                                className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold"
                                style={{ fontSize: "0.82rem", backgroundColor: STATUS_STYLE[statusName]?.backgroundColor || "#f3f4f6", color: STATUS_STYLE[statusName]?.color || "#4b5563" }}
                            >
                                {statusName}
                            </span>
                            {service.Client ? (
                                <span
                                    className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold"
                                    style={{ fontSize: "0.82rem", backgroundColor: "rgba(255,255,255,0.12)", color: "#fff" }}
                                >
                                    {service.Client}
                                </span>
                            ) : null}
                        </div>
                        <h2 className="fw-bold text-white mb-2" style={{ fontSize: "clamp(1.45rem, 2.2vw, 2rem)" }}>
                            {service.Name || "-"}
                        </h2>
                        <p className="mb-1" style={{ color: "rgba(255,255,255,0.78)", fontSize: "0.95rem" }}>
                           {service.Description || "-"}
                        </p>
                        {/* <p className="mb-1" style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.88rem" }}>
                            <MdBusiness size={14} className="me-1" />{service.Client || "Global Service"}
                        </p> */}
                    </div>
                    <div className="col-lg-4">
                        <div className="p-3 rounded-4" style={{ backgroundColor: "rgba(255,255,255,0.10)" }}>
                            <p className="mb-1 small" style={{ color: "rgba(255,255,255,0.65)" }}>
                                Service ID
                            </p>
                            <p className="fw-semibold text-white  text-break" style={{ fontSize: "0.85rem" }}>
                                #{service.Id || "-"}
                            </p>
                            <p className="mb-0 text-white">
                                <span style={{ color: "rgba(255,255,255,0.65)" }}>Estimated Time:</span> <b>{service.EstimatedServiceTime ? `${service.EstimatedServiceTime} min` : '-'}</b>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4 mb-4">
                <div className="col-12">
                    <div className="p-4 p-lg-5 hc-surface hc-card-primary">
                        <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 hc-text-primary">
                            <MdPerson size={22} className="hc-text-primary" /> Audit Info
                        </h5>
                        <div className="row g-3">
                            <div className="col-12 col-md-6">
                                <div className="h-100 d-flex align-items-center gap-3 px-3 py-3 rounded-4 bg-light border">
                                    <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white border" style={{ width: 40, height: 40 }}>
                                        <MdPerson size={18} className="hc-text-primary" />
                                    </span>
                                    <div className="text-start">
                                        <div className="small text-muted">Created By</div>
                                        <div className="fw-medium text-dark">{service.CreatedBy || "-"}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-12 col-md-6">
                                <div className="h-100 d-flex align-items-center gap-3 px-3 py-3 rounded-4 bg-light border">
                                    <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white border" style={{ width: 40, height: 40 }}>
                                        <MdCalendarMonth size={18} className="hc-text-primary" />
                                    </span>
                                    <div className="text-start">
                                        <div className="small text-muted">Created On</div>
                                        <div className="fw-medium text-dark">{createdOnLocal}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-12 col-md-6">
                                <div className="h-100 d-flex align-items-center gap-3 px-3 py-3 rounded-4 bg-light border">
                                    <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white border" style={{ width: 40, height: 40 }}>
                                        <MdPerson size={18} className="hc-text-primary" />
                                    </span>
                                    <div className="text-start">
                                        <div className="small text-muted">Modified By</div>
                                        <div className="fw-medium text-dark">{service.ModifiedBy || "-"}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-12 col-md-6">
                                <div className="h-100 d-flex align-items-center gap-3 px-3 py-3 rounded-4 bg-light border">
                                    <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white border" style={{ width: 40, height: 40 }}>
                                        <MdCalendarMonth size={18} className="hc-text-primary" />
                                    </span>
                                    <div className="text-start">
                                        <div className="small text-muted">Modified On</div>
                                        <div className="fw-medium text-dark">{modifiedOnLocal}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

