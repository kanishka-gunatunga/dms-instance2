/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Heading from "@/components/common/Heading";
import DashboardLayout from "@/components/DashboardLayout";
import useAuth from "@/hooks/useAuth";
import React, { useEffect, useState } from "react";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { DropdownButton, Dropdown } from "react-bootstrap";
import { getWithAuth, postWithAuth } from "@/utils/apiClient";
import { IoAdd, IoClose, IoSaveOutline, IoTrashOutline } from "react-icons/io5";
import { MdCancel } from "react-icons/md";
import { useUserContext } from "@/context/userContext";
import { formatDateForSQL, getFlattenedSectors, getFlattenedCategories } from "@/utils/commonFunctions";
import {
  fetchAndMapUserData,
  fetchCategoryData,
  fetchRoleData,
  fetchSectors,
  fetchSectorsForUser,
} from "@/utils/dataFetchFunctions";
import {
  CategoryDropdownItem,
  RoleDropdownItem,
  SectorDropdownItem,
  UserDropdownItem,
} from "@/types/types";
import ToastMessage from "@/components/common/Toast";
import Link from "next/link";
import { Checkbox, DatePicker, DatePickerProps } from "antd";
import styles from "./add-document.module.css";

export default function AllDocTable() {
  const isAuthenticated = useAuth();
  const { userId, userType } = useUserContext();

  // console.log("user id: ", userId);

  const [name, setName] = useState<string>("");
  const [document, setDocument] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<File | null>(null);
  // const [storage, setStorage] = useState<string>("");
  const [roleDropDownData, setRoleDropDownData] = useState<RoleDropdownItem[]>(
    []
  );
  const [userDropDownData, setUserDropDownData] = useState<UserDropdownItem[]>(
    []
  );
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [description, setDescription] = useState<string>("");
  const [errors, setErrors] = useState<any>({});

  const [loading, setLoading] = useState<boolean>(false);

  const [metaTags, setMetaTags] = useState<string[]>([]);
  const [currentMeta, setCurrentMeta] = useState<string>("");

  const [isTimeLimited, setIsTimeLimited] = useState<boolean>(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [downloadable, setDownloadable] = useState<boolean>(false);

  const [isUserTimeLimited, setIsUserTimeLimited] = useState<boolean>(false);
  const [users, setUsers] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userStartDate, setUserStartDate] = useState<string>("");
  const [userExpireDate, setUserExpireDate] = useState<string>("");
  const [userEndDate, setUserEndDate] = useState<string>("");
  const [userDownloadable, setUserDownloadable] = useState<boolean>(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  const [categoryDropDownData, setCategoryDropDownData] = useState<
    CategoryDropdownItem[]
  >([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSectorId, setSelectedSectorId] = useState<string>("");
  // const [encriptionType, setEncriptionType] = useState<string>("128bit");
  // const [isEncripted, setIsEncripted] = useState<boolean>(false);
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastMessage, setToastMessage] = useState("");
  const [attributes, setAttributes] = useState<string[]>([]);
  const [formAttributeData, setFormAttributeData] = useState<{ attribute: string; value: string }[]>([]);

  const [sectorDropDownData, setSectorDropDownData] = useState<
    SectorDropdownItem[]
  >([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setDocument(file);

    if (file) {
      setName(file.name);
      // setErrors((prevErrors) => ({ ...prevErrors, document: "" }));
    }
  };

  const handlePreviewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setDocumentPreview(file);
  };



  useEffect(() => {
    fetchRoleData(setRoleDropDownData);
    fetchAndMapUserData(setUserDropDownData);
    if (userId) {
      fetchSectorsForUser(userId, setSectorDropDownData);
    }

    const fetchTags = async () => {
      try {
        const response = await getWithAuth("get-all-meta-tags");
        if (Array.isArray(response)) {
          const tags = response.map((t: any) => {
            if (typeof t === "string") return t;
            if (t.tag_name) return t.tag_name;
            if (t.name) return t.name;
            if (t.meta_tag) return t.meta_tag;
            if (t.tag) return t.tag;
            const values = Object.values(t);
            return values.find(v => typeof v === "string");
          }).filter(Boolean);
          setSuggestedTags(tags);
        } else if (response && Array.isArray(response.data)) {
          const tags = response.data.map((t: any) => typeof t === "string" ? t : t.tag_name || t.name || t.meta_tag || t.tag).filter(Boolean);
          setSuggestedTags(tags);
        }
      } catch (err) {
        console.error("Failed to fetch meta tags:", err);
      }
    };
    fetchTags();
  }, [userId]);


  useEffect(() => {
    // console.log("dropdown updated:", userDropDownData);
  }, [userDropDownData, roleDropDownData, categoryDropDownData]);

  // category select
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    handleGetAttributes(categoryId)
  };

  const handleSectorSelect = async (sectorId: string) => {
    setSelectedSectorId(sectorId);
    setSelectedCategoryId("");
    setAttributes([]);
    setFormAttributeData([]);

    if (sectorId) {
      try {
        const response = await getWithAuth(`sector-details/${sectorId}`);
        setCategoryDropDownData(response?.categories || []);
      } catch (error) {
        console.error("Failed to load categories for sector:", error);
        setCategoryDropDownData([]);
      }
    } else {
      setCategoryDropDownData([]);
    }
  };


  const handleGetAttributes = async (id: string) => {
    try {
      const response = await getWithAuth(`attribute-by-category/${id}`);
      // console.log("Attributes: ", response);
      const parsedAttributes = JSON.parse(response.attributes);
      setAttributes(parsedAttributes);
    } catch (error) {
      // console.error("Error getting shareable link:", error);
    }
  };
  const handleInputChange = (attribute: string, value: string) => {
    setFormAttributeData((prevData) => {
      const existingIndex = prevData.findIndex((item) => item.attribute === attribute);
      if (existingIndex !== -1) {
        const updatedData = [...prevData];
        updatedData[existingIndex] = { attribute, value };
        return updatedData;
      }
      return [...prevData, { attribute, value }];
    });
  };



  // meta tag
  const addMetaTag = () => {
    if (currentMeta.trim() !== "" && !metaTags.includes(currentMeta.trim())) {
      setMetaTags((prev) => [...prev, currentMeta.trim()]);
      setCurrentMeta("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addMetaTag();
    }
  };

  const updateMetaTag = (index: number, value: string) => {
    setMetaTags((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const removeMetaTag = (index: number) => {
    setMetaTags((prev) => prev.filter((_, i) => i !== index));
  };

  // role select
  const handleRoleSelect = (roleId: string) => {
    const selectedRole = roleDropDownData.find(
      (role) => role.id.toString() === roleId
    );

    if (selectedRole && !selectedRoleIds.includes(roleId)) {
      setSelectedRoleIds([...selectedRoleIds, roleId]);
      setRoles([...roles, selectedRole.role_name]);
    }
  };

  const handleRemoveRole = (roleName: string) => {
    const roleToRemove = roleDropDownData.find(
      (role) => role.role_name === roleName
    );

    if (roleToRemove) {
      setSelectedRoleIds(
        selectedRoleIds.filter((id) => id !== roleToRemove.id.toString())
      );
      setRoles(roles.filter((r) => r !== roleName));
    }
  };

  // user select
  const handleUserSelect = (userId: string) => {
    const selectedUser = userDropDownData.find(
      (user) => user.id.toString() === userId
    );

    if (selectedUser && !selectedUserIds.includes(userId)) {
      setSelectedUserIds([...selectedUserIds, userId]);
      setUsers([...users, selectedUser.user_name]);
    }
  };

  const handleUserRole = (userName: string) => {
    const userToRemove = userDropDownData.find(
      (user) => user.user_name === userName
    );

    if (userToRemove) {
      setSelectedUserIds(
        selectedUserIds.filter((id) => id !== userToRemove.id.toString())
      );
      setUsers(users.filter((r) => r !== userName));
    }
  };

  const collectedData = {
    isTimeLimited: isTimeLimited ? "1" : "0",
    // isEncripted: isEncripted ? "1" : "0",
    startDate: formatDateForSQL(startDate),
    endDate: formatDateForSQL(endDate),
    downloadable: downloadable ? "1" : "0",
    isUserTimeLimited: isUserTimeLimited ? "1" : "0",
    userStartDate: formatDateForSQL(userStartDate),
    userEndDate: formatDateForSQL(userEndDate),
    userDownloadable: userDownloadable ? "1" : "0",
    expireDate: formatDateForSQL(userExpireDate),
  };

  // console.log("Collected Data:", collectedData);

  if (!isAuthenticated) {
    return <LoadingSpinner />;
  }
  const validate = () => {
    const validationErrors: any = {};

    if (!name) {
      validationErrors.name = "Name is required.";
    }

    if (!selectedCategoryId) {
      validationErrors.category = "Category is required.";
    }

    // if (!storage) {
    //   validationErrors.storage = "Storage is required.";
    // }

    if (!document) {
      validationErrors.document = "Document is required.";
    }

    if (isTimeLimited) {
      if (!startDate) {
        validationErrors.startDate = "Start date is required.";
      }

      if (!endDate) {
        validationErrors.endDate = "End date is required.";
      }
    }

    if (isUserTimeLimited) {
      if (!userStartDate) {
        validationErrors.userStartDate = "Start date is required.";
      }

      if (!userEndDate) {
        validationErrors.userEndDate = "End date is required.";
      }
    }
    return validationErrors;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || formSubmitted) return;
    
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    const formData = new FormData();
    formData.append("name", name);
    formData.append("document", document || "");
    formData.append("category", selectedCategoryId);
    formData.append("sector_category", selectedSectorId);
    // formData.append("storage", storage);
    formData.append("description", description);
    formData.append("document_preview", documentPreview || "");
    formData.append("meta_tags", JSON.stringify(metaTags));
    formData.append("assigned_roles", JSON.stringify(selectedRoleIds));
    formData.append("assigned_users", JSON.stringify(selectedUserIds));
    formData.append("role_is_time_limited", collectedData.isTimeLimited);
    formData.append("role_start_date_time", collectedData.startDate || "");
    formData.append("role_end_date_time", collectedData.endDate || "");
    formData.append("role_is_downloadable", collectedData.downloadable);
    formData.append("user_is_time_limited", collectedData.isUserTimeLimited);
    formData.append("user_start_date_time", collectedData.userStartDate || "");
    formData.append("user_end_date_time", collectedData.userEndDate || "");
    formData.append("user_is_downloadable", collectedData.userDownloadable);
    formData.append("user", userId || "");
    // formData.append("is_encrypted", collectedData.isEncripted);
    // formData.append("encryption_type", encriptionType);
    formData.append("attribute_data", JSON.stringify(formAttributeData));
    formData.append("expiration_date", collectedData.expireDate || "");

    // for (const [key, value] of formData.entries()) {
    //   console.log(`${key}: ${value}`);
    // }

    setLoading(true);
    setErrors({});
    setFormSubmitted(true);
    try {
      const response = await postWithAuth("add-document", formData);
      // console.log("Form submitted successfully:", response);
      if (response.status === "success") {
        setToastType("success");
        setToastMessage("Document added successfully!");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 2000);
        window.location.href = "/all-documents";
      } else {
        // console.log("Form submitted failed:", response);
        setToastType("error");
        setToastMessage("Failed to add the document.");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
        setFormSubmitted(false);
      }
    } catch (error) {
      // console.error("Error submitting form:", error);
      setToastType("error");
      setToastMessage("Failed to add the document.");
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
      setFormSubmitted(false);
    } finally {
      setLoading(false);
    }
  };

  const onStartDateTimeOk = (value: DatePickerProps['value'], dateString: string) => {
    if (value) {
      // console.log('onStartDateTimeOk: ', dateString);
      setStartDate(dateString);
    }
  };

  const onEndDateTimeOk = (value: DatePickerProps['value'], dateString: string) => {
    if (value) {
      // console.log('onEndDateTimeOk: ', dateString);
      setEndDate(dateString);
    }
  };

  const onUserStartDateTimeOk = (value: DatePickerProps['value'], dateString: string) => {
    if (value) {
      // console.log('onStartDateTimeOk: ', dateString);
      setUserStartDate(dateString);
    }
  };

  const onUserEndDateTimeOk = (value: DatePickerProps['value'], dateString: string) => {
    if (value) {
      // console.log('onEndDateTimeOk: ', dateString);
      setUserEndDate(dateString);
    }
  };

  const onExpireDateTimeOk = (value: DatePickerProps['value'], dateString: string) => {
    if (value) {
      // console.log('onEndDateTimeOk: ', dateString);
      setUserExpireDate(dateString);
    }
  };

  // console.log("attribute data : ", formAttributeData)
  return (
    <>
      <DashboardLayout>
        <div className={`${styles.pageWrapper}`}>
          <div className={styles.pageHeader}>
            <Heading text="Add Document" color="#0A0A0A" />
          </div>

          <div className={`${styles.formCard} d-flex flex-column`}>
          <div className={`${styles.formContent} custom-scroll`}>
            <div className="d-flex flex-column">
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Document</label>
                  <input
                    type="file"
                    className={styles.fileInput}
                    id="document"
                    onChange={handleFileChange}
                  />
                  {errors.document && <div className={styles.errorMessage}>{errors.document}</div>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Name</label>
                  <input
                    type="text"
                    className={`form-control ${styles.formInput}`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  {errors.name && <div className={styles.errorMessage}>{errors.name}</div>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Sectors</label>
                  <DropdownButton
                        id="dropdown-sectors-button"
                        title={
                          selectedSectorId
                            ? sectorDropDownData.find((item) => item.id.toString() === selectedSectorId)?.sector_name
                            : "Select Sector"
                        }
                        className={`custom-dropdown-text-start text-start w-100 ${styles.dropdownToggle}`}
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
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Category</label>
                  <DropdownButton
                        id="dropdown-category-button"
                        title={
                          selectedCategoryId
                            ? categoryDropDownData.find(
                                (item) => item.id.toString() === selectedCategoryId
                              )?.category_name
                            : "Select Category"
                        }
                        className={`custom-dropdown-text-start text-start w-100 ${styles.dropdownToggle}`}
                        onSelect={(value) => handleCategorySelect(value || "")}
                      >
                        {getFlattenedCategories(categoryDropDownData).map((cat) => (
                          <Dropdown.Item
                            key={cat.id}
                            eventKey={cat.id.toString()}
                            style={{
                              fontWeight: cat.level === 0 ? "bold" : "normal",
                              paddingLeft: `${cat.level * 15 + 10}px`,
                            }}
                          >
                            {cat.level > 0 ? "— ".repeat(cat.level) : ""}{cat.category_name}
                          </Dropdown.Item>
                        ))}
                      </DropdownButton>

                  {errors.category && <div className={styles.errorMessage}>{errors.category}</div>}
                </div>
                {/* <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Storage</label>
                  <DropdownButton
                    id="dropdown-storage-button"
                    title={storage || "Select"}
                    className={`custom-dropdown-text-start text-start w-100 ${styles.dropdownToggle}`}
                    onSelect={(value) => setStorage(value || "")}
                  >
                    <Dropdown.Item eventKey="Local Disk (Default)">
                      Local Disk (Default)
                    </Dropdown.Item>
                  </DropdownButton>
                  {errors.storage && <div className={styles.errorMessage}>{errors.storage}</div>}
                </div> */}
              </div>
              {attributes.map((attribute, index) => {
                const existingValue = formAttributeData.find((item) => item.attribute === attribute)?.value || "";
                return (
                  <div key={index} className={styles.formGroup}>
                    <label className={styles.formLabel}>{attribute}</label>
                    <input
                      type="text"
                      className={`form-control ${styles.formInput}`}
                      value={existingValue}
                      onChange={(e) => handleInputChange(attribute, e.target.value)}
                    />
                  </div>
                )
              })}
              <div className={styles.formRowFull}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Description</label>
                  <textarea
                    className={`form-control ${styles.formTextarea}`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              <div className={styles.formRowTwoCol}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Preview image</label>
                  <input
                    type="file"
                    className={styles.fileInput}
                    id="documentPreview"
                    accept=".png,.jpg,.jpeg,.tiff,.tif"
                    onChange={handlePreviewFileChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Meta tags</label>
                  <div style={{ width: "100%" }}>
                    <div className={styles.metaTagRow} style={{ marginBottom: "0.5rem", position: "relative" }}>
                      <input
                        type="text"
                        value={currentMeta}
                        onChange={(e) => setCurrentMeta(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter a meta tag"
                        className={styles.metaTagInput}
                      />
                      <button
                        onClick={addMetaTag}
                        className={styles.metaTagAddButton}
                      >
                        <IoAdd />
                      </button>

                      {currentMeta.trim() !== "" && suggestedTags.filter(tag => tag.toLowerCase().includes(currentMeta.trim().toLowerCase()) && !metaTags.includes(tag)).length > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: "42px",
                            backgroundColor: "#fff",
                            border: "1px solid #ccc",
                            borderTop: "none",
                            borderBottomLeftRadius: "4px",
                            borderBottomRightRadius: "4px",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                            zIndex: 10,
                            maxHeight: "150px",
                            overflowY: "auto",
                          }}
                        >
                          {suggestedTags
                            .filter(tag => tag.toLowerCase().includes(currentMeta.trim().toLowerCase()) && !metaTags.includes(tag))
                            .map((tag, idx) => (
                              <div
                                key={idx}
                                onClick={() => {
                                  setMetaTags((prev) => [...prev, tag]);
                                  setCurrentMeta("");
                                }}
                                style={{
                                  padding: "8px 12px",
                                  cursor: "pointer",
                                  fontSize: "14px",
                                  color: "#333",
                                  borderBottom: "1px solid #f9f9f9",
                                  transition: "background-color 0.2s",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f1f1")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                              >
                                {tag}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    <div>
                      {metaTags.map((tag, index) => (
                        <div
                          key={index}
                          className={styles.metaTagItem}
                        >
                          <input
                            type="text"
                            value={tag}
                            onChange={(e) =>
                              updateMetaTag(index, e.target.value)
                            }
                            className={styles.metaTagItemInput}
                          />
                          <button
                            onClick={() => removeMetaTag(index)}
                            className={styles.metaTagRemoveButton}
                          >
                            <IoTrashOutline />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.formRowTwoCol}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Assign/share with roles</label>
                  <div className="d-flex flex-column position-relative">
                    <DropdownButton
                      id="dropdown-roles-button"
                      title={
                        roles.length > 0 ? roles.join(", ") : "Select Roles"
                      }
                      className={`custom-dropdown-text-start text-start w-100 ${styles.dropdownToggle}`}
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

                    <div className="mt-1">
                      {roles.map((role, index) => (
                        <span
                          key={index}
                          className={styles.badge}
                        >
                          {role}
                          <IoClose
                            className={styles.badgeClose}
                            onClick={() => handleRemoveRole(role)}
                          />
                        </span>
                      ))}
                    </div>
                  </div>
                  {roles.length > 0 && (
                    <div className="mt-1">
                      <label className={styles.checkboxLabel}>
                        <Checkbox
                          checked={isTimeLimited}
                          onChange={() => setIsTimeLimited(!isTimeLimited)}
                          className="me-2"
                        >
                          <span className={styles.checkboxLabelText}>
                            Specify the Period
                          </span>
                        </Checkbox>
                      </label>
                      {isTimeLimited && (
                        <div className="d-flex flex-column flex-lg-row gap-2 mt-2">
                          <div className={`${styles.formGroup} flex-grow-1`}>
                            <div className={styles.datePickerWrapper}>
                              <DatePicker
                                showTime
                                placeholder="Choose Start Date"
                                onChange={(value, dateString) => {
                                  setStartDate(`${dateString}`)
                                }}
                                onOk={(value) => onStartDateTimeOk(value, value?.format('YYYY-MM-DD HH:mm:ss') ?? '')}
                              />
                            </div>
                            {errors.startDate && (
                              <div className={styles.errorMessage}>{errors.startDate}</div>
                            )}
                          </div>
                          <div className={`${styles.formGroup} flex-grow-1`}>
                            <div className={styles.datePickerWrapper}>
                              <DatePicker
                                showTime
                                placeholder="Choose End Date"
                                onChange={(value, dateString) => {
                                  setEndDate(`${dateString}`)
                                }}
                                onOk={(value) => onEndDateTimeOk(value, value?.format('YYYY-MM-DD HH:mm:ss') ?? '')}
                              />
                            </div>
                            {errors.endDate && (
                              <div className={styles.errorMessage}>{errors.endDate}</div>
                            )}
                          </div>
                        </div>
                      )}
                      <label className={styles.checkboxLabel}>
                        <Checkbox
                          checked={downloadable}
                          onChange={() => setDownloadable(!downloadable)}
                          className="me-2"
                        >
                          <span className={styles.checkboxLabelText}>
                            Downloadable
                          </span>
                        </Checkbox>
                      </label>
                    </div>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Assign/share with Users</label>
                  <div className="d-flex flex-column position-relative">
                    <DropdownButton
                      id="dropdown-users-button"
                      title={
                        users.length > 0 ? users.join(", ") : "Select Users"
                      }
                      className={`custom-dropdown-text-start text-start w-100 ${styles.dropdownToggle}`}
                      onSelect={(value) => {
                        if (value) handleUserSelect(value);
                      }}
                    >
                      {userDropDownData.length > 0 ? (
                        userDropDownData.map((user) => (
                          <Dropdown.Item key={user.id} eventKey={user.id}>
                            {user.user_name}
                          </Dropdown.Item>
                        ))
                      ) : (
                        <Dropdown.Item disabled>
                          No users available
                        </Dropdown.Item>
                      )}
                    </DropdownButton>

                    <div className="mt-1">
                      {users.map((user, index) => (
                        <span
                          key={index}
                          className={styles.badge}
                        >
                          {user}
                          <IoClose
                            className={styles.badgeClose}
                            onClick={() => handleUserRole(user)}
                          />
                        </span>
                      ))}
                    </div>
                  </div>
                  {selectedUserIds.length > 0 && (
                    <div className="mt-1">
                      <label className={styles.checkboxLabel}>
                        <Checkbox
                          checked={isUserTimeLimited}
                          onChange={() =>
                            setIsUserTimeLimited(!isUserTimeLimited)
                          }
                          className="me-2"
                        >
                          <span className={styles.checkboxLabelText}>
                            Specify the Period
                          </span>
                        </Checkbox>
                      </label>
                      {isUserTimeLimited && (
                        <div className="d-flex flex-column flex-lg-row gap-2 mt-2">
                          <div className={`${styles.formGroup} flex-grow-1`}>
                            <div className={styles.datePickerWrapper}>
                              <DatePicker
                                showTime
                                placeholder="Choose Start Date"
                                onChange={(value, dateString) => {
                                  setUserStartDate(`${dateString}`)
                                }}
                                onOk={(value) => onUserStartDateTimeOk(value, value?.format('YYYY-MM-DD HH:mm:ss') ?? '')}
                              />
                            </div>
                            {errors.userStartDate && (
                              <div className={styles.errorMessage}>{errors.userStartDate}</div>
                            )}
                          </div>
                          <div className={`${styles.formGroup} flex-grow-1`}>
                            <div className={styles.datePickerWrapper}>
                              <DatePicker
                                showTime
                                placeholder="Choose End Date"
                                onChange={(value, dateString) => {
                                  setUserEndDate(`${dateString}`)
                                }}
                                onOk={(value) => onUserEndDateTimeOk(value, value?.format('YYYY-MM-DD HH:mm:ss') ?? '')}
                              />
                            </div>
                            {errors.userEndDate && (
                              <div className={styles.errorMessage}>{errors.userEndDate}</div>
                            )}
                          </div>
                        </div>
                      )}
                      <label className={styles.checkboxLabel}>
                        <Checkbox
                          checked={userDownloadable}
                          onChange={() =>
                            setUserDownloadable(!userDownloadable)
                          }
                          className="me-2"
                        >
                          <span className={styles.checkboxLabelText}>
                            Downloadable
                          </span>
                        </Checkbox>
                      </label>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.formRowTwoCol}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Select Expire Date</label>
                  <div className={styles.datePickerWrapper}>
                    <DatePicker
                      showTime
                      className={`w-100`}
                      placeholder="Choose Expire Date"
                      onChange={(value, dateString) => {
                        setUserEndDate(`${dateString}`)
                      }}
                      onOk={(value) => onExpireDateTimeOk(value, value?.format('YYYY-MM-DD HH:mm:ss') ?? '')}
                    />
                  </div>
                </div>
              </div>
              {/* <div className="d-flex flex-column flex-lg-row w-100">
                <div className="col-12 col-lg-6 d-flex flex-column justify-content-center">
                  <label className="d-flex flex-row mt-3">
                    <Checkbox
                      checked={isEncripted}
                      onChange={() => setIsEncripted(!isEncripted)}
                      className="me-2"
                    >
                      <p
                        className="mb-0 text-start w-100"
                        style={{ fontSize: "14px" }}
                      >
                        Need Encryption
                      </p>

                    </Checkbox>
                  </label>
                  <div className="d-flex w-100 flex-column justify-content-center align-items-start p-1 mt-2">
                    {isEncripted && (
                      <div className="d-flex flex-column w-100 pt-2">
                        <p
                          className="mb-1 text-start w-100"
                          style={{ fontSize: "14px" }}
                        >
                          Encryption Type
                        </p>
                        <DropdownButton
                          id="dropdown-category-button"
                          title={encriptionType}
                          className="custom-dropdown-text-start text-start w-100"
                          onSelect={(value) => setEncriptionType(value || "")}
                        >
                          <Dropdown.Item eventKey="128bit">
                            128bit
                          </Dropdown.Item>
                          <Dropdown.Item eventKey="256bit">
                            256bit
                          </Dropdown.Item>
                        </DropdownButton>
                      </div>
                    )}
                  </div>
                </div>
              </div> */}
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              disabled={loading || formSubmitted}
              onClick={handleSubmit}
              className={styles.btnSave}
            >
              {loading ? (
                "Submitting..."
              ) : (
                <>
                  <IoSaveOutline fontSize={16} className="me-1" /> Save
                </>
              )}
            </button>
            <Link
              href="/all-documents"
              className={styles.btnCancel}
            >
              <MdCancel fontSize={16} className="me-1" /> Cancel
            </Link>
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
