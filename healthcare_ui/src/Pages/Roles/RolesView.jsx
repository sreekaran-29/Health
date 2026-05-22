import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    MdArrowBack,
    MdBadge,
    MdCalendarMonth,
    MdCheckCircle,
    MdEdit,
    MdHistory,
    MdLock,
    MdPauseCircle,
    MdPerson,
    MdShield,
    MdVerifiedUser,
    MdVpnKey,
} from 'react-icons/md';
import { toast } from 'react-toastify';
import { useAuth } from '../../Context/AuthContext';
import { getRoleById } from '../../Services/RolesService';
import { APPRoutes } from '../../Utils/Route';
import { formatUtcToLocalDateTime } from '../../Utils/DateTime';

const STATUS_STYLE = {
    Active: { backgroundColor: '#dcfce7', color: '#166534', icon: MdCheckCircle },
    Inactive: { backgroundColor: '#f3f4f6', color: '#4b5563', icon: MdPauseCircle },
    Unknown: { backgroundColor: '#e5e7eb', color: '#374151', icon: MdPauseCircle },
};

const PERMISSIONS_PER_PAGE = 9;

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
            <div className="col-lg-7">
                <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />
            </div>
            <div className="col-lg-5">
                <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />
            </div>
        </div>
    </div>
);

export default function RolesView() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const { token } = useAuth();

    const [role, setRole] = React.useState(location.state?.role || null);
    const [loading, setLoading] = React.useState(!location.state?.role);
    const [permissionPage, setPermissionPage] = React.useState(1);

    React.useEffect(() => {
        if (!id || !token) {
            return;
        }
        (async () => {
            try {
                setLoading(true);
                const response = await getRoleById(id, token);

                if (response?.is_success) {
                    setRole(response?.data || null);
                } else if (response?.is_success === false && response?.status_code === 500) {
                    toast.error('Internal server error. Please Contact Support Team.');
                    setRole(null);
                } else {
                    toast.error(response?.message || 'Failed to load role details');
                    setRole(null);
                }
            } catch (error) {
                console.error(error);
                setRole(null);
                toast.error('An error occurred while loading role details');
            } finally {
                setLoading(false);
            }
        })();
    }, [id, token]);

    if (loading) {
        return <ViewSkeleton />;
    }

    if (!role) {
        return (
            <div className="container-fluid py-4">
                <div className="p-4 hc-surface">
                    <h5 className="mb-2">Role not found</h5>
                    <p className="text-muted mb-3">The requested role details could not be loaded.</p>
                    <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={() => navigate(APPRoutes.ROLES)}
                    >
                        Back to Roles
                    </button>
                </div>
            </div>
        );
    }

    const statusName = role?.Status || 'Unknown';
    const statusMeta = STATUS_STYLE[statusName] || STATUS_STYLE.Unknown;
    const StatusIcon = statusMeta.icon;

    const permissions = Array.isArray(role?.Permissions) ? role.Permissions : [];
    const permissionCount = permissions.length || (role?.PermissionIds?.length ?? 0);

    const totalPermissionPages = Math.max(1, Math.ceil(permissions.length / PERMISSIONS_PER_PAGE));
    const safePage = Math.min(permissionPage, totalPermissionPages);
    const pageStart = (safePage - 1) * PERMISSIONS_PER_PAGE;
    const pagedPermissions = permissions.slice(pageStart, pageStart + PERMISSIONS_PER_PAGE);

    const createdOn = formatUtcToLocalDateTime(role?.CreatedOn);
    const modifiedOn = formatUtcToLocalDateTime(role?.ModifiedOn);

    return (
        <div className="container-fluid py-4">
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
                <button
                    type="button"
                    className="btn btn-light fw-semibold border shadow-sm d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill"
                    onClick={() => navigate(APPRoutes.ROLES)}
                >
                    <MdArrowBack size={18} />
                    <span>Back</span>
                </button>

                <div className="d-flex align-items-center gap-2">
                    <button
                        type="button"
                        className="btn hc-bg-primary text-white fw-semibold d-inline-flex align-items-center gap-2 px-3 py-2"
                        onClick={() => navigate(APPRoutes.ROLES_EDIT.replace(':id', role?.Id))}
                    >
                        <MdEdit size={16} />
                        <span>Edit Role</span>
                    </button>
                </div>
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
                                <StatusIcon size={14} />
                                {statusName}
                            </span>
                            {role?.IsSuperAdmin ? (
                                <span
                                    className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold"
                                    style={{ fontSize: '0.82rem', backgroundColor: '#fef3c7', color: '#92400e' }}
                                >
                                    <MdVerifiedUser size={14} />
                                    Super Admin
                                </span>
                            ) : null}
                        </div>

                        <h2 className="fw-bold text-white mb-2" style={{ fontSize: 'clamp(1.45rem, 2.2vw, 2rem)' }}>
                            {role?.Name || '-'}
                        </h2>
                        <p className="mb-0" style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.95rem' }}>
                            {role?.Description || 'No description provided for this role.'}
                        </p>
                    </div>

                    <div className="col-lg-4">
                        <div className="p-3 rounded-4" style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}>
                            <p className="mb-1 small" style={{ color: 'rgba(255,255,255,0.65)' }}>
                                Total Permissions
                            </p>
                            <p className="fw-bold text-white mb-3" style={{ fontSize: '1.55rem', lineHeight: 1.1 }}>
                                {permissionCount}
                            </p>
                            <p className="mb-1 small" style={{ color: 'rgba(255,255,255,0.65)' }}>
                                Role ID
                            </p>
                            <p className="fw-semibold text-white mb-0 text-break" style={{ fontSize: '0.85rem' }}>
                                #{role?.Id || '-'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4 mb-4">
                <div className="col-lg-6">
                    <div className="hc-surface hc-card-primary h-100">
                        <div className="px-4 pt-4 pb-2 d-flex align-items-center gap-2">
                            <span
                                className="d-inline-flex align-items-center justify-content-center rounded-3"
                                style={{ width: 34, height: 34, backgroundColor: 'rgba(39, 89, 197, 0.08)', color: '#2759c5' }}
                            >
                                <MdBadge size={18} className="hc-text-primary" />
                            </span>
                            <h6 className="fw-bold mb-0 hc-text-primary">Role Information</h6>
                        </div>
                        <div className="px-4 pb-4">
                            <div className="rounded-4 border p-3 mb-3 bg-light-subtle">
                                <p className="small text-muted mb-1">Role Name</p>
                                <p className="mb-0 fw-semibold text-dark">{role?.Name || '-'}</p>
                            </div>
                            <div className="rounded-4 border p-3 mb-3 bg-light-subtle">
                                <p className="small text-muted mb-1">Account</p>
                                <p className="mb-0 fw-semibold text-dark">
                                    {role?.AccountName || 'Global Role'}
                                </p>
                            </div>
                            <div className="rounded-4 border p-3 bg-light-subtle">
                                <p className="small text-muted mb-1">Description</p>
                                <p className="mb-0 fw-semibold text-dark">
                                    {role?.Description || '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="hc-surface hc-card-primary h-100">
                        <div className="px-4 pt-4 pb-2 d-flex align-items-center gap-2">
                            <span
                                className="d-inline-flex align-items-center justify-content-center rounded-3"
                                style={{ width: 34, height: 34, backgroundColor: 'rgba(39, 89, 197, 0.08)', color: '#2759c5' }}
                            >
                                <MdHistory size={18} />
                            </span>
                            <h6 className="fw-bold mb-0 hc-text-primary">Timeline & Ownership</h6>
                        </div>
                        <div className="px-4 pb-4">
                            <div className="row g-3 mb-3">
                                <div className="col-12 col-sm-6">
                                    <div className="rounded-4 p-3 h-100 bg-primary-subtle border border-primary-subtle">
                                        <p className="small mb-1 text-muted d-flex align-items-center gap-1">
                                            <MdCalendarMonth size={14} /> Created On
                                        </p>
                                        <p className="mb-0 fw-semibold text-dark">{createdOn}</p>
                                    </div>
                                </div>
                                <div className="col-12 col-sm-6">
                                    <div className="rounded-4 p-3 h-100 bg-primary-subtle border border-primary-subtle">
                                        <p className="small mb-1 text-muted d-flex align-items-center gap-1">
                                            <MdCalendarMonth size={14} /> Modified On
                                        </p>
                                        <p className="mb-0 fw-semibold text-dark">{modifiedOn}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-4 p-3 bg-light border">
                                <p className="small text-muted mb-3">Ownership Trail</p>
                                <div className="row g-2">
                                    <div className="col-12 col-sm-6">
                                        <div className="bg-white border rounded-3 p-3 h-100">
                                            <div className="small text-muted mb-1">Created By</div>
                                            <div className="fw-semibold text-dark d-flex align-items-center gap-2">
                                                <MdPerson size={16} className="hc-text-primary" />
                                                <span>{role?.CreatedBy || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-6">
                                        <div className="bg-white border rounded-3 p-3 h-100">
                                            <div className="small text-muted mb-1">Modified By</div>
                                            <div className="fw-semibold text-dark d-flex align-items-center gap-2">
                                                <MdPerson size={16} className="text-primary" />
                                                <span>{role?.ModifiedBy || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-12">
                    <div className="hc-surface hc-card-primary">
                        <div className="px-4 pt-4 pb-2 d-flex align-items-center justify-content-between gap-2 flex-wrap">
                            <div className="d-flex align-items-center gap-2">
                                <span
                                    className="d-inline-flex align-items-center justify-content-center rounded-3"
                                    style={{ width: 34, height: 34, backgroundColor: 'rgba(39, 89, 197, 0.08)', color: '#2759c5' }}
                                >
                                    <MdVpnKey size={18} className="hc-text-primary" />
                                </span>
                                <h6 className="fw-bold mb-0 hc-text-primary">Assigned Permissions</h6>
                            </div>
                            <span className="badge rounded-pill bg-primary-subtle text-primary fw-semibold px-3 py-2">
                                {permissionCount} total
                            </span>
                        </div>
                        <div className="px-4 pb-4">
                            {permissions.length === 0 ? (
                                <div className="rounded-4 border bg-light-subtle p-4 text-center text-muted">
                                    <MdLock size={28} className="mb-2 text-secondary" />
                                    <div className="small">
                                        {role?.IsSuperAdmin
                                            ? 'Super Admin has access to all permissions implicitly.'
                                            : 'No permissions are assigned to this role.'}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="row g-3">
                                        {pagedPermissions.map((permission) => (
                                            <div className="col-12 col-md-6 col-lg-4" key={permission.Id}>
                                                <div className="rounded-4 border p-3 h-100 bg-light-subtle">
                                                    <div className="d-flex align-items-start gap-2">
                                                        <span
                                                            className="d-inline-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                                            style={{ width: 32, height: 32, backgroundColor: 'rgba(39, 89, 197, 0.08)', color: '#2759c5' }}
                                                        >
                                                            <MdShield size={16} />
                                                        </span>
                                                        <div className="flex-grow-1 min-w-0">
                                                            <p className="mb-1 fw-semibold text-dark" style={{ fontSize: '0.92rem' }}>
                                                                {permission.Name}
                                                            </p>
                                                            {permission.Description ? (
                                                                <p className="mb-0 small text-muted">{permission.Description}</p>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {totalPermissionPages > 1 ? (
                                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-4">
                                            <div className="small text-muted">
                                                Showing {pageStart + 1}-{Math.min(pageStart + PERMISSIONS_PER_PAGE, permissions.length)} of {permissions.length}
                                            </div>
                                            <div className="d-flex justify-content-end gap-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-secondary px-5 rounded-3 py-2 shadow"
                                                    disabled={safePage <= 1}
                                                    onClick={() => setPermissionPage((p) => Math.max(1, p - 1))}
                                                >
                                                    Prev
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm hc-bg-primary text-white px-5 py-2 rounded-3 shadow"
                                                    disabled={safePage >= totalPermissionPages}
                                                    onClick={() => setPermissionPage((p) => Math.min(totalPermissionPages, p + 1))}
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

