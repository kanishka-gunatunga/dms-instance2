"use client";

import Heading from "@/components/common/Heading";
import DashboardLayout from "@/components/DashboardLayout";
import useAuth from "@/hooks/useAuth";
import React, { useEffect, useState } from "react";
import { Form, Modal, Pagination, Table } from "react-bootstrap";
import { FaPlus } from "react-icons/fa6";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { fetchRoleData } from "@/utils/dataFetchFunctions";
import { TiEdit } from "react-icons/ti";
import { FiTrash } from "react-icons/fi";
import Link from "next/link";
import { getWithAuth } from "@/utils/apiClient";
import ToastMessage from "@/components/common/Toast";
import { MdCancel } from "react-icons/md";
import { IoCheckmark, IoClose } from "react-icons/io5";
import { usePermissions } from "@/context/userPermissions";
import { hasPermission } from "@/utils/permission";
import styles from "./roles.module.css";

interface TableItem {
  id: number;
  role_name: string;
  permissions: string;
}

export default function AllDocTable() {
  const permissions = usePermissions();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [dummyData, setDummyData] = useState<TableItem[]>([]);
  const isAuthenticated = useAuth();
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastMessage, setToastMessage] = useState("");
  const [modalStates, setModalStates] = useState({
    deleteRoleModel: false,
  });
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(
    null
  );
  const [selectedRoleName, setSelectedRoleName] = useState<string | null>(
    null
  );


  useEffect(() => {
    fetchRoleData(setDummyData);
  }, []);

  if (!isAuthenticated) {
    return <LoadingSpinner />;
  }

  const totalItems = dummyData.length;
  const totalPages = Math.ceil(dummyData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const paginatedData = dummyData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  const handleOpenModal = (
    modalName: keyof typeof modalStates,
    roleTd?: number,
    roleName?: string
  ) => {
    if (roleTd) setSelectedRoleId(roleTd);
    if (roleName) setSelectedRoleName(roleName);
    setModalStates((prev) => ({ ...prev, [modalName]: true }));
  };

  const handleCloseModal = (modalName: keyof typeof modalStates) => {
    setModalStates((prev) => ({ ...prev, [modalName]: false }));
  };
  const handleAddRole = () => {
    window.location.href = "/roles/add"
  };

  const handleDeleteRole = async (id: number) => {
    try {
      const response = await  getWithAuth(`delete-role/${id}`);
      if (response.status === "success") {
        setToastType("success");
        fetchRoleData(setDummyData);
        handleCloseModal("deleteRoleModel");
        setToastMessage("Role deleted successfully!");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
      } else {
        setToastType("error");
        setToastMessage("Failed to delete role!");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
      }
    } catch (error) {
      console.error("Error deleting role:", error);
      setToastType("error");
      setToastMessage("Failed to delete role!");
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
    }
  };

  return (
    <>
      <DashboardLayout>
        <div className={styles.pageWrapper}>
          <div className={styles.pageHeader}>
            <Heading text="Roles" color="#444" />
            {hasPermission(permissions, "Role", "Create Role") && (
              <button
                onClick={handleAddRole}
                className={styles.btnAdd}
              >
                <FaPlus /> Add Role
              </button>
            )}
          </div>

          <div className={styles.card}>
            <div className={`${styles.tableWrapper} custom-scroll`}>
              {/* {hasPermission(permissions, "Reminder", "View Roles") && ( */}
                <Table hover responsive>
                  <thead className="sticky-header">
                    <tr>
                      <th className="text-start" style={{ width: "25%" }}>
                        Actions
                      </th>
                      <th className="text-start">Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.length > 0 ? (
                      paginatedData.map((item) => (
                        <tr key={item.id} className="border-bottom">
                          <td className="d-flex flex-row border-0 gap-2">
                            {hasPermission(permissions, "Role", "Edit Role") && (
                              <Link href={`/roles/${item.id}`} className={styles.btnEdit}>
                                <TiEdit fontSize={16} /> Edit
                              </Link>
                            )}
                            {hasPermission(permissions, "Role", "Delete Role") && (
                              <button onClick={() => handleOpenModal("deleteRoleModel", item.id, item.role_name)} className={styles.btnDelete}>
                                <FiTrash fontSize={16} /> Delete
                              </button>
                            )}
                          </td>
                          <td className="border-0">{item.role_name}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className={styles.noData}>
                          No data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              {/* )} */}
            </div>

            <div className={styles.paginationFooter}>
              <div className="d-flex justify-content-between align-items-center">
                <p className={`${styles.paginationLabel} mb-0`}>Items per page:</p>
                <Form.Select
                  onChange={handleItemsPerPageChange}
                  value={itemsPerPage}
                  style={{ width: "100px", padding: "5px 10px", fontSize: "0.875rem" }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                </Form.Select>
              </div>
              <div className="d-flex flex-row align-items-center px-lg-5">
                <div className={styles.paginationInfo}>
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
          </div>
        </div>

        <Modal
          centered
          show={modalStates.deleteRoleModel}
          onHide={() => handleCloseModal("deleteRoleModel")}
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
                  onClick={() => handleCloseModal("deleteRoleModel")}
                />
              </div>
            </div>
            <div className="d-flex py-3" style={{ color: "#0A0A0A", fontSize: "0.875rem" }}>
              {selectedRoleName || ""}
            </div>
            <div className={styles.modalFooter}>
              <button
                onClick={() => handleDeleteRole(selectedRoleId!)}
                className={styles.btnSave}
              >
                <IoCheckmark fontSize={16} /> Yes
              </button>
              <button
                onClick={() => {
                  handleCloseModal("deleteRoleModel");
                  setSelectedRoleId(null);
                }}
                className={styles.btnCancel}
              >
                <MdCancel fontSize={16} /> No
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
      </DashboardLayout>
    </>
  );
}
