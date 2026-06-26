"use client";

import Heading from "@/components/common/Heading";
import DashboardLayout from "@/components/DashboardLayout";
import useAuth from "@/hooks/useAuth";
import React, { useEffect, useState } from "react";
import { Dropdown, DropdownButton, Modal, Table, Form, Pagination } from "react-bootstrap";
import { AiFillDelete } from "react-icons/ai";
import { FaEllipsisV } from "react-icons/fa";
import { FaKey, FaPlus } from "react-icons/fa6";
import { MdModeEditOutline, MdCancel, MdPeople } from "react-icons/md";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { getWithAuth, postWithAuth } from "@/utils/apiClient";
import { IoCheckmark, IoClose, IoSaveOutline } from "react-icons/io5";
import Link from "next/link";
import { TableItem } from "@/types/types";
import { fetchAndMapUserTableData } from "@/utils/dataFetchFunctions";
import ToastMessage from "@/components/common/Toast";
import { usePermissions } from "@/context/userPermissions";
import { hasPermission } from "@/utils/permission";
import styles from "./users.module.css";

export default function AllDocTable() {
  const isAuthenticated = useAuth();
  const permissions = usePermissions();
  const [tableData, setTableData] = useState<TableItem[]>([]);
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastMessage, setToastMessage] = useState("");
  const [modalStates, setModalStates] = useState({
    deleteUserModel: false,
  });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    null
  );
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(
    null
  );
  const [isAdEnabled, setIsAdEnabled] = useState<string>("0");

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>("");




  useEffect(() => {
    fetchAdConnection()
  }, []);


  const fetchAdConnection = async () => {
    try {
      const response = await getWithAuth(`get-ad-connection`);
      console.log("response ad", response)
      if (response.status === "fail") {
        setIsAdEnabled('0')
      } else {
        setIsAdEnabled(String(response))
      }
    } catch (error) {
      console.error("Error new version updating:", error);
    }
  };

  const handleOpenModal = (
    modalName: keyof typeof modalStates,
    roleTd?: string,
    roleName?: string
  ) => {
    if (roleTd) setSelectedUserId(roleTd);
    if (roleName) setSelectedUserEmail(roleName);
    setModalStates((prev) => ({ ...prev, [modalName]: true }));
  };

  const handleCloseModal = (modalName: keyof typeof modalStates) => {
    setModalStates((prev) => ({ ...prev, [modalName]: false }));
  };

  const handleShow = (id: string, email: string) => {
    setSelectedItem({ id, email });
    setShow(true);
  };

  const handleClose = () => {
    setShow(false);
    setSelectedItem(null);
  };

  useEffect(() => {
    fetchAndMapUserTableData(setTableData);
  }, []);
  console.log("fetchAndMapUserTableData ", tableData)

  if (!isAuthenticated) {
    return <LoadingSpinner />;
  }

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
      setError(
        "Password must be at least 8 characters long and contain at least one capital letter, one number, and one special character."
      );
      return false;
    }

    setError("");
    return true;
  };

  const handleResetPassword = async () => {
    if (validateForm()) {
      const formData = new FormData();
      formData.append("email", selectedItem?.email || "");
      formData.append("current_password", currentPassword);
      formData.append("password", password);
      formData.append("password_confirmation", confirmPassword);

      try {
        const response = await postWithAuth("update-password", formData);
        if (response.status === "fail") {
          handleCloseModal("deleteUserModel")
          setToastType("error");
          setToastMessage("Failed to reset password!");
          setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
          }, 5000);
        } else {
          setToastType("success");
          fetchAndMapUserTableData(setTableData);
          handleCloseModal("deleteUserModel")
          setToastMessage("Reset Password Successfully!");
          setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
          }, 5000);
        }

        handleClose();
      } catch (error) {
        console.error("Error submitting form:", error);
      }
    }
  };

  const handleDeleteUser = async (id: string) => {

    try {
      const response = await  getWithAuth(`delete-user/${id}`);
      if (response.status === "fail") {
        setToastType("error");
        setToastMessage("Failed to delete user!");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
      } else {
        setToastType("success");
        fetchAndMapUserTableData(setTableData);
        setToastMessage("User delete successfully!");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
      }

    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const filteredData = tableData.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      (item.email || "").toLowerCase().includes(term) ||
      (item.firstName || "").toLowerCase().includes(term) ||
      (item.lastName || "").toLowerCase().includes(term) ||
      (item.mobileNumber || "").toLowerCase().includes(term)
    );
  });

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  return (
    <>
      <DashboardLayout>
        <div className={styles.pageWrapper}>
          <div className={styles.pageHeader}>
            <Heading text="Users" color="#444" />
            {/* {hasPermission(permissions, "User", "Create User") && (
            <Link
              href="/users/add-user"
              className="addButton bg-white text-dark border border-success rounded px-3 py-1"
            >
              <FaPlus /> Add User
            </Link>
          )} */}
            {isAdEnabled === '0' && hasPermission(permissions, "User", "Create User") && (
              <Link
                href="/users/add-user"
                className={styles.btnAdd}
              >
                <FaPlus /> Add User
              </Link>
            )}
          </div>

          <div className={styles.card}>
            <div className="d-flex justify-content-end mb-3">
              <input
                type="text"
                className="form-control w-25"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className={`${styles.tableWrapper} custom-scroll`}>
              {hasPermission(permissions, "User", "View Users") && (
                <Table hover responsive>
                  <thead className="sticky-header">
                    <tr>
                      <th>Actions</th>
                      <th className="text-start">Email</th>
                      <th className="text-start">First Name</th>
                      <th className="text-start">Last Name</th>
                      <th className="text-start">Mobile Number</th>
                    </tr>
                  </thead>
                  <tbody>

                    {paginatedData.length > 0 ? (
                      paginatedData.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <DropdownButton
                              id="dropdown-basic-button"
                              drop="end"
                              title={<FaEllipsisV />}
                              className="no-caret position-static"
                            >
                              {hasPermission(permissions, "User", "Edit User") && (
                                <Dropdown.Item
                                  href={`/users/${item.id}`}
                                  className="py-2"
                                >
                                  <MdModeEditOutline className="me-2" />
                                  Edit
                                </Dropdown.Item>
                              )}
                              {hasPermission(permissions, "User", "Delete User") && (
                                <Dropdown.Item
                                  href="#"
                                  className="py-2"
                                  onClick={() => handleOpenModal("deleteUserModel", item.id, item.email)}
                                >
                                  <AiFillDelete className="me-2" />
                                  Delete
                                </Dropdown.Item>
                              )}
                              {hasPermission(permissions, "User", "Reset Password") && (
                                <Dropdown.Item
                                  href="#"
                                  className="py-2"
                                  onClick={() => handleShow(item.id, item.email)}
                                >
                                  <FaKey className="me-2" />
                                  Reset Password
                                </Dropdown.Item>
                              )}
                              {hasPermission(permissions, "User", "Assign Permission") && (
                                <Dropdown.Item href={`/users/permissions/${item.role}`} className="py-2">
                                  <MdPeople className="me-2" />
                                  Permission
                                </Dropdown.Item>
                              )}




                            </DropdownButton>
                          </td>
                          <td>{item.email}</td>
                          <td>{item.firstName}</td>
                          <td>{item.lastName}</td>
                          <td>{item.mobileNumber}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className={styles.noData}>
                          No data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              )}

            </div>

            <Modal
              show={show}
              onHide={handleClose}
              centered
              className={styles.modalContent}
            >
              <Modal.Header closeButton>
                <Modal.Title>
                  <div className="d-flex flex-row align-items-center">
                    <Heading text="Reset Password" color="#444" />{" "}
                  </div>
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <div
                  className="custom-scroll"
                  style={{ maxHeight: "70vh", overflowY: "scroll" }}
                >
                  <div className="d-flex flex-column w-100">
                    <div className="d-flex flex-column mb-3">
                      <p className={`mb-1 ${styles.formLabel}`}>Email</p>
                      <input
                        type="email"
                        className={styles.formInput}
                        value={selectedItem?.email || ""}
                        // onChange={(e) => setEmail(e.target.value)}
                        readOnly
                      />
                    </div>
                    <div className="d-flex flex-column mb-3">
                      <p className={`mb-1 ${styles.formLabel}`}>Current Password</p>
                      <input
                        type="password"
                        className={styles.formInput}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>
                    <div className="d-flex flex-column mb-3">
                      <p className={`mb-1 ${styles.formLabel}`}>Password</p>
                      <input
                        type="password"
                        className={styles.formInput}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <div className="d-flex flex-column mb-3">
                      <p className={`mb-1 ${styles.formLabel}`}>Confirm Password</p>
                      <input
                        type="password"
                        className={styles.formInput}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  {error && <p className="text-danger">{error}</p>}
                  <div className={`${styles.modalFooter} mt-2`}>
                    <button
                      onClick={handleResetPassword}
                      className={styles.btnSave}
                    >
                      <IoSaveOutline fontSize={16} /> Save
                    </button>
                    <button
                      onClick={handleClose}
                      className={styles.btnCancel}
                    >
                      <MdCancel fontSize={16} /> Cancel
                    </button>
                  </div>
                </div>
              </Modal.Body>
            </Modal>
            <Modal
              centered
              show={modalStates.deleteUserModel}
              onHide={() => handleCloseModal("deleteUserModel")}
              className={styles.modalContent}
            >
              <Modal.Body>
                <div className="d-flex flex-column">
                  <div className="d-flex w-100 justify-content-end">
                    <div className="col-11 d-flex flex-row">
                      <p className={`mb-0 ${styles.modalConfirmText}`} style={{ color: "#dc3545" }}>
                        Are you sure you want to delete?
                      </p>
                    </div>
                    <div className="col-1 d-flex justify-content-end">
                      <IoClose
                        fontSize={20}
                        style={{ cursor: "pointer" }}
                        onClick={() => handleCloseModal("deleteUserModel")}
                      />
                    </div>
                  </div>
                  <div className="d-flex py-3" style={{ color: "#0A0A0A", fontSize: "0.875rem" }}>
                    {selectedUserEmail || ""}
                  </div>
                  <div className={styles.modalFooter}>
                    <button
                      onClick={() => handleDeleteUser(selectedUserId!)}
                      className={styles.btnSave}
                    >
                      <IoCheckmark fontSize={16} /> Yes
                    </button>
                    <button
                      onClick={() => {
                        handleCloseModal("deleteUserModel");
                        setSelectedUserId(null);
                        setSelectedUserEmail('');
                      }}
                      className={styles.btnCancel}
                    >
                      <MdCancel fontSize={16} /> No
                    </button>
                  </div>
                </div>
              </Modal.Body>
            </Modal>
            <div className="d-flex flex-column flex-lg-row paginationFooter">
              <div className="d-flex justify-content-between align-items-center">
                <p className="pagintionText mb-0 me-2">Items per page:</p>
                <Form.Select
                  onChange={handleItemsPerPageChange}
                  value={itemsPerPage}
                  style={{
                    width: "100px",
                    padding: "5px 10px",
                    fontSize: "12px",
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                </Form.Select>
              </div>
              <div className="d-flex flex-row align-items-center px-lg-5">
                <div className="pagination-info" style={{ fontSize: "14px" }}>
                  {startIndex} – {endIndex} of {totalItems}
                </div>

                <Pagination className="ms-3">
                  <Pagination.Prev
                    onClick={handlePrev}
                    disabled={currentPage === 1}
                  />
                  <Pagination.Next
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                  />
                </Pagination>
              </div>
            </div>
            <ToastMessage
              message={toastMessage}
              show={showToast}
              onClose={() => setShowToast(false)}
              type={toastType}
            />
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
