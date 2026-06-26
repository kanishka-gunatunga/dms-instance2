"use client";

import Heading from "@/components/common/Heading";
import DashboardLayout from "@/components/DashboardLayout";
import useAuth from "@/hooks/useAuth";
import React, { useEffect, useState } from "react";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { DropdownButton, Dropdown } from "react-bootstrap";
import { postWithAuth } from "@/utils/apiClient";
import { useRouter } from "next/navigation";
import { IoClose, IoSaveOutline, IoEye, IoEyeOff } from "react-icons/io5";
import { MdCancel } from "react-icons/md";
import { RoleDropdownItem } from "@/types/types";
import { fetchRoleData, fetchSectors } from "@/utils/dataFetchFunctions";
import { getFlattenedSectors } from "@/utils/commonFunctions";
import ToastMessage from "@/components/common/Toast";
import { Input } from "antd";
import { SectorDropdownItem } from "@/types/types";
import styles from "./add-user.module.css";

interface ValidationErrors {
  first_name?: string;
  last_name?: string;
  mobile_no?: string;
  email?: string;
  password?: string;
  password_confirmation?: string;
  role?: string;
  sector?: string;
}




export default function AllDocTable() {
  const isAuthenticated = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [roleDropDownData, setRoleDropDownData] = useState<RoleDropdownItem[]>(
    []
  );
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastMessage, setToastMessage] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [selectedSectorIds, setSelectedSectorIds] = useState<string[]>([]);
  const [sectorDropDownData, setSectorDropDownData] = useState<
    SectorDropdownItem[]
  >([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const handleSectorSelect = (sectorId: string) => {
    if (!selectedSectorIds.includes(sectorId)) {
      setSelectedSectorIds((prev) => [...prev, sectorId]);
    }
  };

  const handleRemoveSector = (sectorId: string) => {
    setSelectedSectorIds((prev) => prev.filter((id) => id !== sectorId));
  };

  useEffect(() => {
    fetchRoleData(setRoleDropDownData);
    fetchSectors(setSectorDropDownData)
  }, []);

  useEffect(() => {
  }, [errors]);

  if (!isAuthenticated) {
    return <LoadingSpinner />;
  }

  const handleRoleSelect = (roleId: string) => {
    const selectedRole = roleDropDownData.find(
      (role) => role.id.toString() === roleId
    );

    if (selectedRole) {
      setSelectedRoleIds([roleId]);
      setRoles([selectedRole.role_name]);
    }
  };

  const handleRemoveRole = () => {
    setSelectedRoleIds([]);
    setRoles([]);
  };

  const validateFields = (): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    if (!firstName.trim()) newErrors.first_name = "First name is required.";
    if (!lastName.trim()) newErrors.last_name = "Last name is required.";
    if (!mobileNumber.trim()) newErrors.mobile_no = "Mobile number is required.";
    if (!email.trim()) newErrors.email = "Email is required.";
    if (selectedRoleIds.length === 0) newErrors.role = "Role is required.";

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_\-]).{8,}$/;
    if (!password.trim()) {
      newErrors.password = "Password is required.";
    } else if (!passwordRegex.test(password)) {
      newErrors.password = "Password must contain at least one uppercase letter, one lowercase letter, one number, one special character, and be at least 8 characters long.";
    }

    if (password !== confirmPassword) {
      newErrors.password_confirmation = "Passwords do not match.";
    } else if (!confirmPassword.trim()) {
      newErrors.password_confirmation = "Confirm password is required.";
    }
    if (selectedSectorIds.length === 0) newErrors.sector = "Sector is required.";
    return newErrors;
  };



  const handleSubmit = async () => {
    const fieldErrors = validateFields();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    const formData = new FormData();
    formData.append("first_name", firstName);
    formData.append("last_name", lastName);
    formData.append("mobile_no", mobileNumber);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("password_confirmation", confirmPassword);
    formData.append("role", JSON.stringify(selectedRoleIds));
    formData.append("sector", JSON.stringify(selectedSectorIds));
    // for (const [key, value] of formData.entries()) {
    //   console.log(`${key}: ${value}`);
    // }
    try {
      const response = await postWithAuth("add-user", formData);

      if (response.status === "success") {
        setToastType("success");
        setToastMessage("User added successfully!");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
        window.location.href = "/users";
      } else if (response.status === "fail") {
        if (response.errors) {
          setErrors({
            first_name: response.errors.first_name?.[0] || "",
            last_name: response.errors.last_name?.[0] || "",
            mobile_no: response.errors.mobile_no?.[0] || "",
            email: response.errors.email?.[0] || "",
            password: response.errors.password?.[0] || "",
            password_confirmation: response.errors.password_confirmation?.[0] || "",
            role: response.errors.role?.[0] || "",
          });
        }
        setToastType("error");
        setToastMessage("Failed to add user!");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
      }

    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };


  return (
    <>
      <DashboardLayout>
        <div className={styles.pageWrapper}>
          <div className={styles.pageHeader}>
            <Heading text="Add Users" color="#444" />
          </div>

          <div className={`d-flex flex-column ${styles.card} ${styles.formCard}`}>
            <div className={`${styles.formContent} custom-scroll`}>
              <div className="p-0 row row-cols-1 row-cols-md-2 w-100">
                <div className={`d-flex flex-column ${styles.formGroup}`}>
                  <p className={styles.formLabel}>First Name</p>
                  <div className={`${styles.inputWrapper} mb-3 pe-lg-4`}>
                  <Input
                    placeholder=""
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={errors.first_name ? "is-invalid" : ""}
                  />
                  {errors.first_name && <div className="invalid-feedback">{errors.first_name}</div>}
                  </div>
                </div>
              <div className={`d-flex flex-column ${styles.formGroup}`}>
                <p className={styles.formLabel}>Last Name</p>
                <div className={`${styles.inputWrapper} mb-3 pe-lg-4`}>
                  <Input
                    placeholder=""
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={errors.last_name ? "is-invalid" : ""}
                  />
                  {errors.last_name && <div className="invalid-feedback">{errors.last_name}</div>}
                </div>
              </div>
              <div className={`d-flex flex-column ${styles.formGroup}`}>
                <p className={styles.formLabel}>Mobile Number</p>
                <div className={`${styles.inputWrapper} mb-3 pe-lg-4`}>
                  <Input
                    placeholder=""
                    type="tel"
                    inputMode="numeric"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                    className={errors.mobile_no ? "is-invalid" : ""}
                  />
                  {errors.mobile_no && <div className="invalid-feedback">{errors.mobile_no}</div>}
                </div>
              </div>
              <div className={`d-flex flex-column ${styles.formGroup}`}>
                <p className={styles.formLabel}>Email</p>
                <div className={`${styles.inputWrapper} mb-3 pe-lg-4`}>
                  <Input
                    placeholder=""
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? "is-invalid" : ""}
                  />
                  {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                </div>
              </div>
              <div className={`d-flex flex-column ${styles.formGroup}`}>
                <p className={styles.formLabel}>Password</p>
                <div className={styles.passwordInputWrap}>
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`${styles.formInput} ${styles.formInputWithIcon} ${errors.password ? styles.isInvalid : ""}`}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <IoEye size={18} /> : <IoEyeOff size={18} />}
                  </button>
                </div>
                {errors.password && <div className="invalid-feedback">{errors.password}</div>}
              </div>
              <div className={`d-flex flex-column ${styles.formGroup}`}>
                <p className={styles.formLabel}>Confirm Password</p>
                <div className={styles.passwordInputWrap}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className={`${styles.formInput} ${styles.formInputWithIcon} ${errors.password_confirmation ? styles.isInvalid : ""}`}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <IoEye size={18} /> : <IoEyeOff size={18} />}
                  </button>
                </div>
                {errors.password_confirmation && <div className="invalid-feedback">{errors.password_confirmation}</div>}
              </div>
              <div className={`col-12 col-lg-6 d-flex flex-column ${styles.formGroup}`}>
                <p className={`${styles.formLabel} text-start w-100`}>Roles</p>
                <div className="d-flex flex-column position-relative">
                  <DropdownButton
                    id="dropdown-category-button"
                    title={
                      roles.length > 0 ? roles[0] : "Select Role"
                    }
                    className="custom-dropdown-text-start text-start w-100"
                    onSelect={(value) => {
                      if (value) handleRoleSelect(value);
                    }}
                  >
                    {roleDropDownData.length > 0 ? (
                      roleDropDownData.map((role) => (
                        <Dropdown.Item key={role.id} eventKey={role.id}>
                          {role.role_name}
                        </Dropdown.Item>
                      ))
                    ) : (
                      <Dropdown.Item disabled>
                        No Roles available
                      </Dropdown.Item>
                    )}
                  </DropdownButton>
                  {errors.role && <div className="invalid-feedback">{errors.role}</div>}
                  <div className="mt-1">
                    {roles.map((role, index) => (
                      <span
                        key={index}
                        className={`${styles.badgeTag} d-inline-flex align-items-center`}
                      >
                        {role}
                        <IoClose
                          className="ms-2"
                          style={{ cursor: "pointer" }}
                          onClick={() => handleRemoveRole()}
                        />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className={`col-12 col-lg-6 d-flex flex-column ${styles.formGroup}`}>
                <p className={`${styles.formLabel} text-start w-100`}>Sector</p>
                <div className="d-flex flex-column position-relative">
                  <DropdownButton
                    id="dropdown-category-button"
                    title={
                      selectedSectorIds.length > 0
                        ? `${selectedSectorIds.length} Sectors Selected`
                        : "Select Sector"
                    }
                    className="custom-dropdown-text-start text-start w-100"
                    onSelect={(value) => handleSectorSelect(value || "")}
                  >
                    {getFlattenedSectors(sectorDropDownData).map((sector) => (
                      <Dropdown.Item
                        key={sector.id}
                        eventKey={sector.id.toString()}
                        style={{
                          fontWeight: sector.level === 0 ? "bold" : "normal",
                          paddingLeft: `${sector.level * 20 + 10}px`,
                        }}
                      >
                        {sector.sector_name}
                      </Dropdown.Item>
                    ))}
                  </DropdownButton>
                  {errors.sector && <div className={styles.errorText}>{errors.sector}</div>}
                  <div className="mt-1">
                    {selectedSectorIds.map((sectorId) => {
                      const sector = sectorDropDownData.find(
                        (item) => item.id.toString() === sectorId
                      );
                      return sector ? (
                        <span
                          key={sectorId}
                          className={`${styles.badgeTag} d-inline-flex align-items-center`}
                        >
                          {sector.sector_name}
                          <IoClose
                            className="ms-2"
                            style={{ cursor: "pointer" }}
                            onClick={() => handleRemoveSector(sectorId)}
                          />
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            </div>
            </div>

            <div className={styles.formActions}>
              <button
                onClick={handleSubmit}
                className={styles.btnSave}
              >
                <IoSaveOutline fontSize={16} /> Save
              </button>
              <button
                onClick={() => router.push("/users")}
                className={styles.btnCancel}
              >
                <MdCancel fontSize={16} /> Cancel
              </button>
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


