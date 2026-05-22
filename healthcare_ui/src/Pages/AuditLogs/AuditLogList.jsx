import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdClose,
  MdDownload,
  MdOutlineReceiptLong,
  MdSearch,
  MdVisibility,
  MdWatchLater,
} from 'react-icons/md';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import DataGrid from '../../Components/Table/DataGrid';
import { getAuditLogs } from '../../Services/AuditLogService';
import { useAuth } from '../../Context/AuthContext';
import { formatUtcToLocalDateTime } from '../../Utils/DateTime';
import { APPRoutes } from '../../Utils/Route';

export default function AuditLogList() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [search, setSearch] = React.useState('');
  const [resource, setResource] = React.useState('All');
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [stats, setStats] = React.useState({ total: 0, last24h: 0 });

  React.useEffect(() => {
    if (!token) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const response = await getAuditLogs(token);
        if (cancelled) return;

        if (response?.is_success) {
          const total = typeof response?.data?.TotalCount === 'number' ? response.data.TotalCount : (response.data?.logs || []).length;
          const last24h = typeof response?.data?.Last24HoursCount === 'number'
            ? response.data.Last24HoursCount
            : (response.data?.logs || []).filter((log) => {
                const ts = new Date(log.CreatedOn || log.Timestamp || log.CreatedAt).getTime();
                return !Number.isNaN(ts) && Date.now() - ts <= 86_400_000;
              }).length;

          setRows(response?.data?.logs || []);
          setStats({ total, last24h });
        } else {
          setRows([]);
          setStats({ total: 0, last24h: 0 });
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setRows([]);
          setStats({ total: 0, last24h: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  const resourceOptions = React.useMemo(() => {
    const unique = [...new Set(rows.map((r) => r.ResourceType || r.Resource || '').filter(Boolean))];
    return ['All', ...unique.sort()];
  }, [rows]);

  const filteredRows = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const rowResource = row.ResourceType || row.Resource || '';
      const rowUser = row.UserName || row.User || '';
      const rowRole = row.RoleName || row.ActorType || '';
      const rowDescription = row.Metadata?.description || '';
      const matchesResource = resource === 'All' || rowResource === resource;
      const matchesSearch =
        !term ||
        row.Event?.toLowerCase().includes(term) ||
        rowUser.toLowerCase().includes(term) ||
        rowRole.toLowerCase().includes(term) ||
        rowResource.toLowerCase().includes(term) ||
        rowDescription.toLowerCase().includes(term);
      return matchesResource && matchesSearch;
    });
  }, [rows, search, resource]);

  const handleExport = React.useCallback(() => {
    if (!filteredRows.length) return;

    const headers = ['Timestamp', 'Event', 'User', 'Role', 'Resource'];
    const csvRows = filteredRows.map((r) =>
      [
        `"${formatUtcToLocalDateTime(r.CreatedOn || r.Timestamp || r.CreatedAt)}"`,
        `"${r.Event || ''}"`,
        `"${r.UserName || r.User || ''}"`,
        `"${r.RoleName || r.ActorType || ''}"`,
        `"${r.ResourceType || r.Resource || ''}"`,
      ].join(',')
    );

    const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredRows]);

  const columns = React.useMemo(() => [
    {
      id: 'Timestamp',
      label: 'Timestamp',
      minWidth: 170,
      format: (value, row) =>
        formatUtcToLocalDateTime(value || row.CreatedOn || row.Timestamp || row.CreatedAt),
    },
    {
      id: 'Event',
      label: 'Event',
      minWidth: 160,
      format: (value) => (
        <span
          className="badge rounded-pill px-3 py-2 fw-semibold hc-text-primary"
          style={{ backgroundColor: '#e6ecfb', fontSize: '0.78rem' }}
        >
          {value || '—'}
        </span>
      ),
    },
    {
      id: 'UserName',
      label: 'User',
      minWidth: 140,
      format: (value) => (
        <span className="fw-medium text-dark">{value || '—'}</span>
      ),
    },
    {
      id: 'RoleName',
      label: 'Role',
      minWidth: 120,
      format: (value, row) => (
        <span className="text-secondary text-uppercase small fw-semibold">
          {value || row.ActorType || '—'}
        </span>
      ),
    },
    {
      id: 'ResourceType',
      label: 'Resource',
      minWidth: 160,
      format: (value, row) => (
        <span className="text-secondary text-uppercase small fw-semibold">
          {value || row.Resource || '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 80,
      align: 'center',
      format: (_value, row) => (
        <button
          type="button"
          className="btn btn-sm p-1 lh-1 px-1 hc-text-primary fw-semibold"
          style={{ fontSize: '0.8rem', background: 'none', border: 'none' }}
          onClick={() => navigate(APPRoutes.AUDIT_LOGS_VIEW.replace(':id', row.Id))}
        >
          <MdVisibility size={17} className="me-1" />
          VIEW
        </button>
      ),
    },
  ], [navigate]);

  return (
    <>
      <div className="d-flex flex-md-row flex-column align-items-md-center justify-content-between mb-4 gap-2">
        <div>
          <h4 className="fw-bold mb-1 hc-text-primary fs-3">Audit Logs</h4>
          <p className="text-secondary mb-0 small">
            Track all system activities and user actions.
          </p>
        </div>
        {/* <button
          type="button"
          onClick={handleExport}
          className="btn hc-bg-primary btn-sm text-white fw-semibold d-inline-flex align-items-center gap-1 px-3 py-2 rounded-3 text-nowrap"
        >
          <MdDownload size={18} />
          <span>Export Logs</span>
        </button> */}
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div className="row g-3 mb-4">
          {[1, 2].map((_, i) => (
            <div key={i} className="col-12 col-sm-6">
              <div className="bg-white p-4 rounded-4 shadow">
                <div className="skeleton mb-2" style={{ height: 16, width: '55%' }} />
                <div className="skeleton" style={{ height: 28, width: '35%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6">
            <div className="position-relative overflow-hidden bg-white p-4 rounded-4 shadow d-flex align-items-center gap-3">
              <div
                className="position-absolute start-0 top-0 h-100 hc-bg-primary"
                style={{ width: '5px' }}
              />
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-3"
                style={{ width: 44, height: 44, backgroundColor: '#e6ecfb' }}
              >
                <MdOutlineReceiptLong size={22} color="var(--hc-primary)" />
              </div>
              <div className="d-flex flex-column lh-sm">
                <span className="text-dark fw-semibold" style={{ fontSize: '0.85rem' }}>Total Logs</span>
                <span className="fw-bold hc-text-primary" style={{ fontSize: '1.5rem' }}>{stats.total}</span>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6">
            <div className="position-relative overflow-hidden bg-white p-4 rounded-4 shadow d-flex align-items-center gap-3">
              <div
                className="position-absolute start-0 top-0 h-100 hc-bg-primary"
                style={{ width: '5px' }}
              />
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-3"
                style={{ width: 44, height: 44, backgroundColor: '#e6ecfb' }}
              >
                <MdWatchLater size={22} color="var(--hc-primary)" />
              </div>
              <div className="d-flex flex-column lh-sm">
                <span className="text-dark fw-semibold" style={{ fontSize: '0.85rem' }}>Last 24 Hours</span>
                <span className="fw-bold hc-text-primary" style={{ fontSize: '1.5rem' }}>{stats.last24h}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search + Filter + Table */}
      <div className="bg-white rounded-4 shadow p-3 p-md-4">
        <div className="row g-2 mb-3">
          <div className="col-12 col-md-9">
            <div className="position-relative">
              <span
                className="position-absolute top-50 translate-middle-y text-secondary d-inline-flex align-items-center"
                style={{ left: '12px', pointerEvents: 'none' }}
              >
                <MdSearch size={18} />
              </span>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search logs by events, user, or resource..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
              <InputLabel id="audit-resource-label">Resource</InputLabel>
              <Select
                labelId="audit-resource-label"
                label="Resource"
                value={resource}
                onChange={(e) => setResource(e.target.value)}
              >
                {resourceOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>

        <div className="bg-white p-3 rounded shadow">
          {loading ? (
            <div>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="d-flex gap-3 align-items-center mb-3">
                  <div className="skeleton" style={{ height: 16, width: '20%' }} />
                  <div className="skeleton" style={{ height: 16, width: '18%' }} />
                  <div className="skeleton" style={{ height: 16, width: '15%' }} />
                  <div className="skeleton" style={{ height: 16, width: '22%' }} />
                  <div className="skeleton" style={{ height: 16, width: '8%' }} />
                  <div className="skeleton" style={{ height: 16, width: '8%' }} />
                </div>
              ))}
            </div>
          )  : (
            <DataGrid
              columns={columns}
              rows={filteredRows}
              defaultRowsPerPage={10}
              stickyHeader
              getRowId={(row) => row.Id || row.id}
            />
          )}
        </div>
      </div>
    </>
  );
}
