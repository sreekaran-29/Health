import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import Lottie from "lottie-react";
import searchAnimation from "../../Assets/Loader/search.json";
import { FiUser, FiLock, FiEye, FiEyeOff, FiCheck, FiX } from "react-icons/fi";
import { checkEmail, login } from "../../Services/AuthenticationService";
import SignInImage from "../../Components/SignIn/SignInImage";
import { APPRoutes } from "../../Utils/Route";
import { toast } from "react-toastify";
import { useAuth } from "../../Context/AuthContext";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [emailCheckState, setEmailCheckState] = useState({
    status: "idle",
    checkedEmail: "",
  });
  const [loginState, setLoginState] = useState("idle"); // idle | loading | success | error
  const emailCheckRequestId = useRef(0);
  const { login: authLogin, token } = useAuth();
  const navigate = useNavigate();

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      username: "",
      password: "",
    },
    validationSchema: Yup.object({
      username: Yup.string()
        .trim()
        .required("Username is required")
        .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"),
      password: Yup.string()
        .required("Password is required")
    }),
    onSubmit: async (values) => {
      setLoginState("loading");
      try {
        const response = await login(values);
        if (response?.is_success) {
          const token = response?.data;
          authLogin(token);
          setLoginState("success");
          navigate(APPRoutes.DASHBOARD);
        } else if (response?.is_success === false && response?.status_code === 500) {
          setLoginState("error");
          toast.error("Internal Server Error. Please Contact Support Team.");
        }
        else {
          setLoginState("error");
          toast.error(response?.message || "Login failed. Please check your credentials and try again.");
        }
      } catch (error) {
        setLoginState("error");
        toast.error(error?.message || "An unexpected error occurred. Please try again later.");
        console.error("Login error:", error);
      }
    },
  });

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleUsernameChange = (event) => {
    formik.handleChange(event);
    emailCheckRequestId.current += 1;

    setEmailCheckState({
      status: "idle",
      checkedEmail: "",
    });
  };

  const handlePasswordFocus = async () => {
    const email = formik.values.username.trim();

    formik.setFieldTouched("username", true, true);

    if (!email || !isValidEmail(email)) return;
    if (emailCheckState.status === "loading") return;
    if (emailCheckState.checkedEmail === email) return;

    const requestId = ++emailCheckRequestId.current;

    setEmailCheckState({
      status: "loading",
      checkedEmail: email,
    });

    try {
      const response = await checkEmail(email);
      if (response?.is_success) {
        if (emailCheckRequestId.current !== requestId) return;
        setEmailCheckState({
          status: response?.is_success ? "success" : "error",
          checkedEmail: email,
        });
      }else if (response?.is_success === false && response?.status_code === 500) {
        setEmailCheckState({
          status: "error",
          checkedEmail: email,
        });
        toast.error("Internal Server Error. Please Contact Support Team.");
      } else {
        setEmailCheckState({
          status: "error",
          checkedEmail: email,
        });
        toast.error(response?.message || "Failed to verify email. Please try again.");
      }
    } catch (error) {
      if (emailCheckRequestId.current !== requestId) return;
      setEmailCheckState({
        status: "error",
        checkedEmail: email,
      });
      toast.error("An unexpected error occurred. Please try again later.");
      console.error("Error checking email", error);
    }
  };

  const getFieldError = (fieldName) => formik.touched[fieldName] && formik.errors[fieldName] ? formik.errors[fieldName] : "";

  const renderLoginButtonContent = () => {
    if (loginState === "loading") {
      return (
        <Lottie
          animationData={searchAnimation}
          loop={true}
          style={{ width: "3.5rem", height: "3.5rem" }}
        />
      );
    }
    if (loginState === "success") {
      return (
        <span
          className="d-inline-flex align-items-center justify-content-center rounded-circle"
          style={{ width: "1.5rem", height: "1.5rem", backgroundColor: "#28a745", color: "#ffffff" }}
        >
          <FiCheck size={16} />
        </span>
      );
    }
    return "Sign In";
  };

  const renderEmailStatusIndicator = () => {
    if (emailCheckState.status === "loading") {
      return (
        <span className="input-group-text border-0 bg-transparent pe-3">
          <span
            className="spinner-border spinner-border-sm hc-text-primary"
            role="status"
            style={{ width: "1rem", height: "1rem" }}
          ></span>
        </span>
      );
    }

    if (emailCheckState.status === "success") {
      return (
        <span className="input-group-text border-0 bg-transparent pe-3">
          <span
            className="d-inline-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: "1.35rem",
              height: "1.35rem",
              backgroundColor: "#28a745",
              color: "#ffffff",
            }}
          >
            <FiCheck size={14} />
          </span>
        </span>
      );
    }

    if (emailCheckState.status === "error") {
      return (
        <span className="input-group-text border-0 bg-transparent pe-3">
          <span
            className="d-inline-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: "1.35rem",
              height: "1.35rem",
              backgroundColor: "#dc3545",
              color: "#ffffff",
            }}
          >
            <FiX size={14} />
          </span>
        </span>
      );
    }

    return null;
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center py-3 hc-auth-page-bg">
      <div className="container px-md-5">
        <div className="row g-0 p-md-4 shadow-lg rounded-5 align-items-center overflow-hidden mx-auto" style={{ maxWidth: "88%" }}>
          <SignInImage />
          <div className="col-12 col-lg-6">
            <div className="p-3 px-lg-4 p-xl-5 py-lg-5">
              <div className="d-inline-flex align-items-center rounded-pill px-3 py-2 mb-3" style={{ backgroundColor: "#eef4ff", border: "1px solid #d3e3ff" }}>
                <span className="rounded-circle me-2 hc-bg-primary" style={{ width: "8px", height: "8px" }}></span>
                <span className="fw-semibold small hc-text-primary">Secure connection</span>
              </div>

              <h2 className="mb-1 display-6 fw-bold lh-sm" style={{ color: "#17233d", fontFamily: "Georgia, serif" }}>
                Welcome <span style={{ color: "#3f79f8", fontStyle: "italic" }}>back !</span>
              </h2>
              <p className="mb-3 fs-6 fs-md-5" style={{ color: "#6c7f9b" }}>
                Sign in to continue to your account.
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
                      onChange={handleUsernameChange}
                      onBlur={formik.handleBlur}
                      aria-invalid={Boolean(getFieldError("username"))}
                    />
                    {renderEmailStatusIndicator()}
                  </div>
                  <div className="pt-1 small" style={{ color: "#dc3545", minHeight: "20px" }}>
                    {getFieldError("username")}
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="form-label fw-semibold fs-6" style={{ color: "#4a5c76" }}>
                    Password
                  </label>
                  <div
                    className="input-group rounded-4 overflow-hidden"
                    style={{
                      backgroundColor: "#f2f5fb",
                      border: `1px solid ${getFieldError("password") ? "#dc3545" : "#d4deeb"}`,
                    }}
                  >
                    <span className="input-group-text border-0 bg-transparent ps-3" style={{ color: "#6a7f9d" }}>
                      <FiLock size={18} />
                    </span>
                    <input
                      name="password"
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="form-control border-0 bg-transparent py-2 py-md-3 shadow-none"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      style={{ fontSize: "1.2rem", letterSpacing: "0.20rem" }}
                      value={formik.values.password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      onFocus={handlePasswordFocus}
                      aria-invalid={Boolean(getFieldError("password"))}
                    />
                    <button
                      type="button"
                      className="input-group-text border-0 bg-transparent pe-3"
                      style={{ color: "#6a7f9d" }}
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                  <div className="pt-1 small" style={{ color: "#dc3545", minHeight: "20px" }}>
                    {getFieldError("password")}
                  </div>
                </div>

                <div className="d-flex justify-content-end align-items-center mb-3">
                  <Link to={APPRoutes.FORGOT_PASSWORD} className="btn btn-link text-decoration-none p-0 fw-semibold fs-6 hc-text-primary">
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  className={`btn w-100 fw-semibold rounded-4 border-0 fs-5 d-flex align-items-center justify-content-center hc-btn-primary-gradient ${loginState === "loading" ? "p-0" : "py-2"}`}
                  disabled={emailCheckState.status === "loading" || loginState === "loading" || loginState === "success"}
                  style={{
                    color: "#ffffff",
                    boxShadow: "0 8px 24px rgba(47, 109, 246, 0.35)",
                    opacity: emailCheckState.status === "loading" || loginState === "loading" ? 0.7 : 1,
                    minHeight: "3rem",
                  }}
                >
                  {renderLoginButtonContent()}
                </button>
              </form>

              <p className="mt-3 mb-0 text-center fs-6" style={{ color: "#7d8fad" }}>
                Don't have an account?
                <a href="https://www.aegishs.us/contact.php" target="_blank" rel="noopener noreferrer" className="ms-1 fw-semibold text-decoration-none text-nowrap hc-text-primary">
                  Request Access
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;