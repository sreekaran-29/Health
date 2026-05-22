import * as React from 'react';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import {
	MdAttachMoney,
	MdCheckCircle,
	MdClose,
	MdPauseCircle,
	MdPeople,
	MdSearch,
	MdVisibility,
	MdAdd,
} from 'react-icons/md';
import DataGrid from '../../Components/Table/DataGrid';
import CreatePaymentLinkModal from '../../Components/Subscription/CreatePaymentLinkModal';
import { useAuth } from '../../Context/AuthContext';
import { getAllSubscribers } from '../../Services/SubscriptionService';
import { useNavigate } from 'react-router-dom';
import { APPRoutes } from '../../Utils/Route';
import { toast } from 'react-toastify';

const PAYMENT_STATUS_OPTIONS = ['All', 'Paid', 'Unpaid', 'Cancelled', 'Expired'];

const SUBSCRIPTION_STATUS_BADGE_STYLE = {
	Active: { backgroundColor: '#dcfce7', color: '#16a34a' },
	Inactive: { backgroundColor: '#f3f4f6', color: '#4b5563' },
};

const PAYMENT_STATUS_BADGE_STYLE = {
	Paid: { backgroundColor: '#dcfce7', color: '#16a34a' },
	Unpaid: { backgroundColor: '#fef3c7', color: '#d97706' },
	Cancelled: { backgroundColor: '#fee2e2', color: '#dc2626' },
	Expired: { backgroundColor: '#f3f4f6', color: '#6b7280' },
};

const mapPaymentStatusIdToName = (paymentStatusId) => {
	const mapping = {
		13: 'Paid',
		14: 'Unpaid',
		15: 'Cancelled',
		16: 'Expired',
	};
	return mapping[paymentStatusId] || 'Unknown';
};

export default function SubscribersList() {
	const navigate = useNavigate();
	const { token } = useAuth();

	const [search, setSearch] = React.useState('');
	const [paymentStatus, setPaymentStatus] = React.useState('All');
	const [rows, setRows] = React.useState([]);
	const [summary, setSummary] = React.useState(null);
	const [loading, setLoading] = React.useState(false);
	const [isPaymentLinkModalOpen, setIsPaymentLinkModalOpen] = React.useState(false);

	const loadSubscribers = React.useCallback(async () => {
		if (!token) {
			setRows([]);
			setSummary(null);
			return;
		}
		try {
			setLoading(true);
			const response = await getAllSubscribers(token);

			if (response?.is_success) {
				const subscribers = Array.isArray(response?.data?.subscribers) ? response.data.subscribers : [];
				setRows(subscribers);
				setSummary({
					total: response?.data?.total_subscribers,
					active: response?.data?.active_subscribers,
					inactive: response?.data?.inactive_subscribers,
					monthly_revenue: response?.data?.monthly_revenue,
				});
			} else if(response?.is_success === false && response?.status_code === 500) {
				toast.error('Internal Server Error. Please Contact Support Team.');
				setRows([]);
				setSummary(null);
			} else {
				toast.error(response?.message || 'Failed to load subscribers');
				setRows([]);
				setSummary(null);
			}
		} catch (error) {
			toast.error('An error occurred while loading subscribers');
			console.error(error);
			setRows([]);
			setSummary(null);
		} finally {
			setLoading(false);
		}
	}, [token]);

	React.useEffect(() => {
		loadSubscribers();
	}, [loadSubscribers]);

	const columns = React.useMemo(
		() => [
			{
				id: 'client_name',
				label: 'Client',
				minWidth: 250,
				format: (value, row) => row?.client?.name || '-',
			},
			{
				id: 'subscription_plan_name',
				label: 'Subscription',
				minWidth: 10,
				format: (value, row) => row?.subscription_plan?.name || '-',
			},
			{
				id: 'price',
				label: 'Price',
				minWidth: 10,
				align: 'right',
				format: (value, row) => {
					const price = row?.subscription_price?.price;
					if (!price) return '-';
					return `$${price}`;
				},
			},
			{
				id: 'payment_status_name',
				label: 'Status',
				minWidth: 150,
				align: 'center',
				format: (value) => (
					<span
						className="badge rounded-pill fw-bolder px-3 py-2 text-center"
						style={{
							minWidth: '96px',
							...(PAYMENT_STATUS_BADGE_STYLE[value] || {
								backgroundColor: '#e5e7eb',
								color: '#374151',
							}),
						}}
					>
						{value || '-'}
					</span>
				),
			},
			{
				id: 'billing_method',
				label: 'Billing Method',
				minWidth: 150,
				align: 'center',
				format: (value, row) => {
					const billingMethod = row?.subscription_price?.billing_method;
					return billingMethod ? (
						<span className="text-uppercase fw-semibold" style={{ fontSize: '0.85rem' }}>
							{billingMethod}
						</span>
					) : (
						'-'
					);
				},
			},
			{
				id: 'actions',
				label: 'Actions',
				minWidth: 150,
				align: 'center',
				format: (_value, row) => (
					<div className="d-flex align-items-center justify-content-center gap-2">
						<button
							type="button"
							title="View subscriber"
							className="btn btn-sm p-1 lh-1 text-primary"
							style={{ backgroundColor: '#e0f2fe', border: 'none', borderRadius: '6px' }}
							onClick={() =>
								navigate(APPRoutes.SUBSCRIPTION_SUBSCRIBER_VIEW.replace(':id', row.id), {
									state: { subscriber: row },
								})
							}
						>
							<MdVisibility size={16} />
						</button>
					</div>
				),
			},
		],
		[navigate],
	);

	const mappedRows = React.useMemo(() => {
		return rows.map((subscriber) => ({
			...subscriber,
			paymentStatusName: mapPaymentStatusIdToName(subscriber?.payment_status_id),
		}));
	}, [rows]);

	const filteredRows = React.useMemo(() => {
		const term = search.trim().toLowerCase();

		return mappedRows.filter((row) => {
			const matchesPaymentStatus =
				paymentStatus === 'All' || row.paymentStatusName === paymentStatus;

			const matchesSearch =
				!term ||
				row.client?.name?.toLowerCase().includes(term) ||
				row.subscription_plan?.name?.toLowerCase().includes(term);

			return matchesPaymentStatus && matchesSearch;
		});
	}, [mappedRows, search, paymentStatus]);

	const stats = React.useMemo(() => {
		const total = Number(summary?.total);
		const active = Number(summary?.active);
		const inactive = Number(summary?.inactive);
		const monthlyRevenue = Number(summary?.monthly_revenue);

		return [
			{
				label: 'Total Subscribers',
				value: Number.isFinite(total) ? total : mappedRows.length,
				icon: <MdPeople size={20} color="#1f3b8a" />,
				iconBg: '#e6ecfb',
				accentClass: 'border-primary',
				valueClass: 'text-primary',
			},
			{
				label: 'Active Subscribers',
				value: Number.isFinite(active) ? active : 0,
				icon: <MdCheckCircle size={20} color="#16a34a" />,
				iconBg: '#e7f7ec',
				accentClass: 'border-success',
				valueClass: 'text-success',
			},
			{
				label: 'Inactive Subscribers',
				value: Number.isFinite(inactive) ? inactive : 0,
				icon: <MdPauseCircle size={20} color="#ca8a04" />,
				iconBg: '#fef6c7',
				accentClass: 'border-secondary',
				valueClass: 'text-secondary',
			},
			{
				label: 'Monthly Revenue',
				value: Number.isFinite(monthlyRevenue) ? `$${monthlyRevenue}` : '$0',
				icon: <MdAttachMoney size={20} color="#059669" />,
				iconBg: '#d1fae5',
				accentClass: 'border-success',
				valueClass: 'text-success',
			},
		];
	}, [mappedRows, summary]);

	return (
		<>
			<div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
				<div>
					<h4 className="fw-bold mb-1 hc-text-primary fs-3">Subscribers</h4>
					<p className="text-secondary mb-0 small">
						Manage active and inactive subscription enrollments
					</p>
				</div>
				<div className="d-flex">
					<button
						type="button"
						className="btn hc-bg-primary mt-md-0 mt-2 w-md-auto btn-sm text-white fw-semibold d-flex align-items-center justify-content-center gap-1 px-3 py-2 rounded-3 text-nowrap"
						onClick={() => setIsPaymentLinkModalOpen(true)}
					>
						<MdAdd size={20} />
						<span>Create Payment Link</span>
					</button>
				</div>
			</div>

			{loading ? (
				<div className="row g-3 mb-3">
					{[1, 2, 3, 4].map((_, index) => (
						<div key={index} className="col-12 col-sm-6 col-xl">
							<div className="bg-white p-4 rounded-4 shadow">
								<div className="skeleton mb-2" style={{ height: 16, width: '60%' }} />
								<div className="skeleton" style={{ height: 28, width: '35%' }} />
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="row g-3 mb-3">
					{stats.map((stat) => (
						<div key={stat.label} className="col-12 col-sm-6 col-xl">
							<div className="position-relative overflow-hidden bg-white p-4 rounded-4 shadow d-flex align-items-center gap-3 h-100">
								<div
									className={`position-absolute start-0 top-0 h-100 border-start border-5 ${stat.accentClass}`}
								/>
								<div
									className="d-inline-flex align-items-center justify-content-center rounded-3"
									style={{ width: 44, height: 44, backgroundColor: stat.iconBg }}
								>
									{stat.icon}
								</div>
								<div className="d-flex flex-column fw-bold lh-sm">
									<span className="text-dark" style={{ fontSize: '0.85rem' }}>
										{stat.label}
									</span>
									<span className={`fw-bold ${stat.valueClass}`} style={{ fontSize: '1.25rem' }}>
										{stat.value}
									</span>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			<div className="bg-white rounded-3 shadow-lg p-3 p-md-4">
				<div className="row g-2 mb-3">
					<div className="col-12 col-md-9">
						<div className="position-relative">
							<span
								className="position-absolute top-50 translate-middle-y d-inline-flex align-items-center justify-content-center text-secondary"
								style={{ left: '12px', pointerEvents: 'none' }}
							>
								<MdSearch size={18} />
							</span>
							<input
								type="text"
								className="form-control form-control-sm hc-input"
								placeholder="Search by Client Name or Subscription Name"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								style={{ paddingLeft: '36px', paddingRight: '36px', height: '40px' }}
							/>
							{search ? (
								<button
									type="button"
									aria-label="Clear search"
									onClick={() => setSearch('')}
									className="btn btn-link bg-danger p-0 position-absolute top-50 translate-middle-y text-light rounded-circle"
									style={{ right: '8px', lineHeight: 0 }}
								>
									<MdClose size={18} />
								</button>
							) : null}
						</div>
					</div>

					<div className="col-12 col-md-3">
						<FormControl fullWidth size="small">
							<InputLabel id="payment-status-label">Payment Status</InputLabel>
							<Select
								labelId="payment-status-label"
								label="Payment Status"
								value={paymentStatus}
								onChange={(event) => setPaymentStatus(event.target.value)}
							>
								{PAYMENT_STATUS_OPTIONS.map((option) => (
									<MenuItem key={option} value={option}>
										{option}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					</div>
				</div>

				<div className="bg-white p-3 rounded shadow">
					{loading ? (
						<div>
							{[...Array(6)].map((_, index) => (
								<div key={index} className="d-flex gap-3 align-items-center mb-3">
									<div className="skeleton" style={{ height: 16, width: '20%' }} />
									<div className="skeleton" style={{ height: 16, width: '20%' }} />
									<div className="skeleton" style={{ height: 16, width: '12%' }} />
									<div className="skeleton" style={{ height: 16, width: '15%' }} />
									<div className="skeleton" style={{ height: 16, width: '18%' }} />
									<div className="skeleton" style={{ height: 16, width: '10%' }} />
								</div>
							))}
						</div>
					) : (
						<DataGrid
							columns={columns}
							rows={filteredRows}
							defaultRowsPerPage={10}
							stickyHeader
							getRowId={(row) => row.id}
						/>
					)}
				</div>
			</div>

			<CreatePaymentLinkModal
				isOpen={isPaymentLinkModalOpen}
				token={token}
				onClose={() => setIsPaymentLinkModalOpen(false)}
				onRedirect={(subscriberId) =>
					navigate(APPRoutes.SUBSCRIPTION_SUBSCRIBER_VIEW.replace(':id', subscriberId))
				}
			/>
		</>
	);
}

