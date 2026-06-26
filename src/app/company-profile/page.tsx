/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import Heading from "@/components/common/Heading";
import InfoModal from "@/components/common/InfoModel";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import DashboardLayout from "@/components/DashboardLayout";
import useAuth from "@/hooks/useAuth";
import React, { useState, useRef, useEffect } from "react";
import { Tabs, Tab, Card, Dropdown, DropdownButton } from "react-bootstrap";
import { IoImageOutline, IoSaveOutline } from "react-icons/io5";
import { MdCancel } from "react-icons/md";
import { postWithAuth,getWithAuth } from "@/utils/apiClient";
import ToastMessage from "@/components/common/Toast";
import styles from "./company-profile.module.css";

type S3Fields = Record<"key" | "secret" | "bucket" | "region", string>;
type Errors = Record<"key" | "secret" | "bucket", boolean>;

interface ValidationErrors {
  title?: string;
}

export default function AllDocTable() {
  const [title, setTitle] = useState("");
  const [key, setKey] = useState("");
  const [secret, setSecret] = useState("");
  const [region, setRegion] = useState("");
  const [bucket, setBucket] = useState("");
  const [logo, setLogo] = useState("/logo.svg");
  const [banner, setBanner] = useState("/login-image.png");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastMessage, setToastMessage] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});

  const [selectedStorage, setSelectedStorage] = useState(
    "Local Disk (Default)"
  );
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        const response = await getWithAuth(`company-profile`);
        setTitle(response.title || "");
        setLogo(response.logo_url || "");
        setBanner(response.banner_url || "");
        setSelectedStorage(response.storage || "");
        setKey(response.key || "");
        setSecret(response.secret || "");
        setBucket(response.bucket || "");
        setRegion(response.region || "");

      } catch (error) {
      }
    };

    fetchCompanyProfile();
  }, []);
  const validateFields = (): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    if (!title.trim()) newErrors.title = "Title is required.";
    return newErrors;

  };
  
  const triggerLogoInput = () => {
    logoInputRef.current?.click();
  };

  const triggerBannerInput = () => {
    bannerInputRef.current?.click();
  };

  const [s3Fields, setS3Fields] = useState<S3Fields>({
    key: "",
    secret: "",
    bucket: "",
    region: "",
  });

  const isAuthenticated = useAuth();

  if (!isAuthenticated) {
    return <LoadingSpinner />;
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const logoURL = URL.createObjectURL(file);
      setLogo(logoURL);
    }
  };

  const handleBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file); 
      const bannerURL = URL.createObjectURL(file);
      setBanner(bannerURL);
    }
  };

  const handleSave =async () => {

    const fieldErrors = validateFields();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    const formData = new FormData();

    formData.append("title", title);

    if (logoFile) {
      formData.append("logo", logoFile);
    }
  
    if (bannerFile) {
      formData.append("banner", bannerFile);
    }

    try {
    
      const response = await postWithAuth("company-profile", formData);

      if (response.status === "success") {
        setToastType("success");
        setToastMessage("Company details updated successfully");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
        // window.location.href = "/company-profile";
      } else if (response.status === "fail") {
        if (response.errors) {
          setErrors({
            title: response.errors.title?.[0] || "",
          });
        }
        setToastType("error");
        setToastMessage("Failed to update company details.");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
      }
    } catch (error) {

      setToastType("error");
        setToastMessage("Failed to update company details");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
    }
  };


  const handleCancel = () => {
  };

  const handleStorageSave = async () => {

    try {
      const formData = new FormData();

      formData.append("storage", selectedStorage);
      formData.append("key", key);
      formData.append("secret", secret);
      formData.append("bucket", bucket);
      formData.append("region", region);

    

      const response = await postWithAuth("company-profile-storage", formData);

      if (response.status === "success") {
        setToastType("success");
        setToastMessage("Storage details updated successfully");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
        // window.location.href = "/company-profile";
      } else if (response.status === "fail") {
        if (response.errors) {
          setErrors({
            title: response.errors.title?.[0] || "",
          });
        }
        setToastType("error");
        setToastMessage("Failed to update storage details.");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
      }
    } catch (error) {

      setToastType("error");
        setToastMessage("Failed to update storage details");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
    }
  };

  const handleStorageCancel = () => {
  };

  const handleStorageSelect = (selected: string) => {
    setSelectedStorage(selected);
    setS3Fields({ key: "", secret: "", bucket: "", region: "" });

  };

  const handleInputChange = (field: keyof S3Fields, value: string) => {
    setS3Fields((prevState) => ({ ...prevState, [field]: value }));
    if (field in errors) {
      setErrors((prevState) => ({ ...prevState, [field]: false }));
    }
  };

  const handleFieldBlur = (field: keyof S3Fields) => {
    if (s3Fields[field] === "" && field !== "region" && field in errors) {
      setErrors((prevState) => ({ ...prevState, [field]: true }));
    }
  };

  return (
    <>
      <DashboardLayout>
        <div className={styles.pageWrapper}>
          <div className={styles.pageHeader}>
            <div className="d-flex flex-row align-items-center">
              <Heading text="Company Profile" color="#444" />
              {/* <InfoModal
                title="Sample Blog"
                content={`<h1><strong>Hello world,</strong></h1><p>The Company Profile feature allows users to customize the branding of the application by entering the company name and uploading logos. This customization will reflect on the login screen, enhancing the professional appearance and brand identity of the application.</p><br><h3><strong>Hello world,</strong></h3><p>The Company Profile feature allows users to customize the branding of the application by entering the company name and uploading logos. This customization will reflect on the login screen, enhancing the professional appearance and brand identity of the application.</p><br><h3><strong>Hello world,</strong></h3><p>The Company Profile feature allows users to customize the branding of the application by entering the company name and uploading logos. This customization will reflect on the login screen, enhancing the professional appearance and brand identity of the application.</p><br><h3><strong>Hello world,</strong></h3><p>The Company Profile feature allows users to customize the branding of the application by entering the company name and uploading logos. This customization will reflect on the login screen, enhancing the professional appearance and brand identity of the application.</p>`}
              /> */}
            </div>
          </div>

          <div className={styles.card}>
            <div className={`${styles.scrollContent} custom-scroll`}>
              <Tabs defaultActiveKey="general" id="uncontrolled-tab-example" className="mb-3">
                <Tab eventKey="general" title="General">
                  <div className="d-flex flex-column flex-lg-row gap-4">
                    <div className="col-12 col-lg-6">
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Name</label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className={`${styles.formInput} ${errors.title ? styles.isInvalid : ""}`}
                        />
                        {errors.title && <div className={styles.errorText}>{errors.title}</div>}
                      </div>

                      <div className={styles.formGroup}>
                        <label className={`${styles.formLabel} ${styles.logoLabel}`}>Logo</label>
                        <Card className={styles.imageCard} style={{ width: "18rem" }}>
                          <Card.Img variant="top" src={logo} />
                          <Card.Body className="p-0 pt-3">
                            <button
                              type="button"
                              onClick={triggerLogoInput}
                              className={styles.btnChange}
                            >
                              <IoImageOutline fontSize={16} /> Change Logo
                            </button>
                            <input
                              type="file"
                              ref={logoInputRef}
                              accept="image/*"
                              style={{ display: "none" }}
                              onChange={handleLogoChange}
                            />
                          </Card.Body>
                        </Card>
                      </div>
                    </div>

                    <div className="col-12 col-lg-6">
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Banner Image</label>
                        <Card className={styles.imageCard}>
                          <Card.Img variant="top" src={banner} />
                          <Card.Body className="p-0 pt-3">
                            <button
                              type="button"
                              onClick={triggerBannerInput}
                              className={styles.btnChange}
                            >
                              <IoImageOutline fontSize={16} /> Change Banner
                            </button>
                            <input
                              type="file"
                              ref={bannerInputRef}
                              accept="image/*"
                              style={{ display: "none" }}
                              onChange={handleBannerImageChange}
                            />
                          </Card.Body>
                        </Card>
                      </div>
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button onClick={handleSave} className={styles.btnSave}>
                      <IoSaveOutline fontSize={16} /> Save
                    </button>
                    <button onClick={handleCancel} className={styles.btnCancel}>
                      <MdCancel fontSize={16} /> Cancel
                    </button>
                  </div>
                </Tab>

                <Tab eventKey="storage" title="Storage">
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Storage</label>
                    <DropdownButton
                      id="dropdown-category-button"
                      key="down-centered"
                      title={selectedStorage}
                      className="col-12 col-lg-6 text-start"
                    >
                      <Dropdown.Item onClick={() => handleStorageSelect("Local Disk (Default)")}>
                        Local Disk (Default)
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => handleStorageSelect("Amazon S3")}>
                        Amazon S3
                      </Dropdown.Item>
                    </DropdownButton>
                  </div>

                  {selectedStorage === "Amazon S3" && (
                    <div id="AmazonS3Fields" className={styles.s3FieldsGrid}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Amazon S3 Key</label>
                        <input
                          type="text"
                          className={styles.formInput}
                          value={key}
                          onChange={(e) => setKey(e.target.value)}
                          onBlur={() => handleFieldBlur("key")}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Amazon S3 Secret</label>
                        <input
                          type="text"
                          className={styles.formInput}
                          value={secret}
                          onChange={(e) => setSecret(e.target.value)}
                          onBlur={() => handleFieldBlur("secret")}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Amazon S3 Region</label>
                        <input
                          type="text"
                          className={styles.formInput}
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Amazon S3 Bucket</label>
                        <input
                          type="text"
                          className={styles.formInput}
                          value={bucket}
                          onChange={(e) => setBucket(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className={styles.formActions}>
                    <button onClick={handleStorageSave} className={styles.btnSave}>
                      <IoSaveOutline fontSize={16} /> Save
                    </button>
                    <button onClick={handleStorageCancel} className={styles.btnCancel}>
                      <MdCancel fontSize={16} /> Cancel
                    </button>
                  </div>
                </Tab>
              </Tabs>
            </div>
          </div>
        </div>
        <ToastMessage
          message={toastMessage}
          show={showToast}
          onClose={() => setShowToast(false)}
          type={toastType}
        />
      </DashboardLayout>
    </>
  );
}
