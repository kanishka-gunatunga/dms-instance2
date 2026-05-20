/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Heading from "@/components/common/Heading";
import { Table, Button, Modal } from "react-bootstrap";
import { FaRegFileAlt, FaSignature } from "react-icons/fa";
import { IoClose, IoEyeOutline } from "react-icons/io5";
import { MdOutlineCancel } from "react-icons/md";
import Image from "next/image";
import { useUserContext } from "@/context/userContext";
import { getWithAuth } from "@/utils/apiClient";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import styles from "./sign-approval.module.css";

interface SignedDocument {
  id: number;
  name: string;
  category: { category_name: string };
  signed_date: string;
  status: string;
}

const SignApprovalPage = () => {
  const { userId, userName } = useUserContext();
  const [modalStates, setModalStates] = useState({ viewModel: false });
  const [viewDocument, setViewDocument] = useState<any>(null);
  const [documents, setDocuments] = useState<SignedDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadSignedDocuments();
    }
  }, [userId]);

  const loadSignedDocuments = async () => {
    setLoading(true);
    try {
      const response = await getWithAuth("signed-documents");
      if (Array.isArray(response)) {
        const mappedDocs = response.map((doc: any) => ({
          id: doc.id,
          name: doc.name || doc.document_name,
          category: doc.category || { category_name: doc.category_name || "Uncategorized" },
          signed_date: doc.signed_date || doc.updated_at || new Date().toISOString(),
          status: doc.status || "Signed",
        }));
        setDocuments(mappedDocs);
      } else {
        console.warn("API response is not an array:", response);
        setDocuments([]);
      }
    } catch (error) {
      console.error("Failed to load signed documents:", error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = (modalName: string) => {
    setModalStates(prev => ({ ...prev, [modalName]: false }));
  };

  const currentDateTime = new Date().toLocaleString();

  const handleViewOpen = async (doc: SignedDocument) => {
    try {
      const response = await getWithAuth(`view-document/${doc.id}/${userId}`);
      if (response && response.data) {
        setViewDocument(response.data);
        setModalStates({ viewModel: true });
      } else {
        console.error("Failed to load document details");
      }
    } catch (error) {
      console.error("Error loading document for view:", error);
    }
  };

  if (loading && documents.length === 0) return (
    <DashboardLayout>
      <LoadingSpinner />
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className={styles.pageWrapper}>
        <div className={styles.pageHeader}>
          <div className={styles.pageTitle}>
            <Heading text="Signed Documents" color="#0A0A0A" />
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.tableWrapper}>
            <Table hover responsive>
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Category</th>
                  <th>Signed Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.length > 0 ? (
                  documents.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaRegFileAlt className="me-2 text-muted" />
                          {doc.name}
                        </div>
                      </td>
                      <td>{doc.category?.category_name || "Uncategorized"}</td>
                      <td>{new Date(doc.signed_date).toLocaleDateString()}</td>
                      <td>
                        <span className={styles.statusBadgeSigned}>
                          {doc.status}
                        </span>
                      </td>
                      <td>
                        <Button
                          className={styles.btnView}
                          onClick={() => handleViewOpen(doc)}
                        >
                          <IoEyeOutline fontSize={16} /> View
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-5">
                      <div className={styles.noDataContainer} style={{ border: 'none', padding: 0 }}>
                        <div className={styles.noDataIcon}>
                          <FaSignature />
                        </div>
                        <p className={styles.noDataText}>No signed documents found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </div>

      <Modal
        centered
        show={modalStates.viewModel}
        fullscreen
        onHide={() => {
          handleCloseModal("viewModel");
        }}
      >
        <Modal.Header>
          <div className="d-flex w-100 justify-content-end">
            <div className="col-11 d-flex flex-row">
              <p className="mb-0" style={{ fontSize: "16px", color: "#333" }}>
                View Document : {viewDocument?.name || ""}
              </p>
            </div>
            <div className="col-1 d-flex  justify-content-end">
              <IoClose
                fontSize={20}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  handleCloseModal("viewModel");
                }}
              />
            </div>
          </div>
        </Modal.Header>
        <Modal.Body className="p-2 p-lg-4">
          <div className="d-flex preview-container">
            {viewDocument && (
              <>
                {/* Image Preview */}
                {["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "tiff", "ico", "avif"].includes(viewDocument.type) ? (
                  <Image
                    src={viewDocument.url}
                    alt={viewDocument.name}
                    width={600}
                    height={600}
                  />
                ) :
                  /* TXT / CSV / LOG Preview */
                  ["txt", "csv", "log"].includes(viewDocument.type) ? (
                    <div className="text-preview" style={{ width: "100%" }}>
                      <iframe
                        src={viewDocument.url}
                        title="Text Preview"
                        style={{
                          width: "100%",
                          height: "500px",
                          border: "1px solid #ccc",
                          background: "#fff"
                        }}
                      ></iframe>
                    </div>
                  ) :
                    /* PDF or Office Docs */
                    (viewDocument.type === "pdf" || viewDocument.enable_external_file_view === 1) ? (
                      <div
                        className="iframe-container"
                        data-watermark={`Confidential\nDo Not Copy\n${userName}\n${currentDateTime}`}
                      >
                        <iframe
                          src={
                            viewDocument.type === "pdf"
                              ? viewDocument.url
                              : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewDocument.url)}`
                          }
                          title="Document Preview"
                          style={{ width: "100%", height: "500px", border: "none" }}
                        ></iframe>
                      </div>
                    ) : (
                      <p>No preview available for this document type.</p>
                    )}
              </>
            )}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <div className="d-flex flex-row justify-content-start">
            <button
              onClick={() => {
                handleCloseModal("viewModel");
              }}
              className="custom-icon-button button-danger text-white bg-danger px-3 py-1 rounded"
            >
              <MdOutlineCancel fontSize={16} className="me-1" /> Cancel
            </button>
          </div>
        </Modal.Footer>
      </Modal>

    </DashboardLayout>
  );
};

export default SignApprovalPage;
