/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Heading from "@/components/common/Heading";
import DashboardLayout from "@/components/DashboardLayout";
import useAuth from "@/hooks/useAuth";
import React, { useEffect, useState } from "react";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { DropdownButton, Dropdown } from "react-bootstrap";
import { getWithAuth, postWithAuth } from "@/utils/apiClient";
import { useRouter } from "next/navigation";
import { IoClose, IoSaveOutline } from "react-icons/io5";
import { MdCancel } from "react-icons/md";
import ToastMessage from "@/components/common/Toast";
import { fetchRoleData, fetchSectors } from "@/utils/dataFetchFunctions";
import { RoleDropdownItem } from "@/types/types";
import { SectorDropdownItem } from "@/types/types";
import { getFlattenedSectors } from "@/utils/commonFunctions";
import styles from "../add-user/add-user.module.css";

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
  sector?: string;
}


export default function AllDocTable({ params }: Props) {
  const isAuthenticated = useAuth();

  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [mobileNumber, setMobileNumber] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastMessage, setToastMessage] = useState("");
  const [roleDropDownData, setRoleDropDownData] = useState<RoleDropdownItem[]>(
    []
  );
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [selectedSectorIds, setSelectedSectorIds] = useState<string[]>([]);
  const [sectorDropDownData, setSectorDropDownData] = useState<
    SectorDropdownItem[]
  >([]);

  const router = useRouter();
  const id = params?.id;

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
    const fetchUserDetails = async () => {
      try {
        const response = await getWithAuth(`user-details/${id}`);
        setFirstName(response.user_details.first_name || "");
        setLastName(response.user_details.last_name || "");
        setMobileNumber(response.user_details.mobile_no?.toString() || "");
        setEmail(response.email || "");
        const roleIds = parseRoles(response.role);
        const sectorIds = parseSectors(response.user_details.sector);
        setSelectedSectorIds(sectorIds);
        setSelectedRoleIds(roleIds);
      } catch {
        console.error("Failed to fetch profile data:");
      }
    };

    if (id) {
      fetchUserDetails();
    }
  }, [id]);

  const parseSectors = (sectorData: any): string[] => {
    if (typeof sectorData === "string") {
      try {
        const parsed = JSON.parse(sectorData);
        if (Array.isArray(parsed)) {
          return parsed.map(String);
        }
      } catch {
        const cleanedData = sectorData.replace(/[^0-9,]/g, '');
        if (cleanedData) {
          return cleanedData.split(',').filter((id) => id.trim() !== "");
        }
      }
    } else if (typeof sectorData === "number") {
      return [sectorData.toString()];
    } else if (Array.isArray(sectorData)) {
      return sectorData.map(String);
    }
    return [];
  };

  const parseRoles = (roleData: any): string[] => {
    if (typeof roleData === "string") {
      const cleanedData = roleData.replace(/[^0-9,]/g, '');
      return cleanedData.split(',').filter((roleId) => roleId.trim() !== "");
    }
    return [];
  };

  useEffect(() => {
    const initialRoles = roleDropDownData
      .filter((role) => selectedRoleIds.includes(role.id.toString()))
      .map((role) => role.role_name);

    setRoles(initialRoles);
  }, [selectedRoleIds, roleDropDownData]);

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



  if (!isAuthenticated) {
    return <LoadingSpinner />;
  }


  const validateFields = (): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    if (!firstName.trim()) newErrors.first_name = "First name is required.";
    if (!lastName.trim()) newErrors.last_name = "Last name is required.";
    if (!mobileNumber.trim()) newErrors.mobile_no = "Mobile number is required.";
    if (!email.trim()) newErrors.email = "Email is required.";
    if (selectedRoleIds.length === 0) newErrors.role = "Role is required.";
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
    formData.append("role", JSON.stringify(selectedRoleIds));
    formData.append("sector", JSON.stringify(selectedSectorIds));

    try {
      const response = await postWithAuth(`user-details/${id}`, formData);
      if (response.status === "fail") {
        setToastType("error");
        setToastMessage("Failed to update user!");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      } else {
        setToastType("success");
        setToastMessage("User Updated successfully!");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
        // setSuccess("Form submitted successfully");
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
            <Heading text="Manage Users" color="#444" />
          </div>

          <div className={`d-flex flex-column ${styles.card} ${styles.formCard}`}>
            <div className={`${styles.formContent} custom-scroll`}>
              <div className="p-0 row row-cols-1 row-cols-md-2 w-100">
                <div className={`d-flex flex-column ${styles.formGroup}`}>
                  <p className={styles.formLabel}>First Name</p>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={`${styles.formInput} ${errors.first_name ? styles.isInvalid : ""}`}
                  />
                  {errors.first_name && <div className="invalid-feedback">{errors.first_name}</div>}
                </div>
                <div className={`d-flex flex-column ${styles.formGroup}`}>
                  <p className={styles.formLabel}>Last Name</p>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={`${styles.formInput} ${errors.last_name ? styles.isInvalid : ""}`}
                  />
                  {errors.last_name && <div className="invalid-feedback">{errors.last_name}</div>}
                </div>
                <div className={`d-flex flex-column ${styles.formGroup}`}>
                  <p className={styles.formLabel}>Mobile Number</p>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                    className={`${styles.formInput} ${errors.mobile_no ? styles.isInvalid : ""}`}
                  />
                  {errors.mobile_no && <div className="invalid-feedback">{errors.mobile_no}</div>}
                </div>
                <div className={`d-flex flex-column ${styles.formGroup}`}>
                  <p className={styles.formLabel}>Email</p>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${styles.formInput} ${errors.email ? styles.isInvalid : ""}`}
                  />
                  {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                </div>
                <div className={`d-flex flex-column ${styles.formGroup}`}>
                  <p className={styles.formLabel}>Roles</p>
                  <div className="mb-3 pe-lg-4">
                  <DropdownButton
                    id="dropdown-category-button"
                    title={roles.length > 0 ? roles[0] : "Select Role"}
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
                      <Dropdown.Item disabled>No Roles available</Dropdown.Item>
                    )}
                  </DropdownButton>

                  {errors.role && <div className="invalid-feedback">{errors.role}</div>}

                  <div className="mt-1">
                    {roles.map((roleName, index) => {
                      const role = roleDropDownData.find((r) => r.role_name === roleName);
                      return role ? (
                        <span
                          key={index}
                          className={`${styles.badgeTag} d-inline-flex align-items-center`}
                        >
                          {roleName}
                          <IoClose
                            className="ms-2"
                            style={{ cursor: "pointer" }}
                            onClick={() => handleRemoveRole()} // Pass role.id here
                          />
                        </span>
                      ) : null;
                    })}
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

