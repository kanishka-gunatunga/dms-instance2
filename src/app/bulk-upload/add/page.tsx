/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import Heading from "@/components/common/Heading";
import DashboardLayout from "@/components/DashboardLayout";
import useAuth from "@/hooks/useAuth";
import React, { useEffect, useState } from "react";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { IoCheckmark, IoClose, IoSaveOutline } from "react-icons/io5";
import { MdModeEditOutline, MdCancel, MdUpload } from "react-icons/md";
import { deleteWithAuth, getWithAuth, postAxiosWithAuth, postWithAuth, postWithAuthXML } from "@/utils/apiClient";
import { useUserContext } from "@/context/userContext";
import ToastMessage from "@/components/common/Toast";
import Link from "next/link";
import { Dropdown, DropdownButton, Form, Modal, Pagination, Tab, Table, Tabs } from "react-bootstrap";
import { useRouter } from "next/navigation";
import { CategoryDropdownItem, DocumentData, FtpAccDropdownItem, SectorDropdownItem } from "@/types/types";
import { fetchCategoryData, fetchFtpAccounts, fetchSectors, fetchSectorsForUser } from "@/utils/dataFetchFunctions";
import { getFlattenedSectors, getFlattenedCategories } from "@/utils/commonFunctions";
import { Button, Checkbox, Progress } from "antd";
import { FaEllipsisV, FaShareAlt } from "react-icons/fa";
import Paragraph from "@/components/common/Paragraph";
import { IoMdCloudDownload } from "react-icons/io";
import { AxiosProgressEvent } from "axios";
import { MouseEvent } from 'react';
import styles from "./bulk-upload-add.module.css";

type ErrorsLocal = {
  document?: string;
};


export default function AllDocTable() {
  const isAuthenticated = useAuth();
  const { userId } = useUserContext();
  const router = useRouter();
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastMessage, setToastMessage] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [excelFiles, setExcelFiles] = useState<FileList | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSectorId, setSelectedSectorId] = useState<string>("");
  const [documentData, setDocumentData] = useState<DocumentData[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [categoryDropDownData, setCategoryDropDownData] = useState<
    CategoryDropdownItem[]
  >([]);
  const [sectorDropDownData, setSectorDropDownData] = useState<
    SectorDropdownItem[]
  >([]);
  const [excelData, setExcelData] = useState({
    category: "",
    sector_category: "",
    extension: "",
  });
  const [templateUrl, setTemplateUrl] = useState<string>("");

  const [categoryDropDownDataLocal, setCategoryDropDownDataLocal] = useState<
    CategoryDropdownItem[]
  >([]);
  const [sectorDropDownDataLocal, setSectorDropDownDataLocal] = useState<
    SectorDropdownItem[]
  >([]);
  const [selectedCategoryIdLocal, setSelectedCategoryIdLocal] = useState<string>("");
  const [selectedSectorIdLocal, setSelectedSectorIdLocal] = useState<string>("");
  const [excelDataLocal, setExcelDataLocal] = useState({
    category: "",
    sector_category: "",
    extension: "",
  });
  const [templateUrlLocal, setTemplateUrlLocal] = useState<string>("");
  const [excelFilesLocal, setExcelFilesLocal] = useState<FileList | null>(null);
  const [documentLocal, setDocumentLocal] = useState<FileList | null>(null);
  const [errorsLocal, setErrorsLocal] = useState<{ [key: string]: string }>({});
  const [localFiles, setLocalFiles] = useState<FileList | null>(null);
  // const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [currentUploadingFile, setCurrentUploadingFile] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  // const [uploadProgress, setUploadProgress] = useState([
  //   { percentage: 0, fileName: '' },
  // ]);
  const [isChecked, setIsChecked] = useState(false);
  const [isCheckedAuto, setIsCheckedAuto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([
    { fileName: "example-file1.txt", status: "pending" },
    { fileName: "example-file2.txt", status: "pending" },
  ]);
  const [uploadStarted, setUploadStarted] = useState(false);
  const [apiCallLocalFailed, setApiCallLocalFailed] = useState(false);
  const [apiCallExcelFailed, setApiCallExcelFailed] = useState(false);


  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setExcelFiles(e.target.files);
    }
  };

  const handleCategorySelect = async (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setExcelData((prevData) => ({
      ...prevData,
      category: categoryId,
    }));

    try {
      const response = await getWithAuth(`category-details/${categoryId}`);
      console.log("category res: ", response)
      console.log("template : ", response.template)
      setTemplateUrl(response.template);
    } catch (error) {
      console.error("API call failed", error);
    }
  };
  const handleSectorSelect = async (sectorId: string) => {
    setSelectedSectorId(sectorId);
    setSelectedCategoryId("");
    setTemplateUrl("");
    setExcelData((prevData) => ({
      ...prevData,
      sector_category: sectorId,
      category: "",
    }));

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

  const handleInputChange = (e: { target: { id: any; value: any; }; }) => {
    const { id, value } = e.target;
    setExcelData((prevData) => ({
      ...prevData,
      [id]: value,
    }));
  };






  const handleExcelFileChangeLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setExcelFilesLocal(e.target.files);
    }
  };
  const handleDocumentChangeLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setDocumentLocal(files);
      setErrorsLocal((prevErrors) => ({ ...prevErrors, document: "" }));
    } else {
      setDocumentLocal(null);
      setErrorsLocal({ document: "Please select at least one document." });
    }
  };



  const handleCategorySelectLocal = async (categoryId: string) => {
    setSelectedCategoryIdLocal(categoryId);
    setExcelDataLocal((prevData) => ({
      ...prevData,
      category: categoryId,
    }));

    try {
      const response = await getWithAuth(`category-details/${categoryId}`);
      console.log("category res: ", response)
      console.log("template : ", response.template)
      setTemplateUrlLocal(response.template);
    } catch (error) {
      console.error("API call failed", error);
    }
  };

  const handleSectorSelectLocal = async (sectorId: string) => {
    setSelectedSectorIdLocal(sectorId);
    setSelectedCategoryIdLocal("");
    setTemplateUrlLocal("");
    setExcelDataLocal((prevData) => ({
      ...prevData,
      sector_category: sectorId,
      category: "",
    }));

    if (sectorId) {
      try {
        const response = await getWithAuth(`sector-details/${sectorId}`);
        setCategoryDropDownDataLocal(response?.categories || []);
      } catch (error) {
        console.error("Failed to load categories for sector:", error);
        setCategoryDropDownDataLocal([]);
      }
    } else {
      setCategoryDropDownDataLocal([]);
    }
  };

  const handleInputChangeLocal = (e: { target: { id: any; value: any; }; }) => {
    const { id, value } = e.target;
    setExcelDataLocal((prevData) => ({
      ...prevData,
      [id]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setLocalFiles(e.target.files);
      setUploadProgress(new Array(e.target.files.length).fill(0));
    }
  };



  useEffect(() => {
    if (userId) {
      fetchSectorsForUser(userId, setSectorDropDownData);
      fetchSectorsForUser(userId, setSectorDropDownDataLocal);
    }
  }, [userId]);

  useEffect(() => {
  }, [categoryDropDownData]);


  // excel file upload
  const validate = () => {
    const validationErrors: any = {};

    if (!excelData.category) {
      validationErrors.category = "Category is required.";
    }
    if (!excelData.sector_category) {
      validationErrors.sector_category = "Sector category is required.";
    }

    return validationErrors;
  };
  const handleExcelFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    if (!excelFiles || excelFiles.length === 0) {
      setErrors({ document: "Please select at least one document." });
      return;
    }

    const formData = new FormData();
    Array.from(excelFiles).forEach((file, index) => {
      formData.append("upload_file", file, file.name);
    });
    formData.append("category", excelData.category);
    formData.append("sector_category", excelData.sector_category);
    formData.append("user", userId || "");

    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }
    setLoading(true);
    setError("");
    setApiCallExcelFailed(false);

    try {
      console.log("bulk start ")
      const response = await postWithAuth("excel-bulk-upload", formData);
      if (response.status === "success") {
        setToastType("success");
        setToastMessage("Documents uploaded successfully!");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 2000);
      } else {
        setToastType("error");
        setToastMessage("Failed to upload the documents!");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
      }
    } catch (error) {
      setError("Failed to upload the documents!");
      setToastType("error");
      setToastMessage("Failed to upload the documents!");
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
      setApiCallExcelFailed(true);
    } finally {
      setLoading(false);
    }
  };

  // local file submit
  const validateLocal = () => {
    const validationErrors: any = {};

    if (!excelDataLocal.category) {
      validationErrors.category = "Category is required.";
    }
    if (!excelDataLocal.sector_category) {
      validationErrors.sector_category = "Sector category is required.";
    }


    return validationErrors;
  };


  const handleExcelFileSubmitLocal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading || localSubmitted) return;

    const validationErrors = validateLocal();
    if (Object.keys(validationErrors).length > 0) {
      setErrorsLocal(validationErrors);
      return;
    }

    if (!excelFilesLocal || excelFilesLocal.length === 0) {
      setErrorsLocal({ document: "Please select at least one document." });
      return;
    }

    if (!documentLocal || documentLocal.length === 0) {
      setErrorsLocal({ document: "Please select at least one document." });
      return;
    }

    setLoading(true);
    setError("");
    setApiCallLocalFailed(false);

    const initialProgress = Array.from(documentLocal).map((doc) => ({
      fileName: doc.name,
      status: "pending",
    }));
    setUploadProgress(initialProgress);

    setUploadStarted(true);

    try {
      console.log("bulk start");

      for (let i = 0; i < documentLocal.length; i++) {
        const formData = new FormData();

        Array.from(excelFilesLocal).forEach((file) => {
          formData.append("upload_file", file, file.name);
        });

        formData.append("document", documentLocal[i], documentLocal[i].name);

        formData.append("category", excelDataLocal.category);
        formData.append("sector_category", excelDataLocal.sector_category);
        formData.append("user", userId || "");
        formData.append("copy_files_from_computer", "1");

        for (const [key, value] of formData.entries()) {
          console.log(`${key}: ${value}`);
        }

        setUploadProgress((prevProgress) =>
          prevProgress.map((fileProgress) =>
            fileProgress.fileName === documentLocal[i].name
              ? { ...fileProgress, status: "ongoing" }
              : fileProgress
          )
        );

        const response = await postWithAuth("excel-bulk-upload", formData);

        if (response.status === "success") {
          setUploadProgress((prevProgress) =>
            prevProgress.map((fileProgress) =>
              fileProgress.fileName === documentLocal[i].name
                ? { ...fileProgress, status: "completed" }
                : fileProgress
            )
          );
          setToastType("success");
          setToastMessage("Documents uploaded successfully!");
          setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
          }, 2000);
        } else {
          setUploadProgress((prevProgress) =>
            prevProgress.map((fileProgress) =>
              fileProgress.fileName === documentLocal[i].name
                ? { ...fileProgress, status: "failed" }
                : fileProgress
            )
          );
          setToastType("error");
          setToastMessage("Failed to upload the documents.");
          setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
          }, 5000);
        }
        setLocalSubmitted(true);
      }
      setIsProcessing(true);
      const processDocResponse = await getWithAuth("process-documents");
      if (processDocResponse.status === "success") {
        setIsProcessing(false);
        setToastType("success");
        setToastMessage("Indexing complete");
        setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
          }, 2000);
      } else {
        setIsProcessing(false);
        setToastType("error");
        setToastMessage("Fail to index documents");
        setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
          }, 2000);
      }
    } catch (error) {
      setError("Failed to upload the documents.");
      setToastType("error");
      setToastMessage("Failed to upload the documents!");
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  // const handleExcelFileSubmitLocal = async (e: React.FormEvent) => {
  //   e.preventDefault();

  //   const validationErrors = validateLocal();
  //   if (Object.keys(validationErrors).length > 0) {
  //     setErrorsLocal(validationErrors);
  //     return;
  //   }

  //   if (!excelFilesLocal || excelFilesLocal.length === 0) {
  //     setErrorsLocal({ document: "Please select at least one document." });
  //     return;
  //   }

  //   if (!documentLocal || documentLocal.length === 0) {
  //     setErrorsLocal({ document: "Please select at least one document." });
  //     return;
  //   }

  //   setLoading(true);
  //   setError("");

  //   try {
  //     console.log("bulk start");

  //     const progressData = Array.from(documentLocal).map((doc) => ({
  //       fileName: doc.name,
  //       percentage: 0,
  //     }));
  //     setUploadProgress(progressData);


  //     for (let i = 0; i < documentLocal.length; i++) {
  //       const formData = new FormData();

  //       Array.from(excelFilesLocal).forEach((file) => {
  //         formData.append("upload_file", file, file.name);
  //       });

  //       formData.append("document", documentLocal[i], documentLocal[i].name);
  //       formData.append("category", excelDataLocal.category);
  //       formData.append("sector_category", excelDataLocal.sector_category);
  //       formData.append("extension", excelDataLocal.extension);
  //       formData.append("user", userId || "");
  //       formData.append("copy_files_from_computer", "1");

  //       for (const [key, value] of formData.entries()) {
  //         console.log(`${key}: ${value}`);
  //       }

  //       const onProgress = (progress: number, fileName: string) => {
  //         setUploadProgress((prevProgress) =>
  //           prevProgress.map((fileProgress) =>
  //             fileProgress.fileName === fileName
  //               ? { ...fileProgress, percentage: progress }
  //               : fileProgress
  //           )
  //         );
  //       };

  //       const onFileUploadSuccess = (fileName: string) => {
  //         setUploadProgress((prevProgress) =>
  //           prevProgress.map((fileProgress) =>
  //             fileProgress.fileName === fileName
  //               ? { ...fileProgress, percentage: 100 }
  //               : fileProgress
  //           )
  //         );
  //       };



  //       const response = await postWithAuthXML("excel-bulk-upload", formData, onProgress);

  //       if (response.status === "success") {
  //         onFileUploadSuccess(formData.get("upload_file")?.toString() || "Unknown");

  //         setToastType("success");
  //         setToastMessage("Document uploaded successfully!");
  //         setShowToast(true);
  //         setTimeout(() => {
  //           setShowToast(false);
  //         }, 2000);
  //       } else {
  //         setToastType("error");
  //         setToastMessage("Failed to upload document.");
  //         setShowToast(true);
  //         setTimeout(() => {
  //           setShowToast(false);
  //         }, 5000);
  //       }
  //     }
  //   } catch (error) {
  //     setError("Failed to submit the form.");
  //     setToastType("error");
  //     setToastMessage("Error submitting the form.");
  //     setShowToast(true);
  //     setTimeout(() => {
  //       setShowToast(false);
  //     }, 5000);
  //   } finally {
  //     setLoading(false);
  //   }
  // };


  const autoFillTemplate = async (e: MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.checked ? 1 : 0;
    setIsChecked(target.checked);

    const formData = new FormData();
    formData.append("category", selectedCategoryIdLocal);

    if (documentLocal) {
      Array.from(documentLocal).forEach((file) => {
        formData.append("documents[]", file.name);
      });
    }

    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }

    try {
      const response = await postWithAuth("generate-excel-with-file-names", formData);
      console.log(123);
      
      if (response.status === "success") {
        console.log("res: ", response);
        const fileData = response.file_data;
        const byteCharacters = atob(fileData);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
          const slice = byteCharacters.slice(offset, Math.min(offset + 1024, byteCharacters.length));
          const byteNumbers = Array.from(slice, char => char.charCodeAt(0));
          byteArrays.push(new Uint8Array(byteNumbers));
        }

        const blob = new Blob(byteArrays, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = response.file_name || "file.xlsx"; 
        a.click();

        window.URL.revokeObjectURL(url);
      } else {
        console.log("res failed: ", response);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };



  if (!isAuthenticated) {
    return <LoadingSpinner />;
  }


  const totalItems = Array.isArray(documentData) ? documentData.length : 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);
  const paginatedData = Array.isArray(documentData) ? documentData.slice(startIndex, endIndex) : [];


  return (
    <>
      <DashboardLayout>
        <div className={styles.pageWrapper}>
          <div className={styles.pageHeader}>
            <Heading text="Upload Documents" color="#444" />
          </div>

          <div className={`companyProfileTabs ${styles.tabsWrapper}`}>
          <Tabs
            defaultActiveKey="local"
            id="uncontrolled-tab-example"
            className="mb-3"
          >
            <Tab eventKey="local" title="Local computer file upload">
              <div className={styles.formCard}>
                <div className={`${styles.formContent} custom-scroll`}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>1. Select local documents</label>
                      <input
                        type="file"
                        className={styles.fileInput}
                        id="document"
                        multiple
                        onChange={handleDocumentChangeLocal}
                      />
                      {errorsLocal.document && (
                        <div className={styles.errorMessage}>{errorsLocal.document}</div>
                      )}
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>2. Sectors</label>
                      <div className={styles.dropdownWrapper}>
                      <DropdownButton
                        id="dropdown-sector-button-local"
                        title={
                          selectedSectorIdLocal
                            ? sectorDropDownDataLocal.find((item) => item.id.toString() === selectedSectorIdLocal)?.sector_name
                            : "Select Sector"
                        }
                        className={`custom-dropdown-text-start text-start w-100 ${styles.dropdownToggle}`}
                        onSelect={(value) => handleSectorSelectLocal(value || "")}
                      >
                          {getFlattenedSectors(sectorDropDownDataLocal).map((sector) => (
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
                      {errorsLocal.sector_category && <div className={styles.errorMessage}>{errorsLocal.sector_category}</div>}
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>3. Category</label>
                      <div className={styles.dropdownWrapper}>
                      <DropdownButton
                        id="dropdown-category-button-local"
                        title={
                          selectedCategoryIdLocal
                            ? categoryDropDownDataLocal.find(
                                (item) => item.id.toString() === selectedCategoryIdLocal
                              )?.category_name
                            : "Select Category"
                        }
                        className={`custom-dropdown-text-start text-start w-100 ${styles.dropdownToggle}`}
                        onSelect={(value) => handleCategorySelectLocal(value || "")}
                      >
                            {getFlattenedCategories(categoryDropDownDataLocal).map((category) => (
                              <Dropdown.Item
                                key={category.id}
                                eventKey={category.id.toString()}
                                style={{
                                  fontWeight: category.level === 0 ? "bold" : "normal",
                                  paddingLeft: `${category.level * 20 + 10}px`,
                                }}
                              >
                                {category.category_name}
                              </Dropdown.Item>
                            ))}
                      </DropdownButton>
                      </div>
                      {errorsLocal.category && <div className={styles.errorMessage}>{errorsLocal.category}</div>}
                      {templateUrlLocal && (
                        <a href={templateUrlLocal} download className={styles.btnDownload}>
                          <IoMdCloudDownload />
                          Download Template
                        </a>
                      )}
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>4. Select excel document</label>
                      <input
                        type="file"
                        className={styles.fileInput}
                        id="excel-local"
                        accept=".xlsx"
                        onChange={handleExcelFileChangeLocal}
                      />
                      {errorsLocal.document && <div className={styles.errorMessage}>{errorsLocal.document}</div>}
                    </div>
                    {documentLocal && selectedCategoryIdLocal && (
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>&nbsp;</label>
                        <button type="button" onClick={autoFillTemplate} className={styles.btnAutoFill}>
                          Auto Fill Template
                        </button>
                      </div>
                    )}
                      {/* 
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Extension <span style={{ fontSize: "12px" }}>(Do not use &apos;.&apos; in front)</span></label>
                        <input
                          type="text"
                          className={`form-control ${styles.formInput}`}
                          id="extension-local"
                          value={excelDataLocal.extension}
                          onChange={handleInputChangeLocal}
                        />
                        {errorsLocal.extension && <div className={styles.errorMessage}>{errorsLocal.extension}</div>}
                      </div> */}
                    {/* <div className="col-12 col-lg-6 d-flex flex-column justify-content-center align-items-center p-0 px-3 px-lg-0 ps-lg-2 mb-2">
                      <div className="d-flex flex-column w-100">
                        <p className="mb-1 text-start w-100" style={{ fontSize: "14px" }}>
                          Select local documents
                        </p>
                        <input
                          type="file"
                          style={{ border: "solid 1px #eee" }}
                          id="document"
                          multiple
                          onChange={handleDocumentChangeLocal}
                        />
                        {errorsLocal.document && (
                          <div style={{ color: "red", fontSize: "12px" }}>{errorsLocal.document}</div>
                        )}
                        {uploadProgress.map((fileProgress, index) => (
                          <div key={index} style={{ width: '100%', marginTop: '10px' }}>
                            <p>{fileProgress.fileName}</p>
                            <Progress percent={fileProgress.percentage} />
                          </div>
                        ))}
                      </div>
                    </div> */}
                    {/* <div className="col-12 col-lg-6 d-flex flex-column justify-content-center align-items-center p-0 px-3 px-lg-0 ps-lg-2 mb-2">
                      
                    </div> */}

                    {uploadStarted && (
                      <div style={{ width: "100%", marginTop: "1rem" }}>
                        <div style={{ marginBottom: "1rem" }}>
                          <p style={{ fontSize: "14px", fontWeight: 600, marginBottom: "0.25rem" }}>
                            Uploading {uploadProgress.filter(p => p.status === "completed" || p.status === "failed").length} out of {uploadProgress.length}
                          </p>
                          <Progress 
                            percent={Math.round((uploadProgress.filter(p => p.status === "completed" || p.status === "failed").length / uploadProgress.length) * 100)} 
                            status="active"
                          />
                        </div>
                        <div 
                          className={`${styles.uploadProgressList} custom-scroll`}
                          style={{ maxHeight: '150px', overflowY: 'auto', overflowX: 'hidden' }}
                        >
                          {uploadProgress.map((fileProgress, index) => (
                            <div key={index} className={styles.uploadProgressItem}>
                              <p className={styles.uploadProgressFileName} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "70%" }}>
                                {fileProgress.fileName}
                              </p>
                              <p
                                className={`${styles.uploadProgressStatus} ${
                                  fileProgress.status === "pending" ? styles.statusPending :
                                  fileProgress.status === "ongoing" ? styles.statusOngoing :
                                  fileProgress.status === "completed" ? styles.statusCompleted :
                                  styles.statusFailed
                                }`}
                              >
                                {fileProgress.status === "pending" && "Pending"}
                                {fileProgress.status === "ongoing" && "Uploading..."}
                                {fileProgress.status === "completed" && "Completed"}
                                {fileProgress.status === "failed" && "Failed"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {isProcessing && (
                  <div className={styles.processingMessage}>
                    Please wait until we process your documents <span className="dots"><span>{'>'}</span><span>{'>'}</span><span>{'>'}</span></span>
                  </div>
                )}
                <div className={styles.formActions}>
                  <button
                    type="button"
                    disabled={loading || (!apiCallLocalFailed && localSubmitted)}
                    onClick={handleExcelFileSubmitLocal}
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
                    href="/bulk-upload/add"
                    className={styles.btnCancel}
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.reload();
                    }}
                  >
                    <MdCancel fontSize={16} className="me-1" /> Cancel
                  </Link>
                </div>
              </div>
            </Tab>
            <Tab eventKey="excel" title="Excel file upload">
              <div className={styles.formCard}>
                <div className={`${styles.formContent} custom-scroll`}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>1. Select excel document</label>
                      <input
                        type="file"
                        className={styles.fileInput}
                        id="excel-upload"
                        accept=".xlsx"
                        onChange={handleExcelFileChange}
                      />
                      {errors.document && <div className={styles.errorMessage}>{errors.document}</div>}
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>2. Sectors</label>
                      <div className={styles.dropdownWrapper}>
                      <DropdownButton
                        id="dropdown-sector-button-excel"
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
                      {errors.sector_category && <div className={styles.errorMessage}>{errors.sector_category}</div>}
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>3. Category</label>
                      <div className={styles.dropdownWrapper}>
                      <DropdownButton
                        id="dropdown-category-button-excel"
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
                            {getFlattenedCategories(categoryDropDownData).map((category) => (
                              <Dropdown.Item
                                key={category.id}
                                eventKey={category.id.toString()}
                                style={{
                                  fontWeight: category.level === 0 ? "bold" : "normal",
                                  paddingLeft: `${category.level * 20 + 10}px`,
                                }}
                              >
                                {category.category_name}
                              </Dropdown.Item>
                            ))}
                      </DropdownButton>
                      </div>
                      {errors.category && <div className={styles.errorMessage}>{errors.category}</div>}
                      {templateUrl && (
                        <a href={templateUrl} download className={styles.btnDownload}>
                          <IoMdCloudDownload />
                          Download Template
                        </a>
                      )}
                    </div>
                    
                    {/* <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Extension <span style={{ fontSize: "12px" }}>(Do not use &apos;.&apos; in front)</span></label>
                      <input
                        type="text"
                        className={`form-control ${styles.formInput}`}
                        id="extension"
                        value={excelData.extension}
                        onChange={handleInputChange}
                      />
                      {errors.extension && <div className={styles.errorMessage}>{errors.extension}</div>}
                    </div> */}
                  </div>
                </div>
                <div className={styles.formActions}>
                  <button
                    type="button"
                    disabled={loading || (!apiCallExcelFailed && localSubmitted)}
                    onClick={handleExcelFileSubmit}
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
                    href="/bulk-upload/add"
                    className={styles.btnCancel}
                  >
                    <MdCancel fontSize={16} className="me-1" /> Cancel
                  </Link>
                </div>
              </div>
            </Tab>

          </Tabs>
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


