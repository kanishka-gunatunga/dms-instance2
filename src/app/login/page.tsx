/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import Paragraph from "@/components/common/Paragraph";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { API_BASE_URL, getWithAuth } from "@/utils/apiClient";
import ToastMessage from "@/components/common/Toast";
import { Input } from "antd";
import { useCompanyProfile } from "@/context/userCompanyProfile";

type Stage = "login" | "mfa_verify" | "mfa_setup";

const page = () => {
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
  const { data } = useCompanyProfile();

  // MFA-Related States
  const [stage, setStage] = useState<Stage>("login");
  const [tempToken, setTempToken] = useState<string>("");
  const [mfaCode, setMfaCode] = useState<string>("");
  const [mfaSetupData, setMfaSetupData] = useState<{
    secret: string;
    qrCodeUrl: string;
    recoveryCodes: string[];
  } | null>(null);

  useEffect(() => {
    fetchAdConnection();
  }, []);

  const fetchAdConnection = async () => {
    try {
      const response = await getWithAuth(`get-ad-connection`);
      if (response && response.status !== "fail") {
        setIsAdEnabled(response);
      }
    } catch (error) {
      console.error("Error checking AD:", error);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    const validationErrors: { email?: string; password?: string } = {};
    if (!email) validationErrors.email = "Email is required";
    if (!password) validationErrors.password = "Password is required";
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      if (!isAdEnabled) formData.append("type", "normal");

      const endpoint = isAdEnabled
        ? `${API_BASE_URL}login-with-ad`
        : `${API_BASE_URL}login`;

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const res = await response.json();

      if (response.status === 423 || res.status === "locked") {
        // Handle Lockout Control
        setToastType("error");
        setToastMessage(res.message || "Account locked due to consecutive failures.");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 6000);
        return;
      }

      if (res.status === "change_password_required" || res.status === "password_expired") {
        // Handle default password and expiration redirects
        setToastType("error");
        setToastMessage(res.message);
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          // Redirect user to the reset password workflow with their temporary session token
          window.location.href = `/reset-password/${res.temp_token}`;
        }, 3000);
        return;
      }

      if (res.status === "mfa_required") {
        // Redirect to MFA code prompt stage
        setTempToken(res.temp_token);
        setStage("mfa_verify");
        setToastType("success");
        setToastMessage("Verification required. Please enter OTP.");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        return;
      }

      if (res.status === "mfa_setup_required") {
        // Enforce mandatory MFA setup
        setTempToken(res.temp_token);
        setStage("mfa_setup");
        fetchMfaSetupDetails(res.temp_token);
        return;
      }

      if (res.data?.token) {
        completeLoginSession(res.data);
      } else {
        setToastType("error");
        setToastMessage(res.message || "Login failed. Check credentials.");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      }
    } catch (error) {
      console.error("Error during login:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMfaSetupDetails = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}mfa/setup-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temp_token: token }),
      });
      const data = await response.json();
      if (data.status === "success") {
        setMfaSetupData({
          secret: data.secret,
          qrCodeUrl: data.qr_code_url,
          recoveryCodes: data.recovery_codes,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completeLoginSession = (data: any) => {
    const expiresIn = 1;
    Cookies.set("authToken", data.token, {
      expires: expiresIn,
      secure: true,
      sameSite: "strict",
    });
    Cookies.set("userId", data.id, { expires: expiresIn });
    Cookies.set("userEmail", data.email, { expires: expiresIn });
    Cookies.set("userType", data.type, { expires: expiresIn });
    Cookies.set("userName", data.name, { expires: expiresIn });

    window.location.href = "/";
  };

  const imageUrl = data?.logo_url || '/logo.png';
  const bannerUrl = data?.banner_url || '/login-image.png';

  return (
    <>
      <div
        className="d-flex flex-column flex-lg-row w-100"
        style={{ minHeight: "100svh", maxHeight: "100svh" }}
      >
        {/* Banner Area */}
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
            alt="DMS"
            width={1000}
            height={800}
            className="img-fluid"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>

        {/* Dynamic Form Area */}
        <div
          className="col-12 col-md-6 align-self-center col-lg-4 px-4 px-lg-5 d-flex flex-column justify-content-center align-items-center"
          style={{ minHeight: "100svh", maxHeight: "100svh", overflowY: "auto" }}
        >
          <Image
            src={imageUrl}
            alt="Logo"
            width={180}
            height={130}
            objectFit="cover"
            className="img-fluid mb-3 loginLogo"
          />

          {stage === "login" && (
            <>
              <Paragraph text="Login To Continue" color="Paragraph" />
              <form
                className="d-flex flex-column px-0 px-lg-3"
                style={{ width: "100%" }}
                onSubmit={handleLogin}
              >
                <div className="d-flex flex-column">
                  <div className="d-flex flex-column mt-3">
                    <label htmlFor="email">Email</label>
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`mb-3 ${errors.email ? "is-invalid" : ""}`}
                    />
                    {errors.email && <div className="text-danger">{errors.email}</div>}
                  </div>
                  <div className="d-flex flex-column mt-3">
                    <label htmlFor="password">Password</label>
                    <Input.Password
                      placeholder="Input password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={errors.password ? "is-invalid" : ""}
                    />
                    {errors.password && <div className="text-danger">{errors.password}</div>}
                  </div>

                  <Link
                    href="/forgot-password"
                    style={{
                      fontSize: "14px",
                      color: "#333",
                      textDecoration: "none",
                    }}
                    className="py-3 d-flex align-self-end"
                  >
                    Forgot Password?
                  </Link>
                  <button type="submit" className="loginButton text-white" disabled={loading}>
                    {loading ? "Logging in..." : "Login"}
                  </button>
                </div>
              </form>
            </>
          )}

          {stage === "mfa_verify" && (
            <>
              <h3 className="mb-1 text-center font-weight-bold">Two-Factor Authentication</h3>
              <Paragraph text="Please open your authenticator app and enter the 6-digit verification code below." color="Paragraph" className="text-center mb-4" />
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
                    className={`mb-3 text-center font-weight-bold`}
                    style={{ fontSize: "1.5rem", letterSpacing: "0.2rem" }}
                  />
                  {errors.mfaCode && <div className="text-danger text-center mb-2">{errors.mfaCode}</div>}
                </div>
                <button type="submit" className="loginButton text-white mt-3" disabled={loading}>
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

          {stage === "mfa_setup" && mfaSetupData && (
            <div className="w-100 px-0 px-lg-2 py-3" style={{ maxHeight: "75vh", overflowY: "auto" }}>
              <h3 className="mb-1 text-center font-weight-bold" style={{ color: "#1e3a8a" }}>Enable Multi-Factor Auth</h3>
              <p className="text-muted text-center" style={{ fontSize: "0.85rem" }}>
                MFA is mandatory for all system users. Scan the QR code to set up security on your authenticator app.
              </p>

              {/* QR Image block */}
              <div className="d-flex justify-content-center mb-3">
                <div className="p-2 bg-white border rounded shadow-sm" style={{ border: "2px solid #3b82f6" }}>
                  <img
                    src={mfaSetupData.qrCodeUrl}
                    alt="Scan QR"
                    width={180}
                    height={180}
                  />
                </div>
              </div>

              {/* Secret Key Manual Entry */}
              <div className="mb-3 text-center">
                <span className="text-muted" style={{ fontSize: "0.8rem" }}>Manual Entry Code:</span>
                <div className="bg-light p-2 rounded font-weight-bold font-monospace" style={{ fontSize: "0.95rem", letterSpacing: "0.1rem", border: "1px dashed #cbd5e1" }}>
                  {mfaSetupData.secret}
                </div>
              </div>

              {/* Emergency Recovery Codes */}
              <div className="mb-3 p-3 bg-light rounded shadow-sm border">
                <span className="font-weight-bold text-danger" style={{ fontSize: "0.85rem" }}>⚠️ Save Recovery Codes:</span>
                <p className="text-muted mb-2" style={{ fontSize: "0.75rem" }}>
                  Store these in a secure place. If you lose your app, you can use these to recover access.
                </p>
                <div className="row g-1" style={{ fontSize: "0.8rem" }}>
                  {mfaSetupData.recoveryCodes.map((code, idx) => (
                    <div key={idx} className="col-6 font-monospace p-1 bg-white border text-center rounded">
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleMfaSetupVerify} className="w-100">
                <div className="d-flex flex-column">
                  <label htmlFor="mfaCode" className="font-weight-bold" style={{ fontSize: "0.85rem" }}>Enter Verification Code</label>
                  <Input
                    maxLength={6}
                    placeholder="6-digit code"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    className="mb-2 text-center font-weight-bold"
                    style={{ fontSize: "1.2rem", letterSpacing: "0.15rem" }}
                  />
                  {errors.mfaCode && <div className="text-danger text-center mb-2">{errors.mfaCode}</div>}
                </div>
                <button type="submit" className="loginButton text-white w-100 mt-2" disabled={loading}>
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

export default page;
