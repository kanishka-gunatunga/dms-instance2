/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Heading from "@/components/common/Heading";
import DashboardLayout from "@/components/DashboardLayout";
import useAuth from "@/hooks/useAuth";
import React, { useEffect, useState, useRef } from "react";
import Cookies from "js-cookie";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { getWithAuth, postWithAuth, getBlobWithAuth, API_BASE_URL } from "@/utils/apiClient";
import { useRouter } from "next/navigation";
import { IoSaveOutline, IoImageOutline, IoCreateOutline } from "react-icons/io5";
import { MdOutlineCancel } from "react-icons/md";
import ToastMessage from "@/components/common/Toast";
import { useUserContext } from "@/context/userContext";
import { FaKey } from "react-icons/fa6";
import { Modal, Tabs, Tab } from "react-bootstrap";
import SignaturePad from "@/components/common/SignaturePad";
import styles from "./my-profile.module.css";

type Params = {
    id: string;
};

interface Props {
    params: Params;
}

interface ValidationErrors {
    first_name?: string;
    last_name?: string;
    mobile_no?: string;
    email?: string;
    role?: string;
}

export default function AllDocTable({ }: Props) {
    const isAuthenticated = useAuth();
    const { userId, email } = useUserContext();

    const [firstName, setFirstName] = useState<string>("");
    const [lastName, setLastName] = useState<string>("");
    const [mobileNumber, setMobileNumber] = useState<string>("");
    const [myEmail, setMyEmail] = useState<string>(email || '');
    const [signature, setSignature] = useState("");
    const [signatureMode, setSignatureMode] = useState<"upload" | "draw">("upload");
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [showToast, setShowToast] = useState(false);
    const [toastType, setToastType] = useState<"success" | "error">("success");
    const [toastMessage, setToastMessage] = useState("");
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<string>("general");
    const [password, setPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [show, setShow] = useState(false);
    const [error, setError] = useState("");

    // MFA States
    const [mfaEnabled, setMfaEnabled] = useState<boolean>(false);
    const [mfaSecret, setMfaSecret] = useState<string>("");
    const [mfaQrCode, setMfaQrCode] = useState<string>("");
    const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<string[]>([]);
    const [mfaVerificationCode, setMfaVerificationCode] = useState<string>("");
    const [mfaPassword, setMfaPassword] = useState<string>("");
    const [mfaSetupStep, setMfaSetupStep] = useState<"idle" | "enrolling" | "disabling">("idle");

    const signatureInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const triggerSignatureInput = () => {
        signatureInputRef.current?.click();
    };

    const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSignatureFile(file);
            const signatureURL = URL.createObjectURL(file);
            setSignature(prev => {
                if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
                return signatureURL;
            });
        }
    };

    const handleSignatureDraw = (dataUrl: string) => {
        if (dataUrl) {
            setSignature(dataUrl);
            const file = dataURLtoFile(dataUrl, "signature.png");
            setSignatureFile(file);
        } else {
            setSignature("");
            setSignatureFile(null);
        }
    };

    const dataURLtoFile = (dataurl: string, filename: string) => {
        const arr = dataurl.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    };

    const fetchSignature = async () => {
        try {
            let signatureSource = "";
            try {
                const data = await getWithAuth("get-signature");
                if (data && (data.signature_url || data.signature || (data.data && data.data.signature))) {
                    signatureSource = data.signature_url || data.signature || data.data.signature;
                } else if (data && typeof data === 'string' && data.startsWith('http')) {
                    signatureSource = data;
                }
            } catch {
                // fall through to blob fetch
            }

            if (signatureSource) {
                if (!signatureSource.startsWith("http") && !signatureSource.startsWith("data:") && !signatureSource.startsWith("blob:")) {
                    const apiOrigin = new URL(API_BASE_URL).origin;
                    signatureSource = `${apiOrigin}${signatureSource.startsWith("/") ? "" : "/"}${signatureSource}`;
                }
                setSignature(prev => {
                    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
                    return signatureSource;
                });
                return;
            }

            const blob = await getBlobWithAuth("get-signature");
            if (blob.size > 0 && blob.type.startsWith("image/")) {
                const url = URL.createObjectURL(blob);
                setSignature(prev => {
                    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
                    return url;
                });
            }
        } catch (error) {
            console.error("Failed to fetch signature:", error);
        }
    };

    useEffect(() => {
        const fetchUserDetails = async () => {
            try {
                const response = await getWithAuth(`user-details/${userId}`);
                setFirstName(response.user_details.first_name || "");
                setLastName(response.user_details.last_name || "");
                setMobileNumber(response.user_details.mobile_no?.toString() || "");
                setMyEmail(response.user_details?.email || response.email || "");
                const roleIds = parseRoles(response.role);
                setSelectedRoleIds(roleIds);
                setMfaEnabled(response.mfa_enabled === 1 || response.mfa_enabled === true);
            } catch (error) {
                console.error("Failed to fetch profile data:", error);
            }
        };

        if (userId) {
            fetchUserDetails();
            fetchSignature();
        }

        return () => {
            setSignature(prev => {
                if (prev.startsWith("blob:")) {
                    URL.revokeObjectURL(prev);
                }
                return prev;
            });
        };
    }, [userId]);

    const parseRoles = (roleData: any): string[] => {
        if (typeof roleData === "string") {
            const cleanedData = roleData.replace(/[^0-9,]/g, "");
            return cleanedData.split(",").filter((roleId) => roleId.trim() !== "");
        }
        return [];
    };

    if (!isAuthenticated) {
        return <LoadingSpinner />;
    }

    const validateFields = (): ValidationErrors => {
        const newErrors: ValidationErrors = {};

        if (!firstName.trim()) newErrors.first_name = "First name is required.";
        if (!lastName.trim()) newErrors.last_name = "Last name is required.";
        if (!mobileNumber.trim())
            newErrors.mobile_no = "Mobile number is required.";
        if (!myEmail.trim()) newErrors.email = "Email is required.";
        if (!JSON.stringify(selectedRoleIds))
            newErrors.role = "At least select one role.";

        return newErrors;
    };

    const handleSubmit = async () => {
        if (activeTab === "general") {
            const fieldErrors = validateFields();
            if (Object.keys(fieldErrors).length > 0) {
                setErrors(fieldErrors);
                return;
            }

            try {
                const formData = new FormData();
                formData.append("first_name", firstName);
                formData.append("last_name", lastName);
                formData.append("mobile_no", mobileNumber);
                formData.append("email", myEmail);
                formData.append("role", JSON.stringify(selectedRoleIds));

                const response = await postWithAuth(`user-details/${userId}`, formData);

                if (response.status === "fail") {
                    setToastType("error");
                    setToastMessage(response.message || "Failed to update profile details!");
                    setShowToast(true);
                } else {
                    setToastType("success");
                    setToastMessage("Profile updated successfully!");
                    setShowToast(true);
                }
            } catch (error) {
                console.error("Error submitting profile form:", error);
                setToastType("error");
                setToastMessage("An error occurred while saving profile changes.");
                setShowToast(true);
            }
        } else if (activeTab === "signature") {
            if (!signatureFile) {
                setToastType("error");
                setToastMessage("Please upload or draw a signature first.");
                setShowToast(true);
                return;
            }

            try {
                const sigFormData = new FormData();
                sigFormData.append("signature", signatureFile);

                const sigResponse = await postWithAuth("update-signature", sigFormData);

                if (sigResponse.status === "success" || sigResponse.message === "success") {
                    setToastType("success");
                    setToastMessage("Signature updated successfully!");
                    setShowToast(true);
                    setSignatureFile(null);
                    await fetchSignature();
                } else {
                    setToastType("error");
                    setToastMessage(sigResponse.message || "Failed to update signature!");
                    setShowToast(true);
                }
            } catch (error) {
                console.error("Error submitting signature form:", error);
                setToastType("error");
                setToastMessage("An error occurred while saving the signature.");
                setShowToast(true);
            }
        }

        setTimeout(() => {
            setShowToast(false);
        }, 5000);
    };

    const handleShow = () => { setShow(true); };
    const handleClose = () => { setShow(false); };

    const validateForm = () => {
        if (!password || !confirmPassword) {
            setError("All fields are required.");
            return false;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return false;
        }
        const passwordRegex = /^.{8,}$/;
        if (!passwordRegex.test(password)) {
            setError("Password must be at least 8 characters long and contain at least one capital letter, one number, and one special character.");
            return false;
        }
        setError("");
        return true;
    };

    const handleResetPassword = async () => {
        if (validateForm()) {
            const formData = new FormData();
            formData.append("email", email || "");
            formData.append("current_password", currentPassword);
            formData.append("password", password);
            formData.append("password_confirmation", confirmPassword);

            try {
                const response = await postWithAuth("update-password", formData);
                if (response.status === "fail") {
                    setToastType("error");
                    setToastMessage("Failed to reset password!");
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 5000);
                } else {
                    setToastType("success");
                    setToastMessage("Reset Password Successful!");
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 5000);
                }
                handleClose();
            } catch (error) {
                console.error("Error submitting form:", error);
            }
        }
    };

    // ── MFA handlers ────────────────────────────────────────────────────────

    const handleStartMfaSetup = async () => {
        try {
            const res = await postWithAuth("mfa/generate", new FormData());
            if (res.status === "success" || res.secret) {
                setMfaSecret(res.secret);
                setMfaQrCode(res.qrCodeUrl);
                setMfaRecoveryCodes(res.recovery_codes);
                setMfaSetupStep("enrolling");
            } else {
                setToastType("error");
                setToastMessage("Failed to initiate MFA setup.");
                setShowToast(true);
            }
        } catch (error) {
            console.error("MFA Generate Error:", error);
        }
    };

    const handleEnableMfa = async () => {
        if (!mfaVerificationCode || mfaVerificationCode.length !== 6) {
            setToastType("error");
            setToastMessage("Please enter a valid 6-digit OTP code.");
            setShowToast(true);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}mfa/enable`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${Cookies.get("authToken")}`
                },
                body: JSON.stringify({
                    secret: mfaSecret,
                    code: mfaVerificationCode,
                    recovery_codes: mfaRecoveryCodes
                })
            });

            const res = await response.json();
            if (res.status === "success") {
                setMfaEnabled(true);
                setMfaSetupStep("idle");
                setMfaVerificationCode("");
                setToastType("success");
                setToastMessage("Multi-Factor Authentication enabled successfully!");
                setShowToast(true);
            } else {
                setToastType("error");
                setToastMessage(res.message || "Failed to verify authenticator code.");
                setShowToast(true);
            }
        } catch (error) {
            console.error("MFA Enable Error:", error);
        }
    };

    const handleDisableMfa = async () => {
        if (!mfaPassword) {
            setToastType("error");
            setToastMessage("Account password is required to disable MFA.");
            setShowToast(true);
            return;
        }
        if (!mfaVerificationCode || mfaVerificationCode.length !== 6) {
            setToastType("error");
            setToastMessage("Verification OTP code is required.");
            setShowToast(true);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}mfa/disable`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${Cookies.get("authToken")}`
                },
                body: JSON.stringify({
                    password: mfaPassword,
                    code: mfaVerificationCode
                })
            });

            const res = await response.json();
            if (res.status === "success") {
                setMfaEnabled(false);
                setMfaSetupStep("idle");
                setMfaPassword("");
                setMfaVerificationCode("");
                setToastType("success");
                setToastMessage("Multi-Factor Authentication disabled.");
                setShowToast(true);
            } else {
                setToastType("error");
                setToastMessage(res.message || "Failed to disable MFA. Check password/OTP.");
                setShowToast(true);
            }
        } catch (error) {
            console.error("MFA Disable Error:", error);
        }
    };

    return (
        <>
            <DashboardLayout>
                <div className={styles.pageWrapper}>
                    <div className={styles.pageHeader}>
                        <div className="d-flex flex-row align-items-center">
                            <Heading text="Profile" color="#444" />
                        </div>
                        <div className="d-flex flex-row">
                            <button
                                onClick={() => handleShow()}
                                className={styles.btnChangePassword}
                            >
                                <FaKey className="me-1" /> Change Password
                            </button>
                        </div>
                    </div>

                    <div className={styles.card}>
                        <div className={`${styles.scrollContent} custom-scroll`}>
                            <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || "general")} id="profile-tabs" className="mb-3">

                                {/* ── General Tab ── */}
                                <Tab eventKey="general" title="General">
                                    <div className="p-0 row row-cols-1 row-cols-md-2 overflow-hidden w-100 mt-2">
                                        <div className="d-flex flex-column pe-md-3">
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>First Name</label>
                                                <input
                                                    type="text"
                                                    value={firstName}
                                                    onChange={(e) => setFirstName(e.target.value)}
                                                    className={`${styles.formInput} ${errors.first_name ? styles.isInvalid : ""}`}
                                                />
                                                {errors.first_name && <div className={styles.errorText}>{errors.first_name}</div>}
                                            </div>
                                        </div>
                                        <div className="d-flex flex-column pe-md-3">
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>Last Name</label>
                                                <input
                                                    type="text"
                                                    value={lastName}
                                                    onChange={(e) => setLastName(e.target.value)}
                                                    className={`${styles.formInput} ${errors.last_name ? styles.isInvalid : ""}`}
                                                />
                                                {errors.last_name && <div className={styles.errorText}>{errors.last_name}</div>}
                                            </div>
                                        </div>
                                        <div className="d-flex flex-column pe-md-3 mt-3">
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>Mobile Number</label>
                                                <input
                                                    type="number"
                                                    value={mobileNumber}
                                                    onChange={(e) => setMobileNumber(e.target.value)}
                                                    className={`${styles.formInput} ${errors.mobile_no ? styles.isInvalid : ""}`}
                                                />
                                                {errors.mobile_no && <div className={styles.errorText}>{errors.mobile_no}</div>}
                                            </div>
                                        </div>
                                        <div className="d-flex flex-column pe-md-3 mt-3">
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>Email</label>
                                                <input
                                                    type="email"
                                                    value={myEmail}
                                                    onChange={(e) => setMyEmail(e.target.value)}
                                                    className={`${styles.formInput} ${errors.email ? styles.isInvalid : ""}`}
                                                />
                                                {errors.email && <div className={styles.errorText}>{errors.email}</div>}
                                            </div>
                                        </div>
                                    </div>
                                </Tab>

                                {/* ── Digital Signature Tab ── */}
                                <Tab eventKey="signature" title="Digital Signature">
                                    <div className="d-flex flex-column gap-4 mt-2">
                                        <div className="d-flex gap-2">
                                            <button
                                                type="button"
                                                className={`${styles.btnToggle} ${signatureMode === "upload" ? styles.active : ""}`}
                                                onClick={() => setSignatureMode("upload")}
                                            >
                                                <IoImageOutline fontSize={16} /> Upload PNG
                                            </button>
                                            <button
                                                type="button"
                                                className={`${styles.btnToggle} ${signatureMode === "draw" ? styles.active : ""}`}
                                                onClick={() => setSignatureMode("draw")}
                                            >
                                                <IoCreateOutline fontSize={16} /> Draw Signature
                                            </button>
                                        </div>

                                        {signatureMode === "upload" ? (
                                            <div className="col-12 col-md-6 col-lg-4">
                                                <div className={styles.imageCard}>
                                                    {signature ? (
                                                        <img
                                                            src={signature}
                                                            alt="Digital Signature"
                                                            className="card-img-top w-100"
                                                            style={{
                                                                maxHeight: '120px',
                                                                objectFit: 'contain',
                                                                borderRadius: '0.5rem',
                                                                backgroundColor: '#f9fafb'
                                                            }}
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="d-flex align-items-center justify-content-center bg-light rounded" style={{ height: "120px" }}>
                                                            <span className="text-muted">No signature uploaded</span>
                                                        </div>
                                                    )}
                                                    <div className="pt-3">
                                                        <button
                                                            type="button"
                                                            onClick={triggerSignatureInput}
                                                            className={styles.btnSave}
                                                            style={{ width: '100%' }}
                                                        >
                                                            <IoImageOutline fontSize={16} /> Change Signature
                                                        </button>
                                                        <input
                                                            type="file"
                                                            ref={signatureInputRef}
                                                            accept="image/png"
                                                            style={{ display: "none" }}
                                                            onChange={handleSignatureChange}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="col-12 col-lg-8">
                                                <div className="border rounded p-3 bg-white shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
                                                    <p className={styles.formLabel}>Draw your signature</p>
                                                    <SignaturePad onSave={handleSignatureDraw} />
                                                    <p className="text-muted mt-2 small">Your signature will be saved as a transparent PNG.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Tab>

                                {/* ── Security & MFA Tab ── */}
                                <Tab eventKey="mfa" title="Security & MFA">
                                    <div className="d-flex flex-column gap-3 mt-2 col-12 col-lg-8">
                                        <div className="p-4 rounded border shadow-sm bg-white">
                                            <h4 className="font-weight-bold mb-2 text-primary">Multi-Factor Authentication (MFA)</h4>
                                            <p className="text-muted small">
                                                Protect your account using standard TOTP-based Authenticator applications like Google Authenticator or Microsoft Authenticator.
                                            </p>

                                            {mfaEnabled ? (
                                                <div className="mt-3">
                                                    <div className="d-flex align-items-center mb-3">
                                                        <span className="badge bg-success p-2 me-2" style={{ fontSize: "0.9rem" }}>Active / Secure</span>
                                                        <span className="text-muted small">MFA is fully enabled and active on your account.</span>
                                                    </div>

                                                    {mfaSetupStep !== "disabling" ? (
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={() => setMfaSetupStep("disabling")}
                                                        >
                                                            Disable Multi-Factor Authentication
                                                        </button>
                                                    ) : (
                                                        <div className="p-3 bg-light rounded border mt-3">
                                                            <h5 className="font-weight-bold text-danger mb-2">Disable Multi-Factor Authentication</h5>
                                                            <p className="text-muted small">Please confirm your identity by entering your account password and the 6-digit OTP code.</p>

                                                            <div className="mb-2">
                                                                <label className="form-label small font-weight-bold">Account Password</label>
                                                                <input
                                                                    type="password"
                                                                    className="form-control form-control-sm"
                                                                    placeholder="Enter password"
                                                                    value={mfaPassword}
                                                                    onChange={(e) => setMfaPassword(e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="mb-3">
                                                                <label className="form-label small font-weight-bold">Authenticator Code</label>
                                                                <input
                                                                    type="text"
                                                                    maxLength={6}
                                                                    className="form-control form-control-sm"
                                                                    placeholder="6-digit code"
                                                                    value={mfaVerificationCode}
                                                                    onChange={(e) => setMfaVerificationCode(e.target.value.replace(/\D/g, ""))}
                                                                />
                                                            </div>

                                                            <div className="d-flex gap-2">
                                                                <button type="button" className="btn btn-danger btn-sm" onClick={handleDisableMfa}>
                                                                    Confirm Disable
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-secondary btn-sm"
                                                                    onClick={() => { setMfaSetupStep("idle"); setMfaPassword(""); setMfaVerificationCode(""); }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="mt-3">
                                                    {mfaSetupStep === "idle" && (
                                                        <div>
                                                            <p className="text-warning font-weight-bold small">⚠️ MFA is currently disabled. Enable it to secure your documents.</p>
                                                            <button
                                                                type="button"
                                                                className="btn btn-primary btn-sm mt-2"
                                                                onClick={handleStartMfaSetup}
                                                            >
                                                                Set up Authenticator App
                                                            </button>
                                                        </div>
                                                    )}

                                                    {mfaSetupStep === "enrolling" && (
                                                        <div className="p-3 bg-light rounded border mt-3">
                                                            <h5 className="font-weight-bold mb-3">1. Scan the QR Code</h5>
                                                            <p className="text-muted small">Scan this image using your Google Authenticator or Microsoft Authenticator app.</p>

                                                            <div className="d-flex justify-content-center p-3 bg-white border rounded mb-3">
                                                                {mfaQrCode && <img src={mfaQrCode} alt="MFA QR" width={180} height={180} />}
                                                            </div>

                                                            <div className="mb-3">
                                                                <span className="text-muted small font-weight-bold">Manual Entry Code:</span>
                                                                <div className="bg-white p-2 border rounded font-monospace text-center font-weight-bold mt-1" style={{ letterSpacing: "0.1rem" }}>
                                                                    {mfaSecret}
                                                                </div>
                                                            </div>

                                                            <h5 className="font-weight-bold mb-2">2. Save Emergency Recovery Codes</h5>
                                                            <p className="text-muted small mb-2">If you lose your device, these codes can recover your account. Save them securely.</p>
                                                            <div className="row g-2 mb-3 bg-white p-2 border rounded">
                                                                {mfaRecoveryCodes.map((code, idx) => (
                                                                    <div key={idx} className="col-6 font-monospace small text-center p-1 bg-light border rounded">
                                                                        {code}
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <h5 className="font-weight-bold mb-2">3. Verify Connection</h5>
                                                            <p className="text-muted small">Enter the 6-digit OTP generated by your authenticator app to verify.</p>

                                                            <div className="mb-3">
                                                                <input
                                                                    type="text"
                                                                    maxLength={6}
                                                                    className="form-control text-center font-weight-bold"
                                                                    placeholder="e.g. 123456"
                                                                    style={{ fontSize: "1.2rem", letterSpacing: "0.2rem" }}
                                                                    value={mfaVerificationCode}
                                                                    onChange={(e) => setMfaVerificationCode(e.target.value.replace(/\D/g, ""))}
                                                                />
                                                            </div>

                                                            <div className="d-flex gap-2">
                                                                <button type="button" className="btn btn-success btn-sm" onClick={handleEnableMfa}>
                                                                    Verify and Enable
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-secondary btn-sm"
                                                                    onClick={() => { setMfaSetupStep("idle"); setMfaVerificationCode(""); }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Tab>

                            </Tabs>
                        </div>

                        <div className={styles.formActions}>
                            <button onClick={handleSubmit} className={styles.btnSave}>
                                <IoSaveOutline fontSize={16} /> Save Changes
                            </button>
                            <button onClick={() => router.push("/")} className={styles.btnCancel}>
                                <MdOutlineCancel fontSize={16} /> Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </DashboardLayout>

            {/* Change Password Modal */}
            <Modal show={show} onHide={handleClose} centered className="smallModel">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <div className="d-flex flex-row align-items-center">
                            <Heading text="Reset Password" color="#444" />
                        </div>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="custom-scroll" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                        <div className="d-flex flex-column w-100">
                            <div className={styles.formGroup + " mb-3"}>
                                <label className={styles.formLabel}>Email</label>
                                <input
                                    type="email"
                                    className={styles.formInput}
                                    value={myEmail || ""}
                                    onChange={(e) => setMyEmail(e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup + " mb-3"}>
                                <label className={styles.formLabel}>Current Password</label>
                                <input
                                    type="password"
                                    className={styles.formInput}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup + " mb-3"}>
                                <label className={styles.formLabel}>New Password</label>
                                <input
                                    type="password"
                                    className={styles.formInput}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup + " mb-3"}>
                                <label className={styles.formLabel}>Confirm Password</label>
                                <input
                                    type="password"
                                    className={styles.formInput}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        {error && <p className="text-danger small mt-2">{error}</p>}
                        <div className={styles.formActions + " mt-4"}>
                            <button onClick={handleResetPassword} className={styles.btnSave}>
                                <IoSaveOutline fontSize={16} /> Update Password
                            </button>
                            <button onClick={handleClose} className={styles.btnCancel}>
                                <MdOutlineCancel fontSize={16} /> Cancel
                            </button>
                        </div>
                    </div>
                </Modal.Body>
            </Modal>

            <ToastMessage
                message={toastMessage}
                show={showToast}
                onClose={() => setShowToast(false)}
                type={toastType}
            />
        </>
    );
}
