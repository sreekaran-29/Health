import React from "react";
import { MdChevronRight } from "react-icons/md";
import { toast } from "react-toastify";
import { getAllTransactions, downloadInvoice, cancelSubscription } from "../../Services/SubscriptionService";
import { formatUtcToLocalDateTime } from "../../Utils/DateTime";
import { useNavigate } from "react-router-dom";

const STATUS_STYLE = {
    ACTIVE: { backgroundColor: "#15803d", color: "#ffffff" },
    PAID: { backgroundColor: "#15803d", color: "#ffffff" },
    "PAST DUE": { backgroundColor: "#ca8a04", color: "#ffffff" },
    UNPAID: { backgroundColor: "#ca8a04", color: "#ffffff" },
    PENDING: { backgroundColor: "#ca8a04", color: "#ffffff" },
    CANCELLED: { backgroundColor: "#b91c1c", color: "#ffffff" },
    FAILED: { backgroundColor: "#b91c1c", color: "#ffffff" },
    INACTIVE: { backgroundColor: "#4b5563", color: "#ffffff" },
    UNKNOWN: { backgroundColor: "#4b5563", color: "#ffffff" },
};

const toCurrency = (value) => {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        return "-";
    }

    return `$${(amount / 100).toLocaleString()}`;
};

const toText = (value) => {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return String(value);
};

const toCardTail = (value) => {
    const onlyDigits = String(value || "").replace(/\D/g, "");

    if (!onlyDigits) {
        return "-";
    }

    return onlyDigits.slice(-4);
};

const mapTransactions = (rows) =>
    rows.map((item) => {
        const metadata = item?.metadata || {};
        const status = metadata?.payment_status
            ? String(metadata.payment_status).toUpperCase()
            : "UNKNOWN";

        return {
            id: item?.id || "-",
            planName: metadata?.invoice_id || "Invoice",
            clientName: metadata?.stripe_customer_id || "Customer",
            amount: metadata?.amount_paid,
            status,
            invoiceName: item?.name || "-",
            currency: metadata?.currency || "usd",
            invoiceId: metadata?.invoice_id || "-",
            subscriberId: metadata?.subscriber_id || "-",
            stripeCustomerId: metadata?.stripe_customer_id || "-",
            stripeSubscriptionId: metadata?.stripe_subscription_id || "-",
            stripeTransactionId: metadata?.stripe_transaction_id || metadata?.stripe_charge_id || "-",
            transactionDate: metadata?.transaction_date || item?.created_on || null,
            periodStart: metadata?.period_start || null,
            periodEnd: metadata?.period_end || null,
            isCancel: item?.is_cancel === true,
            paymentMethod: metadata?.payment_method || "-",
            cardBrand: metadata?.card_brand || "-",
            cardNumber: metadata?.card_number || "-",
            expMonth: metadata?.exp_month || "-",
            expYear: metadata?.exp_year || "-",
        };
    });

const filterByStatus = (items, status) => {
    if (!status || status === "All") {
        return items;
    }

    return items.filter(
        (item) =>
            String(item.status).toLowerCase() ===
            String(status).toLowerCase()
    );
};

export default function ExpandableTransactionPanel({ token, accountId = null, subId = null, title = "Transactions", subtitle = "Track billing entries and expand a card to inspect details.",}) 
{
    const PAGE_SIZE = 5;
    const navigate = useNavigate();
    const [loading, setLoading] = React.useState(false);
    const [transactions, setTransactions] = React.useState([]);
    const [activeCardId, setActiveCardId] = React.useState(null);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [downloadingId, setDownloadingId] = React.useState(null);
    const [cancellingId, setCancellingId] = React.useState(null);

    const loadTransactions = React.useCallback(async () => {
        if (!token) {
            setTransactions([]);
            setActiveCardId(null);
            return;
        }
        try {
            setLoading(true);
            const response = await getAllTransactions(subId,accountId,token);
            if (response?.is_success === false) {
                setTransactions([]);
                setActiveCardId(null);
                toast.error(response?.message || "Failed to load transactions");
                return;
            }
            const rows = Array.isArray(response?.data) ? response.data : [];
            const mapped = mapTransactions(rows);
            setTransactions(mapped);
            setActiveCardId((current) => current && mapped.some((item) => item.id === current) ? current: null);
        } catch (error) {
            console.error(error);
            setTransactions([]);
            setActiveCardId(null);
            toast.error("Unable to fetch transaction details");
        } finally {
            setLoading(false);
        }
    }, [accountId, subId, token]);

    React.useEffect(() => {
        loadTransactions();
    }, [loadTransactions]);

    const totalPages = Math.ceil(transactions.length / PAGE_SIZE);
    const pagedTransactions = transactions.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const handleToggleCard = (id) => {
        setActiveCardId((current) => (current === id ? null : id));
    };

    const handleCancelSubscription = async (item) => {
        if (!item.stripeSubscriptionId || item.stripeSubscriptionId === "-") return;
        try {
            setCancellingId(item.id);
            const response = await cancelSubscription(item.subscriberId, token);
            if (response?.is_success) {
                toast.success(response?.message || "Subscription cancelled successfully");
                await loadTransactions();
                navigate(-1);

            } else if (response?.status_code === 500) {
                toast.error("Internal Server Error. Please Contact Support Team.");
            } else {
                toast.error(response?.message || "Failed to cancel subscription");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to cancel subscription");
        } finally {
            setCancellingId(null);
        }
    };

    const handleDownloadInvoice = async (item) => {
        if (!item.invoiceName || item.invoiceName === "-") return;
        try {
            setDownloadingId(item.id);
            const response = await downloadInvoice(item.id, token);
            if (response?.is_success) {
                const dataUrl = response.data;
                const [meta, base64] = dataUrl.split(",");
                const datatype = meta.split(":")[1].split(";")[0];
                const byteCharacters = atob(base64);
                const byteArray = new Uint8Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteArray[i] = byteCharacters.charCodeAt(i);
                }
                const blob = new Blob([byteArray], { type: datatype });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = item.invoiceName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                toast.success("Invoice downloaded successfully");
            }
            else if (response?.is_success === false && response?.status_code === 500) {
                toast.error("Internal Server Error. Please Contact Support Team.");
                return;
            } else{
                toast.error(response?.message || "Failed to download invoice");
                return;
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to download invoice");
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div className="hc-surface hc-card-primary mt-3">
            <div className="card-body p-3 p-md-4">

                <div className="mb-4">
                    <h4 className="fw-bold mb-1">{title}</h4>
                    <p className="text-muted mb-0 small">{subtitle}</p>
                </div>

                {loading ? (
                    <div className="d-flex flex-column gap-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="card border rounded-3 shadow-sm">
                                <div className="card-body p-3 p-md-4">
                                    <div className="d-flex align-items-start gap-3">
                                        <div className="skeleton flex-shrink-0" style={{ width: 52, height: 52, borderRadius: 12 }} />
                                        <div className="flex-grow-1">
                                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                                                <div>
                                                    <div className="skeleton mb-2" style={{ height: 18, width: 160, borderRadius: 6 }} />
                                                    <div className="skeleton" style={{ height: 14, width: 110, borderRadius: 6 }} />
                                                </div>
                                                <div>
                                                    <div className="skeleton mb-1" style={{ height: 12, width: 72, borderRadius: 4 }} />
                                                    <div className="skeleton" style={{ height: 16, width: 60, borderRadius: 4 }} />
                                                </div>
                                                <div>
                                                    <div className="skeleton mb-1" style={{ height: 12, width: 56, borderRadius: 4 }} />
                                                    <div className="skeleton" style={{ height: 16, width: 44, borderRadius: 4 }} />
                                                </div>
                                                <div className="skeleton" style={{ height: 28, width: 64, borderRadius: 999 }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-5">
                        <div className="text-muted fs-1 mb-2">🧾</div>
                        <p className="text-muted fw-semibold mb-0">No transactions found.</p>
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-3">
                        {pagedTransactions.map((item) => {
                            const isOpen = activeCardId === item.id;
                            const statusVisual = STATUS_STYLE[item.status.toUpperCase()] || STATUS_STYLE.UNKNOWN;

                            return (
                                <div
                                    key={item.id}
                                    className={`card border rounded-3 ${isOpen ? "shadow border-primary border-opacity-50" : "shadow-sm"}`}
                                    tabIndex={0}
                                    style={{ cursor: "pointer", transition: "box-shadow .2s ease, border-color .2s ease" }}
                                    onClick={() => handleToggleCard(item.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            handleToggleCard(item.id);
                                        }
                                    }}
                                >
                                    <div className="card-body p-3 p-md-4">

                                        <div className="d-flex align-items-start gap-3">
                                            <div
                                                className="d-inline-flex align-items-center justify-content-center rounded-3 flex-shrink-0 fw-bold fs-5 bg-primary bg-opacity-10 text-primary"
                                                style={{ width: 52, height: 52 }}
                                            >
                                                {String(item.planName).charAt(0).toUpperCase()}
                                            </div>

                                            <div className="flex-grow-1 w-100">
                                                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                                                    <div>
                                                        <h6 className="mb-0 text-break">{item.planName}</h6>
                                                        <p className="mb-0 text-secondary small text-break">{item.clientName}</p>
                                                    </div>
                                                    <div>
                                                        <div className="small text-muted">Amount Paid</div>
                                                        <div className="fw-semibold">{toCurrency(item.amount)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="small text-muted">Currency</div>
                                                        <div className="fw-semibold text-uppercase">{toText(item.currency)}</div>
                                                    </div>
                                                    <span className="badge rounded-pill px-3 py-2" style={statusVisual}>
                                                        {item.status}
                                                    </span>
                                                </div>

                                            </div>
                                        </div>

                                        {/* ── Expanded detail ── */}
                                        {isOpen && (
                                            <div className="mt-4 pt-3 border-top">
                                                <div className="row g-3 small">

                                                    {/* Transaction */}
                                                    <div className="col-12 col-md-6 col-lg-4 col-xl-3">
                                                        <div className="rounded-3 h-100 p-3 bg-primary bg-opacity-10">
                                                            <h6 className="fw-bold text-primary mb-3">Transaction</h6>
                                                            <div className="mb-2">
                                                                <div className="small text-muted mb-1">Amount Paid</div>
                                                                <div className="fw-semibold">{toCurrency(item.amount)}</div>
                                                            </div>
                                                            <div className="mb-2">
                                                                <div className="small text-muted mb-1">Currency</div>
                                                                <div className="fw-semibold text-uppercase">{toText(item.currency)}</div>
                                                            </div>
                                                            <div className="mb-2">
                                                                <div className="small text-muted mb-1">Status</div>
                                                                <span className="badge rounded-pill px-2 py-1" style={statusVisual}>{toText(item.status)}</span>
                                                            </div>
                                                            <div>
                                                                <div className="small text-muted mb-1">Transaction Date</div>
                                                                <div className="fw-semibold">
                                                                    {item.transactionDate ? formatUtcToLocalDateTime(item.transactionDate) : "-"}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Card */}
                                                    <div className="col-12 col-md-6 col-lg-4 col-xl-3">
                                                        <div className="rounded-3 h-100 p-3 bg-success bg-opacity-10">
                                                            <h6 className="fw-bold text-success mb-3">Card</h6>
                                                            <div className="mb-2">
                                                                <div className="small text-muted mb-1">Brand</div>
                                                                <div className="fw-semibold text-uppercase">{toText(item.cardBrand)}</div>
                                                            </div>
                                                            <div className="mb-2">
                                                                <div className="small text-muted mb-1">Number</div>
                                                                <div className="fw-semibold">****{toCardTail(item.cardNumber)}</div>
                                                            </div>
                                                            <div className="mb-2">
                                                                <div className="small text-muted mb-1">Expiry</div>
                                                                <div className="fw-semibold">{toText(item.expMonth)}/{toText(item.expYear)}</div>
                                                            </div>
                                                            <div>
                                                                <div className="small text-muted mb-1">Payment Method</div>
                                                                <div className="fw-semibold text-capitalize">{toText(item.paymentMethod)}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* IDs */}
                                                    <div className="col-12 col-md-6 col-lg-4 col-xl-3">
                                                        <div className="rounded-3 h-100 p-3 bg-warning bg-opacity-10">
                                                            <h6 className="fw-bold text-warning mb-3">ID's</h6>
                                                            <div className="mb-2">
                                                                <div className="small text-muted mb-1">Invoice ID</div>
                                                                <div className="fw-semibold text-break">{toText(item.invoiceId)}</div>
                                                            </div>
                                                            <div className="mb-2">
                                                                <div className="small text-muted mb-1">Customer ID</div>
                                                                <div className="fw-semibold text-break">{toText(item.stripeCustomerId)}</div>
                                                            </div>
                                                            <div className="mb-2">
                                                                <div className="small text-muted mb-1">Subscription ID</div>
                                                                <div className="fw-semibold text-break">{toText(item.stripeSubscriptionId)}</div>
                                                            </div>
                                                            <div>
                                                                <div className="small text-muted mb-1">Transaction ID</div>
                                                                <div className="fw-semibold text-break">{toText(item.stripeTransactionId)}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="col-12 col-md-6 col-lg-12 col-xl-3">
                                                        <div className="rounded-3 h-100 p-3 bg-info bg-opacity-10 d-flex flex-column justify-content-between">
                                                            <h6 className="fw-bold text-info mb-3">Actions</h6>
                                                            <div>
                                                                <button
                                                                    className="btn btn-primary w-100 mb-2"
                                                                    disabled={!item.invoiceName || item.invoiceName === "-" || downloadingId === item.id}
                                                                    onClick={(e) => { e.stopPropagation(); handleDownloadInvoice(item); }}
                                                                >
                                                                    {downloadingId === item.id ? (
                                                                        <>
                                                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                                                                            Downloading…
                                                                        </>
                                                                    ) : "Download Invoice"}
                                                                </button>
                                                                {item.isCancel && (
                                                                    <button
                                                                        className="btn btn-outline-danger w-100 mb-2"
                                                                        disabled={cancellingId === item.id}
                                                                        onClick={(e) => { e.stopPropagation(); handleCancelSubscription(item); }}
                                                                    >
                                                                        {cancellingId === item.id ? (
                                                                            <>
                                                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                                                                                Cancelling…
                                                                            </>
                                                                        ) : "Cancel Subscription"}
                                                                    </button>
                                                                )}
                                                                <div className="small text-muted">Click another card to auto-collapse.</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* ── Pagination ── */}
                        {transactions.length > PAGE_SIZE && (
                            <div className="d-flex justify-content-between align-items-center pt-2 mt-1 border-top">
                                <span className="small text-muted">
                                    Page {currentPage} of {totalPages} &nbsp;·&nbsp; {transactions.length} transactions
                                </span>
                                <div className="d-flex gap-2">
                                    <button
                                        className="btn btn-sm btn-outline-secondary"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage((p) => p - 1)}
                                    >
                                        ‹ Prev
                                    </button>
                                    <button
                                        className="btn btn-sm btn-outline-secondary"
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage((p) => p + 1)}
                                    >
                                        Next ›
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}