import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { FiUser, FiCheck } from "react-icons/fi";
import SignInImage from "../../Components/SignIn/SignInImage";
import { APPRoutes } from "../../Utils/Route";
import { forgotPassword } from "../../Services/AuthenticationService";
import { toast } from "react-toastify";

const ForgetPasswordPage = () => {
	const [submitState, setSubmitState] = useState("idle"); // idle | loading | success | error

	const formik = useFormik({
		enableReinitialize: true,
		initialValues: {
			username: "",
		},
		validationSchema: Yup.object({
			username: Yup.string()
				.trim()
				.required("Username is required")
				.matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"),
		}),
		onSubmit: async (values) => {
			setSubmitState("loading");
			try {
				const response = await forgotPassword(values.username);
				if (response?.is_success) {
					setSubmitState("success");
					toast.success(response?.message || "Password reset link sent successfully.");
				} else if (response?.is_success === false && response?.status_code === 500) {
					setSubmitState("error");
					toast.error("Internal Server Error. Please Contact Support Team.");
				}
				else {
					setSubmitState("error");
					toast.error(response?.message || "Failed to send password reset link. Please try again.");
				}
			} catch (error) {
				setSubmitState("error");
				toast.error(error?.message || "An unexpected error occurred. Please try again later.");
				console.error("Forgot password error:", error);
			}
		},
	});

	const getFieldError = (fieldName) =>
		formik.touched[fieldName] && formik.errors[fieldName] ? formik.errors[fieldName] : "";

	const renderButtonContent = () => {
		if (submitState === "loading") {
			return (
				<span
					className="spinner-border spinner-border-sm"
					role="status"
					style={{ color: "#ffffff", width: "1.25rem", height: "1.25rem" }}
				></span>
			);
		}

		if (submitState === "success") {
			return (
				<span
					className="d-inline-flex align-items-center justify-content-center rounded-circle"
					style={{ width: "1.5rem", height: "1.5rem", backgroundColor: "#28a745", color: "#ffffff" }}
				>
					<FiCheck size={16} />
				</span>
			);
		}

		return "Send Reset Link";
	};

	return (
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

							<h2 className="mb-2 display-6 fw-bold lh-sm" style={{ color: "#17233d", fontFamily: "Georgia, serif" }}>
								Forgot <span style={{ color: "#3f79f8", fontStyle: "italic" }}>Password?</span>
							</h2>
							<p className="mb-3 mb-md-4 fs-6 fs-md-5" style={{ color: "#6c7f9b" }}>
								Enter your email and we will send you a reset link.
							</p>

							<form onSubmit={formik.handleSubmit} noValidate>
								<div className="mb-3">
									<label htmlFor="username" className="form-label fw-semibold fs-6" style={{ color: "#4a5c76" }}>
										Username
									</label>
									<div
										className="input-group rounded-4 overflow-hidden"
										style={{
											backgroundColor: "#f2f5fb",
											border: `1px solid ${getFieldError("username") ? "#dc3545" : "#d4deeb"}`,
										}}
									>
										<span className="input-group-text border-0 bg-transparent ps-3" style={{ color: "#6a7f9d" }}>
											<FiUser size={18} />
										</span>
										<input
											name="username"
											id="username"
											type="text"
											className="form-control border-0 bg-transparent py-2 py-md-3 shadow-none"
											placeholder="you@example.com"
											autoComplete="username"
											value={formik.values.username}
											onChange={(event) => {
												formik.handleChange(event);
												if (submitState !== "idle") setSubmitState("idle");
											}}
											onBlur={formik.handleBlur}
											aria-invalid={Boolean(getFieldError("username"))}
										/>
									</div>
									<div className="pt-1 small" style={{ color: "#dc3545", minHeight: "20px" }}>
										{getFieldError("username")}
									</div>
								</div>

								<button
									type="submit"
									className="btn w-100 fw-semibold rounded-4 border-0 fs-5 d-flex align-items-center justify-content-center py-2 hc-btn-primary-gradient"
									disabled={submitState === "loading" || submitState === "success"}
									style={{
										color: "#ffffff",
										boxShadow: "0 8px 24px rgba(47, 109, 246, 0.35)",
										opacity: submitState === "loading" ? 0.7 : 1,
										minHeight: "3rem",
									}}
								>
									{renderButtonContent()}
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
		</div>
	);
};

export default ForgetPasswordPage;
