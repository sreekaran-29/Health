import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
    MdCalendarMonth,
    MdArrowBack,
    MdBusiness,
    MdEdit,
    MdEmail,
    MdLocationOn,
    MdPayments,
    MdPhone,
    MdPerson,
    MdSubscriptions,
    MdSettingsSuggest,
} from "react-icons/md";
import { useAuth } from "../../Context/AuthContext";
import { getClientById, getClientLogo } from "../../Services/ClientService";
import ExpandableTransactionPanel from "../../Components/Common/ExpandableTransactionPanel";
import NAV from "../../Utils/MenuData";
import { APPRoutes } from "../../Utils/Route";
import { formatUtcToLocalDateTime } from "../../Utils/DateTime";
import { toast } from "react-toastify";

const STATUS_STYLE = {
    Active: { backgroundColor: "#dcfce7", color: "#166534" },
    Inactive: { backgroundColor: "#f3f4f6", color: "#4b5563" },
    Pending: { backgroundColor: "#e0e7ff", color: "#1d4ed8" },
    Suspended: { backgroundColor: "#fef3c7", color: "#92400e" },
};

const SERVICE_LOOKUP = new Map(
    NAV.map((item) => [
        item.id,
        {
            id: item.id,
            label: item.label,
            description: item.description || "No description available.",
        },
    ])
);

const formatAddress = (address) => {
    if (!address) {
        return "-";
    }

    const pieces = [
        address.Street,
        address.City,
        address.State,
        address.Country,
        address.Zipcode,
    ].filter(Boolean);

    return pieces.length ? pieces.join(", ") : "-";
};

const resolveServiceDetails = (serviceIds) => {
    if (!Array.isArray(serviceIds)) {
        return [];
    }

    return serviceIds.map((serviceId) => (
        SERVICE_LOOKUP.get(serviceId) || {
            id: serviceId,
            label: `Service ${serviceId}`,
            description: "No description available.",
        }
    ));
};

const formatDate = (value) => {
    if (!value) {
        return "-";
    }

    return formatUtcToLocalDateTime(value);
};

const toCurrency = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return "-";
    }

    return `$${Number(value).toLocaleString()}`;
};


export default function ClientView() {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const { token } = useAuth();

    const [client, setClient] = React.useState(location.state?.client || null);
    const [logoSrc, setLogoSrc] = React.useState(null);
    const [loading, setLoading] = React.useState(!location.state?.client);

    const loadData = async () => {
        try {
            setLoading(true);
            const clientRes = await getClientById(id, token);
            if (clientRes?.is_success) {
                setClient(clientRes.data);
            } else if (clientRes?.is_success === false && clientRes?.status_code === 500) {
                toast.error("Internal Server Error. Please Contact Support Team.");
                setClient(null);
            } else {
                toast.error(clientRes?.message || "Failed to load client");
                setClient(null);
            }
        } catch (err) {
            console.error(err);
            setClient(null);
        } finally {
            setLoading(false);
        }
    };

    const loadLogo = async () => {
        try {
            const logoRes = await getClientLogo(id, token);
            if(logoRes?.is_success){
                setLogoSrc(logoRes.data);
            } else if (logoRes?.is_success === false && logoRes?.status_code === 500) {
                toast.error("Internal Server Error. Please Contact Support Team.");
                setLogoSrc(null);
            } else {
                toast.error(logoRes?.message || "Failed to load client logo");
                setLogoSrc(null);
            }
        } catch (err) {
            console.error(err);
            setLogoSrc(null);
        }
    };

    React.useEffect(() => {
        if (!token || !id) return;

        if (!location.state?.client) {
            loadData();
        }

        loadLogo();
    }, [token, id]);

    const statusName = client?.StatusName || "Unknown";
    const serviceDetails = React.useMemo(
        () => resolveServiceDetails(client?.ServiceIds),
        [client?.ServiceIds]
    );
    const createdOnLocal = React.useMemo(
        () => formatUtcToLocalDateTime(client?.CreatedOn),
        [client?.CreatedOn]
    );
    const modifiedOnLocal = React.useMemo(
        () => formatUtcToLocalDateTime(client?.ModifiedOn),
        [client?.ModifiedOn]
    );
    const subscribers = React.useMemo(
        () => (Array.isArray(client?.Subscribers) ? client.Subscribers : []),
        [client?.Subscribers]
    );
    const subscribersCount = client?.SubscribersCount ?? subscribers.length;
    const hasSubscribers = subscribersCount > 0 && subscribers.length > 0;

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

                <div className="row g-4">
                    <div className="col-lg-6">
                        <div className="skeleton" style={{ height: 180, width: "100%", borderRadius: 20 }} />
                    </div>
                    <div className="col-lg-6">
                        <div className="skeleton" style={{ height: 180, width: "100%", borderRadius: 20 }} />
                    </div>

                    <div className="col-12">
                        <div className="skeleton" style={{ height: 130, width: "100%", borderRadius: 20 }} />
                    </div>

                    <div className="col-12">
                        <div className="p-4 p-lg-5 hc-surface">
                            <div className="skeleton mb-4" style={{ height: 34, width: 250, borderRadius: 10 }} />
                            <div className="row g-3">
                                {[1, 2, 3, 4, 5, 6].map((item) => (
                                    <div className="col-12 col-md-6 col-xl-4" key={item}>
                                        <div className="skeleton" style={{ height: 108, width: "100%", borderRadius: 12 }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="container-fluid py-4">
                <div className="p-4 hc-surface">
                    <h5 className="mb-2">Client not found</h5>
                    <p className="text-muted mb-3">The requested client details could not be loaded.</p>
                    <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={() => navigate(APPRoutes.CLIENTS)}
                    >
                        Back to Clients
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
                    onClick={() => navigate(APPRoutes.CLIENTS)}
                    style={{ minHeight: 40 }}
                >
                    <MdArrowBack size={18} />
                    <span>Back</span>
                </button>

                <button
                    type="button"
                    className="btn hc-bg-primary text-white d-inline-flex align-items-center gap-2"
                    onClick={() => navigate(APPRoutes.CLIENTS_EDIT.replace(":id", client.Id))}
                >
                    <MdEdit size={18} /> Edit Client
                </button>
            </div>

            <div className="p-4 p-lg-5 mb-4 overflow-hidden hc-hero-banner hc-hero-banner-primary">
                <div aria-hidden="true" className="hc-hero-circle-tr" />
                <div aria-hidden="true" className="hc-hero-circle-bl" />

                <div className="row g-4 align-items-center position-relative">
                    <div className="col-lg-8">
                        <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                            <span
                                className="px-3 py-2 rounded-pill fw-semibold"
                                style={{
                                    fontSize: "0.82rem",
                                    backgroundColor: STATUS_STYLE[statusName]?.backgroundColor || "#f3f4f6",
                                    color: STATUS_STYLE[statusName]?.color || "#4b5563",
                                }}
                            >
                                {statusName}
                            </span>
                            {client.ShortForm ? (
                                <span
                                    className="px-3 py-2 rounded-pill"
                                    style={{ fontSize: "0.82rem", backgroundColor: "rgba(255,255,255,0.12)", color: "#fff" }}
                                >
                                    {client.ShortForm}
                                </span>
                            ) : null}
                        </div>

                        <h2 className="fw-bold text-white mb-2" style={{ fontSize: "clamp(1.45rem, 2.2vw, 2rem)" }}>
                            {client.OrganizationName}
                        </h2>
                        <p className="mb-1" style={{ color: "rgba(255,255,255,0.78)", fontSize: "0.95rem" }}>
                            <MdEmail size={14} className="me-1" />{client.Email || "-"}
                        </p>
                        <p className="mb-0" style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.88rem" }}>
                            <MdPhone size={14} className="me-1" />{client.Phone || "-"}
                        </p>
                    </div>

                    <div className="col-lg-4">
                        <div className="p-3 rounded-4" style={{ backgroundColor: "rgba(255,255,255,0.10)" }}>
                            <div className="d-flex align-items-center gap-3 mb-3">
                                <div
                                    className="d-flex align-items-center justify-content-center overflow-hidden rounded-3 flex-shrink-0"
                                    style={{
                                        width: 56,
                                        height: 56,
                                        background: "rgba(255,255,255,0.15)",
                                    }}
                                >
                                    {logoSrc ? (
                                        <img
                                            src={logoSrc}
                                            alt={`${client.OrganizationName} logo`}
                                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        />
                                    ) : (
                                        <span className="fw-bold text-white" style={{ fontSize: "1.3rem", letterSpacing: "0.06em" }}>
                                            {(client.ShortForm || client.OrganizationName || "CL").slice(0, 2).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <p className="mb-0 small" style={{ color: "rgba(255,255,255,0.65)" }}>Enabled Services</p>
                                    <p className="fw-bold text-white mb-0" style={{ fontSize: "1.55rem", lineHeight: 1.1 }}>
                                        {client.ServicesCount ?? serviceDetails.length}
                                    </p>
                                </div>
                            </div>
                            <p className="mb-0 small" style={{ color: "rgba(255,255,255,0.65)" }}>
                                Client account overview with contact details, service access, and operational information.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4 mb-4 align-items-stretch">
                <div className="col-xl-8 d-flex">
                    {hasSubscribers ? (
                        <div
                            className="p-4 p-lg-5 hc-surface hc-card-primary w-100 h-100 d-flex flex-column"
                            style={{ minHeight: 220 }}
                        >
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                                <h5 className="fw-bold mb-0 d-flex align-items-center gap-2 hc-text-primary">
                                    <MdSubscriptions size={22} /> Subscriptions
                                </h5>
                                <span className="badge rounded-pill px-3 py-2 bg-primary-subtle hc-text-primary fw-semibold">
                                    {subscribersCount} Plan{subscribersCount > 1 ? "s" : ""}
                                </span>
                            </div>

                            <div className="d-flex flex-column gap-3 flex-grow-1">
                                {subscribers.map((subscriber) => {
                                    const statusVisual = STATUS_STYLE[subscriber.StatusName] || {
                                        backgroundColor: "#f3f4f6",
                                        color: "#4b5563",
                                    };

                                    return (
                                        <div className="h-100" key={subscriber.Id}>
                                            <div
                                                className="h-100 rounded-4 p-3 p-lg-4 d-flex flex-column justify-content-between"
                                                style={{
                                                    background: "linear-gradient(145deg, #0f2d61 0%, #1b4a94 55%, #2056aa 100%)",
                                                    color: "#fff",
                                                }}
                                            >
                                                <div className="d-flex align-items-start justify-content-between gap-2">
                                                    <span
                                                        className="d-inline-flex align-items-center justify-content-center rounded-3"
                                                        style={{ width: 42, height: 42, background: "rgba(255,255,255,0.16)" }}
                                                    >
                                                        <MdSubscriptions size={20} />
                                                    </span>
                                                    <div className="d-flex flex-wrap justify-content-end gap-2">
                                                        <span className="small px-2 py-1 rounded-pill" style={{ background: "rgba(255,255,255,0.2)" }}>
                                                            {subscriber.IsRecurring ? "Recurring" : "One-time"}
                                                        </span>
                                                        <span className="badge rounded-pill px-3 py-2" style={statusVisual}>
                                                            {subscriber.StatusName || "Unknown"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="mt-3">
                                                    <h6 className="fw-bold mb-1" style={{ fontSize: "1.12rem" }}>
                                                        {subscriber.SubscriptionPlanName || "-"}
                                                    </h6>
                                                    <div className="small" style={{ color: "rgba(255,255,255,0.82)" }}>
                                                        Subscription for this client account
                                                    </div>
                                                </div>

                                                <div className="d-flex flex-wrap gap-2 mt-3">
                                                    <span className="small d-inline-flex align-items-center gap-1 px-2 py-1 rounded-pill border" style={{ borderColor: "rgba(255,255,255,0.35)", color: "#fff" }}>
                                                        <MdPayments size={14} />
                                                        <span className="text-uppercase">{subscriber.BillingMethod || "-"}</span>
                                                    </span>
                                                    <span className="small fw-semibold px-2 py-1 rounded-pill" style={{ background: "rgba(255,255,255,0.16)", color: "#fff" }}>
                                                        {toCurrency(subscriber.Price)}
                                                    </span>
                                                </div>

                                                <div className="row g-2 mt-3">
                                                    <div className="col-12 col-md-6">
                                                        <div className="rounded-3 p-2" style={{ background: "rgba(255,255,255,0.12)" }}>
                                                            <div className="small" style={{ color: "rgba(255,255,255,0.78)" }}>Start</div>
                                                            <div className="fw-semibold text-white">{formatDate(subscriber.StartDate)}</div>
                                                        </div>
                                                    </div>
                                                    <div className="col-12 col-md-6">
                                                        <div className="rounded-3 p-2" style={{ background: "rgba(255,255,255,0.12)" }}>
                                                            <div className="small" style={{ color: "rgba(255,255,255,0.78)" }}>End</div>
                                                            <div className="fw-semibold text-white">{formatDate(subscriber.EndDate)}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 p-lg-5 hc-surface hc-card-primary w-100 h-100 d-flex flex-column align-items-center justify-content-center text-center gap-3" style={{ minHeight: 220 }}>
                            <span
                                className="d-inline-flex align-items-center justify-content-center rounded-circle"
                                style={{ width: 56, height: 56, background: "#f0f4ff" }}
                            >
                                <MdSubscriptions size={26} className="hc-text-primary" />
                            </span>
                            <div>
                                <h6 className="fw-semibold mb-1 hc-text-primary">No Subscriptions</h6>
                                <p className="mb-0 small text-muted">This client has no subscription plans assigned yet.</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="col-xl-4 d-flex">
                    <div className="d-flex flex-column gap-4 w-100">
                        <div
                            className="p-4 p-lg-5 hc-surface hc-card-primary flex-fill d-flex flex-column justify-content-center"
                            style={{ minHeight: 220 }}
                        >
                            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 hc-text-primary">
                                <MdLocationOn size={22} className="hc-text-primary" /> Legal Address
                            </h5>
                            <p className="mb-0 text-secondary">{formatAddress(client.LegalAddress)}</p>
                        </div>

                        <div
                            className="p-4 p-lg-5 hc-surface hc-card-primary flex-fill d-flex flex-column justify-content-center"
                            style={{ minHeight: 220 }}
                        >
                            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 hc-text-primary">
                                <MdBusiness size={22} className="hc-text-primary" /> Billing Address
                            </h5>
                            <p className="mb-0 text-secondary">{formatAddress(client.BillingAddress)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4 mb-4">
                <div className="col-12">
                    <ExpandableTransactionPanel
                        token={token}
                        subId={null}
                        accountId={id}
                        title="Subscription Transactions"
                        subtitle="Billing timeline across subscriptions. Click a card to expand details."
                    />
                </div>

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
                                        <div className="fw-medium text-dark">{client.CreatedBy || "-"}</div>
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
                                        <div className="fw-medium text-dark">{client.ModifiedBy || "-"}</div>
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

            <div className="row g-4">
                <div className="col-12">
                    <div className="p-4 p-lg-5 hc-surface hc-card-primary">
                        <h4 className="fw-bold mb-4 d-flex align-items-center gap-2 hc-text-primary">
                            <MdSettingsSuggest size={28} className="hc-text-primary" /> Services Portfolio
                        </h4>

                        {serviceDetails.length ? (
                            <div className="row g-3">
                                {serviceDetails.map((service) => (
                                    <div className="col-12 col-md-6 col-xl-4" key={service.id}>
                                        <div
                                            className="h-100 border px-4 py-3"
                                            style={{
                                                backgroundColor: "#f7fbff",
                                                borderRadius: "12px",
                                            }}
                                        >
                                            <h6 className="mb-1 fw-semibold hc-text-primary">
                                                {service.label}
                                            </h6>
                                            <p className="mb-0 small text-secondary">{service.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mb-0 text-muted">No services assigned.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
