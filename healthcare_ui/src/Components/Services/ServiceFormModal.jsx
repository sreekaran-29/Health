import React, { useMemo, useEffect } from "react";
import SearchableDropdown from "../Subscription/SearchableDropdown";
import { useFormik } from "formik";
import * as Yup from "yup";
import PropTypes from "prop-types";
import { useAuth } from "../../Context/AuthContext";

const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const validationSchema = Yup.object({
  Name: Yup.string().trim().required("Service Name is required"),
  ClientId: Yup.string().required("Client is required"),
  Status: Yup.string().required("Status is required"),
  EstimatedServiceTime: Yup.number()
    .typeError("Estimated Time must be a number")
    .required("Estimated Time is required")
    .min(1, "Estimated Time must be at least 1 minute"),
  Description: Yup.string().trim().required("Description is required"),
});


export default function ServiceFormModal({
  open,
  onClose,
  onSubmit,
  loading,
  initialValues = {},
  clients = [],
  clientsLoading = false,
  title = "Add Service",
}) {
  const { decodedToken } = useAuth();
  const isSuperAdmin = !!decodedToken?.is_super_admin;
  const accountId = decodedToken?.account_id;
  const clientOptions = useMemo(
    () =>
      clients.map((c) => ({
        value: c.Id,
        label: c.OrganizationName,
      })),
    [clients]
  );

  const formik = useFormik({
    initialValues: {
      Name: initialValues.Name || "",
      AccountId: isSuperAdmin ? (initialValues.AccountId || "") : accountId || "",
      Status: initialValues.Status || "Active",
      EstimatedServiceTime: initialValues.EstimatedServiceTime || "",
      Description: initialValues.Description || "",
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      Name: Yup.string().trim().required("Service Name is required"),
      AccountId: isSuperAdmin ? Yup.string().required("Account is required") : Yup.string(),
      Status: Yup.string().required("Status is required"),
      EstimatedServiceTime: Yup.number()
        .typeError("Estimated Time must be a number")
        .required("Estimated Time is required")
        .min(1, "Estimated Time must be at least 1 minute"),
      Description: Yup.string().trim().required("Description is required"),
    }),
    onSubmit: (values) => {
      const payload = {
        Name: values.Name,
        Status: values.Status,
        EstimatedServiceTime: values.EstimatedServiceTime,
        Description: values.Description,
        ...(isSuperAdmin ? { AccountId: values.AccountId } : {}),
      };
      if (initialValues.Id) payload.Id = initialValues.Id;
      onSubmit(payload);
    },
  });

  if (!open) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.25)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content rounded-4 shadow-lg">
          <div className="modal-header border-0 pb-2">
            <h5 className="modal-title fw-bold">{title}</h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
              disabled={loading}
            />
          </div>
          <form onSubmit={formik.handleSubmit}>
            <div className="modal-body pt-0">
              <div className="mb-3">
                <label className="form-label fw-semibold">Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className={`form-control rounded-3${formik.touched.Name && formik.errors.Name ? ' is-invalid' : ''}`}
                  name="Name"
                  value={formik.values.Name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="Service Name"
                  disabled={loading}
                />
                {formik.touched.Name && formik.errors.Name && (
                  <div className="invalid-feedback">{formik.errors.Name}</div>
                )}
              </div>
              {isSuperAdmin && (
                <div className="mb-3">
                  <SearchableDropdown
                    label="Account"
                    placeholder="Select Account"
                    options={clientOptions}
                    value={formik.values.AccountId}
                    onChange={(value) => formik.setFieldValue('AccountId', value)}
                    disabled={clientsLoading || loading}
                    loading={clientsLoading}
                    emptyMessage="No accounts found"
                  />
                  {formik.touched.AccountId && formik.errors.AccountId && (
                    <div className="invalid-feedback d-block">{formik.errors.AccountId}</div>
                  )}
                </div>
              )}
              <div className="mb-3">
                <label className="form-label fw-semibold">Status <span className="text-danger">*</span></label>
                <select
                  className={`form-select rounded-3${formik.touched.Status && formik.errors.Status ? ' is-invalid' : ''}`}
                  name="Status"
                  value={formik.values.Status}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={loading}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {formik.touched.Status && formik.errors.Status && (
                  <div className="invalid-feedback">{formik.errors.Status}</div>
                )}
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Estimated Time (min) <span className="text-danger">*</span></label>
                <input
                  type="number"
                  className={`form-control rounded-3${formik.touched.EstimatedServiceTime && formik.errors.EstimatedServiceTime ? ' is-invalid' : ''}`}
                  name="EstimatedServiceTime"
                  value={formik.values.EstimatedServiceTime}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  min="1"
                  placeholder="e.g. 10"
                  disabled={loading}
                />
                {formik.touched.EstimatedServiceTime && formik.errors.EstimatedServiceTime && (
                  <div className="invalid-feedback">{formik.errors.EstimatedServiceTime}</div>
                )}
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Description <span className="text-danger">*</span></label>
                <textarea
                  className={`form-control rounded-3${formik.touched.Description && formik.errors.Description ? ' is-invalid' : ''}`}
                  name="Description"
                  value={formik.values.Description}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  rows={3}
                  placeholder="Describe the service"
                  disabled={loading}
                />
                {formik.touched.Description && formik.errors.Description && (
                  <div className="invalid-feedback">{formik.errors.Description}</div>
                )}
              </div>
            </div>
            <div className="modal-footer border-0 pt-0 d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary px-4 rounded-3"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn hc-bg-primary text-white px-4 rounded-3 fw-semibold d-flex align-items-center gap-2"
                disabled={loading}
              >
                {loading && (
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                )}
                {title.includes("Edit") ? "Update" : "Add"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

ServiceFormModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  initialValues: PropTypes.object,
  clients: PropTypes.array,
  clientsLoading: PropTypes.bool,
  title: PropTypes.string,
};
