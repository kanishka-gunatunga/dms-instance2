/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Heading from "@/components/common/Heading";
import { Table, Button } from "react-bootstrap";
import { FaSignature, FaRegFileAlt } from "react-icons/fa";
import { useUserContext } from "@/context/userContext";
import SignaturePlacementModal from "@/components/common/SignaturePlacementModal";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { getWithAuth, postWithAuth } from "@/utils/apiClient";
import ToastMessage from "@/components/common/Toast";
import styles from "./sign-requests.module.css";

interface Document {
  id: number;
  name: string;
  type: string;
  created_date: string;
  category?: { category_name: string };
}

const SignRequestsPage = () => {
  const { userId } = useUserContext();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const [showSignModal, setShowSignModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [userSignatureUrl, setUserSignatureUrl] = useState<string>("");

  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastMessage, setToastMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const loadUserSignature = useCallback(async () => {
    try {
      const response = await getWithAuth(`user-details/${userId}`);
      if (response && response.user_details) {
        setUserSignatureUrl(response.user_details.signature || "");
      }
    } catch (error) {
      console.error("Failed to load user signature:", error);
    }
  }, [userId]);

  const loadSignRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getWithAuth("pending-signatures");
      if (Array.isArray(response)) {
        setDocuments(response);
      } else {
        console.warn("Pending signatures response is not an array:", response);
        setDocuments([]);
      }
    } catch (error) {
      console.error("Failed to load sign requests:", error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      loadSignRequests();
      loadUserSignature();
    }
  }, [userId, loadSignRequests, loadUserSignature]);

  const openSignModal = async (doc: Document) => {
    try {
      const response = await getWithAuth(`view-document/${doc.id}/${userId}`);
      if (response && response.data) {
        try {
          await getWithAuth(`view-sign-document/${doc.id}`);
        } catch (error) {
          console.error("Failed to track view time for document:", error);
        }

        setSelectedDoc(response.data);
        setShowSignModal(true);
      } else {
        throw new Error("Failed to load document details");
      }
    } catch (error) {
      console.error("Error loading document for signing:", error);
      setToastType("error");
      setToastMessage("Failed to load document details for signing.");
      setShowToast(true);
    }
  };

  const handleSaveSignedDocument = async (signedFile: File, signatureData: any[]) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("user", userId || "");
      formData.append("signatures", JSON.stringify(signatureData));

      const response = await postWithAuth(
        `sign-document/${selectedDoc?.id}`,
        formData
      );

      if (response && (response.status === "success" || response.message === "success" || response.status === 200)) {
        setShowSignModal(false);
        setToastType("success");
        setToastMessage("Document signed and updated successfully!");
        setShowToast(true);
        loadSignRequests();
      } else {
        const errorMsg = response?.message || response?.error || "Failed to save the signed document!";
        setToastType("error");
        setToastMessage(errorMsg);
        setShowToast(true);
      }
    } catch (error) {
      console.error("Error saving signed document:", error);
      setToastType("error");
      setToastMessage("An error occurred while saving the signed document!");
      setShowToast(true);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading && documents.length === 0) return <LoadingSpinner />;

  return (
    <DashboardLayout>
      <div className={styles.pageWrapper}>
        <div className={styles.pageHeader}>
          <div className={styles.pageTitle}>
            <Heading text="Sign Requests" color="#0A0A0A" />
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.tableWrapper}>
            <Table hover responsive>
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Category</th>
                  <th>Received Date</th>
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
                      <td>{new Date(doc.created_date).toLocaleDateString()}</td>
                      <td>
                        <span className={styles.statusBadge}>Pending Sign</span>
                      </td>
                      <td>
                        <Button className={styles.btnSign} onClick={() => openSignModal(doc)}>
                          <FaSignature /> Sign Now
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-5">
                      <div className={styles.noDataContainer}>
                        <div className={styles.noDataIcon}>
                          <FaSignature />
                        </div>
                        <p className={styles.noDataText}>No pending signature requests found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </div>

      {showSignModal && selectedDoc && (
        <SignaturePlacementModal
          show={showSignModal}
          onHide={() => setShowSignModal(false)}
          name={selectedDoc.name}
          documentUrl={selectedDoc.url}
          documentType={selectedDoc.type}
          signatureUrl={userSignatureUrl}
          onSave={handleSaveSignedDocument}
          onTimeExpired={() => {
            setShowSignModal(false);
            setToastType("error");
            setToastMessage("Time has expired for signing this document.");
            setShowToast(true);
          }}
        />
      )}

      {isProcessing && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)', zIndex: 9999 }}>
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-2 fw-bold" style={{ color: '#ea580c' }}>Processing signed document...</p>
          </div>
        </div>
      )}

      <ToastMessage
        show={showToast}
        onClose={() => setShowToast(false)}
        type={toastType}
        message={toastMessage}
      />
    </DashboardLayout>
  );
};

export default SignRequestsPage;
