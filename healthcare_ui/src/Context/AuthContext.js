import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import { login as loginApi } from "../Services/AuthenticationService";
import { toast } from "react-toastify";
import { FiEye, FiEyeOff } from "react-icons/fi";

const AuthContext = createContext();
const MAX_REAUTH_ATTEMPTS = 2;
const STAY_MODAL_TIMEOUT_SECONDS = 10;
const REAUTH_ATTEMPTS_KEY = "reauth_attempts";
const REAUTH_STAGE_KEY = "reauth_stage";

const getStoredAuth = () => {
  const storedToken = sessionStorage.getItem("accesstoken");
  const storedDecodedToken = sessionStorage.getItem("decodedToken");
  let parsedDecodedToken = null;

  if (storedDecodedToken) {
    try {
      parsedDecodedToken = JSON.parse(storedDecodedToken);
    } catch {
      sessionStorage.removeItem("decodedToken");
    }
  }

  return {
    token: storedToken || null,
    decodedToken: parsedDecodedToken,
  };
};

const getStoredReAuthAttempts = () => {
  const parsedAttempts = Number(sessionStorage.getItem(REAUTH_ATTEMPTS_KEY));
  if (!Number.isFinite(parsedAttempts) || parsedAttempts < 0) {
    return 0;
  }
  return parsedAttempts;
};

const clearReAuthSessionState = () => {
  sessionStorage.removeItem(REAUTH_ATTEMPTS_KEY);
  sessionStorage.removeItem(REAUTH_STAGE_KEY);
};

export const AuthProvider = ({ children }) => {
  const initialAuth = getStoredAuth();

  const [token, setToken] = useState(initialAuth.token);
  const [decodedToken, setDecodedToken] = useState(initialAuth.decodedToken);
  const [showStayModal, setShowStayModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [stayCountdown, setStayCountdown] = useState(STAY_MODAL_TIMEOUT_SECONDS);
  const [reAuthPassword, setReAuthPassword] = useState("");
  const [reAuthLoading, setReAuthLoading] = useState(false);
  const [reAuthError, setReAuthError] = useState("");
  const [reAuthAttempts, setReAuthAttempts] = useState(getStoredReAuthAttempts);
  const [showReAuthPassword, setShowReAuthPassword] = useState(false);
  const timerRef = useRef(null);
  const stayTimeoutRef = useRef(null);
  const stayIntervalRef = useRef(null);

  const clearStayModalTimers = useCallback(() => {
    if (stayTimeoutRef.current) {
      clearTimeout(stayTimeoutRef.current);
      stayTimeoutRef.current = null;
    }
    if (stayIntervalRef.current) {
      clearInterval(stayIntervalRef.current);
      stayIntervalRef.current = null;
    }
  }, []);

  const logout = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    clearStayModalTimers();
    sessionStorage.removeItem("accesstoken");
    sessionStorage.removeItem("decodedToken");
    clearReAuthSessionState();
    setToken(null);
    setDecodedToken(null);
    setShowStayModal(false);
    setShowPasswordModal(false);
    setReAuthAttempts(0);
  }, [clearStayModalTimers]);

  const scheduleExpiry = useCallback((decoded) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const msUntilExpiry = decoded.exp * 1000 - Date.now();

    if (msUntilExpiry <= 0) {
      const storedAttempts = getStoredReAuthAttempts();
      const storedStage = sessionStorage.getItem(REAUTH_STAGE_KEY);

      if (storedAttempts >= MAX_REAUTH_ATTEMPTS) {
        toast.error("Maximum re-authentication attempts reached. Logging out.");
        logout();
        return;
      }

      if (storedStage === "password" || storedAttempts > 0) {
        setShowStayModal(false);
        setShowPasswordModal(true);
        return;
      }

      sessionStorage.setItem(REAUTH_STAGE_KEY, "stay");
      setShowPasswordModal(false);
      setShowStayModal(true);
      return;
    }

    clearReAuthSessionState();
    setReAuthAttempts(0);
    setShowStayModal(false);
    setShowPasswordModal(false);
    timerRef.current = setTimeout(() => {
      sessionStorage.setItem(REAUTH_STAGE_KEY, "stay");
      setShowStayModal(true);
    }, msUntilExpiry);
  }, [logout]);

  useEffect(() => {
    if (reAuthAttempts > 0) {
      sessionStorage.setItem(REAUTH_ATTEMPTS_KEY, String(reAuthAttempts));
    } else {
      sessionStorage.removeItem(REAUTH_ATTEMPTS_KEY);
    }
  }, [reAuthAttempts]);

  useEffect(() => {
    if (!showStayModal) {
      clearStayModalTimers();
      setStayCountdown(STAY_MODAL_TIMEOUT_SECONDS);
      return;
    }

    setStayCountdown(STAY_MODAL_TIMEOUT_SECONDS);
    stayIntervalRef.current = setInterval(() => {
      setStayCountdown((previous) => (previous > 0 ? previous - 1 : 0));
    }, 1000);

    stayTimeoutRef.current = setTimeout(() => {
      setShowStayModal(false);
      logout();
    }, STAY_MODAL_TIMEOUT_SECONDS * 1000);

    return () => {
      clearStayModalTimers();
    };
  }, [showStayModal, logout]);

  useEffect(() => {
    if (token && decodedToken) {
      scheduleExpiry(decodedToken);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearStayModalTimers();
    };
  }, [token, decodedToken, scheduleExpiry]);

  const login = (newToken) => {
    const decoded = jwtDecode(newToken);
    sessionStorage.setItem("accesstoken", newToken);
    sessionStorage.setItem("decodedToken", JSON.stringify(decoded));
    clearReAuthSessionState();
    clearStayModalTimers();
    setToken(newToken);
    setDecodedToken(decoded);
    setReAuthAttempts(0);
    setShowStayModal(false);
    setShowPasswordModal(false);
    scheduleExpiry(decoded);
  };

  const handleStayConfirm = () => {
    clearStayModalTimers();
    setShowStayModal(false);
    setReAuthPassword("");
    setReAuthError("");
    setReAuthAttempts(0);
    sessionStorage.setItem(REAUTH_STAGE_KEY, "password");
    setShowPasswordModal(true);
  };

  const handleStayDecline = () => {
    clearStayModalTimers();
    setShowStayModal(false);
    logout();
  };

  const handleReAuth = async () => {
    const email = decodedToken?.user_email ||"";

    if (!reAuthPassword.trim()) {
      setReAuthError("Password is required.");
      return;
    }

    if (reAuthAttempts >= MAX_REAUTH_ATTEMPTS) {
      toast.error("Maximum re-authentication attempts reached. Logging out.");
      logout();
      return;
    }

    const handleFailedAttempt = (message) => {
      const nextAttempts = reAuthAttempts + 1;
      const attemptsLeft = MAX_REAUTH_ATTEMPTS - nextAttempts;
      setReAuthAttempts(nextAttempts);
      sessionStorage.setItem(REAUTH_STAGE_KEY, "password");

      if (attemptsLeft <= 0) {
        toast.error("Maximum re-authentication attempts reached. Logging out.");
        logout();
        return;
      }

      setReAuthError(`${message} ${attemptsLeft} attempt left.`);
    };

    setReAuthLoading(true);
    setReAuthError("");

    try {
      const response = await loginApi({ username: email, password: reAuthPassword });
      if (response?.is_success) {
        login(response.data);
        setShowPasswordModal(false);
        setReAuthPassword("");
        setReAuthAttempts(0);
      } else {
        handleFailedAttempt("Invalid password.");
      }
    } catch {
      handleFailedAttempt("Authentication failed.");
    } finally {
      setReAuthLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ token, decodedToken, login, logout }}>
      {children}
      {showStayModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1055 }} />
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1056 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow-lg">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold hc-text-primary">Session Expired</h5>
                </div>
                <div className="modal-body py-3">
                  <p className="text-secondary mb-0">
                    Your session has expired. Would you like to stay logged in?
                  </p>
                </div>
                <div className="modal-footer border-0 pt-0 gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm rounded-3 px-3"
                    onClick={handleStayDecline}
                  >
                    Logout
                  </button>
                  <button
                    type="button"
                    className="btn hc-bg-primary text-white btn-sm rounded-3 px-3"
                    onClick={handleStayConfirm}
                  >
                    Stay Logged In ({stayCountdown})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showPasswordModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1057 }} />
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1058 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 border-0 shadow-lg">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold hc-text-primary">Re-authenticate</h5>
                </div>
                <div className="modal-body py-3">
                  <p className="text-secondary mb-3 small">
                    Enter your password to continue your session.
                  </p>
                  <p className="text-secondary mb-2 small">
                    Attempts remaining: {Math.max(0, MAX_REAUTH_ATTEMPTS - reAuthAttempts)} of {MAX_REAUTH_ATTEMPTS}
                  </p>
                  <div>
                    <div className="position-relative">
                      <input
                        type={showReAuthPassword ? "text" : "password"}
                        className={`form-control form-control-sm hc-input${reAuthError ? " is-invalid" : ""}`}
                        placeholder="Password"
                        value={reAuthPassword}
                        autoFocus
                        style={{
                          paddingRight: reAuthError ? "70px" : "40px",
                          height: "40px",
                        }}
                        onChange={(e) => {
                          setReAuthPassword(e.target.value);
                          setReAuthError("");
                        }}
                        onKeyDown={(e) =>
                          e.key === "Enter" && !reAuthLoading && handleReAuth()
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-link p-0 position-absolute top-50 translate-middle-y text-secondary"
                        style={{ right: reAuthError ? "34px" : "10px", lineHeight: 0 }}
                        tabIndex={-1}
                        onClick={() => setShowReAuthPassword((v) => !v)}
                      >
                        {showReAuthPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                    {reAuthError && (
                      <div className="invalid-feedback d-block">{reAuthError}</div>
                    )}
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0 gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm rounded-3 px-3"
                    disabled={reAuthLoading}
                    onClick={() => {
                      setShowPasswordModal(false);
                      logout();
                    }}
                  >
                    Logout
                  </button>
                  <button
                    type="button"
                    className="btn hc-bg-primary text-white btn-sm rounded-3 px-3"
                    disabled={reAuthLoading}
                    onClick={handleReAuth}
                  >
                    {reAuthLoading && (
                      <span
                        className="spinner-border spinner-border-sm me-1"
                        role="status"
                        aria-hidden="true"
                      />
                    )}
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);