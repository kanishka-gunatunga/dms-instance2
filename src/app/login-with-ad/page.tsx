/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import Paragraph from "@/components/common/Paragraph";
import Image from "next/image";
import React, { useState } from "react";
import Cookies from "js-cookie";
import { API_BASE_URL } from "@/utils/apiClient";
import ToastMessage from "@/components/common/Toast";
import { Input } from "antd";
import { useCompanyProfile } from "@/context/userCompanyProfile";
import { PublicClientApplication, InteractionRequiredAuthError } from "@azure/msal-browser";

const Page = () => {
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastMessage, setToastMessage] = useState("");
  const { data } = useCompanyProfile();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email) {
      setToastType("error");
      setToastMessage("Email is required");
      setShowToast(true);
      return;
    }

    setLoading(true);

    try {
      // 1. Fetch AD Config from Backend
      const configResponse = await fetch(`${API_BASE_URL}ad-config`);
      const configData = await configResponse.json();

      if (configData.status !== "success") {
        throw new Error("Failed to fetch AD configuration from backend.");
      }

      const { client_id, tenant_id } = configData.data;

      // 2. Initialize MSAL
      const msalConfig = {
        auth: {
          clientId: client_id,
          authority: `https://login.microsoftonline.com/${tenant_id}`,
          redirectUri: window.location.origin + '/auth.html',
          navigateToLoginRequestUrl: false
        },
        cache: {
          cacheLocation: "sessionStorage",
          storeAuthStateInCookie: false,
        }
      };

      const msalInstance = new PublicClientApplication(msalConfig);
      await msalInstance.initialize();

      // 3. Try Popup Login
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

      // 4. Send token to Backend
      const formData = new FormData();
      formData.append("email", email);
      formData.append("token", tokenResponse.accessToken); // Use accessToken for Graph API calls on backend

      const response = await fetch(`${API_BASE_URL}login-with-ad`, {
        method: "POST",
        body: formData,
      });

      const loginData = await response.json();

      if (loginData.status === "success" && loginData.data?.token) {
        const expiresIn = 1;
        Cookies.set("authToken", loginData.data.token, {
          expires: expiresIn,
          secure: false,
          sameSite: "strict",
        });

        Cookies.set("userId", loginData.data.id, { expires: expiresIn });
        Cookies.set("userEmail", loginData.data.email, { expires: expiresIn });
        Cookies.set("userName", loginData.data.name, { expires: expiresIn });

        window.location.href = "/";
        setToastType("success");
        setToastMessage("Logged in successfully!");
        setShowToast(true);
      } else {
        setToastType("error");
        setToastMessage(loginData.message || "Login failed. Please check your AD account.");
        setShowToast(true);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred during SSO login.";
      console.error("Error during SSO login:", error);
      setToastType("error");
      setToastMessage(errorMessage);
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const imageUrl = data?.logo_url || '/logo.png';
  const bannerUrl = data?.banner_url || '/login-image.png';

  return (
    <>
      <div
        className="d-flex flex-column flex-lg-row w-100"
        style={{ minHeight: "100svh", maxHeight: "100svh" }}
      >
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
        <div
          className="col-12 col-md-6 align-self-center  col-lg-4 px-4 px-lg-5 d-flex flex-column justify-content-center align-items-center"
          style={{ minHeight: "100svh", maxHeight: "100svh" }}
        >
          <Image
            src={imageUrl}
            alt=""
            width={200}
            height={150}
            objectFit="cover"
            className="img-fluid mb-3 loginLogo"
          />
          <Paragraph text="Login with AD SSO" color="Paragraph" />
          <form
            className="d-flex flex-column px-0 px-lg-3"
            style={{ width: "100%" }}
            onSubmit={handleLogin}
          >
            <div className="d-flex flex-column">
              <div className="d-flex flex-column mt-3">
                <label htmlFor="email">Principal Name</label>
                <Input
                  type="email"
                  placeholder="Enter your principal name (email)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mb-3"
                />
              </div>

              <div className="py-3 d-flex flex-column align-items-start">
                <p style={{ fontSize: '13px', color: '#555', fontWeight: '500' }}>
                  Please enter your Principal Name to proceed with Single Sign-On. 
                  The system will automatically verify your session with Azure AD.
                </p>
              </div>

              <button type="submit" className="loginButton text-white" disabled={loading}>
                {loading ? "Checking AD session..." : "Login with SSO"}
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

export default Page;

