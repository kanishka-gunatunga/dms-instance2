/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import Paragraph from "@/components/common/Paragraph";
import { useCompanyProfile } from "@/context/userCompanyProfile";
import { Input } from "antd";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import ToastMessage from "@/components/common/Toast";
import { API_BASE_URL } from "@/utils/apiClient";

type Params = {
  id: string;
};

interface Props {
  params: Params;
}

const page = ({ params }: Props) => {
  const id = params?.id;
  const { data } = useCompanyProfile();
  const [password, setPassword] = useState<string>("");
  const [password_confirmation, setPasswordConfirmation] = useState<string>("");
  const [errors, setErrors] = useState<{ password?: string; password_confirmation?: string }>(
    {}
  );
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastMessage, setToastMessage] = useState("");
  const [loading, setLoading] = useState<boolean>(false);

  // Password Strength Evaluator
  const getPasswordStrength = (pwd: string) => {
    if (!pwd)
      return {
        score: 0,
        label: "",
        color: "#e5e7eb",
        checks: { len: false, upper: false, lower: false, num: false, sym: false },
      };

    const checks = {
      len: pwd.length >= 12,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      num: /[0-9]/.test(pwd),
      sym: /[^a-zA-Z0-9]/.test(pwd),
    };

    let score = 0;
    if (checks.len) score += 1;
    if (pwd.length >= 14) score += 1; // Extra point for preferred length
    if (checks.upper && checks.lower) score += 1;
    if (checks.num) score += 1;
    if (checks.sym) score += 1;

    let label = "Very Weak";
    let color = "#ef4444"; // Red

    if (score >= 5) {
      label = "Exceptional (Secure Passphrase)";
      color = "#10b981"; // Emerald
    } else if (score >= 4) {
      label = "Strong (ISO Compliant)";
      color = "#22c55e"; // Green
    } else if (score >= 3) {
      label = "Medium (Passes basic rules)";
      color = "#eab308"; // Yellow
    } else if (score >= 2) {
      label = "Weak (Needs complexity)";
      color = "#f97316"; // Orange
    }

    return { score, label, color, checks };
  };

  const strength = getPasswordStrength(password);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    const validationErrors: { password?: string; password_confirmation?: string } = {};
    if (!password) validationErrors.password = "Password is required";
    if (password.length < 12)
      validationErrors.password = "Password must be at least 12 characters under ISO guidelines";
    if (!password_confirmation)
      validationErrors.password_confirmation = "Confirm password is required";
    if (password !== password_confirmation)
      validationErrors.password_confirmation = "Passwords do not match";

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("id", id);
      formData.append("password", password);
      formData.append("password_confirmation", password_confirmation);

      const response = await fetch(`${API_BASE_URL}reset-password`, {
        method: "POST",
        body: formData,
      });
      const res = await response.json();

      if (response.status === 200 || res.status === "success") {
        setToastType("success");
        setToastMessage("Password updated successfully! Redirecting...");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          window.location.href = "/login";
        }, 2000);
      } else {
        if (res.errors) {
          setErrors({
            password: res.errors.password?.[0] || "",
            password_confirmation: res.errors.password_confirmation?.[0] || "",
          });
        }
        setToastType("error");
        setToastMessage(
          res.message || "Failed to update password. Password might have been reused."
        );
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      }
    } catch (error) {
      setToastType("error");
      setToastMessage("Failed to reset password!");
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  const imageUrl = data?.logo_url || "/logo.png";
  const bannerUrl = data?.banner_url || "/login-image.png";

  return (
    <>
      <div
        className="d-flex flex-column flex-lg-row-reverse w-100"
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
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
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
            width={180}
            height={130}
            objectFit="cover"
            className="img-fluid mb-3 loginLogo"
          />
          <h3 className="mb-0 font-weight-bold" style={{ color: "#1e3a8a" }}>
            Update Password
          </h3>
          <Paragraph
            text="Please establish a secure, compliant password."
            color="Paragraph"
          />
          <form
            className="d-flex flex-column px-0 px-lg-3 mt-2"
            style={{ width: "100%" }}
            onSubmit={handleLogin}
          >
            <div className="d-flex flex-column">
              <div className="d-flex flex-column mt-2">
                <label className="font-weight-bold mb-1" style={{ fontSize: "0.85rem" }}>
                  New Password
                </label>
                <Input.Password
                  placeholder="New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${errors.password ? "is-invalid" : ""}`}
                />
                {errors.password && (
                  <div className="text-danger mt-1" style={{ fontSize: "0.8rem" }}>
                    {errors.password}
                  </div>
                )}

                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2 p-2 bg-light rounded border">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span style={{ fontSize: "0.75rem", fontWeight: "600" }}>Strength:</span>
                      <span style={{ fontSize: "0.75rem", color: strength.color, fontWeight: "bold" }}>
                        {strength.label}
                      </span>
                    </div>

                    {/* Visual progress bar */}
                    <div className="progress" style={{ height: "6px" }}>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{
                          width: `${(strength.score / 5) * 100}%`,
                          backgroundColor: strength.color,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>

                    {/* Policy Compliance Checklist */}
                    <div className="mt-2 row g-1" style={{ fontSize: "0.7rem", color: "#64748b" }}>
                      <div className="col-6 d-flex align-items-center">
                        <span className="me-1">{strength.checks.len ? "✅" : "❌"}</span>
                        <span>12+ characters</span>
                      </div>
                      <div className="col-6 d-flex align-items-center">
                        <span className="me-1">{password.length >= 14 ? "✅" : "❌"}</span>
                        <span>Preferred 14+</span>
                      </div>
                      <div className="col-6 d-flex align-items-center">
                        <span className="me-1">
                          {strength.checks.upper && strength.checks.lower ? "✅" : "❌"}
                        </span>
                        <span>Mixed letters</span>
                      </div>
                      <div className="col-6 d-flex align-items-center">
                        <span className="me-1">{strength.checks.num ? "✅" : "❌"}</span>
                        <span>Numbers</span>
                      </div>
                      <div className="col-6 d-flex align-items-center">
                        <span className="me-1">{strength.checks.sym ? "✅" : "❌"}</span>
                        <span>Special symbol</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="d-flex flex-column mt-3">
                <label className="font-weight-bold mb-1" style={{ fontSize: "0.85rem" }}>
                  Confirm Password
                </label>
                <Input.Password
                  placeholder="Confirm Password"
                  value={password_confirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  className={`${errors.password_confirmation ? "is-invalid" : ""}`}
                />
                {errors.password_confirmation && (
                  <div className="text-danger mt-1" style={{ fontSize: "0.8rem" }}>
                    {errors.password_confirmation}
                  </div>
                )}
              </div>

              <div className="d-flex flex-row align-items-center mt-2">
                <p className="mb-0 me-2" style={{ fontSize: "0.85rem" }}>
                  Remembered your password?{" "}
                </p>
                <Link
                  href="/login"
                  style={{
                    fontSize: "0.85rem",
                    color: "#1e3a8a",
                    fontWeight: "600",
                    textDecoration: "none",
                  }}
                  className="py-2 d-flex align-self-end"
                >
                  Log in
                </Link>
              </div>
              <button
                type="submit"
                className="loginButton text-white mt-3"
                disabled={loading}
              >
                {loading ? "Loading..." : "Update & Reset Password"}
              </button>
            </div>
          </form>
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
