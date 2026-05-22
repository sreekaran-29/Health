import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import SignInImage from "../../Components/SignIn/SignInImage";
import { APPRoutes } from "../../Utils/Route";
import { checkValidity, updatePassword } from "../../Services/AuthenticationService";
import { toast } from "react-toastify";

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [entireLoading, setEntireLoading] = useState(true);
    const [validateResponse, setValidateResponse] = useState(null);

    const tokenFromParams = searchParams.get("token") || "";
    const emailFromParams = searchParams.get("email") || "";

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            email: emailFromParams,
            newPassword: "",
            confirmPassword: "",
            token: tokenFromParams,
        },
        validationSchema: Yup.object({
            newPassword: Yup.string()
                .required("New password is required")
                .min(8, "Password must be at least 8 characters"),
            confirmPassword: Yup.string()
                .required("Confirm password is required")
                .oneOf([Yup.ref("newPassword")], "Passwords must match"),
        }),
        onSubmit: async (values) => {
            try {
                const response = await updatePassword({
                    email: values.email,
                    token: values.token,
                    new_password: values.newPassword,
                    confirm_password: values.confirmPassword,
                });
                if (response?.is_success) {
                    toast.success("Password updated successfully");
                    navigate(APPRoutes.LOGIN);
                } else if (response?.is_success === false && response?.status_code === 500) {
                    toast.error("Internal Server Error. Please Contact Support Team.");
                } else {
                    toast.error(response?.message || "Failed to update password");
                }
            } catch (error) {
                console.error("Error updating password:", error);
                toast.error("An error occurred while updating the password");
            }
        },
    });

    const ValidateToken = async () => {
        try {
            debugger;
            setEntireLoading(true);
            const response = await checkValidity(emailFromParams);
            if (response?.is_success) {
                setEntireLoading(false);
                console.log("Token is valid");
            }
            else if (response?.status_code === 500) {
                toast.error("Internal Server Error. Please Contact Support Team.");
                setEntireLoading(false);
            }
            else {
                if (response?.data?.IsValidity) {
                    navigate(APPRoutes.VALIDATION_EXPIRES);
                }
                else {
                    toast.error(response?.data?.Message);
                }
                setEntireLoading(false);
            }
        } catch (error) {
            console.error("Token validation error:", error);
        }
    }

    useEffect(() => {
        if (tokenFromParams && emailFromParams) {
            ValidateToken();
        }
    }, [])

    const getFieldError = (fieldName) =>
        formik.touched[fieldName] && formik.errors[fieldName] ? formik.errors[fieldName] : "";

    const renderLoadingSpinner = () => (
        <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center hc-auth-page-bg">
            <span
                className="spinner-border hc-text-primary"
                role="status"
                aria-label="Validating reset link"
                style={{ width: "2.5rem", height: "2.5rem" }}
            ></span>
            <p className="mt-3 mb-0 fw-semibold" style={{ color: "#4a5c76" }}>
                Validating reset link...
            </p>
        </div>
    );

    return (
        entireLoading ? renderLoadingSpinner() : (
            <div className="min-vh-100 d-flex align-items-center justify-content-center py-3 hc-auth-page-bg">
                <div className="container px-md-5">
                    <div className="row g-0 p-md-4 shadow-lg rounded-5 align-items-center overflow-hidden mx-auto" style={{ maxWidth: "88%" }}>
                        <SignInImage />
                        <div className="col-12 col-lg-6">
                            <div className="p-4 px-lg-4 p-xl-5 py-lg-5">
                                <div className="d-inline-flex align-items-center rounded-pill px-3 py-2 mb-3" style={{ backgroundColor: "#eef4ff", border: "1px solid #d3e3ff" }}>
                                    <span className="rounded-circle me-2 hc-bg-primary" style={{ width: "8px", height: "8px" }}></span>
                                    <span className="fw-semibold small hc-text-primary">Secure connection</span>
                                </div>

                                <h2 className="mb-1 display-6 fw-bold lh-sm" style={{ color: "#17233d", fontFamily: "Georgia, serif" }}>
                                    Reset <span style={{ color: "#3f79f8", fontStyle: "italic" }}>Password</span>
                                </h2>
                                <p className="mb-4 fs-6 fs-md-5" style={{ color: "#6c7f9b" }}>
                                    Set a new password for your account.
                                </p>

                                <form onSubmit={formik.handleSubmit} noValidate>
                                    <div className="mb-3">
                                        <label htmlFor="newPassword" className="form-label fw-semibold fs-6" style={{ color: "#4a5c76" }}>
                                            New Password
                                        </label>
                                        <div
                                            className="input-group rounded-4 overflow-hidden"
                                            style={{
                                                backgroundColor: "#f2f5fb",
                                                border: `1px solid ${getFieldError("newPassword") ? "#dc3545" : "#d4deeb"}`,
                                            }}
                                        >
                                            <span className="input-group-text border-0 bg-transparent ps-3" style={{ color: "#6a7f9d" }}>
                                                <FiLock size={18} />
                                            </span>
                                            <input
                                                name="newPassword"
                                                id="newPassword"
                                                type={showNewPassword ? "text" : "password"}
                                                className="form-control border-0 bg-transparent py-2 py-md-3 shadow-none"
                                                placeholder="••••••••"
                                                autoComplete="new-password"
                                                style={{ fontSize: "1.2rem", letterSpacing: "0.20rem" }}
                                                value={formik.values.newPassword}
                                                onChange={formik.handleChange}
                                                onBlur={formik.handleBlur}
                                                aria-invalid={Boolean(getFieldError("newPassword"))}
                                            />
                                            <button
                                                type="button"
                                                className="input-group-text border-0 bg-transparent pe-3"
                                                style={{ color: "#6a7f9d" }}
                                                onClick={() => setShowNewPassword((prev) => !prev)}
                                                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                                            >
                                                {showNewPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                            </button>
                                        </div>
                                        <div className="pt-1 small" style={{ color: "#dc3545", minHeight: "20px" }}>
                                            {getFieldError("newPassword")}
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label htmlFor="confirmPassword" className="form-label fw-semibold fs-6" style={{ color: "#4a5c76" }}>
                                            Confirm Password
                                        </label>
                                        <div
                                            className="input-group rounded-4 overflow-hidden"
                                            style={{
                                                backgroundColor: "#f2f5fb",
                                                border: `1px solid ${getFieldError("confirmPassword") ? "#dc3545" : "#d4deeb"}`,
                                            }}
                                        >
                                            <span className="input-group-text border-0 bg-transparent ps-3" style={{ color: "#6a7f9d" }}>
                                                <FiLock size={18} />
                                            </span>
                                            <input
                                                name="confirmPassword"
                                                id="confirmPassword"
                                                type={showConfirmPassword ? "text" : "password"}
                                                className="form-control border-0 bg-transparent py-2 py-md-3 shadow-none"
                                                placeholder="••••••••"
                                                autoComplete="new-password"
                                                style={{ fontSize: "1.2rem", letterSpacing: "0.20rem" }}
                                                value={formik.values.confirmPassword}
                                                onChange={formik.handleChange}
                                                onBlur={formik.handleBlur}
                                                aria-invalid={Boolean(getFieldError("confirmPassword"))}
                                            />
                                            <button
                                                type="button"
                                                className="input-group-text border-0 bg-transparent pe-3"
                                                style={{ color: "#6a7f9d" }}
                                                onClick={() => setShowConfirmPassword((prev) => !prev)}
                                                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                                            >
                                                {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                            </button>
                                        </div>
                                        <div className="pt-1 small" style={{ color: "#dc3545", minHeight: "20px" }}>
                                            {getFieldError("confirmPassword")}
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn w-100 fw-semibold rounded-4 border-0 fs-5 d-flex align-items-center justify-content-center py-2 hc-btn-primary-gradient"
                                        disabled={formik.isSubmitting}
                                        style={{
                                            color: "#ffffff",
                                            boxShadow: "0 8px 24px rgba(47, 109, 246, 0.35)",
                                            minHeight: "3rem",
                                            opacity: formik.isSubmitting ? 0.85 : 1,
                                        }}
                                    >
                                        {formik.isSubmitting ? (
                                            <>
                                                <span
                                                    className="spinner-border spinner-border-sm me-2"
                                                    role="status"
                                                    aria-hidden="true"
                                                ></span>
                                            </>
                                        ) : (
                                            "Reset Password"
                                        )}
                                    </button>
                                </form>

                                <p className="mt-3 mb-0 text-center fs-6" style={{ color: "#7d8fad" }}>
                                    Remember your password?
                                    <Link to={APPRoutes.LOGIN} className="ms-1 fw-semibold text-decoration-none text-nowrap hc-text-primary">
                                        Sign In
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div >
        )
    );
};

export default ResetPassword;
