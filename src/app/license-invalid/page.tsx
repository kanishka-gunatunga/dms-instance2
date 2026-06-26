"use client";

import React, { useState } from "react";
import { Input } from "antd";
import ToastMessage from "@/components/common/Toast";
import { API_BASE_URL } from "@/utils/apiClient";

const LicenseInvalidPage = () => {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastMessage, setToastMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!key.trim()) {
      setToastType("error");
      setToastMessage("License key is required");
      setShowToast(true);
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("key", key);

      const response = await fetch(`${API_BASE_URL}license/apply`, {
        method: "POST",
        body: formData,
      });

      const result: { message?: string } = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Invalid license key");
      }

      setToastType("success");
      setToastMessage("License activated successfully");
      setShowToast(true);

      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "License activation failed";

      setToastType("error");
      setToastMessage(message);
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "100vh", backgroundColor: "#F5F7FA" }}
      >
        <div
          className="p-4 p-md-5 bg-white shadow rounded"
          style={{ width: "100%", maxWidth: 420 }}
        >
          <h3 className="text-center mb-2 text-danger">
            License Invalid
          </h3>

          <p className="text-center text-muted mb-4">
            Your license is invalid or expired.  
            Please enter a valid license key to continue.
          </p>

          <form onSubmit={handleSubmit}>
            <label className="mb-2">License Key</label>

            <Input.TextArea
              rows={4}
              placeholder="Paste your license key here"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />

            <button
              type="submit"
              className="loginButton text-white w-100 mt-4"
              disabled={loading}
            >
              {loading ? "Activating..." : "Activate License"}
            </button>
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

export default LicenseInvalidPage;
