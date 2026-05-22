import * as React from 'react';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import {
  MdAdd,
  MdApartment,
  MdBlock,
  MdCheckCircle,
  MdClose,
  MdDelete,
  MdEdit,
  MdPauseCircle,
  MdSchedule,
  MdSearch,
  MdVisibility,
} from 'react-icons/md';
import DataGrid from '../../Components/Table/DataGrid';
import DeleteModel from '../../Components/Common/DeleteModel';
import { useNavigate } from "react-router-dom";
import { APPRoutes } from "../../Utils/Route";
import { deleteClientById, getClients } from '../../Services/ClientService';
import { useAuth } from '../../Context/AuthContext';
import { toast } from 'react-toastify';

const STATUS_OPTIONS = ['All', 'Active', 'Inactive', 'Pending', 'Suspended'];
const STATUS_BADGE_STYLE = {
  Active: { backgroundColor: '#dcfce7', color: '#16a34a' },
  Inactive: { backgroundColor: '#f1f3f5', color: '#6b7280' },
  Suspended: { backgroundColor: '#fee2e2', color: '#dc2626' },
  Pending: { backgroundColor: '#fff3cd', color: '#f59e0b' },
};

export default function ClientsList() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('All');
  const [rows, setRows] = React.useState([]);
  const [statusSummary, setStatusSummary] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState('');

  const handleCreateClient = React.useCallback(() => {
    navigate(APPRoutes.CLIENTS_FORM);
  }, [navigate]);

  const loadClients = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await getClients(token);
      if (response?.is_success) {
        const clients = response?.data?.Clients || [];
        const summary = response?.data?.StatusSummary || null;
        setRows(clients);
        setStatusSummary(summary);
      } else if (response?.status_code === 500) {
        toast.error("Internal Server Error. Please Contact Support Team.");
        setRows([]);
        setStatusSummary(null);
      } else {
        setRows([]);
        setStatusSummary(null);
      }
    } catch (error) {
      console.error(error);
      setRows([]);
      setStatusSummary(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (token) {
      loadClients();
    }
  }, [token, loadClients]);

  const handleDeleteClick = React.useCallback((row) => {
    setDeleteError('');
    setDeleteTarget(row);
  }, []);

  const handleDeleteClose = React.useCallback(() => {
    if (deleteLoading) {
      return;
    }

    setDeleteTarget(null);
    setDeleteError('');
  }, [deleteLoading]);

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!deleteTarget?.Id || !token) {
      return;
    }

    try {
      setDeleteLoading(true);
      setDeleteError('');
      const response = await deleteClientById(deleteTarget.Id, token);
      if (response?.is_success) {
        await loadClients();
        setDeleteTarget(null);
      } else if (response?.status_code === 500) {
        toast.error("Internal Server Error. Please Contact Support Team.");
        setDeleteError('Internal Server Error. Please Contact Support Team.');
      } else{
        toast.error(response?.message || 'Failed to delete the client. Please try again.');
        setDeleteError(response?.message || 'Failed to delete the client. Please try again.');
      }
    } catch (error) {
      console.error(error);
      setDeleteError('Something went wrong while deleting the client.');
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, token, loadClients]);

  const filteredRows = React.useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      const rowStatus = row.StatusName || row.Status || '';
      const matchesStatus = status === 'All' || rowStatus === status;

      const matchesSearch =
        !term ||
        row.OrganizationName?.toLowerCase().includes(term) ||
        row.ShortForm?.toLowerCase().includes(term) ||
        row.Email?.toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [rows, search, status]);

  const stats = React.useMemo(() => {
    const counts = statusSummary || rows.reduce((acc, row) => {
      const rowStatus = row.StatusName || row.Status || 'Unknown';
      acc[rowStatus] = (acc[rowStatus] || 0) + 1;
      return acc;
    }, {});

    return [
      {
        label: 'Total Clients',
        value: rows.length,
        icon: <MdApartment size={22} color="#1f3b8a" />,
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
        label: 'Pending',
        value: counts.Pending || 0,
        icon: <MdSchedule size={22} color="#f59e0b" />,
        iconBg: '#fdecd3',
        accentClass: 'border-warning',
        valueClass: 'text-warning',
      },
      {
        label: 'Inactive',
        value: counts.Inactive || 0,
        icon: <MdPauseCircle size={22} color="#ca8a04" />,
        iconBg: '#fef6c7',
        accentClass: 'border-secondary',
        valueClass: 'text-secondary',
      },
      {
        label: 'Suspended',
        value: counts.Suspended || 0,
        icon: <MdBlock size={22} color="#dc2626" />,
        iconBg: '#fee2e2',
        accentClass: 'border-danger',
        valueClass: 'text-danger',
      },
    ];
  }, [rows, statusSummary]);

  const columns = React.useMemo(() => [
    {
      id: 'OrganizationName',
      label: 'Client',
      minWidth: 180,
      format: (value, row) => row.ShortForm ? `${value} (${row.ShortForm})` : value,
    },
    {
      id: 'Email',
      label: 'Email',
      minWidth: 180,
    },
    {
      id: 'ServicesCount',
      label: 'Services',
      minWidth: 80,
      align: 'right',
      format: (value) => value ?? 0,
    },
    {
      id: 'StatusName',
      label: 'Status',
      minWidth: 80,
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
      label: 'CreatedBy',
      minWidth: 140,
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
            onClick={() =>
              navigate(APPRoutes.CLIENTS_VIEW.replace(":id", row.Id), {
                state: { client: row },
              })
            }
          >
            <MdVisibility size={16} />
          </button>
          <button
            type="button"
            title="Edit"
            className="btn btn-sm p-1 lh-1 hc-text-primary"
            style={{ backgroundColor: '#e6ecfb', border: 'none', borderRadius: '6px' }}
            onClick={() => navigate(APPRoutes.CLIENTS_EDIT.replace(":id", row.Id))}
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
  ], [navigate, handleDeleteClick]);

  return (
    <>
      <div className="d-flex flex-md-row flex-column align-items-start justify-content-between mb-4">
        <div>
          <h4 className="fw-bold mb-1 hc-text-primary fs-3">Clients Management</h4>
          <p className="text-secondary mb-0 small">
            Manage all clients across the Aegis Healthcare platform
          </p>
        </div>
        <button
          onClick={handleCreateClient}
          type="button"
          className="btn hc-bg-primary mt-md-0 mt-2 w-md-auto btn-sm text-white fw-semibold d-flex align-items-center justify-content-center gap-1 px-3 py-2 rounded-3 text-nowrap"
        >
          <MdAdd size={20} />
          <span>Create Client</span>
        </button>
      </div>

      {loading ? (
        <div className="row g-3 mb-3">
          {[1, 2, 3, 4, 5].map((_, i) => (
            <div key={i} className="col-12 col-sm-6 col-lg">
              <div className="bg-white p-4 rounded-4 shadow">
                <div className="skeleton mb-2" style={{ height: 16, width: "60%" }} />
                <div className="skeleton" style={{ height: 28, width: "40%" }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="row g-3 mb-3">
          {stats.map((stat) => (
            <div key={stat.label} className="col-12 col-sm-6 col-lg-4 col-xl">
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
                placeholder="Search Client By Name, Short Form or Email"
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
              <InputLabel id="client-status-label">Status</InputLabel>
              <Select
                labelId="client-status-label"
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
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="d-flex gap-3 align-items-center mb-3"
                >
                  <div className="skeleton" style={{ height: 16, width: "25%" }} />
                  <div className="skeleton" style={{ height: 16, width: "20%" }} />
                  <div className="skeleton" style={{ height: 16, width: "10%" }} />
                  <div className="skeleton" style={{ height: 16, width: "15%" }} />
                  <div className="skeleton" style={{ height: 16, width: "20%" }} />
                  <div className="skeleton" style={{ height: 16, width: "10%" }} />
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
        title="Delete Client"
        entityLabel="client"
        itemName={deleteTarget?.OrganizationName || deleteTarget?.ShortForm || ''}
        description="You are about to remove this client and its access from the platform. This action is permanent."
        confirmText="Delete Client"
        isLoading={deleteLoading}
        errorMessage={deleteError}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}