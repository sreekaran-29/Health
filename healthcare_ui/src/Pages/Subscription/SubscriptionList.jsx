import * as React from 'react';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import {
	MdCheckCircle,
	MdClose,
	MdDelete,
	MdEdit,
	MdLayers,
	MdPauseCircle,
	MdSearch,
	MdVisibility,
	MdAdd,
} from 'react-icons/md';
import { toast } from 'react-toastify';
import DataGrid from '../../Components/Table/DataGrid';
import DeleteModel from '../../Components/Common/DeleteModel';
import { useAuth } from '../../Context/AuthContext';
import { getAllSubscriptions, deleteSubscriptionById } from '../../Services/SubscriptionService';
import { useNavigate } from 'react-router-dom';
import { APPRoutes } from '../../Utils/Route';

const STATUS_OPTIONS = ['All', 'Active', 'Inactive'];

const STATUS_BADGE_STYLE = {
	Active: { backgroundColor: '#dcfce7', color: '#15803d' },
	Inactive: { backgroundColor: '#f3f4f6', color: '#4b5563' },
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

const getPriceByBillingMethod = (priceDetails, billingMethod) => {
	if (!Array.isArray(priceDetails)) {
		return null;
	}

	const entry = priceDetails.find(
		(detail) => detail?.billing_method?.toLowerCase() === billingMethod,
	);

	return entry?.price ?? null;
};

export default function SubscriptionList() {
	const navigate = useNavigate();
	const { token } = useAuth();

	const [search, setSearch] = React.useState('');
	const [status, setStatus] = React.useState('All');
	const [rows, setRows] = React.useState([]);
	const [summary, setSummary] = React.useState(null);
	const [loading, setLoading] = React.useState(false);
	const [selectedSubscription, setSelectedSubscription] = React.useState(null);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
	const [isDeleting, setIsDeleting] = React.useState(false);
	const [deleteError, setDeleteError] = React.useState('');

	const loadSubscriptions = React.useCallback(async () => {
		if (!token) {
			setRows([]);
			setSummary(null);
			return;
		}
		try {
			setLoading(true);
			const response = await getAllSubscriptions(token);
			if (response?.is_success) {
				const subscriptions = response?.data?.subscriptions ?? [];
				setRows(subscriptions);
				setSummary({
					total: response?.data?.total_subscriptions,
					active: response?.data?.active_subscriptions,
					inactive: response?.data?.inactive_subscriptions,
				});
			} else if(response?.is_success === false && response?.status_code === 500) {
				toast.error('Internal Server Error. Please Contact Support Team.');
				setRows([]);
				setSummary(null);
			} else {
				toast.error(response?.message || 'Failed to load subscriptions.');
				setRows([]);
				setSummary(null);
			}
		} catch (error) {
			console.error(error);
			setRows([]);
			setSummary(null);
		} finally {
			setLoading(false);
		}
	}, [token]);

	React.useEffect(() => {
		loadSubscriptions();
	}, [loadSubscriptions]);

	const handleOpenDeleteModal = React.useCallback((subscription) => {
		if (Number(subscription?.active_subscribers) > 0) {
			toast.error('Subscription has active users');
			return;
		}

		setSelectedSubscription(subscription);
		setDeleteError('');
		setIsDeleteModalOpen(true);
	}, []);

	const handleCloseDeleteModal = React.useCallback(() => {
		if (isDeleting) {
			return;
		}

		setIsDeleteModalOpen(false);
		setSelectedSubscription(null);
		setDeleteError('');
	}, [isDeleting]);

	const handleConfirmDelete = React.useCallback(async () => {
		if (!token || !selectedSubscription?.id) {
			setDeleteError('Subscription details are missing.');
			return;
		}

		try {
			setIsDeleting(true);
			setDeleteError('');
			const response = await deleteSubscriptionById(selectedSubscription.id, token);

			if (response?.is_success) {
				toast.success(response?.message || 'Subscription deleted successfully.');
				handleCloseDeleteModal();
				await loadSubscriptions();
				return;
			} else if(response?.is_success === false && response?.status_code === 500) {
				toast.error('Internal Server Error. Please Contact Support Team.');
				setDeleteError('Failed to delete subscription due to server error.');
			} else {
				toast.error(response?.message || 'Failed to delete subscription.');
				setDeleteError(response?.message || 'Failed to delete subscription.');
			}
		} catch (error) {
			console.error(error);
			setDeleteError('An error occurred while deleting subscription.');
		} finally {
			setIsDeleting(false);
		}
	}, [token, selectedSubscription, handleCloseDeleteModal, loadSubscriptions]);

	const columns = React.useMemo(
		() => [
			{
				id: 'name',
				label: 'Plan',
				minWidth: 200,
				format: (value, row) => (
					<div className="d-flex flex-column">
						<span className="fw-bold text-dark" style={{ fontSize: '1.02rem' }}>
							{value || '-'}
						</span>
						<small className="text-muted">
							{row?.description || '-'}
						</small>
					</div>
				),
			},
			{
				id: 'price_details',
				label: 'Pricing',
				minWidth: 170,
				format: (value, row) => {
					const monthlyPrice = getPriceByBillingMethod(value, 'monthly');
					const yearlyPrice = getPriceByBillingMethod(value, 'yearly');
					const defaultBilling = Array.isArray(row?.billing_method)
						? row.billing_method[0]
						: null;

					return (
						<div className="d-flex flex-column">
							<span className="text-dark">
								{monthlyPrice !== null ? `$${monthlyPrice} / mo` : '-'}
							</span>
							<span className="text-dark">
								{yearlyPrice !== null ? `$${yearlyPrice} / yr` : '-'}
							</span>
							<span className="text-secondary">
								{defaultBilling ? `Default: ${defaultBilling}` : 'Default: -'}
							</span>
						</div>
					);
				},
			},
			{
				id: 'limits',
				label: 'Limits',
				minWidth: 170,
				format: (_value, row) => (
					<div className="d-flex flex-column text-dark">
						<span>Patients: 1 - {row?.patients_limit ?? 0}</span>
						<span>Doctors: {row?.doctors_limit ?? 0}</span>
						<span>Storage: {row?.storage_size ?? 0} GB</span>
					</div>
				),
			},
			{
				id: 'statusLabel',
				label: 'Status',
				minWidth: 140,
				align: 'center',
				format: (value) => (
					<span
						className="badge rounded-pill fw-bolder px-3 py-2 text-center"
						style={{
							minWidth: '96px',
							...(STATUS_BADGE_STYLE[value] || {
								backgroundColor: '#e5e7eb',
								color: '#374151',
							}),
						}}
					>
						{value}
					</span>
				),
			},
			{
				id: 'createdBy',
				label: 'CreatedBy',
				minWidth: 140,
				format: (value) => value || '-',
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
							title={`View ${row?.name || 'plan'}`}
							className="btn btn-sm p-1 lh-1 text-primary"
							style={{ backgroundColor: '#e0f2fe', border: 'none', borderRadius: '6px' }}
							onClick={() =>
								navigate(APPRoutes.SUBSCRIPTION_VIEW.replace(':id', row.id), {
									state: { subscription: row },
								})
							}
						>
							<MdVisibility size={16} />
						</button>
						<button
							type="button"
							title={`Edit ${row?.name || 'plan'}`}
							className="btn btn-sm p-1 lh-1 hc-text-primary"
							style={{ backgroundColor: '#e6ecfb', border: 'none', borderRadius: '6px' }}
							onClick={() =>
								navigate(APPRoutes.SUBSCRIPTION_EDIT.replace(':id', row.id))
							}
						>
							<MdEdit size={16} />
						</button>
						<button
							type="button"
							title={`Delete ${row?.name || 'plan'}`}
							className="btn btn-sm p-1 lh-1 text-danger"
							style={{ backgroundColor: '#fee2e2', border: 'none', borderRadius: '6px' }}
							onClick={() => handleOpenDeleteModal(row)}
						>
							<MdDelete size={16} />
						</button>
					</div>
				),
			},
		],
		[navigate, handleOpenDeleteModal],
	);

	const mappedRows = React.useMemo(
		() => rows.map((subscription) => ({
			...subscription,
			statusLabel: getStatusLabel(subscription),
		})),
		[rows],
	);

	const filteredRows = React.useMemo(() => {
		const term = search.trim().toLowerCase();

		return mappedRows.filter((row) => {
			const matchesStatus = status === 'All' || row.statusLabel === status;

			const matchesSearch =
				!term ||
				row.name?.toLowerCase().includes(term) ||
				row.description?.toLowerCase().includes(term) ||
				row.createdBy?.toLowerCase().includes(term);

			return matchesStatus && matchesSearch;
		});
	}, [mappedRows, search, status]);

	const stats = React.useMemo(() => {
		const activeByRows = mappedRows.filter((row) => row.statusLabel === 'Active').length;
		const inactiveByRows = mappedRows.filter((row) => row.statusLabel === 'Inactive').length;

		const total = Number(summary?.total);
		const active = Number(summary?.active);
		const inactive = Number(summary?.inactive);

		return [
			{
				label: 'Total Subscriptions',
				value: Number.isFinite(total) ? total : mappedRows.length,
				icon: <MdLayers size={20} color="#1f3b8a" />,
				iconBg: '#e6ecfb',
				accentClass: 'border-primary',
				valueClass: 'text-primary',
			},
			{
				label: 'Active Subscriptions',
				value: Number.isFinite(active) ? active : activeByRows,
				icon: <MdCheckCircle size={20} color="#16a34a" />,
				iconBg: '#e7f7ec',
				accentClass: 'border-success',
				valueClass: 'text-success',
			},
			{
				label: 'Inactive Subscriptions',
				value: Number.isFinite(inactive) ? inactive : inactiveByRows,
				icon: <MdPauseCircle size={20} color="#ca8a04" />,
				iconBg: '#fef6c7',
				accentClass: 'border-secondary',
				valueClass: 'text-secondary',
			},
		];
	}, [mappedRows, summary]);

	return (
		<>
			<div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
				<div>
					<h4 className="fw-bold mb-1 hc-text-primary fs-3">Manage Plans</h4>
					<p className="text-secondary mb-0 small">
						Manage healthcare subscription plans and billing limits
					</p>
				</div>
				<button
					type="button"
					className="btn hc-bg-primary text-white fw-semibold px-4 d-inline-flex align-items-center justify-content-center gap-2"
					onClick={() => navigate(APPRoutes.SUBSCRIPTION_CREATE)}
				>
					<MdAdd size={20} />
					<span>Create Plan</span>
				</button>
			</div>

			{loading ? (
				<div className="row g-3 mb-3">
					{[1, 2, 3].map((_, index) => (
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
								placeholder="Search Plan By Name, Description or CreatedBy"
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
							<InputLabel id="subscription-status-label">Status</InputLabel>
							<Select
								labelId="subscription-status-label"
								label="Status"
								value={status}
								onChange={(event) => setStatus(event.target.value)}
							>
								{STATUS_OPTIONS.map((option) => (
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
									<div className="skeleton" style={{ height: 16, width: '24%' }} />
									<div className="skeleton" style={{ height: 16, width: '20%' }} />
									<div className="skeleton" style={{ height: 16, width: '20%' }} />
									<div className="skeleton" style={{ height: 16, width: '12%' }} />
									<div className="skeleton" style={{ height: 16, width: '12%' }} />
									<div className="skeleton" style={{ height: 16, width: '12%' }} />
								</div>
							))}
						</div>
					) : (
						<DataGrid
							columns={columns}
							rows={filteredRows}
							defaultRowsPerPage={5}
							stickyHeader
							getRowId={(row) => row.id}
						/>
					)}
				</div>
			</div>

			<DeleteModel
				isOpen={isDeleteModalOpen}
				title="Delete subscription"
				description="This will permanently delete this subscription. This action cannot be undone."
				entityLabel="subscription"
				itemName={selectedSubscription?.name || '-'}
				confirmText="Delete"
				onConfirm={handleConfirmDelete}
				onClose={handleCloseDeleteModal}
				isLoading={isDeleting}
				errorMessage={deleteError}
			/>
		</>
	);
}
