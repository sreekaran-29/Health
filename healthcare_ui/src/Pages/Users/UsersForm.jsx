import React, { useMemo, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../Context/AuthContext";
import { APPRoutes } from "../../Utils/Route";
import { getUserById, saveUser } from "../../Services/UserService";
import { getRolesName } from "../../Services/RolesService";
import { getAllClientNames } from "../../Services/ClientService";
import SearchableDropdown from "../../Components/Subscription/SearchableDropdown";

const STATUS_OPTIONS = [
	{ id: 1, label: "Active" },
	{ id: 2, label: "Inactive" },
];

const emptyForm = {
	id: null,
	firstName: "",
	lastName: "",
	emailAddress: "",
	phone: "",
	isDoctor: false,
	roleId: "",
	accountId: null,
	statusId: 1,
	doctor: {
		id: null,
		type: "",
		title: "",
		clinicalRole: "",
		specialty: "",
		credential: "",
		userId: null,
	},
};

const validationSchema = Yup.object({
	firstName: Yup.string().trim().required("First Name is required"),
	lastName: Yup.string().trim().required("Last Name is required"),
	emailAddress: Yup.string().email("Invalid email").required("Email is required"),
	phone: Yup.string().trim().nullable(),
	isDoctor: Yup.boolean(),
	roleId: Yup.string().required("Role is required"),
	statusId: Yup.number().required("Status is required"),
	doctor: Yup.object().when("isDoctor", {
		is: true,
		then: (schema) =>
			schema.shape({
				title: Yup.string().trim().required("Doctor Title is required"),
				clinicalRole: Yup.string().trim().required("Clinical Role is required"),
				specialty: Yup.string().trim().required("Specialty is required"),
				credential: Yup.string().trim().required("Credential is required"),
			}),
		otherwise: (schema) => schema,
	}),
});


export default function UsersForm() {
	const navigate = useNavigate();
	const location = useLocation();
	const { id } = useParams();
	const isEdit = !!id;
	const { token, decodedToken } = useAuth();
	const isSuperAdmin = !!decodedToken?.is_super_admin;
	const accountId = decodedToken?.account_id;
	const searchParams = new URLSearchParams(location.search);
	const fromParam = searchParams.get('from');

	const [loading, setLoading] = useState(isEdit);
	const [roles, setRoles] = useState([]);
	const [rolesLoading, setRolesLoading] = useState(false);
	const [clients, setClients] = useState([]);
	const [clientsLoading, setClientsLoading] = useState(false);

	function mapApiToForm(userData) {
		return {
			id: userData?.Id ?? null,
			firstName: userData?.FirstName ?? "",
			lastName: userData?.LastName ?? "",
			emailAddress: userData?.EmailAddress ?? "",
			phone: userData?.Phone ?? "",
			isDoctor: userData?.IsDoctor ?? false,
			roleId: userData?.Role?.Id ?? "",
			accountId: isSuperAdmin ? userData?.ClientId ?? null : accountId,
			statusId: userData?.StatusId ?? 1,
			doctor: {
				id: userData?.Doctor?.Id ?? null,
				type: userData?.Doctor?.Type ?? "",
				title: userData?.Doctor?.Title ?? "",
				clinicalRole: userData?.Doctor?.ClinicalRole ?? "",
				specialty: userData?.Doctor?.Specialty ?? "",
				credential: userData?.Doctor?.Credential ?? "",
				userId: userData?.Doctor?.UserId ?? null,
			},
		};
	}

	function buildPayload(values) {
		return {
			Id: values.id || null,
			FirstName: values.firstName,
			LastName: values.lastName,
			EmailAddress: values.emailAddress,
			Phone: values.phone,
			IsDoctor: !!values.isDoctor,
			RoleId: values.roleId,
			AccountId: isSuperAdmin ? values.accountId || null : accountId,
			StatusId: values.statusId,
			Type: values.id ? "update" : "create",
			doctor: values.isDoctor ? {
				Id: values.doctor.id || null,
				Type: values.id ? "update" : "create",
				Title: values.doctor.title,
				ClinicalRole: values.doctor.clinicalRole || "",
				Specialty: values.doctor.specialty || "",
				Credential: values.doctor.credential || "",
				UserId: values.doctor.userId || null,
			} : undefined,
		};
	}

	const formik = useFormik({
		initialValues: useMemo(() => emptyForm, []),
		enableReinitialize: false,
		validationSchema,
		onSubmit: async (values) => {
			try {
				const payload = buildPayload(values);
				const response = await saveUser(payload, token);
				if (response?.is_success) {
					toast.success(response?.message || "User saved successfully");
					if (fromParam === 'doctors' && values.isDoctor && response?.data?.DoctorId) {
						navigate(APPRoutes.DOCTORS_VIEW.replace(":id", response.data.DoctorId));
					} else {
						navigate(APPRoutes.USERS_VIEW.replace(":id", response?.data.id || values.id));
					}
				} else if (response?.is_success === false && response?.status_code === 500) {
					toast.error("Internal Server Error. Please Contact Support Team.");
				} else {
					toast.error(response?.message || "Failed to save user");
				}
			} catch (error) {
				console.error(error);
				toast.error(error.message || "Failed to save user");
			}
		},
	});

	const loadUser = async () => {
		if (!isEdit) return;
		try {
			setLoading(true);
			const response = await getUserById(id, token);
			if (response?.is_success) {
				const userData = response?.data ?? response;
				formik.setValues(mapApiToForm(userData));
			} else if(response?.is_success === false && response?.status_code === 500) {
				toast.error('Internal Server Error. Please Contact Support Team.');
				formik.setValues(emptyForm);
			} else {
				toast.error(response?.message || "Failed to load user");
				formik.setValues(emptyForm);
			}
		} catch (error) {
			console.error(error);
			toast.error(error.message || "Failed to load user");
		} finally {
			setLoading(false);
		}
	};

	const loadRoles = async () => {
		try {
			setRolesLoading(true);
			const response = await getRolesName(token);
			if (response?.is_success) {
				setRoles(response?.data ?? response);
			} else if(response?.is_success === false && response?.status_code === 500) {
				toast.error('Internal Server Error. Please Contact Support Team.');
				setRoles([]);
			} else {
				toast.error(response?.message || "Failed to load roles");
				setRoles([]);
			}
		} catch (error) {
			console.error(error);
			toast.error(error.message || "Failed to load roles");
		} finally {
			setRolesLoading(false);
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
			} else if(response?.is_success === false && response?.status_code === 500) {
				toast.error('Internal Server Error. Please Contact Support Team.');
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
		loadUser();
		loadRoles();
		if (isSuperAdmin) loadClients();
	}, [id, isEdit, token, isSuperAdmin]);

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
								{isEdit ? "Edit User" : "Create User"}
							</h3>
							<small className="text-muted">
								Define user details & assign role
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
									First Name {renderAsterisk()}
								</label>
								<input
									className={`form-control rounded-3 shadow-sm ${formik.touched.firstName && formik.errors.firstName ? "is-invalid" : ""}`}
									name="firstName"
									placeholder="First Name"
									{...formik.getFieldProps("firstName")}
								/>
								<div className="invalid-feedback">{formik.errors.firstName}</div>
							</div>
							<div className="col-md-6">
								<label className="form-label fw-semibold">
									Last Name {renderAsterisk()}
								</label>
								<input
									className={`form-control rounded-3 shadow-sm ${formik.touched.lastName && formik.errors.lastName ? "is-invalid" : ""}`}
									name="lastName"
									placeholder="Last Name"
									{...formik.getFieldProps("lastName")}
								/>
								<div className="invalid-feedback">{formik.errors.lastName}</div>
							</div>
							<div className="col-md-6">
								<label className="form-label fw-semibold">
									Email Address {renderAsterisk()}
								</label>
								<input
									className={`form-control rounded-3 shadow-sm ${formik.touched.emailAddress && formik.errors.emailAddress ? "is-invalid" : ""}`}
									name="emailAddress"
									placeholder="user@example.com"
									{...formik.getFieldProps("emailAddress")}
								/>
								<div className="invalid-feedback">{formik.errors.emailAddress}</div>
							</div>
							<div className="col-md-6">
								<label className="form-label fw-semibold">Phone</label>
								<input
									className={`form-control rounded-3 shadow-sm ${formik.touched.phone && formik.errors.phone ? "is-invalid" : ""}`}
									name="phone"
									placeholder="9876543210"
									{...formik.getFieldProps("phone")}
								/>
								<div className="invalid-feedback">{formik.errors.phone}</div>
							</div>
							<div className="col-md-6">
								<label className="form-label fw-semibold">Status {renderAsterisk()}</label>
								<select
									name="statusId"
									className={`form-select rounded-3 shadow-sm ${formik.touched.statusId && formik.errors.statusId ? "is-invalid" : ""}`}
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
							<div className="col-md-6">
								<SearchableDropdown
									label="Role"
									placeholder="Select Role"
									options={roles.map((role) => ({ value: role.Id, label: role.Name }))}
									value={formik.values.roleId ?? ""}
									onChange={(value) => formik.setFieldValue("roleId", value || "")}
									disabled={rolesLoading}
									loading={rolesLoading}
									required
									emptyMessage="No roles found"
								/>
								<div className="invalid-feedback d-block">{formik.errors.roleId}</div>
							</div>
							{isSuperAdmin && (
								<div className="col-md-6">
									<SearchableDropdown
										label="Account"
										placeholder="Global User"
										options={clients.map((client) => ({ value: client.Id, label: client.OrganizationName }))}
										value={formik.values.accountId ?? ""}
										onChange={(value) => formik.setFieldValue("accountId", value || null)}
										disabled={clientsLoading}
										loading={clientsLoading}
										required={false}
										emptyMessage="No clients found"
									/>
									<div className="small text-muted mt-1">
										Optional. Leave empty to make this a global user.
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Doctor Section */}
					{formik.values.isDoctor && (
						<div className="mb-4 p-4 rounded-4 border bg-light-subtle">
							<h6 className="fw-bold hc-text-primary mb-3">Doctor Information</h6>
							<div className="row g-3">
								<div className="col-md-6">
									<label className="form-label fw-semibold">Title {renderAsterisk()}</label>
									<input
										className={`form-control rounded-3 shadow-sm ${formik.touched.doctor?.title && formik.errors.doctor?.title ? "is-invalid" : ""}`}
										name="doctor.title"
										placeholder="e.g. Dr."
										value={formik.values.doctor.title}
										onChange={formik.handleChange}
										onBlur={formik.handleBlur}
									/>
									<div className="invalid-feedback">{formik.errors.doctor?.title}</div>
								</div>
								<div className="col-md-6">
									<label className="form-label fw-semibold">Clinical Role {renderAsterisk()}</label>
									<input
										className={`form-control rounded-3 shadow-sm ${formik.touched.doctor?.clinicalRole && formik.errors.doctor?.clinicalRole ? "is-invalid" : ""}`}
										name="doctor.clinicalRole"
										placeholder="e.g. Surgeon"
										value={formik.values.doctor.clinicalRole}
										onChange={formik.handleChange}
										onBlur={formik.handleBlur}
									/>
									<div className="invalid-feedback">{formik.errors.doctor?.clinicalRole}</div>
								</div>
								<div className="col-md-6">
									<label className="form-label fw-semibold">Specialty {renderAsterisk()}</label>
									<input
										className={`form-control rounded-3 shadow-sm ${formik.touched.doctor?.specialty && formik.errors.doctor?.specialty ? "is-invalid" : ""}`}
										name="doctor.specialty"
										placeholder="e.g. Cardiology"
										value={formik.values.doctor.specialty}
										onChange={formik.handleChange}
										onBlur={formik.handleBlur}
									/>
									<div className="invalid-feedback">{formik.errors.doctor?.specialty}</div>
								</div>
								<div className="col-md-6">
									<label className="form-label fw-semibold">Credential {renderAsterisk()}</label>
									<input
										className={`form-control rounded-3 shadow-sm ${formik.touched.doctor?.credential && formik.errors.doctor?.credential ? "is-invalid" : ""}`}
										name="doctor.credential"
										placeholder="e.g. MBBS, MD"
										value={formik.values.doctor.credential}
										onChange={formik.handleChange}
										onBlur={formik.handleBlur}
									/>
									<div className="invalid-feedback">{formik.errors.doctor?.credential}</div>
								</div>
							</div>
						</div>
					)}

					<div className="form-check mb-4 mx-1">
						<input
							type="checkbox"
							id="isDoctor"
							name="isDoctor"
							className="form-check-input"
							checked={formik.values.isDoctor}
							onChange={formik.handleChange}
						/>
						<label htmlFor="isDoctor" className="form-check-label fw-semibold ms-1">
							Is Doctor
						</label>
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