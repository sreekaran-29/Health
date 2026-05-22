import React, { useMemo, useState } from "react";
import { useAuth } from "../../Context/AuthContext";
import { useFormik } from "formik";
import * as Yup from "yup";
import NAV from "../../Utils/MenuData";
import { useNavigate, useParams } from "react-router-dom";
import { getClientById, saveClient, getClientLogo } from "../../Services/ClientService";
import { toast } from "react-toastify";
import { APPRoutes } from "../../Utils/Route";

const STATUS_OPTIONS = [
  { id: 1, label: "Active" },
  { id: 2, label: "Inactive" },
  { id: 3, label: "Pending" },
  { id: 4, label: "Suspended" },
];

const emptyForm = {
  id: null,
  orgName: "",
  shortForm: "",
  phone: "",
  email: "",
  logo: null,
  fileId: null,
  statusId: 1,
  legal: { street: "", city: "", state: "", country: "", zip: "" },
  billing: { street: "", city: "", state: "", country: "", zip: "" },
  services: [],
};

const validationSchema = Yup.object({
  orgName: Yup.string().trim().required("Organization Name is required"),
  shortForm: Yup.string().trim().required("Short Form is required"),
  phone: Yup.string().trim().required("Phone Number is required"),
  email: Yup.string().trim().email("Invalid email").required("Email is required"),
  statusId: Yup.number().required("Status is required"),
  legal: Yup.object({
    street: Yup.string().trim().required("Street Address is required"),
    city: Yup.string().trim().required("City is required"),
    state: Yup.string().trim().required("State is required"),
    country: Yup.string().trim().required("Country is required"),
    zip: Yup.string().trim().required("ZIP Code is required"),
  }),
  billing: Yup.object({
    street: Yup.string().trim().required("Street Address is required"),
    city: Yup.string().trim().required("City is required"),
    state: Yup.string().trim().required("State is required"),
    country: Yup.string().trim().required("Country is required"),
    zip: Yup.string().trim().required("ZIP Code is required"),
  }),
  services: Yup.array().min(1, "At least one service must be selected"),
});

function mapApiToForm(clientData) {
  return {
    id: clientData?.Id ?? null,
    orgName: clientData?.OrganizationName ?? "",
    shortForm: clientData?.ShortForm ?? "",
    phone: clientData?.Phone ?? "",
    email: clientData?.Email ?? "",
    logo: null,
    fileId: clientData?.FileId ?? null,
    statusId: clientData?.StatusId ?? 1,
    legal: {
      street: clientData?.LegalAddress?.Street ?? "",
      city: clientData?.LegalAddress?.City ?? "",
      state: clientData?.LegalAddress?.State ?? "",
      country: clientData?.LegalAddress?.Country ?? "",
      zip: clientData?.LegalAddress?.Zipcode ?? "",
    },
    billing: {
      street: clientData?.BillingAddress?.Street ?? "",
      city: clientData?.BillingAddress?.City ?? "",
      state: clientData?.BillingAddress?.State ?? "",
      country: clientData?.BillingAddress?.Country ?? "",
      zip: clientData?.BillingAddress?.Zipcode ?? "",
    },
    services: clientData?.ServiceIds ?? clientData?.Services ?? clientData?.services ?? [],
  };
}

function buildPayload(values) {
  return {
    Id: values.id || null,
    OrganizationName: values.orgName,
    ShortForm: values.shortForm,
    Email: values.email,
    Phone: values.phone,
    LegalAddress: {
      Street: values.legal.street,
      City: values.legal.city,
      State: values.legal.state,
      Country: values.legal.country,
      Zipcode: values.legal.zip,
    },
    BillingAddress: {
      Street: values.billing.street,
      City: values.billing.city,
      State: values.billing.state,
      Country: values.billing.country,
      Zipcode: values.billing.zip,
    },
    StatusId: values.statusId,
    Reason: null,
    FileId: values.fileId || null,
    Type: values.id ? "update" : "create",
    Services: values.services,
  };
}

export default function ClientsForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [logoPreview, setLogoPreview] = useState(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [sameAsLegal, setSameAsLegal] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const { token } = useAuth();

  const formik = useFormik({
    initialValues: useMemo(() => emptyForm, []),
    enableReinitialize: false,
    validationSchema,
    onSubmit: async (values) => {
      try {
        const payload = buildPayload(values);

        const formData = new FormData();
        formData.append("request", JSON.stringify(payload));

        if (values.logo) {
          formData.append("logo", values.logo);
        }

        const response = await saveClient(formData, token);

        if (response?.is_success) {
          toast.success(response?.message || "Client saved successfully");
          navigate(APPRoutes.CLIENTS_VIEW.replace(":id", response?.data || id));
        } else if (response?.is_success === false && response?.status_code === 500) {
          toast.error("Internal Server Error. Please Contact Support Team.");
        } else {
          toast.error(response?.message || "Failed to save client");
        }
      } catch (error) {
        console.error(error);
        toast.error(error.message || "Failed to save client");
      }
    },
  });

  const loadClient = async () => {
    if (!isEdit) return;

    try {
      setLoading(true);
      const clientResponse = await getClientById(id, token);
      if (clientResponse?.is_success) {
        const clientData = clientResponse?.data ?? clientResponse;
        const mapped = mapApiToForm(clientData);
        formik.setValues(mapped);

        const sameAddress =
          JSON.stringify(clientData?.LegalAddress || {}) ===
          JSON.stringify(clientData?.BillingAddress || {});
        setSameAsLegal(sameAddress);
      } else if(clientResponse?.is_success === false && clientResponse?.status_code === 500) {
        toast.error("Internal Server Error. Please Contact Support Team.");
      } else{
        toast.error(clientResponse?.message || "Failed to load client");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to load client");
    } finally {
      setLoading(false);
    }
  };

  const loadClientLogo = async () => {
    if (!isEdit || !formik.values.fileId) {
      setLogoLoading(false);
      return;
    }

    try {
      setLogoLoading(true);
      const logoResponse = await getClientLogo(id, token);
      if (logoResponse?.is_success) {
        const logoData = logoResponse?.data ?? logoResponse;
        if (logoData) {
          setLogoPreview(logoData);
        }
      } else if (logoResponse?.is_success === false && logoResponse?.status_code === 500) {
        toast.error("Internal Server Error. Please Contact Support Team.");
        setLogoPreview(null);
      } else {
        toast.error(logoResponse?.message || "Failed to load client logo");
        setLogoPreview(null);
      }
    } catch (error) {
      console.error("Failed to load client logo:", error);
      setLogoPreview(null);
    } finally {
      setLogoLoading(false);
    }
  };

  React.useEffect(() => {
    loadClient();
    loadClientLogo();
  }, [id, isEdit, token, formik.values.fileId]);

  React.useEffect(() => {
    if (sameAsLegal) {
      formik.setFieldValue("billing", { ...formik.values.legal });
    }
  }, [formik.values.legal, sameAsLegal]);

  React.useEffect(() => {
    if (!isEdit) return;

    const areAddressesSame =
      JSON.stringify(formik.values.legal || {}) ===
      JSON.stringify(formik.values.billing || {});

    if (sameAsLegal !== areAddressesSame) {
      setSameAsLegal(areAddressesSame);
    }
  }, [isEdit, sameAsLegal, formik.values.legal, formik.values.billing]);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0] || null;
    formik.setFieldValue("logo", file);
    setLogoLoading(false);

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  };

  const handleSameAsLegal = (checked) => {
    setSameAsLegal(checked);
    if (checked) {
      formik.setFieldValue("billing", { ...formik.values.legal });
    }
  };

  const ITEMS_PER_PAGE = 12;
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(NAV.length / ITEMS_PER_PAGE);
  const paginatedServices = NAV.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE
  );

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
                {isEdit ? "Edit Client" : "Client Details"}
              </h3>
              <small className="text-muted">
                Manage organization information & permissions
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
                  Organization Name {renderAsterisk()}
                </label>
                <input
                  className={`form-control rounded-3 shadow-sm ${formik.touched.orgName && formik.errors.orgName
                      ? "is-invalid"
                      : ""
                    }`}
                  name="orgName"
                  placeholder="Aegis HealthCare Solutions"
                  {...formik.getFieldProps("orgName")}
                />
                <div className="invalid-feedback">{formik.errors.orgName}</div>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Short Form {renderAsterisk()}
                </label>
                <input
                  className={`form-control rounded-3 shadow-sm ${formik.touched.shortForm && formik.errors.shortForm
                      ? "is-invalid"
                      : ""
                    }`}
                  name="shortForm"
                  placeholder="AHS"
                  {...formik.getFieldProps("shortForm")}
                />
                <div className="invalid-feedback">{formik.errors.shortForm}</div>
              </div>
            </div>

            <div className="row g-3 mt-1">
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Phone {renderAsterisk()}
                </label>
                <input
                  className={`form-control rounded-3 shadow-sm ${formik.touched.phone && formik.errors.phone
                      ? "is-invalid"
                      : ""
                    }`}
                  name="phone"
                  placeholder="+1 (555) 123-4567"
                  {...formik.getFieldProps("phone")}
                />
                <div className="invalid-feedback">{formik.errors.phone}</div>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Email {renderAsterisk()}
                </label>
                <input
                  className={`form-control rounded-3 shadow-sm ${formik.touched.email && formik.errors.email
                      ? "is-invalid"
                      : ""
                    }`}
                  name="email"
                  placeholder="example@domain.com"
                  {...formik.getFieldProps("email")}
                />
                <div className="invalid-feedback">{formik.errors.email}</div>
              </div>
            </div>

            <div className="row g-3 mt-1">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Logo</label>

                <div className="border rounded-4 p-3 text-center bg-white shadow-sm position-relative">
                  <input
                    type="file"
                    className="form-control"
                    onChange={handleLogoChange}
                  />

                  {logoLoading && !logoPreview && (
                    <div className="mt-3">
                      <div
                        className="skeleton mx-auto"
                        style={{ height: "180px", maxWidth: "260px" }}
                      />
                    </div>
                  )}

                  {logoPreview && (
                    <div className="position-relative d-inline-block mt-3 w-100 border-0 border-md py-3 px-md-0">
                      <button
                        type="button"
                        onClick={() => {
                          setLogoPreview(null);
                          formik.setFieldValue("logo", null);
                        }}
                        className="btn btn-danger rounded-circle p-0 d-flex align-items-center justify-content-center"
                        style={{
                          width: "30px",
                          height: "30px",
                          position: "absolute",
                          top: "0px",
                          right: "0px",
                          fontSize: "14px",
                        }}
                      >
                        x
                      </button>

                      <img
                        src={logoPreview}
                        alt="preview"
                        className="rounded shadow-sm"
                        style={{
                          maxHeight: "200px",
                          border: "1px solid #eee",
                          padding: "4px",
                          background: "#fff",
                        }}
                      />
                    </div>
                  )}

                  {!logoLoading && !logoPreview && formik.values.fileId && (
                    <div className="mt-3 text-muted small">
                      Existing logo will be kept.
                    </div>
                  )}
                </div>
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
            </div>
          </div>

          <div className="row g-4">
            {["legal", "billing"].map((type) => (
              <div className="col-md-6" key={type}>
                <div className="p-4 rounded-4 border bg-light-subtle h-100">
                  {type === "billing" ? (
                    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                      <h6 className="fw-bold hc-text-primary text-capitalize m-0">
                        Billing Address {renderAsterisk()}
                      </h6>

                      <div className="form-check m-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="sameAsLegal"
                          checked={sameAsLegal}
                          onChange={(e) => handleSameAsLegal(e.target.checked)}
                        />
                        <label
                          className="form-check-label small text-muted"
                          htmlFor="sameAsLegal"
                        >
                          As Legal Address
                        </label>
                      </div>
                    </div>
                  ) : (
                    <h6 className="fw-bold hc-text-primary mb-3 text-capitalize">
                      Legal Address {renderAsterisk()}
                    </h6>
                  )}

                  <div className="mb-2">
                    <input
                      name={`${type}.street`}
                      placeholder="Street"
                      disabled={type === "billing" && sameAsLegal}
                      className={`form-control rounded-3 shadow-sm ${formik.touched[type]?.street &&
                          formik.errors[type]?.street
                          ? "is-invalid"
                          : ""
                        }`}
                      value={formik.values[type].street}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    <div className="invalid-feedback">
                      {formik.errors[type]?.street}
                    </div>
                  </div>

                  <div className="row g-2 mb-2">
                    <div className="col">
                      <input
                        name={`${type}.city`}
                        placeholder="City"
                        disabled={type === "billing" && sameAsLegal}
                        className={`form-control rounded-3 shadow-sm ${formik.touched[type]?.city && formik.errors[type]?.city
                            ? "is-invalid"
                            : ""
                          }`}
                        value={formik.values[type].city}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                      />
                      <div className="invalid-feedback">
                        {formik.errors[type]?.city}
                      </div>
                    </div>

                    <div className="col">
                      <input
                        name={`${type}.state`}
                        placeholder="State"
                        disabled={type === "billing" && sameAsLegal}
                        className={`form-control rounded-3 shadow-sm ${formik.touched[type]?.state &&
                            formik.errors[type]?.state
                            ? "is-invalid"
                            : ""
                          }`}
                        value={formik.values[type].state}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                      />
                      <div className="invalid-feedback">
                        {formik.errors[type]?.state}
                      </div>
                    </div>
                  </div>

                  <div className="row g-2">
                    <div className="col">
                      <input
                        name={`${type}.country`}
                        placeholder="Country"
                        disabled={type === "billing" && sameAsLegal}
                        className={`form-control rounded-3 shadow-sm ${formik.touched[type]?.country &&
                            formik.errors[type]?.country
                            ? "is-invalid"
                            : ""
                          }`}
                        value={formik.values[type].country}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                      />
                      <div className="invalid-feedback">
                        {formik.errors[type]?.country}
                      </div>
                    </div>

                    <div className="col">
                      <input
                        name={`${type}.zip`}
                        placeholder="ZIP"
                        disabled={type === "billing" && sameAsLegal}
                        className={`form-control rounded-3 shadow-sm ${formik.touched[type]?.zip && formik.errors[type]?.zip
                            ? "is-invalid"
                            : ""
                          }`}
                        value={formik.values[type].zip}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                      />
                      <div className="invalid-feedback">
                        {formik.errors[type]?.zip}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 rounded-4 border bg-light-subtle">
            <h6 className="fw-bold hc-text-primary mb-2">
              Services {renderAsterisk()}
            </h6>

            {formik.touched.services && formik.errors.services && (
              <div className="text-danger mb-3 small">
                {formik.errors.services}
              </div>
            )}

            <div className="row g-3">
              {paginatedServices.map((item) => {
                const active = formik.values.services.includes(item.id);

                return (
                  <div className="col-12 col-md-4 col-lg-3" key={item.id}>
                    <div
                      onClick={() => {
                        formik.setFieldTouched("services", true);

                        formik.setFieldValue(
                          "services",
                          active
                            ? formik.values.services.filter(
                              (serviceId) => serviceId !== item.id
                            )
                            : [...formik.values.services, item.id]
                        );
                      }}
                      className={`service-card text-center px-3 py-3 rounded-3 fw-medium w-100 ${active ? "active" : "hc-text-primary"
                        }`}
                      style={{
                        cursor: "pointer",
                        minHeight: "60px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {item.label}
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