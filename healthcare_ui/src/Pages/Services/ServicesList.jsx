import * as React from 'react';
import { MdAdd, MdShield, MdCheckCircle, MdClose, MdDelete, MdEdit, MdPauseCircle, MdSearch, MdVisibility } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import DataGrid from '../../Components/Table/DataGrid';
import DeleteModel from '../../Components/Common/DeleteModel';
import { getAllServices, deleteService, getServiceById, saveService } from '../../Services/ServicesService';
import { getAllClientNames } from '../../Services/ClientService';
import ServiceFormModal from '../../Components/Services/ServiceFormModal';
import { useAuth } from '../../Context/AuthContext';
import { APPRoutes } from '../../Utils/Route';
import { toast } from 'react-toastify';

const STATUS_OPTIONS = ['All', 'Active', 'Inactive'];
const STATUS_BADGE_STYLE = {
	Active: { backgroundColor: '#dcfce7', color: '#16a34a' },
	Inactive: { backgroundColor: '#f1f3f5', color: '#6b7280' },
};

export default function ServicesList() {
	const navigate = useNavigate();
	const { token, decodedToken } = useAuth();
	const isSuperAdmin = !!decodedToken?.is_super_admin;

	const [search, setSearch] = React.useState('');
	const [status, setStatus] = React.useState('All');
	const [rows, setRows] = React.useState([]);
	const [statusSummary, setStatusSummary] = React.useState(null);
	const [formModalOpen, setFormModalOpen] = React.useState(false);
	const [formModalLoading, setFormModalLoading] = React.useState(false);
	const [formInitialValues, setFormInitialValues] = React.useState({});
	const [clients, setClients] = React.useState([]);
	const [clientsLoading, setClientsLoading] = React.useState(false);
	const [loading, setLoading] = React.useState(false);
	const [deleteTarget, setDeleteTarget] = React.useState(null);
	const [deleteLoading, setDeleteLoading] = React.useState(false);
	const [deleteError, setDeleteError] = React.useState('');

	const loadServices = React.useCallback(async () => {
		try {
			setLoading(true);
			const response = await getAllServices(token);
			if (response?.is_success) {
				const services = Array.isArray(response?.data?.Services) ? response.data.Services : [];
				setRows(services);
				setStatusSummary({
					Total: response?.data?.TotalServices ?? services.length,
					Active: response?.data?.ActiveServices ?? 0,
					Inactive: response?.data?.InactiveServices ?? 0,
				});
			} else if (response?.is_success === false && response?.status_code === 500) {
				toast.error('Internal server error. Please Contact Support Team.');
				setRows([]);
				setStatusSummary(null);
			} else {
				toast.error(response?.message || 'Failed to load services');
				setRows([]);
				setStatusSummary(null);
			}
		} catch (error) {
			console.error(error);
			toast.error(error.message || 'Failed to load services');
			setRows([]);
			setStatusSummary(null);
		} finally {
			setLoading(false);
		}
	}, [token]);

	React.useEffect(() => {
		if (token) {
			loadServices();
		}
	}, [token, loadServices]);

	const loadClients = React.useCallback(async () => {
		try {
			setClientsLoading(true);
			const response = await getAllClientNames(token);
			if(response?.is_success){
				setClients(Array.isArray(response?.data) ? response.data : []);
			} else if(response?.is_success === false && response?.status_code === 500) {
				toast.error('Internal server error. Please Contact Support Team.');
				setClients([]);
			} else {
				toast.error(response?.message || 'Failed to load clients');
				setClients([]);
			}
		} catch (error) {
			setClients([]);
			toast.error(error.message || 'Failed to load clients');
		} finally {
			setClientsLoading(false);
		}
	}, [token]);

	React.useEffect(() => {
		if (formModalOpen && token) {
			loadClients();
		}
	}, [formModalOpen, token, loadClients]);

	const handleCreateService = React.useCallback(() => {
		setFormInitialValues({});
		setFormModalOpen(true);
	}, []);

	const handleView = React.useCallback((row) => {
		navigate(APPRoutes.SERVICES_VIEW.replace(':id', row.Id), { state: { service: row } });
	}, [navigate]);

	const handleEdit = React.useCallback(async (row) => {
		setFormModalLoading(true);
		try {
			const res = await getServiceById(token, row.Id);
			if (res?.is_success) {
				const data = res?.data;
				setFormInitialValues({
					Id: data.Id,
					Name: data.Name,
					AccountId: data.ClientId || '',
					Status: data.Status || 'Active',
					EstimatedServiceTime: data.EstimatedServiceTime || '',
					Description: data.Description || '',
				});
				setFormModalOpen(true);
			} else if(res?.is_success === false && res?.status_code === 500) {
				toast.error('Internal Server Error. Please Contact Support Team.');
			} else{
				toast.error(res?.message || 'Failed to load service');
			}
		} catch (e) {
			toast.error('Failed to load service for edit');
		} finally {
			setFormModalLoading(false);
		}
	}, [token]);

	const handleFormSubmit = async (formData) => {
		setFormModalLoading(true);
		try {
			const statusId = formData.Status === 'Active' ? 1 : 2;
			const payload = {
				Id: formData.Id || null,
				Name: formData.Name,
				EstimatedServiceTime: Number(formData.EstimatedServiceTime),
				StatusId: statusId,
				Description: formData.Description,
				Type: formData.Id ? 'update' : 'create',
			};
			if (isSuperAdmin) payload.AccountId = formData.AccountId;
			const res = await saveService(token, payload);
			if (res?.is_success) {
				toast.success(res?.message || (formData.Id ? 'Service updated' : 'Service added'));
				loadServices();
				setFormModalOpen(false);
			} else if(res?.is_success === false && res?.status_code === 500) {
				toast.error('Internal Server Error. Please Contact Support Team.');
			} else {
				toast.error(res?.message || 'Failed to save service');
			}
		} catch (e) {
			toast.error('Failed to save service');
		} finally {
			setFormModalLoading(false);
		}
	};

	const handleDeleteClick = React.useCallback((row) => {
		setDeleteError('');
		setDeleteTarget(row);
	}, []);

	const handleDeleteClose = React.useCallback(() => {
		if (deleteLoading) return;
		setDeleteTarget(null);
		setDeleteError('');
	}, [deleteLoading]);

	const handleDeleteConfirm = React.useCallback(async () => {
		if (!deleteTarget?.Id) return;
		try {
			setDeleteLoading(true);
			setDeleteError('');
			try {
				const response = await deleteService(token, deleteTarget.Id);
				if (response?.is_success) {
					setRows((prev) => prev.filter((service) => service.Id !== deleteTarget.Id));
					setDeleteTarget(null);
					loadServices();
					toast.success(response?.message || 'Service deleted successfully.');
				} else if (response?.is_success === false && response?.status_code === 500) {
					setDeleteError('Internal Server Error. Please Contact Support Team.');
				} else {
					setDeleteError(response?.message || 'Failed to delete service.');
				}
			} catch (error) {
				console.error(error);
				setDeleteError('Something went wrong while deleting the service.');
			}
		} finally {
			setDeleteLoading(false);
		}
	}, [deleteTarget, token, loadServices]);

	const filteredRows = React.useMemo(() => {
		const term = search.trim().toLowerCase();
		return rows.filter((row) => {
			const rowStatus = row.Status || '';
			const matchesStatus = status === 'All' || rowStatus === status;
			const matchesSearch =
				!term ||
				row.Name?.toLowerCase().includes(term) ||
				row.Client?.toLowerCase().includes(term);
			return matchesStatus && matchesSearch;
		});
	}, [rows, search, status]);

	const stats = React.useMemo(() => {
		const counts = statusSummary || rows.reduce((acc, row) => {
			const rowStatus = row.Status || 'Unknown';
			acc[rowStatus] = (acc[rowStatus] || 0) + 1;
			acc.Total = (acc.Total || 0) + 1;
			return acc;
		}, {});
		return [
			{
				label: 'Total Services',
				value: counts.Total ?? rows.length,
				icon: <MdShield size={22} color="#1f3b8a" />,
				iconBg: '#e6ecfb',
				accentClass: 'border-primary',
				valueClass: 'text-primary',
			},
			{
				label: 'Active',
				value: counts.Active || 0,
				icon: <MdCheckCircle size={22} color="#16a34a" />,
				iconBg: '#e7f7ec',
				accentClass: 'border-success',
				valueClass: 'text-success',
			},
			{
				label: 'Inactive',
				value: counts.Inactive || 0,
				icon: <MdPauseCircle size={22} color="#ca8a04" />,
				iconBg: '#fef6c7',
				accentClass: 'border-secondary',
				valueClass: 'text-secondary',
			},
		];
	}, [rows, statusSummary]);

	const columns = React.useMemo(() => {
		const cols = [
			{
				id: 'Name',
				label: 'Name',
				minWidth: 50,
				format: (value, row) => (
					<div className="d-flex flex-column">
						<span className="fw-semibold text-dark">{value}</span>
						{row.Description ? (
							<span className="text-secondary small">{row.Description}</span>
						) : null}
					</div>
				),
			},
		];
		if (isSuperAdmin) {
			cols.push({
				id: 'Client',
				label: 'Client',
				minWidth: 100,
				format: (value) => value || <span className="text-secondary">—</span>,
			});
		}
		cols.push(
			{
				id: 'Status',
				label: 'Status',
				minWidth: 50,
				align: 'center',
				format: (value) => (
					<span
						className="badge rounded-pill fw-bolder px-3 py-2 text-center"
						style={{
							minWidth: '96px',
							fontWeight: 1000,
							...(STATUS_BADGE_STYLE[value] || {
								backgroundColor: '#f1f3f5',
								color: '#6b7280',
							}),
						}}
					>
						{value}
					</span>
				),
			},
			{
				id: 'CreatedBy',
				label: 'Created By',
				minWidth: 70,
			},
			{
				id: 'actions',
				label: 'Actions',
				minWidth: 80,
				align: 'center',
				format: (_value, row) => (
					<div className="d-flex align-items-center justify-content-center gap-2">
						<button
							type="button"
							title="View"
							className="btn btn-sm p-1 lh-1 text-primary"
							style={{ backgroundColor: '#e0f2fe', border: 'none', borderRadius: '6px' }}
							onClick={() => handleView(row)}
						>
							<MdVisibility size={16} />
						</button>
						<button
							type="button"
							title="Edit"
							className="btn btn-sm p-1 lh-1 hc-text-primary"
							style={{ backgroundColor: '#e6ecfb', border: 'none', borderRadius: '6px' }}
							onClick={() => handleEdit(row)}
						>
							<MdEdit size={16} />
						</button>
						<button
							type="button"
							title="Delete"
							className="btn btn-sm p-1 lh-1 text-danger"
							style={{ backgroundColor: '#fee2e2', border: 'none', borderRadius: '6px' }}
							onClick={() => handleDeleteClick(row)}
						>
							<MdDelete size={16} />
						</button>
					</div>
				),
			},
		);
		return cols;
	}, [isSuperAdmin, handleView, handleEdit, handleDeleteClick]);

	return (
		<>
			<ServiceFormModal
				open={formModalOpen}
				onClose={() => { if (!formModalLoading) setFormModalOpen(false); }}
				onSubmit={handleFormSubmit}
				loading={formModalLoading}
				initialValues={formInitialValues}
				clients={clients}
				clientsLoading={clientsLoading}
				title={formInitialValues?.Id ? 'Edit Service' : 'Add Service'}
				accountIdField
			/>
			<div className="d-flex flex-md-row flex-column align-items-start justify-content-between mb-4">
				<div>
					<h4 className="fw-bold mb-1 hc-text-primary fs-3">Services</h4>
					<p className="text-secondary mb-0 small">Manage services across the platform</p>
				</div>
				<button
					onClick={handleCreateService}
					type="button"
					className="btn hc-bg-primary mt-md-0 mt-2 w-md-auto btn-sm text-white fw-semibold d-flex align-items-center justify-content-center gap-1 px-3 py-2 rounded-3 text-nowrap"
				>
					<MdAdd size={20} />
					<span>Create Service</span>
				</button>
			</div>

			{loading ? (
				<div className="row g-3 mb-3">
					{[1, 2, 3].map((_, i) => (
						<div key={i} className="col-12 col-sm-6 col-lg-4">
							<div className="bg-white p-4 rounded-4 shadow">
								<div className="skeleton mb-2" style={{ height: 16, width: '60%' }} />
								<div className="skeleton" style={{ height: 28, width: '40%' }} />
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="row g-3 mb-3">
					{stats.map((stat) => (
						<div key={stat.label} className="col-12 col-sm-6 col-lg-4">
							<div className="position-relative overflow-hidden bg-white p-4 rounded-4 shadow p-3 d-flex align-items-center gap-3 h-100">
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
								placeholder="Search Service By Name"
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
						<select
							className="form-select form-select-sm"
							value={status}
							onChange={(event) => setStatus(event.target.value)}
						>
							{STATUS_OPTIONS.map((option) => (
								<option key={option} value={option}>
									{option}
								</option>
							))}
						</select>
					</div>
				</div>
				<div className="bg-white p-3 rounded shadow">
					{loading ? (
						<div>
							{[...Array(8)].map((_, i) => (
								<div key={i} className="d-flex gap-3 align-items-center mb-3">
									<div className="skeleton" style={{ height: 16, width: '25%' }} />
									<div className="skeleton" style={{ height: 16, width: '20%' }} />
									<div className="skeleton" style={{ height: 16, width: '10%' }} />
									<div className="skeleton" style={{ height: 16, width: '15%' }} />
									<div className="skeleton" style={{ height: 16, width: '20%' }} />
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
							getRowId={(row) => row.Id}
						/>
					)}
				</div>
			</div>

			<DeleteModel
				isOpen={Boolean(deleteTarget)}
				title="Delete Service"
				entityLabel="service"
				itemName={deleteTarget?.Name || ''}
				description="You are about to remove this service from the platform. This action is permanent."
				confirmText="Delete Service"
				isLoading={deleteLoading}
				errorMessage={deleteError}
				onClose={handleDeleteClose}
				onConfirm={handleDeleteConfirm}
			/>
		</>
	);
}

