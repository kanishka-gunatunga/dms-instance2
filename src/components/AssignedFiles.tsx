/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import React, {useEffect, useState} from 'react';
import {Button, Tag, Table} from 'antd';
import type {TableProps} from 'antd';
import {BsEye, BsDownload} from 'react-icons/bs';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Image from "next/image";
import {handleDownload} from "@/utils/documentFunctions";
import Link from "next/link";
import {useUserContext} from "@/context/userContext";
import {getWithAuth} from "@/utils/apiClient";
import {Modal} from "react-bootstrap";
import {IoClose} from "react-icons/io5";
import {MdOutlineCancel} from "react-icons/md";
// import styles from '../styles/AssignedFiles.module.css';

dayjs.extend(relativeTime);

export interface AssignedDocument {
    id: number;
    document_name: string;
    category_name: string;
    expiration_date: string | null;
    is_new: number;
    days_since_added: number;
}

interface AssignedFilesProps {
    documents: AssignedDocument[];
    userId: string | null;
}

interface ViewDocumentItem {
    id: number;
    name: string;
    category: { id: number; category_name: string };
    description: string;
    meta_tags: string;
    attributes: string;
    type: string;
    url: string;
    enable_external_file_view: number
}

const AssignedFiles: React.FC<AssignedFilesProps> = ({documents, userId}) => {

    const columns: TableProps<AssignedDocument>['columns'] = [
        {
            title: 'DOCUMENT',
            dataIndex: 'document_name',
            key: 'document_name',
            render: (text, record) => (
                <div>
                    <div className="d-flex align-items-center gap-2">
                        <h6 className="mb-0" style={{color: "#1A1A1A", fontSize: "14px"}}>{text}</h6>
                        {record.is_new === 1 && <Tag color="#EA580C">NEW</Tag>}
                    </div>
                    <small className="text-muted">
                        ID: {record.id} • {' '} <span
                        style={{color: "#EA580C"}}> Assigned {record.days_since_added} days ago</span>
                    </small>
                </div>
            ),
        },
        {
            title: 'CATEGORY',
            dataIndex: 'category_name',
            key: 'category_name',
            render: (category) => <Tag>{category}</Tag>,
        },
        {
            title: 'DUE DATE',
            dataIndex: 'expiration_date',
            key: 'expiration_date',
            render: (dueDate) => {
                if (!dueDate) return <small className="text-muted">N/A</small>;
                const daysLeft = dayjs(dueDate).diff(dayjs(), 'day');
                return (
                    <div>
                        <div className="" style={{color: "#1A1A1A", fontSize: "14px"}}>{dueDate}</div>
                        {/*<small className="text-muted">{daysLeft} days left</small>*/}
                        <small className={daysLeft < 0 ? 'text-danger fw-bold' : 'text-muted'}>
                            {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                        </small>
                    </div>
                );
            },
        },
        {
            title: 'ACTIONS',
            key: 'actions',
            align: 'left',
            render: (_, record) => (
                <div>
                    <Button type="text" shape="circle" icon={<BsEye/>} onClick={() =>
                        handleOpenModal("viewModel", record.id, record.document_name)
                    }/>
                    <Button type="text" shape="circle" icon={<BsDownload/>}
                            onClick={() => handleDownload(record.id, userId)}/>
                </div>
            ),
        },
    ];

    const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(
        null
    );
    const [selectedDocumentName, setSelectedDocumentName] = useState<
        string | null
    >(null);

    const [viewDocument, setViewDocument] = useState<ViewDocumentItem | null>(
        null
    );

    const [modalStates, setModalStates] = useState({
        editModel: false,
        shareDocumentModel: false,
        shareAssignUserModel: false,
        shareAssignRoleModel: false,
        shareDeleteModel: false,
        shareableLinkModel: false,
        generatedShareableLinkModel: false,
        sharableLinkSettingModel: false,
        deleteConfirmShareableLinkModel: false,
        docArchivedModel: false,
        uploadNewVersionFileModel: false,
        sendEmailModel: false,
        versionHistoryModel: false,
        commentModel: false,
        addReminderModel: false,
        removeIndexingModel: false,
        deleteFileModel: false,
        allDocShareModel: false,
        myReminderModel: false,
        reminderViewModel: false,
        reminderDeleteModel: false,
        viewModel: false,
        deleteBulkFileModel: false,
    });

    const {userName} = useUserContext();

    const newFilesCount = documents.filter(doc => doc.is_new === 1).length;

    useEffect(() => {
        if (modalStates.viewModel && selectedDocumentId !== null) {
            handleGetViewData(selectedDocumentId);
            // console.log("View Document : ", viewDocument)
        }
    }, [modalStates.viewModel, selectedDocumentId]);

    const handleGetViewData = async (id: number) => {
        try {
            const response = await getWithAuth(`view-document/${id}/${userId}`);
            const data = response.data;

            // const parsedMetaTags = JSON.parse(data.meta_tags || "[]");
            // const parsedAttributes = JSON.parse(data.attributes || "[]");

            setViewDocument(data);
            // setMetaTags(parsedMetaTags);
            // setAttributes(parsedAttributes);
        } catch (error) {
            console.error("Error :", error);
        }
    };

    const handleCloseModal = (modalName: keyof typeof modalStates) => {
        setModalStates((prev) => ({...prev, [modalName]: false}));
    };

    const handleOpenModal = (
        modalName: keyof typeof modalStates,
        documentId?: number,
        documentName?: string
    ) => {
        if (documentId) setSelectedDocumentId(documentId);
        if (documentName) setSelectedDocumentName(documentName);

        setModalStates((prev) => ({...prev, [modalName]: true}));
    };

    const currentDateTime = new Date().toLocaleString();

    return (
        <>
            <div className="bg-white h-100 calendarWrapper">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="d-flex align-items-center gap-2">
                        <Image src="/jam_document.svg" alt="icon document" width={24} height={24}/>
                        <h5 className="mb-0" style={{color: "#0A0A0A", fontSize: "16px", fontFamily: "Arial"}}>My
                            Assigned
                            Files</h5>
                        <Tag style={{color: "#EA580C"}}>{documents.length} files</Tag>
                        <Tag color="#EA580C">{newFilesCount} new</Tag>
                    </div>
                    <Link href="/assigned-documents">
                        <Button type="text" style={{
                            color: "#1A1A1A",
                            padding: "4px 10px",
                            border: "1px solid #E5E7EB",
                            borderRadius: "5px"
                        }}>View All</Button>
                    </Link>
                </div>

                {/* Ant Design Table */}
                <Table
                    columns={columns}
                    dataSource={documents}
                    pagination={false}
                    rowKey="id"
                    rowClassName={(record) => record.is_new === 1 ? 'newRow' : ''}
                />

                <div className="d-flex justify-content-between align-items-center mt-4"
                     style={{fontSize: "14px", borderTop: "1px solid #E5E7EB", paddingTop: "10px", marginTop: "10px"}}>
                    <small className="text-muted" style={{color: "#6B7280"}}>Showing {documents.length} assigned
                        files {newFilesCount > 0 &&
                            <span style={{color: "#EA580C"}}> ({newFilesCount} newly assigned)</span>}</small>
                    <Link href="/assigned-documents">
                        <Button type="text" style={{color: "#EA580C"}}>Load More Files</Button>
                    </Link>
                </div>
            </div>

            <Modal
                centered
                show={modalStates.viewModel}
                // className="large-model"
                fullscreen
                onHide={() => {
                    handleCloseModal("viewModel");
                    setSelectedDocumentId(null);
                }}
            >
                <Modal.Header>
                    <div className="d-flex w-100 justify-content-end">
                        <div className="col-11 d-flex flex-row">
                            <p className="mb-0" style={{fontSize: "16px", color: "#333"}}>
                                View Document : {viewDocument?.name || ""}
                            </p>
                        </div>
                        <div className="col-1 d-flex  justify-content-end">
                            <IoClose
                                fontSize={20}
                                style={{cursor: "pointer"}}
                                onClick={() => {
                                    handleCloseModal("viewModel");
                                    // setMetaTags([])
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
                                            <div className="text-preview" style={{width: "100%"}}>
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
                                                    style={{width: "100%", height: "500px", border: "none"}}
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
                                setSelectedDocumentId(null);
                                // setMetaTags([])
                            }}
                            className="custom-icon-button button-danger text-white bg-danger px-3 py-1 rounded"
                        >
                            <MdOutlineCancel fontSize={16} className="me-1"/> Cancel
                        </button>
                    </div>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default AssignedFiles;