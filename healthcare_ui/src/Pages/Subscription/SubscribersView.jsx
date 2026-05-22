import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    MdArrowBack,
    MdAttachMoney,
    MdAutorenew,
    MdCalendarMonth,
    MdCheckCircle,
    MdCreditCard,
    MdEventBusy,
    MdHistory,
    MdOutlinePayments,
    MdPauseCircle,
    MdPerson,
    MdCardMembership,
    MdEmail,
    MdPhone,
    MdLocationOn,
} from 'react-icons/md';
import { toast } from 'react-toastify';
import { useAuth } from '../../Context/AuthContext';
import { getSubscriberById } from '../../Services/SubscriptionService';
import ExpandableTransactionPanel from '../../Components/Common/ExpandableTransactionPanel';
import { APPRoutes } from '../../Utils/Route';
import { formatUtcToLocalDateTime } from '../../Utils/DateTime';

const SUBSCRIPTION_STATUS_STYLE = {
    Active: { backgroundColor: '#dcfce7', color: '#166534', icon: MdCheckCircle },
    Inactive: { backgroundColor: '#f3f4f6', color: '#4b5563', icon: MdPauseCircle },
    Unknown: { backgroundColor: '#e5e7eb', color: '#374151', icon: MdPauseCircle },
};

const PAYMENT_STATUS_STYLE = {
    Paid: { backgroundColor: '#dcfce7', color: '#166534' },
    Unpaid: { backgroundColor: '#fef3c7', color: '#92400e' },
    Cancelled: { backgroundColor: '#fee2e2', color: '#991b1b' },
    Expired: { backgroundColor: '#f3f4f6', color: '#4b5563' },
    Unknown: { backgroundColor: '#e5e7eb', color: '#374151' },
};

const toCurrency = (value) => {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return '-';
    }

    return `$${amount.toLocaleString()}`;
};

const toCapitalized = (value) => {
    if (!value || value === '-') {
        return '-';
    }

    const textValue = String(value).toLowerCase();
    return textValue.charAt(0).toUpperCase() + textValue.slice(1);
};

const normalizeSubscriber = (subscriber) => {
    if (!subscriber) {
        return null;
    }

    return {
        ...subscriber,
        subscription_status_name: subscriber?.subscription_status_name || 'Unknown',
        payment_status_name: subscriber?.payment_status_name || 'Unknown',
    };
};

const ViewSkeleton = () => (
    <div className="container-fluid py-4 hc-page-bg">
        <div className="d-flex gap-2 mb-3">
            <div className="skeleton" style={{ height: 40, width: 110, borderRadius: 999 }} />
        </div>

        <div className="p-4 mb-4" style={{ borderRadius: 20, backgroundColor: '#0f2d61' }}>
            <div className="skeleton mb-3" style={{ height: 28, width: '55%', borderRadius: 8 }} />
            <div className="skeleton mb-2" style={{ height: 18, width: '38%', borderRadius: 6 }} />
            <div className="skeleton" style={{ height: 18, width: '28%', borderRadius: 6 }} />
        </div>

        <div className="row g-4">
            {[1, 2, 3, 4].map((item) => (
                <div className="col-lg-3 col-md-6" key={item}>
                    <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
                </div>
            ))}
            <div className="col-lg-7">
                <div className="skeleton" style={{ height: 250, borderRadius: 16 }} />
            </div>
            <div className="col-lg-5">
                <div className="skeleton" style={{ height: 250, borderRadius: 16 }} />
            </div>
        </div>
    </div>
);

const StatCard = ({ label, value, icon: Icon, iconBg, accentClass, valueClass }) => (
    <div className="position-relative overflow-hidden bg-white p-4 rounded-4 shadow d-flex align-items-center gap-3 h-100">
        <div className={`position-absolute start-0 top-0 h-100 border-start border-5 ${accentClass}`} />
        <div
            className="d-inline-flex align-items-center justify-content-center rounded-3"
            style={{ width: 44, height: 44, backgroundColor: iconBg }}
        >
            <Icon size={20} />
        </div>
        <div className="d-flex flex-column fw-bold lh-sm">
            <span className="text-dark" style={{ fontSize: '0.85rem' }}>
                {label}
            </span>
            <span className={`fw-bold ${valueClass}`} style={{ fontSize: '1.25rem' }}>
                {value}
            </span>
        </div>
    </div>
);

const DetailRow = ({ icon: Icon, label, value }) => (
    <div className="d-flex align-items-start gap-3 py-3 border-bottom border-light-subtle">
        <span
            className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
            style={{ width: 36, height: 36, background: 'linear-gradient(135deg, rgba(39, 89, 197, 0.08) 0%, rgba(39, 89, 197, 0.12) 100%)', color: '#2759c5' }}
        >
            <Icon size={16} />
        </span>
        <div className="flex-grow-1 min-w-0">
            <div className="small text-muted mb-1">{label}</div>
            <div className="fw-medium text-dark text-break" style={{ fontSize: '0.9rem' }}>
                {value || '-'}
            </div>
        </div>
    </div>
);

export default function SubscribersView() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const { token } = useAuth();

    const [subscriber, setSubscriber] = React.useState(
        normalizeSubscriber(location.state?.subscriber || null),
    );
    const [loading, setLoading] = React.useState(!location.state?.subscriber);

    React.useEffect(() => {
        if (!id || !token) {
            return;
        }

        if (location.state?.subscriber) {
            return;
        }

        (async () => {
            try {
                setLoading(true);
                const response = await getSubscriberById(id, token);

                if (response?.is_success) {
                    setSubscriber(normalizeSubscriber(response?.data || null));
                } else if(response?.is_success === false && response?.status_code === 500) {
                    toast.error('Internal Server Error. Please Contact Support Team.');
                    setSubscriber(null);
                } else {
                    setSubscriber(null);
                    toast.error(response?.message || 'Failed to load subscriber details');
                }
            } catch (error) {
                console.error(error);
                setSubscriber(null);
                toast.error('An error occurred while loading subscriber details');
            } finally {
                setLoading(false);
            }
        })();
    }, [id, token, location.state?.subscriber]);

    if (loading) {
        return <ViewSkeleton />;
    }

    if (!subscriber) {
        return (
            <div className="container-fluid py-4">
                <div className="p-4 hc-surface">
                    <h5 className="mb-2">Subscriber not found</h5>
                    <p className="text-muted mb-3">The requested subscriber details could not be loaded.</p>
                    <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={() => navigate(APPRoutes.SUBSCRIPTION_SUBSCRIBERS)}
                    >
                        Back to Subscribers
                    </button>
                </div>
            </div>
        );
    }

    const statusName = subscriber?.subscription_status_name || 'Unknown';
    const paymentName = subscriber?.payment_status_name || 'Unknown';
    const statusMeta = SUBSCRIPTION_STATUS_STYLE[statusName] || SUBSCRIPTION_STATUS_STYLE.Unknown;
    const StatusIcon = statusMeta.icon;
    const paymentMeta = PAYMENT_STATUS_STYLE[paymentName] || PAYMENT_STATUS_STYLE.Unknown;

    const isRecurring = Boolean(subscriber?.subscription_price?.is_recurring);
    const billingMethod = subscriber?.subscription_price?.billing_method || '-';
    const planName = subscriber?.subscription_plan?.name || '-';
    const clientName = subscriber?.client?.name || '-';

    const createdOn = formatUtcToLocalDateTime(subscriber?.created_on);
    const modifiedOn = formatUtcToLocalDateTime(subscriber?.modified_on);
    const startDate = formatUtcToLocalDateTime(subscriber?.start_date);
    const endDate = formatUtcToLocalDateTime(subscriber?.end_date);

    return (
        <div className="container-fluid py-4">
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
                <button
                    type="button"
                    className="btn btn-light fw-semibold border shadow-sm d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill"
                    onClick={() => navigate(APPRoutes.SUBSCRIPTION_SUBSCRIBERS)}
                >
                    <MdArrowBack size={18} />
                    <span>Back</span>
                </button>

                <span className="small text-muted">
                    Subscriber ID <strong className="hc-text-primary">#{subscriber?.id || '-'}</strong>
                </span>
            </div>

            <div className="p-4 p-lg-5 mb-4 overflow-hidden hc-hero-banner hc-hero-banner-teal">
                <div aria-hidden="true" className="hc-hero-circle-tr" />
                <div aria-hidden="true" className="hc-hero-circle-bl" />

                <div className="row g-4 align-items-center position-relative">
                    <div className="col-lg-8">
                        <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                            <span
                                className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold"
                                style={{ fontSize: '0.82rem', ...statusMeta }}
                            >
                                {statusName}
                            </span>
                            <span
                                className="px-3 py-2 rounded-pill fw-semibold"
                                style={{
                                    fontSize: '0.82rem',
                                    backgroundColor: paymentMeta.backgroundColor,
                                    color: paymentMeta.color,
                                }}
                            >
                                {paymentName}
                            </span>
                            <span
                                className="px-3 py-2 rounded-pill"
                                style={{ fontSize: '0.82rem', backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff' }}
                            >
                                {isRecurring ? 'Recurring' : 'One-time'}
                            </span>
                        </div>

                        <h2 className="fw-bold text-white mb-2" style={{ fontSize: 'clamp(1.45rem, 2.2vw, 2rem)' }}>
                            {clientName}
                        </h2>
                        <p className="mb-1" style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.95rem' }}>
                            Enrolled in <span className="fw-semibold text-white">{planName}</span>
                        </p>
                        <p className="mb-0" style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.88rem' }}>
                            Pricing and billing status for this subscriber account.
                        </p>
                    </div>

                    <div className="col-lg-4">
                        <div className="p-3 rounded-4" style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}>
                            <p className="mb-1 small" style={{ color: 'rgba(255,255,255,0.65)' }}>
                                Price
                            </p>
                            <p className="fw-bold text-white mb-3" style={{ fontSize: '1.55rem', lineHeight: 1.1 }}>
                                {toCurrency(subscriber?.subscription_price?.price)}
                            </p>
                            <p className="mb-1 small" style={{ color: 'rgba(255,255,255,0.65)' }}>
                                Billing Method
                            </p>
                            <p className="fw-semibold text-white mb-0">
                                {toCapitalized(billingMethod)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* <div className="row g-3 mb-4">
				<div className="col-12 col-sm-6 col-xl-3">
					<StatCard
						label="Subscription Price"
						value={toCurrency(subscriber?.subscription_price?.price)}
						icon={MdAttachMoney}
						iconBg="#dcfce7"
						accentClass="border-success"
						valueClass="text-success"
					/>
				</div>
				<div className="col-12 col-sm-6 col-xl-3">
					<StatCard
						label="Billing Cycle"
						value={toCapitalized(billingMethod)}
						icon={MdOutlinePayments}
						iconBg="#e6ecfb"
						accentClass="border-primary"
						valueClass="text-primary"
					/>
				</div>
				<div className="col-12 col-sm-6 col-xl-3">
					<StatCard
						label="Payment Status"
						value={paymentName}
						icon={MdCreditCard}
						iconBg="#fef3c7"
						accentClass="border-warning"
						valueClass="text-warning"
					/>
				</div>
				<div className="col-12 col-sm-6 col-xl-3">
					<StatCard
						label="Recurrence"
						value={isRecurring ? 'Enabled' : 'Disabled'}
						icon={MdAutorenew}
						iconBg="#e0f2fe"
						accentClass="border-info"
						valueClass="text-info"
					/>
				</div>
			</div> */}

            <div className="row g-4">
                <div className="col-lg-7">
                    <div className="hc-surface hc-card-primary mb-3">
                        <div className="px-4 pt-4 pb-2 d-flex align-items-center gap-2">
                            <span
                                className="d-inline-flex align-items-center justify-content-center rounded-3"
                                style={{ width: 34, height: 34, backgroundColor: 'rgba(39, 89, 197, 0.08)', color: '#2759c5' }}
                            >
                                <MdCardMembership size={18} className="hc-text-primary" />
                            </span>
                            <h6 className="fw-bold mb-0 hc-text-primary">Subscription Period</h6>
                        </div>
                        <div className="px-4 pb-4">
                            <div className="row g-3">
                                <div className="col-12 col-md-6">
                                    <div className="rounded-4 border p-3 h-100 bg-light-subtle">
                                        <p className="small text-muted mb-1 d-flex align-items-center gap-1">
                                            <MdEventBusy size={14} className="hc-text-primary" /> Start Date
                                        </p>
                                        <p className="mb-0 fw-semibold text-dark">{startDate}</p>
                                    </div>
                                </div>
                                <div className="col-12 col-md-6">
                                    <div className="rounded-4 border p-3 h-100 bg-light-subtle">
                                        <p className="small text-muted mb-1 d-flex align-items-center gap-1">
                                            <MdEventBusy size={14} className="hc-text-primary" /> End Date
                                        </p>
                                        <p className="mb-0 fw-semibold text-dark">{endDate}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="hc-surface hc-card-primary">
                        <div className="px-4 pt-4 pb-2 d-flex align-items-center gap-2">
                            <span
                                className="d-inline-flex align-items-center justify-content-center rounded-3"
                                style={{ width: 34, height: 34, backgroundColor: 'rgba(39, 89, 197, 0.08)', color: '#2759c5' }}
                            >
                                <MdLocationOn size={18} className="hc-text-primary" />
                            </span>
                            <h6 className="fw-bold mb-0 hc-text-primary">
                                Billing Information
                            </h6>
                        </div>
                        <div className="px-4 pb-4">
                            <div className="row g-3 mb-3">
                                <div className="col-12 col-md-6">
                                    <div className="rounded-4 border p-3 h-100 bg-light-subtle">
                                        <p className="small text-muted mb-1 d-flex align-items-center gap-1">
                                            <MdEmail size={14} /> Email
                                        </p>
                                        <p className="mb-0 fw-semibold text-dark text-break" style={{ fontSize: '0.9rem' }}>
                                            {subscriber?.client?.billing_email || '-'}
                                        </p>
                                    </div>
                                </div>
                                <div className="col-12 col-md-6">
                                    <div className="rounded-4 border p-3 h-100 bg-light-subtle">
                                        <p className="small text-muted mb-1 d-flex align-items-center gap-1">
                                            <MdPhone size={14} /> Phone
                                        </p>
                                        <p className="mb-0 fw-semibold text-dark">{subscriber?.client?.billing_phone || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-4 border p-3 bg-light-subtle">
                                <p className="small text-muted mb-2 d-flex align-items-center gap-1">
                                    <MdLocationOn size={14} /> Address
                                </p>
                                <p className="mb-0 fw-semibold text-dark text-break" style={{ fontSize: '0.9rem' }}>
                                    {(() => {
                                        const addr = subscriber?.client?.billing_address;
                                        if (!addr) return '-';
                                        const parts = [
                                            addr.street,
                                            addr.city,
                                            addr.state?.trim(),
                                            addr.zipcode,
                                            addr.country,
                                        ].filter(Boolean);
                                        return parts.join(', ');
                                    })()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-5">
                    <div className="hc-surface hc-card-primary h-100">
                        <div className="px-4 pt-4 pb-2 d-flex align-items-center gap-2">
                            <span
                                className="d-inline-flex align-items-center justify-content-center rounded-3"
                                style={{ width: 34, height: 34, backgroundColor: 'rgba(39, 89, 197, 0.08)', color: '#2759c5' }}
                            >
                                <MdHistory size={18} />
                            </span>
                            <h6 className="fw-bold mb-0 hc-text-primary">
                                Timeline & Ownership
                            </h6>
                        </div>
                        <div className="px-4 pb-4">
                            <div className="rounded-4 p-3 mb-3 bg-primary-subtle border border-primary-subtle">
                                <p className="small mb-1 text- d-flex align-items-center gap-1">
                                    <MdCalendarMonth size={14} /> Created On
                                </p>
                                <p className="mb-0 fw-semibold text-dark">{createdOn}</p>
                            </div>

                            <div className="rounded-4 p-3 mb-3 bg-primary-subtle border border-primary-subtle">
                                <p className="small mb-1 text-muted d-flex align-items-center gap-1">
                                    <MdCalendarMonth size={14} /> Modified On
                                </p>
                                <p className="mb-0 fw-semibold text-dark">{modifiedOn}</p>
                            </div>

                            <div className="rounded-4 p-3 bg-light border">
                                <p className="small text-muted mb-3">Ownership Trail</p>
                                <div className="row g-2">
                                    <div className="col-12 col-sm-6">
                                        <div className="bg-white border rounded-3 p-3 h-100">
                                            <div className="small text-muted mb-1">Created By</div>
                                            <div className="fw-semibold text-dark d-flex align-items-center gap-2">
                                                <MdPerson size={16} className="hc-text-primary" />
                                                <span>{subscriber?.created_by || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6">
                                        <div className="bg-white border rounded-3 p-3 h-100">
                                            <div className="small text-muted mb-1">Modified By</div>
                                            <div className="fw-semibold text-dark d-flex align-items-center gap-2">
                                                <MdPerson size={16} className="text-primary" />
                                                <span>{subscriber?.modified_by || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4 mb-4">
                <div className="col-12">
                    <ExpandableTransactionPanel
                        token={token}
                        subId={id || null}
                        accountId={null}
                        title="Subscriber Transactions"
                        subtitle="Click a transaction card to reveal billing details for this subscriber."
                    />
                </div>
            </div>
        </div>
    );
}