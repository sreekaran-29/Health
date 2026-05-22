import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    MdArrowBack,
    MdCalendarMonth,
    MdCheckCircle,
    MdEdit,
    MdGroup,
    MdLocalHospital,
    MdPauseCircle,
    MdPayments,
    MdPerson,
    MdStorage,
    MdSync,
    MdVerified,
} from 'react-icons/md';
import { toast } from 'react-toastify';
import { useAuth } from '../../Context/AuthContext';
import { getSubscriptionById } from '../../Services/SubscriptionService';
import { APPRoutes } from '../../Utils/Route';

const STATUS_STYLE = {
    Active: { backgroundColor: '#dcfce7', color: '#166534' },
    Inactive: { backgroundColor: '#f3f4f6', color: '#4b5563' },
    Unknown: { backgroundColor: '#e5e7eb', color: '#374151' },
};

const getStatusLabel = (subscription) => {
    const statusId = Number(subscription?.status_id);

    if (statusId === 1) {
        return 'Active';
    }

    if (statusId === 2) {
        return 'Inactive';
    }

    return 'Unknown';
};

const toCurrency = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return '-';
    }

    return `$${Number(value).toLocaleString()}`;
};

const ViewSkeleton = () => (
    <div className="container-fluid py-4">
        <div className="d-flex gap-2 mb-3">
            <div className="skeleton" style={{ height: 40, width: 110, borderRadius: 999 }} />
        </div>

        <div className="p-4 mb-4" style={{ borderRadius: 20, backgroundColor: '#0f2d61' }}>
            <div className="skeleton mb-3" style={{ height: 26, width: '45%', borderRadius: 8 }} />
            <div className="skeleton" style={{ height: 16, width: '30%', borderRadius: 8 }} />
        </div>

        <div className="row g-4">
            {[1, 2, 3].map((item) => (
                <div className="col-lg-4" key={item}>
                    <div className="skeleton" style={{ height: 130, width: '100%', borderRadius: 16 }} />
                </div>
            ))}
            <div className="col-12">
                <div className="skeleton" style={{ height: 210, width: '100%', borderRadius: 16 }} />
            </div>
        </div>
    </div>
);

export default function SubscriptionView() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const { token } = useAuth();

    const [subscription, setSubscription] = React.useState(location.state?.subscription || null);
    const [loading, setLoading] = React.useState(!location.state?.subscription);

    React.useEffect(() => {
        if (!token || !id) {
            return;
        }

        if (location.state?.subscription) {
            return;
        }

        (async () => {
            try {
                setLoading(true);
                const response = await getSubscriptionById(id, token);
                if (response?.is_success) {
                    setSubscription(response?.data || null);
                } else if(response?.is_success === false && response?.status_code === 500) {
                    toast.error('Internal Server Error. Please Contact Support Team.');
                    setSubscription(null);
                } else {
                    toast.error(response?.message || 'Failed to load subscription details');
                    setSubscription(null);
                }
            } catch (error) {
                console.error(error);
                toast.error('An error occurred while loading subscription details');
                setSubscription(null);
            } finally {
                setLoading(false);
            }
        })();
    }, [token, id, location.state?.subscription]);

    if (loading) {
        return <ViewSkeleton />;
    }

    if (!subscription) {
        return (
            <div className="container-fluid py-4">
                <div className="p-4 hc-surface">
                    <h5 className="mb-2">Subscription not found</h5>
                    <p className="text-muted mb-3">The requested subscription details could not be loaded.</p>
                    <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={() => navigate(APPRoutes.SUBSCRIPTION_MANAGE_PLANS)}
                    >
                        Back to Manage Plans
                    </button>
                </div>
            </div>
        );
    }

    const status = getStatusLabel(subscription);
    const priceDetails = Array.isArray(subscription?.price_details) ? subscription.price_details : [];
    const monthlyPlan = priceDetails.find((item) => item?.billing_method === 'monthly');
    const yearlyPlan = priceDetails.find((item) => item?.billing_method === 'yearly');

    return (
        <div className="container-fluid py-4">
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
                <button
                    type="button"
                    className="btn btn-light fw-semibold border shadow-sm d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill"
                    onClick={() => navigate(APPRoutes.SUBSCRIPTION_MANAGE_PLANS)}
                >
                    <MdArrowBack size={18} />
                    <span>Back</span>
                </button>

                <button
                    type="button"
                    className="btn hc-bg-primary text-white d-inline-flex align-items-center gap-2"
                    onClick={() => navigate(APPRoutes.SUBSCRIPTION_EDIT.replace(':id', subscription.id), { state: { subscription } })}
                >
                    <MdEdit size={18} />
                    <span>Edit Plan</span>
                </button>
            </div>

            <div className="row g-4 mb-4">
                <div className="col-md-6 col-xl-3">
                    <div className="p-4 h-100 shadow-lg rounded-4 border">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="small text-muted">Active Subscribers</span>
                            <MdCheckCircle size={20} color="#16a34a" />
                        </div>
                        <div className="fw-bold text-success fs-2 lh-1">
                            {subscription?.active_subscribers ?? 0}
                        </div>
                    </div>
                </div>
                <div className="col-md-6 col-xl-3">
                    <div className="p-4 h-100 shadow-lg rounded-4 border">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="small text-muted">Inactive Subscribers</span>
                            <MdPauseCircle size={20} color="#6b7280" />
                        </div>
                        <div className="fw-bold text-secondary fs-2 lh-1">
                            {subscription?.inactive_subscribers ?? 0}
                        </div>
                    </div>
                </div>
                <div className="col-md-6 col-xl-3">
                    <div className="p-4 h-100 shadow-lg rounded-4 border">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="small text-muted">Doctors Limit</span>
                            <MdLocalHospital size={20} className="hc-text-primary" />
                        </div>
                        <div className="fw-bold hc-text-primary fs-2 lh-1">
                            {subscription?.doctors_limit ?? 0}
                        </div>
                    </div>
                </div>
                <div className="col-md-6 col-xl-3">
                    <div className="p-4 h-100 shadow-lg rounded-4 border">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="small text-muted">Patients Limit</span>
                            <MdGroup size={20} className="text-info" />
                        </div>
                        <div className="fw-bold text-info fs-2 lh-1">
                            {subscription?.patients_limit ?? 0}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 p-lg-5 mb-4 overflow-hidden hc-hero-banner hc-hero-banner-primary">
                <div aria-hidden="true" className="hc-hero-circle-tr" />
                <div aria-hidden="true" className="hc-hero-circle-bl" />
                <div className="row g-4 align-items-center position-relative">
                    <div className="col-lg-8">
                        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                            <span
                                className="badge px-3 py-2 fw-semibold"
                                style={STATUS_STYLE[status] || STATUS_STYLE.Unknown}
                            >
                                {status}
                            </span>
                            <span
                                className="badge rounded-pill px-3 py-2 fw-semibold text-white"
                                style={{ fontSize: '0.82rem', backgroundColor: 'rgba(255,255,255,0.16)', color: '#fff' }}
                            >
                                {subscription?.is_recurring ? 'Recurring Plan' : 'One-time Plan'}
                            </span>
                        </div>
                        <h2 className="fw-bold text-white mb-2 display-6">
                            {subscription?.name || '-'}
                        </h2>
                        <p className="mb-0" style={{ color: 'rgba(255,255,255,0.76)', fontSize: '0.95rem' }}>
                            {subscription?.description || 'No description available for this subscription plan.'}
                        </p>
                    </div>

                    <div className="col-lg-4">
                        <div className="p-3 rounded-4" style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}>
                            <p className="mb-1 small" style={{ color: 'rgba(255,255,255,0.68)' }}>Created By</p>
                            <p className="fw-bold text-white mb-3 fs-6">
                                {subscription?.createdBy || '-'}
                            </p>
                            <p className="mb-1 small" style={{ color: 'rgba(255,255,255,0.68)' }}>Billing Modes</p>
                            <p className="fw-semibold text-white mb-0 small text-uppercase">
                                {Array.isArray(subscription?.billing_method)
                                    ? subscription.billing_method.join(' | ')
                                    : '-'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-lg-7">
                    <div className="hc-surface hc-card-primary shadow p-4 p-lg-5 h-100">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                            <div className="d-flex align-items-center gap-2">
                                <span
                                    className="d-inline-flex align-items-center justify-content-center rounded-3 bg-primary-subtle text-primary p-2"
                                >
                                    <MdPayments size={20} className='hc-text-primary' />
                                </span>
                                <h5 className="fw-bold mb-0 hc-text-primary">
                                    Pricing Matrix
                                </h5>
                            </div>
                            <span className="badge rounded-pill px-3 py-2 hc-text-primary bg-primary-subtle">
                                Stripe linked
                            </span>
                        </div>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <div
                                    className="p-3 rounded-4 border h-100"
                                    style={{
                                        background: 'linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)',
                                        borderColor: '#d6e2fb',
                                    }}
                                >
                                    <p className="small text-muted mb-1 text-uppercase">
                                        Monthly
                                    </p>
                                    <div className="fw-bold text-dark mb-1 fs-3">
                                        {toCurrency(monthlyPlan?.price)}
                                    </div>
                                    <p className="small text-secondary">
                                        <span className="d-block">Price ID:</span>
                                        <span className="font-monospace d-block text-break">
                                            {subscription?.monthly_price_id || '-'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div
                                    className="p-3 rounded-4 border h-100"
                                    style={{
                                        background: 'linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)',
                                        borderColor: '#d6e2fb',
                                    }}
                                >
                                    <p className="small text-muted mb-1 text-uppercase">
                                        Yearly
                                    </p>
                                    <div className="fw-bold text-dark mb-1 fs-3">
                                        {toCurrency(yearlyPlan?.price)}
                                    </div>
                                    <p className="small text-secondary">
                                        <span className="d-block">Price ID:</span>
                                        <span className="font-monospace d-block text-break">
                                            {subscription?.yearly_price_id || '-'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 p-3 rounded-4 border bg-light-subtle">
                            <div className="d-flex align-items-center gap-2 mb-2 text-secondary">
                                <MdSync size={18} />
                                <span className="fw-semibold">Recurrence</span>
                            </div>
                            <p className="mb-0 text-secondary small">
                                This subscription is {subscription?.is_recurring ? 'configured for recurring billing cycles.' : 'configured as a one-time billing plan.'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="col-lg-5">
                    <div className="hc-surface hc-card-primary shadow p-4 p-lg-5 h-100">
                        <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 hc-text-primary">
                            <MdVerified size={22} /> Plan Limits & Audit
                        </h5>
                        <div className="d-flex align-items-center gap-3 py-2 border-bottom border-light-subtle">
                            <MdStorage size={18} className="hc-text-primary" />
                            <div className="flex-grow-1">
                                <div className="small text-muted">Storage Size</div>
                                <div className="fw-semibold">{subscription?.storage_size ?? 0} GB</div>
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-3 py-2 border-bottom border-light-subtle">
                            <MdGroup size={18} className="hc-text-primary" />
                            <div className="flex-grow-1">
                                <div className="small text-muted">Total Subscribers</div>
                                <div className="fw-semibold">{subscription?.total_subscribers ?? 0}</div>
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-3 py-2">
                            <MdPerson size={18} className="hc-text-primary" />
                            <div className="flex-grow-1">
                                <div className="small text-muted">Created By</div>
                                <div className="fw-semibold">{subscription?.createdBy || '-'}</div>
                            </div>
                        </div>
                        <div className="mt-1 rounded-4 p-3 bg-primary-subtle">
                            <p className="small text-muted mb-1 d-flex align-items-center gap-1">
                                <MdCalendarMonth size={14} /> Reference
                            </p>
                            <p className="mb-0 small text-primary-emphasis">
                                The plan supports monthly and yearly billing with Stripe-linked price IDs.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

