/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import Paragraph from "@/components/common/Paragraph";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState, useCallback } from "react";
import Cookies from "js-cookie";
import { API_BASE_URL, getWithAuth } from "@/utils/apiClient";
import ToastMessage from "@/components/common/Toast";
import { Input } from "antd";
import { useCompanyProfile } from "@/context/userCompanyProfile";
import { PublicClientApplication, InteractionRequiredAuthError } from "@azure/msal-browser";

type Stage = "login" | "mfa_verify" | "mfa_setup";

const Page = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; mfaCode?: string }>(
    {}
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastMessage, setToastMessage] = useState("");
  const [isAdEnabled, setIsAdEnabled] = useState<number>(0);
  const { data: companyData } = useCompanyProfile();

  // MFA-Related States (non-AD login only)
  const [stage, setStage] = useState<Stage>("login");
  const [tempToken, setTempToken] = useState<string>("");
  const [mfaCode, setMfaCode] = useState<string>("");
  const [mfaSetupData, setMfaSetupData] = useState<{
    secret: string;
    qrCodeUrl: string;
    recoveryCodes: string[];
  } | null>(null);

  // ── AD Login helpers ──────────────────────────────────────────────────────

  const handleLoginSuccess = useCallback(
    (loginData: {
      data: {
        token: string;
        id: string;
        email: string;
        type: string;
        name: string;
      };
    }) => {
      const expiresIn = 1;
      Cookies.set("authToken", loginData.data.token, {
        expires: expiresIn,
        secure: false,
        sameSite: "strict",
      });
      Cookies.set("userId", loginData.data.id, { expires: expiresIn });
      Cookies.set("userEmail", loginData.data.email, { expires: expiresIn });
      Cookies.set("userType", loginData.data.type, { expires: expiresIn });
      Cookies.set("userName", loginData.data.name, { expires: expiresIn });

      window.location.href = "/";
      setToastType("success");
      setToastMessage("Logged in successfully!");
      setShowToast(true);
    },
    []
  );

  const handleSilentLogin = useCallback(async () => {
    try {
      const configResponse = await fetch(`${API_BASE_URL}ad-config`);
      const configData = await configResponse.json();

      if (configData.status !== "success") return;

      const { client_id, tenant_id } = configData.data;

      const msalConfig = {
        auth: {
          clientId: client_id,
          authority: `https://login.microsoftonline.com/${tenant_id}`,
          redirectUri: window.location.origin + "/auth.html",
          navigateToLoginRequestUrl: false,
        },
        cache: {
          cacheLocation: "sessionStorage" as const,
          storeAuthStateInCookie: false,
        },
      };

      const msalInstance = new PublicClientApplication(msalConfig);
      await msalInstance.initialize();

      const silentRequest = {
        scopes: ["User.Read", "openid", "profile"],
      };

      const tokenResponse = await msalInstance.ssoSilent(silentRequest);

      setLoading(true);
      const formData = new FormData();
      formData.append("email", tokenResponse.account?.username || "");
      formData.append("token", tokenResponse.accessToken);

      const response = await fetch(`${API_BASE_URL}login-with-ad`, {
        method: "POST",
        body: formData,
      });

      const responseData = await response.json();
      if (responseData.status === "success" && responseData.data?.token) {
        handleLoginSuccess(responseData);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.log("Silent SSO failed or requires interaction", error);
    }
  }, [handleLoginSuccess]);

  const fetchAdConnection = useCallback(async () => {
    try {
      const response = await getWithAuth(`get-ad-connection`);
      console.log("response ad", response);
      if (response.status === "fail") {
        // setIsAdEnabled(0)
      } else {
        setIsAdEnabled(response);
        if (response === 1) {
          handleSilentLogin();
        }
      }
    } catch (error) {
      console.error("Error new version updating:", error);
    }
  }, [handleSilentLogin]);

  useEffect(() => {
    fetchAdConnection();
  }, [fetchAdConnection]);

  // ── Non-AD session helper ─────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completeLoginSession = (data: any) => {
    const expiresIn = 1;
    Cookies.set("authToken", data.token, {
      expires: expiresIn,
      secure: false,
      sameSite: "strict",
    });
    Cookies.set("userId", data.id, { expires: expiresIn });
    Cookies.set("userEmail", data.email, { expires: expiresIn });
    Cookies.set("userType", data.type, { expires: expiresIn });
    Cookies.set("userName", data.name, { expires: expiresIn });

    window.location.href = "/";
  };

  // ── Main login handler ────────────────────────────────────────────────────

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    const validationErrors: { email?: string; password?: string } = {};
    if (!email) validationErrors.email = "Email is required";
    if (!isAdEnabled && !password) validationErrors.password = "Password is required";

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      if (isAdEnabled) {
        // ── AD Login Flow (unchanged) ─────────────────────────────────────
        const configResponse = await fetch(`${API_BASE_URL}ad-config`);
        const configData = await configResponse.json();

        if (configData.status !== "success") {
          throw new Error("Failed to fetch AD configuration from backend.");
        }

        const { client_id, tenant_id } = configData.data;

        const msalConfig = {
          auth: {
            clientId: client_id,
            authority: `https://login.microsoftonline.com/${tenant_id}`,
            redirectUri: window.location.origin + "/auth.html",
            navigateToLoginRequestUrl: false,
          },
          cache: {
            cacheLocation: "sessionStorage" as const,
            storeAuthStateInCookie: false,
          },
        };

        const msalInstance = new PublicClientApplication(msalConfig);
        await msalInstance.initialize();

        let tokenResponse;
        try {
          tokenResponse = await msalInstance.loginPopup({
            scopes: ["User.Read", "openid", "profile"],
            loginHint: email,
          });
        } catch (error: unknown) {
          console.error("Popup error:", error);
          if (
            error instanceof InteractionRequiredAuthError ||
            (error as { errorCode?: string }).errorCode === "timed_out" ||
            (error as { errorCode?: string }).errorCode === "user_cancelled"
          ) {
            setToastType("error");
            setToastMessage("AD authentication was cancelled or timed out.");
            setShowToast(true);
            setLoading(false);
            return;
          }
          throw error;
        }

        const formData = new FormData();
        formData.append("email", email);
        formData.append("token", tokenResponse.accessToken);

        const response = await fetch(`${API_BASE_URL}login-with-ad`, {
          method: "POST",
          body: formData,
        });

        const loginResponseData = await response.json();

        if (loginResponseData.status === "success" && loginResponseData.data?.token) {
          handleLoginSuccess(loginResponseData);
        } else {
          setToastType("error");
          setToastMessage(
            loginResponseData.message || "Login failed. Please check your AD account."
          );
          setShowToast(true);
        }
      } else {
        // ── Non-AD Login Flow with MFA + lockout + password-expiry support ──

        const getLocation = (): Promise<{ latitude?: number; longitude?: number }> => {
          return new Promise((resolve) => {
            if (!navigator.geolocation) {
              resolve({});
              setToastType("error");
              setToastMessage("Geolocation is not supported by your browser.");
              setShowToast(true);
              setTimeout(() => setShowToast(false), 5000);
            } else {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                  });
                },
                () => {
                  resolve({});
                }
              );
            }
          });
        };

        const { latitude, longitude } = await getLocation();

        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", password);
        formData.append("type", "normal");

        if (latitude !== undefined) formData.append("latitude", latitude.toString());
        if (longitude !== undefined) formData.append("longitude", longitude.toString());

        const response = await fetch(`${API_BASE_URL}login`, {
          method: "POST",
          body: formData,
        });

        const res = await response.json();

        // Account lockout
        if (response.status === 423 || res.status === "locked") {
          setToastType("error");
          setToastMessage(res.message || "Account locked due to consecutive failures.");
          setShowToast(true);
          setTimeout(() => setShowToast(false), 6000);
          return;
        }

        // Default / expired password — redirect to reset workflow
        if (res.status === "change_password_required" || res.status === "password_expired") {
          setToastType("error");
          setToastMessage(res.message);
          setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
            window.location.href = `/reset-password/${res.temp_token}`;
          }, 3000);
          return;
        }

        // MFA verification required
        if (res.status === "mfa_required") {
          setTempToken(res.temp_token);
          setStage("mfa_verify");
          setToastType("success");
          setToastMessage("Verification required. Please enter OTP.");
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
          return;
        }

        // MFA first-time setup required
        if (res.status === "mfa_setup_required") {
          setTempToken(res.temp_token);
          setStage("mfa_setup");
          fetchMfaSetupDetails(res.temp_token);
          return;
        }

        // Normal success
        if (res.data?.token) {
          completeLoginSession(res.data);
        } else {
          setToastType("error");
          setToastMessage(res.message || "Login failed. Please check your credentials.");
          setShowToast(true);
          setTimeout(() => setShowToast(false), 5000);
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred during login.";
      console.error("Error during login:", error);
      setToastType("error");
      setToastMessage(errorMessage);
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  // ── MFA helpers (non-AD only) ─────────────────────────────────────────────

  const fetchMfaSetupDetails = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}mfa/setup-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temp_token: token }),
      });
      const resData = await response.json();
      if (resData.status === "success") {
        setMfaSetupData({
          secret: resData.secret,
          qrCodeUrl: resData.qrCodeUrl,
          recoveryCodes: resData.recovery_codes,
        });
      }
    } catch (e) {
      console.error("Failed to load MFA QR:", e);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.length !== 6) {
      setErrors({ mfaCode: "Please enter a valid 6-digit code." });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}mfa/verify-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temp_token: tempToken, code: mfaCode }),
      });

      const res = await response.json();

      if (response.status === 423 || res.status === "locked") {
        setToastType("error");
        setToastMessage(res.message || "Account locked.");
        setShowToast(true);
        setStage("login");
        setTimeout(() => setShowToast(false), 5000);
        return;
      }

      if (res.status === "success" && res.data?.token) {
        completeLoginSession(res.data);
      } else {
        setToastType("error");
        setToastMessage(res.message || "Invalid authenticator code.");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      }
    } catch (error) {
      console.error("MFA Verify Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSetupVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.length !== 6) {
      setErrors({ mfaCode: "Please enter a valid 6-digit code." });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}mfa/setup-enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temp_token: tempToken,
          secret: mfaSetupData?.secret,
          code: mfaCode,
          recovery_codes: mfaSetupData?.recoveryCodes,
        }),
      });

      const res = await response.json();

      if (res.status === "success" && res.data?.token) {
        setToastType("success");
        setToastMessage("MFA enabled successfully! Logged in.");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          completeLoginSession(res.data);
        }, 1500);
      } else {
        setToastType("error");
        setToastMessage(res.message || "Verification failed. Check OTP.");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      }
    } catch (error) {
      console.error("MFA Enable Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const imageUrl = companyData?.logo_url || "/logo.png";
  const bannerUrl = companyData?.banner_url || "/login-image.png";

  return (
    <>
      <div
        className="d-flex flex-column flex-lg-row w-100"
        style={{ minHeight: "100svh", maxHeight: "100svh" }}
      >
        {/* Banner */}
        <div
          className="col-12 col-lg-8 d-none d-lg-block"
          style={{
            minHeight: "100svh",
            maxHeight: "100svh",
            backgroundColor: "#EBF2FB",
          }}
        >
          <Image
            src={bannerUrl}
            alt=""
            width={1000}
            height={800}
            className="img-fluid"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Form area */}
        <div
          className="col-12 col-md-6 align-self-center col-lg-4 px-4 px-lg-5 d-flex flex-column justify-content-center align-items-center"
          style={{ minHeight: "100svh", maxHeight: "100svh", overflowY: "auto" }}
        >
          <Image
            src={imageUrl}
            alt=""
            width={200}
            height={150}
            objectFit="cover"
            className="img-fluid mb-3 loginLogo"
          />

          {/* ── Login form: AD login OR non-AD login stage ── */}
          {(isAdEnabled > 0 || stage === "login") && (
            <>
              <Paragraph text="Login To Continue" color="Paragraph" />
              <form
                className="d-flex flex-column px-0 px-lg-3"
                style={{ width: "100%" }}
                onSubmit={handleLogin}
              >
                <div className="d-flex flex-column">
                  <div className="d-flex flex-column mt-3">
                    <label htmlFor="email">{isAdEnabled ? "User Name" : "Email"}</label>
                    <Input
                      type="email"
                      placeholder={isAdEnabled ? "Enter your User Name" : "Email"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`mb-3 ${errors.email ? "is-invalid" : ""}`}
                    />
                    {errors.email && <div className="text-danger">{errors.email}</div>}
                    {isAdEnabled === 1 && (
                      <p
                        className="mt-1"
                        style={{ fontSize: "13px", color: "#555", fontWeight: "500" }}
                      >
                        Please enter your User Name to proceed with Single Sign-On.
                      </p>
                    )}
                  </div>

                  {!isAdEnabled && (
                    <div className="d-flex flex-column mt-3">
                      <label htmlFor="password">Password</label>
                      <Input.Password
                        placeholder="Input password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={errors.password ? "is-invalid" : ""}
                      />
                      {errors.password && (
                        <div className="text-danger">{errors.password}</div>
                      )}
                    </div>
                  )}

                  {!isAdEnabled && (
                    <Link
                      href="/forgot-password"
                      style={{ fontSize: "14px", color: "#333", textDecoration: "none" }}
                      className="py-3 d-flex align-self-end"
                    >
                      Forgot Password?
                    </Link>
                  )}

                  <button
                    type="submit"
                    className="loginButton text-white"
                    disabled={loading}
                  >
                    {loading ? "Logging in..." : "Login"}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── MFA Verify stage (non-AD only) ── */}
          {!isAdEnabled && stage === "mfa_verify" && (
            <>
              <h3 className="mb-1 text-center font-weight-bold">Two-Factor Authentication</h3>
              <div className="text-center mb-4">
                <Paragraph
                  text="Please open your authenticator app and enter the 6-digit verification code below."
                  color="Paragraph"
                />
              </div>
              <form
                className="d-flex flex-column px-0 px-lg-3 w-100"
                onSubmit={handleMfaVerify}
              >
                <div className="d-flex flex-column mt-2">
                  <label htmlFor="mfaCode">Authenticator Code (OTP)</label>
                  <Input
                    maxLength={6}
                    placeholder="e.g. 123456"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    className="mb-3 text-center font-weight-bold"
                    style={{ fontSize: "1.5rem", letterSpacing: "0.2rem" }}
                  />
                  {errors.mfaCode && (
                    <div className="text-danger text-center mb-2">{errors.mfaCode}</div>
                  )}
                </div>
                <button
                  type="submit"
                  className="loginButton text-white mt-3"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
                <button
                  type="button"
                  className="btn btn-link text-secondary mt-3"
                  onClick={() => setStage("login")}
                >
                  Back to standard login
                </button>
              </form>
            </>
          )}

          {/* ── MFA Setup stage (non-AD only) ── */}
          {!isAdEnabled && stage === "mfa_setup" && mfaSetupData && (
            <div
              className="w-100 px-0 px-lg-2 py-3"
              style={{ maxHeight: "75vh", overflowY: "auto" }}
            >
              <h3
                className="mb-1 text-center font-weight-bold"
                style={{ color: "#1e3a8a" }}
              >
                Enable Multi-Factor Auth
              </h3>
              <p className="text-muted text-center" style={{ fontSize: "0.85rem" }}>
                MFA is mandatory for all system users. Scan the QR code to set up security
                on your authenticator app.
              </p>

              {/* QR Code */}
              <div className="d-flex justify-content-center mb-3">
                <div
                  className="p-2 bg-white border rounded shadow-sm"
                  style={{ border: "2px solid #3b82f6" }}
                >
                  <img
                    src={mfaSetupData.qrCodeUrl}
                    alt="Scan QR"
                    width={180}
                    height={180}
                  />
                </div>
              </div>

              {/* Manual secret */}
              <div className="mb-3 text-center">
                <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                  Manual Entry Code:
                </span>
                <div
                  className="bg-light p-2 rounded font-weight-bold font-monospace"
                  style={{
                    fontSize: "0.95rem",
                    letterSpacing: "0.1rem",
                    border: "1px dashed #cbd5e1",
                  }}
                >
                  {mfaSetupData.secret}
                </div>
              </div>

              {/* Recovery codes */}
              <div className="mb-3 p-3 bg-light rounded shadow-sm border">
                <span
                  className="font-weight-bold text-danger"
                  style={{ fontSize: "0.85rem" }}
                >
                  ⚠️ Save Recovery Codes:
                </span>
                <p className="text-muted mb-2" style={{ fontSize: "0.75rem" }}>
                  Store these in a secure place. If you lose your app, you can use these to
                  recover access.
                </p>
                <div className="row g-1" style={{ fontSize: "0.8rem" }}>
                  {mfaSetupData.recoveryCodes.map((code, idx) => (
                    <div
                      key={idx}
                      className="col-6 font-monospace p-1 bg-white border text-center rounded"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              {/* Setup verify form */}
              <form onSubmit={handleMfaSetupVerify} className="w-100">
                <div className="d-flex flex-column">
                  <label
                    htmlFor="mfaCode"
                    className="font-weight-bold"
                    style={{ fontSize: "0.85rem" }}
                  >
                    Enter Verification Code
                  </label>
                  <Input
                    maxLength={6}
                    placeholder="6-digit code"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    className="mb-2 text-center font-weight-bold"
                    style={{ fontSize: "1.2rem", letterSpacing: "0.15rem" }}
                  />
                  {errors.mfaCode && (
                    <div className="text-danger text-center mb-2">{errors.mfaCode}</div>
                  )}
                </div>
                <button
                  type="submit"
                  className="loginButton text-white w-100 mt-2"
                  disabled={loading}
                >
                  {loading ? "Activating..." : "Confirm & Enable MFA"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      <ToastMessage
        message={toastMessage}
        show={showToast}
        onClose={() => setShowToast(false)}
        type={toastType}
      />
    </>
  );
};

export default Page;
