"use client";

import Heading from "@/components/common/Heading";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import DashboardLayout from "@/components/DashboardLayout";
import { usePermissions } from "@/context/userPermissions";
import useAuth from "@/hooks/useAuth";
import { fetchLoginAudits } from "@/utils/dataFetchFunctions";
import { hasPermission } from "@/utils/permission";
import React, { useEffect, useState } from "react";
import { Form, Pagination, Table } from "react-bootstrap";
import { MdArrowDropDown, MdArrowDropUp } from "react-icons/md";
import styles from "./login-audits.module.css";

interface TableItem {
  id: number;
  email: string;
  date_time: string;
  ip_address: string;
  status: string;
  latitude: string;
  longitude: string;
}
export default function AllDocTable() {
  const permissions = usePermissions();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [dummyData, setDummyData] = useState<TableItem[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const isAuthenticated = useAuth();


  useEffect(() => {
    fetchLoginAudits(setDummyData);
  }, []);


  if (!isAuthenticated) {
    return <LoadingSpinner />;
  }

  const filteredData = dummyData.filter((item) =>
    item.email?.toLowerCase().includes(searchValue.toLowerCase())
  );
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleSort = () => setSortAsc(!sortAsc);

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const sortedData = [...filteredData].sort((a, b) =>
    sortAsc
      ? new Date(a.date_time).getTime() - new Date(b.date_time).getTime()
      : new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
  );

  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <>
      <DashboardLayout>
        <div className={styles.pageWrapper}>
          <div className={styles.pageHeader}>
            <Heading text="Login Audit Logs" color="#444" />
          </div>

          <div className={styles.card}>
            <div className={styles.filterItem}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by email"
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div>
              <div className={`${styles.tableWrapper} custom-scroll`}>
                {hasPermission(permissions, "Login Audits", "View Login Audit Logs") && (
                  <Table hover responsive>
                    <thead className="sticky-header">
                      <tr>
                        <th
                          className={`text-start ${styles.sortableTh}`}
                          onClick={handleSort}
                        >
                          Date & Time{" "}
                          {sortAsc ? (
                            <MdArrowDropUp fontSize={20} />
                          ) : (
                            <MdArrowDropDown fontSize={20} />
                          )}
                        </th>
                        <th className="text-start">Email</th>
                        <th className="text-start">IP Address</th>
                        <th className="text-start">Status</th>
                        <th className="text-start">Latitude</th>
                        <th className="text-start">Longitude</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.length > 0 ? (
                        paginatedData.map((item) => (
                          <tr key={item.id}>
                            <td className="text-start">{item.date_time}</td>
                            <td className="text-start">{item.email}</td>
                            <td className="text-start">{item.ip_address}</td>
                            <td className="text-start">
                              <span
                                className={
                                  item.status === "success"
                                    ? styles.badgeSuccess
                                    : item.status === "fail"
                                      ? styles.badgeFail
                                      : styles.badgeOther
                                }
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="text-start">{item.latitude}</td>
                            <td className="text-start">{item.longitude}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className={styles.noData}>
                            No data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                )}
              </div>

              <div className={`d-flex flex-column flex-lg-row ${styles.paginationFooter}`}>
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
        </div>
      </DashboardLayout>
    </>
  );
}
