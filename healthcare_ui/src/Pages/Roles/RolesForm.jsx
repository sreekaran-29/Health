import React, { useMemo, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../Context/AuthContext";
import { APPRoutes } from "../../Utils/Route";
import { getRoleById, saveRole, getAllPermissions } from "../../Services/RolesService";
import { getAllClientNames } from "../../Services/ClientService";
import SearchableDropdown from "../../Components/Subscription/SearchableDropdown";

const STATUS_OPTIONS = [
    { id: 1, label: "Active" },
    { id: 2, label: "Inactive" },
];

const SUPER_ADMIN_ROLE = "Super Admin";

const emptyForm = {
    id: null,
    name: "",
    description: "",
    statusId: 1,
    isSuperAdmin: false,
    accountId: null,
    permissionIds: [],
};

const validationSchema = Yup.object({
    name: Yup.string().trim().required("Role Name is required"),
    description: Yup.string().trim().nullable(),
    statusId: Yup.number().required("Status is required"),
    isSuperAdmin: Yup.boolean(),
    permissionIds: Yup.array().when("isSuperAdmin", {
        is: true,
        then: (schema) => schema,
        otherwise: (schema) => schema.min(1, "At least one permission must be selected"),
    }),
});


export default function RolesForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    const { token, decodedToken } = useAuth();
    const isSuperAdmin = !!decodedToken?.is_super_admin;
    const accountId = decodedToken?.account_id;

    const [loading, setLoading] = useState(isEdit);
    const [permissions, setPermissions] = useState([]);
    const [permissionsLoading, setPermissionsLoading] = useState(false);
    const [clients, setClients] = useState([]);
    const [clientsLoading, setClientsLoading] = useState(false);
    const [page, setPage] = useState(0);

    const ITEMS_PER_PAGE = 9;

    function mapApiToForm(roleData) {
        return {
            id: roleData?.Id ?? null,
            name: roleData?.Name ?? "",
            description: roleData?.Description ?? "",
            statusId: roleData?.StatusId ?? 1,
            isSuperAdmin: roleData?.IsSuperAdmin ?? false,
            accountId: isSuperAdmin ? roleData?.AccountId : accountId,
            permissionIds: roleData?.PermissionIds ?? [],
        };
    }

    function buildPayload(values) {
        return {
            Id: values.id || null,
            AccountId: isSuperAdmin ? values.accountId : accountId,
            Name: values.name,
            Description: values.description || null,
            PermissionIds: values.permissionIds,
            IsSuperAdmin: !!values.isSuperAdmin,
            StatusId: values.statusId,
            Type: values.id ? "update" : "create",
        };
    }

    const formik = useFormik({
        initialValues: useMemo(() => emptyForm, []),
        enableReinitialize: false,
        validationSchema,
        onSubmit: async (values) => {
            try {
                const payload = buildPayload(values);
                const response = await saveRole(payload, token);

                if (response?.is_success) {
                    toast.success(response?.message || "Role saved successfully");
                    navigate(APPRoutes.ROLES_VIEW.replace(':id', response?.data || values.id));
                } else if (response?.is_success === false && response?.status_code === 500) {
                    toast.error("Internal Server Error. Please Contact Support Team.");
                } else {
                    toast.error(response?.message || "Failed to save role");
                }
            } catch (error) {
                console.error(error);
                toast.error(error.message || "Failed to save role");
            }
        },
    });

    const loadRole = async () => {
        if (!isEdit) return;

        try {
            setLoading(true);
            const response = await getRoleById(id, token);
            if (response?.is_success) {
                const roleData = response?.data;
                formik.setValues(mapApiToForm(roleData));
            } else if (response?.is_success === false && response?.status_code === 500) {
                toast.error("Internal Server Error. Please Contact Support Team.");
            } else {
                toast.error(response?.message || "Failed to load role");
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Failed to load role");
        } finally {
            setLoading(false);
        }
    };

    const loadPermissions = async () => {
        try {
            setPermissionsLoading(true);
            const response = await getAllPermissions(token);
            if (response?.is_success) {
                const data = Array.isArray(response?.data) ? response.data : [];
                setPermissions(data);
            } else if (response?.is_success === false && response?.status_code === 500) {
                toast.error("Internal Server Error. Please Contact Support Team.");
                setPermissions([]);
            } else {
                toast.error(response?.message || "Failed to load permissions");
                setPermissions([]);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Failed to load permissions");
            setPermissions([]);
        } finally {
            setPermissionsLoading(false);
        }
    };

    const loadClients = async () => {
        if (!isSuperAdmin) return;
        try {
            setClientsLoading(true);
            const response = await getAllClientNames(token);
            if (response?.is_success) {
                const data = Array.isArray(response?.data) ? response.data : [];
                setClients(data);
            } else if (response?.is_success === false && response?.status_code === 500) {
                toast.error("Internal Server Error. Please Contact Support Team.");
                setClients([]);
            } else {
                toast.error(response?.message || "Failed to load clients");
                setClients([]);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Failed to load clients");
            setClients([]);
        } finally {
            setClientsLoading(false);
        }
    };

    React.useEffect(() => {
        if (!token) return;
        loadPermissions();
        loadClients();
        loadRole();
    }, [id, isEdit, token]);

    const totalPages = Math.max(1, Math.ceil(permissions.length / ITEMS_PER_PAGE));
    const paginatedPermissions = permissions.slice(
        page * ITEMS_PER_PAGE,
        (page + 1) * ITEMS_PER_PAGE
    );

    const togglePermission = (permissionId) => {
        formik.setFieldTouched("permissionIds", true);
        const current = formik.values.permissionIds || [];
        const next = current.includes(permissionId)
            ? current.filter((pid) => pid !== permissionId)
            : [...current, permissionId];
        formik.setFieldValue("permissionIds", next);
    };

    const renderAsterisk = () => <span className="text-danger">*</span>;

    if (loading) {
        return (
            <div className="spinner">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container p-0">
            <div className="rounded-4 bg-white p-2 p-md-4 shadow-lg border-0">
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <div className="d-flex align-items-center gap-3">
                        <button
                            type="button"
                            className="btn btn-light border rounded-circle shadow-sm"
                            onClick={() => navigate(-1)}
                            style={{ width: 40, height: 40 }}
                        >
                            &larr;
                        </button>
                        <div>
                            <h3 className="fw-bold mb-0 hc-text-primary">
                                {isEdit ? "Edit Role" : "Create Role"}
                            </h3>
                            <small className="text-muted">
                                Define role details & assign permissions
                            </small>
                        </div>
                    </div>
                </div>

                <form onSubmit={formik.handleSubmit}>
                    <div className="mb-4 p-4 rounded-4 border bg-light-subtle">
                        <h6 className="fw-bold hc-text-primary mb-3">Basic Information</h6>

                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label fw-semibold">
                                    Role Name {renderAsterisk()}
                                </label>
                                <input
                                    className={`form-control rounded-3 shadow-sm ${formik.touched.name && formik.errors.name ? "is-invalid" : ""
                                        }`}
                                    name="name"
                                    placeholder="e.g. Account Admin"
                                    {...formik.getFieldProps("name")}
                                />
                                <div className="invalid-feedback">{formik.errors.name}</div>
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-semibold">
                                    Status {renderAsterisk()}
                                </label>
                                <select
                                    name="statusId"
                                    className={`form-select rounded-3 shadow-sm ${formik.touched.statusId && formik.errors.statusId
                                        ? "is-invalid"
                                        : ""
                                        }`}
                                    value={formik.values.statusId}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                >
                                    {STATUS_OPTIONS.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                                <div className="invalid-feedback">{formik.errors.statusId}</div>
                            </div>

                            {isSuperAdmin && (
                                <div className="col-md-6">
                                    <SearchableDropdown
                                        label="Account"
                                        placeholder="Global Role"
                                        options={clients.map((client) => ({
                                            value: client.Id,
                                            label: client.OrganizationName
                                        }))}
                                        value={formik.values.accountId ?? ""}
                                        onChange={(value) => formik.setFieldValue("accountId", value || null)}
                                        disabled={clientsLoading}
                                        loading={clientsLoading}
                                        required={false}
                                        emptyMessage="No clients found"
                                    />
                                    <div className="small text-muted mt-1">
                                        Optional. Leave empty to make this a global role.
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="row g-3 mt-1">
                            <div className="col-12">
                                <label className="form-label fw-semibold">Description</label>
                                <textarea
                                    className={`form-control rounded-3 shadow-sm ${formik.touched.description && formik.errors.description
                                        ? "is-invalid"
                                        : ""
                                        }`}
                                    name="description"
                                    rows={3}
                                    placeholder="Describe the responsibilities of this role"
                                    {...formik.getFieldProps("description")}
                                />
                                <div className="invalid-feedback">{formik.errors.description}</div>
                            </div>
                        </div>
                        {isSuperAdmin && (
                            <div className="row g-3 mt-1">
                                <div className="col-12">
                                    <div className="form-check">
                                        <input
                                            type="checkbox"
                                            id="isSuperAdmin"
                                            name="isSuperAdmin"
                                            className="form-check-input"
                                            checked={formik.values.isSuperAdmin}
                                            onChange={formik.handleChange}
                                        />
                                        <label
                                            htmlFor="isSuperAdmin"
                                            className="form-check-label fw-semibold ms-1"
                                        >
                                            Is Super Admin
                                        </label>
                                        <div className="small text-muted">
                                            Grants system-level access regardless of selected permissions.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 p-4 rounded-4 border bg-light-subtle">
                        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                            <h6 className="fw-bold hc-text-primary m-0">
                                Permissions {renderAsterisk()}
                            </h6>
                            <span className="text-muted small">
                                {formik.values.permissionIds.length} selected
                            </span>
                        </div>

                        {formik.touched.permissionIds && formik.errors.permissionIds && (
                            <div className="text-danger mb-3 small">
                                {formik.errors.permissionIds}
                            </div>
                        )}

                        {permissionsLoading ? (
                            <div className="row g-3">
                                {[...Array(9)].map((_, i) => (
                                    <div className="col-12 col-md-4" key={i}>
                                        <div className="skeleton" style={{ height: 90 }} />
                                    </div>
                                ))}
                            </div>
                        ) : permissions.length === 0 ? (
                            <div className="text-muted small">No permissions available.</div>
                        ) : (
                            <>
                                <div className="row g-3">
                                    {paginatedPermissions.map((permission) => {
                                        const active = formik.values.permissionIds.includes(permission.Id);

                                        return (
                                            <div className="col-12 col-md-4" key={permission.Id}>
                                                <div
                                                    onClick={() => togglePermission(permission.Id)}
                                                    role="button"
                                                    className={`service-card d-flex flex-column align-items-start justify-content-start text-start px-3 py-3 rounded-3 fw-medium w-100 h-100 ${active ? "active" : ""
                                                        }`}
                                                >
                                                    <div className={`fw-bold mb-1 hc-text-primary ${active ? "text-white fw-semibold" : ""}`}>{permission.Name}</div>
                                                    {permission.Description ? (
                                                        <div className={`small ${active ? "text-white-50" : "text-muted"}`}>
                                                            {permission.Description}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {totalPages > 1 && (
                                    <div className="d-flex justify-content-end gap-2 mt-3">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-secondary px-5 rounded-3 py-2 shadow"
                                            disabled={page === 0}
                                            onClick={() => setPage((p) => p - 1)}
                                        >
                                            Prev
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-sm hc-bg-primary text-white px-5 py-2 rounded-3 shadow"
                                            disabled={page === totalPages - 1}
                                            onClick={() => setPage((p) => p + 1)}
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="text-end mt-4">
                        <button
                            type="submit"
                            className="btn hc-bg-primary text-white px-5 py-2 rounded-3 fw-semibold shadow"
                            disabled={formik.isSubmitting}
                        >
                            {formik.isSubmitting ? (
                                <>
                                    <span
                                        className="spinner-border spinner-border-sm me-2"
                                        role="status"
                                        aria-hidden="true"
                                    />
                                    Saving...
                                </>
                            ) : (
                                "Save"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
