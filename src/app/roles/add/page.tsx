/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import Heading from "@/components/common/Heading";
import DashboardLayout from "@/components/DashboardLayout";
import useAuth from "@/hooks/useAuth";
import React, { useState } from "react";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { postWithAuth } from "@/utils/apiClient";
import { IoSave } from "react-icons/io5";
import { MdCancel } from "react-icons/md";
import Link from "next/link";
import { Checkbox, Divider } from "antd";
import ToastMessage from "@/components/common/Toast";
import styles from "../roles-add.module.css";


export default function AllDocTable() {
    const [roleName, setRoleName] = useState("");
    const [showToast, setShowToast] = useState(false);
    const [toastType, setToastType] = useState<"success" | "error">("success");
    const [toastMessage, setToastMessage] = useState("");
    const [error, setError] = useState("");
    const [selectedGroups, setSelectedGroups] = useState<{ [key: string]: string[] }>({});
    const [apiCallFailed, setApiCallFailed] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
const [isAdmin, setIsAdmin] = useState(false);
    const isAuthenticated = useAuth();

    if (!isAuthenticated) {
        return <LoadingSpinner />;
    }

    const allGroups = [
        { name: "Dashboard", items: ["View Dashboard"] },
        { name: "All Documents", items: ["View Documents", "Create Document", "Edit Document", "Delete Document", "Archive Document", "Add Reminder", "Share Document", "Download Document", "Send Email", "Manage Sharable Link", "AI Options", "Upload New Version file", "Version History", "Comment", "Remove From Search"] },        
        { name: "Assigned Documents", items: ["View Documents","Create Document", "Edit Document", "Share Document", "Upload New Version", "Delete Document", "Send Email", "Manage Sharable Link", "Upload New Version file", "Version History", "Comment", "Remove From Search", "Download", "Add Reminder", "Archive","AI Options"] },
        { name: "Archived Documents", items: ["View Documents", "Restore Document", "Delete Document"] },
        { name: "Advanced Search", items: ["Advanced Search"] },
        { name: "Deep Search", items: ["Deep Search", "Add Indexing", "Remove Indexing"] },
        { name: "Document Categories", items: ["Manage Document Category"] },
        { name: "Bulk Upload", items: ["View Bulk Upload","Delete Bulk Upload","Create Bulk Upload", "Edit Bulk Upload",] },
        // { name: "FTP Accounts", items: ["View FTP Accounts","Delete FTP Accounts","Create FTP Accounts", "Edit FTP Accounts",] },
        // { name: "Attributes", items: ["View Attributes", "Add Attributes", "Edit Attributes","Delete Attributes"] },
        { name: "Sectors", items: ["Manage Sectors"] },
        { name: "Documents Audit Trail", items: ["View Document Audit Trail"] },
        { name: "User", items: ["View Users", "Create User", "Edit User", "Delete User", "Reset Password", "Assign User Role", "Assign Permission"] },
        { name: "Role", items: ["View Roles", "Create Role", "Edit Role", "Delete Role"] },
        // { name: "Email", items: ["Manage SMTP Settings"] },
        { name: "Settings", items: ["Manage Languages", "Storage Settings", "Manage Company Profile"] },
        { name: "Signatures", items: ["Sign Approval","Sign Requests"] },
        { name: "Reminder", items: ["View Reminders", "Create Reminder", "Edit Reminder", "Delete Reminder"] },
        { name: "Login Audits", items: ["View Login Audit Logs"] },
        // { name: "Page Helpers", items: ["Manage Page Helper"] },
    ];
    
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const updatedGroups: { [key: string]: string[] } = {};

            allGroups.forEach((group) => {
                updatedGroups[group.name] = group.items;
            });

            setSelectedGroups(updatedGroups);
        } else {
            setSelectedGroups({});
        }
    };

    const handleGroupSelect = (checked: boolean, groupName: string, groupItems: string[]) => {
        setSelectedGroups((prev) => {
            const updatedGroups: { [key: string]: string[] } = { ...prev };

            if (checked) {
                updatedGroups[groupName] = groupItems;
            } else {
                delete updatedGroups[groupName];
            }

            return updatedGroups;
        });
    };

    const handleIndividualSelect = (groupName: string, value: string, checked: boolean) => {
        setSelectedGroups((prev) => {
            const updatedGroups: { [key: string]: string[] } = { ...prev };
            const groupItems = updatedGroups[groupName] || [];

            if (checked) {
                updatedGroups[groupName] = [...groupItems, value];
            } else {
                updatedGroups[groupName] = groupItems.filter((item) => item !== value);

                if (updatedGroups[groupName].length === 0) {
                    delete updatedGroups[groupName];
                }
            }

            return updatedGroups;
        });
    };


    const selectedArray = Object.entries(selectedGroups).map(([group, items]) => ({
        group,
        items,
    }));

    const handleAddRolePermission = async () => {

        if (formSubmitted) return;
        if (!roleName.trim()) {
            setError("Role name is required.");
            return;
        }

        setError("");
        setApiCallFailed(false);
        setFormSubmitted(true);
        try {
            const formData = new FormData();
            formData.append("role_name", roleName);
            formData.append("permissions", JSON.stringify(selectedArray));
            formData.append("is_admin", isAdmin ? "1" : "0");
            const response = await postWithAuth(`add-role`, formData);


            if (response.status === "success") {
                setToastType("success");
                setToastMessage("Role added successfully!");
                setShowToast(true);
                setTimeout(() => setShowToast(false), 5000);
                setFormSubmitted(false);
            } else {
                setToastType("error");
                setToastMessage("Failed to add role!");
                setShowToast(true);
                setTimeout(() => setShowToast(false), 5000);
                setFormSubmitted(false);
            }

        } catch (error) {
            setToastType("error");
            setToastMessage("Failed to add role!");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 5000);
            setFormSubmitted(false);
            // console.error("Error adding role:", error);
        }
    };


    return (
        <>
            <DashboardLayout>
                <div className={styles.pageWrapper}>
                    <div className={styles.pageHeader}>
                        <Heading text="Manage Role" color="#444" />
                    </div>

                    <div className={`${styles.card} ${styles.cardWithStickyActions} ${styles.formCard}`}>
                        <div className={`${styles.scrollArea} custom-scroll`}>
                            <div className={`${styles.formGroup} col-12 col-md-6`}>
                                <label className={styles.formLabel}>Role Name</label>
                                <input
                                    type="text"
                                    className={`${styles.formInput} ${error ? styles.isInvalid : ""}`}
                                    value={roleName}
                                    onChange={(e) => setRoleName(e.target.value)}
                                />
                                {error && <div className={styles.errorText}>{error}</div>}
                            </div>
                            <Checkbox
                                className="mb-2"
                                checked={isAdmin}
                                onChange={(e) => setIsAdmin(e.target.checked)}
                            >
                                Enable Admin Dashboard
                            </Checkbox>
                            <h3 className={styles.sectionHeading}>Permission</h3>
                            <div className="mt-2">
                                <Checkbox
                                    checked={Object.keys(selectedGroups).length === allGroups.length}
                                    indeterminate={
                                        Object.keys(selectedGroups).length > 0 &&
                                        Object.keys(selectedGroups).length < allGroups.length
                                    }
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                >
                                    Select All
                                </Checkbox>
                                <Divider />

                                {allGroups.map((group, groupIndex) => (
                                    <div key={groupIndex} className={styles.permissionGroup}>
                                        <Checkbox
                                            checked={selectedGroups[group.name]?.length === group.items.length}
                                            indeterminate={
                                                selectedGroups[group.name]?.length > 0 &&
                                                selectedGroups[group.name]?.length < group.items.length
                                            }
                                            onChange={(e) => handleGroupSelect(e.target.checked, group.name, group.items)}
                                            style={{ fontWeight: "700" }}
                                        >
                                            {group.name}
                                        </Checkbox>
                                        <div className={styles.permissionItems}>
                                            {group.items.map((item, itemIndex) => (
                                                <Checkbox
                                                    key={itemIndex}
                                                    checked={selectedGroups[group.name]?.includes(item)}
                                                    onChange={(e) => handleIndividualSelect(group.name, item, e.target.checked)}
                                                >
                                                    {item}
                                                </Checkbox>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <Divider />
                            </div>
                        </div>

                        <div className={styles.stickyActions}>
                            <button
                                disabled={formSubmitted}
                                onClick={() => handleAddRolePermission()}
                                className={styles.btnSave}
                            >
                                <IoSave fontSize={16} /> Yes
                            </button>
                            <Link href="/roles" className={styles.btnCancel}>
                                <MdCancel fontSize={16} /> No
                            </Link>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
            <ToastMessage
          message={toastMessage}
          show={showToast}
          onClose={() => setShowToast(false)}
          type={toastType}
        />
        </>
    );
}

