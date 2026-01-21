/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import React, {useEffect, useState} from 'react';
import {Button, Calendar, Tag, message, Modal as AntModal} from 'antd';
import {Modal} from "react-bootstrap";
import {BsEye, BsDownload, BsArrowRepeat} from 'react-icons/bs';
import dayjs, {Dayjs} from 'dayjs';
import Image from "next/image";
import {handleDownload} from "@/utils/documentFunctions";
import {getWithAuth, postWithAuth} from "@/utils/apiClient";
import Link from "next/link";
import {IoClose} from "react-icons/io5";
import {MdOutlineCancel} from "react-icons/md";
import {useUserContext} from "@/context/userContext";


interface NearExpiryDocument {
    id: number;
    name: string;
    category_name: string;
    sector_name: string;
    expiration_date: string;
    days_to_expire: number;
}

interface NearlyExpiredDocumentsProps {
    initialDocuments: NearExpiryDocument[];
    userId: string | null;
    isAdmin: number | undefined;
    onRefresh: () => void;
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

const getPriorityTag = (daysLeft: number) => {
    if (daysLeft <= 3) {
        return <Tag color="red">HIGH</Tag>;
    }
    if (daysLeft <= 10) {
        return <Tag color="orange">MEDIUM</Tag>;
    }
    return <Tag color="blue">LOW</Tag>;
};

const NearlyExpiredDocuments: React.FC<NearlyExpiredDocumentsProps> = ({
                                                                           initialDocuments,
                                                                           userId,
                                                                           isAdmin,
                                                                           onRefresh
                                                                       }) => {
    const [documents, setDocuments] = useState<NearExpiryDocument[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<NearExpiryDocument | null>(null);
    const [newExpiryDate, setNewExpiryDate] = useState<Dayjs | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
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

    useEffect(() => {
        setDocuments(initialDocuments);
    }, [initialDocuments]);

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

            setViewDocument(data);
        } catch (error) {
            console.error("Error :", error);
        }
    };

    const handleCloseModal = (modalName: keyof typeof modalStates) => {
        setModalStates((prev) => ({...prev, [modalName]: false}));
    };

    const handleRenewClick = (doc: NearExpiryDocument) => {
        setSelectedDocument(doc);
        setNewExpiryDate(dayjs(doc.expiration_date));
        setIsModalVisible(true);
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
        setSelectedDocument(null);
        setNewExpiryDate(undefined);
    };

    const handleConfirmRenewal = async () => {
        if (!selectedDocument || !newExpiryDate) return;

        setIsLoading(true);

        const formData = new FormData();
        formData.append('document_id', selectedDocument.id.toString());
        formData.append('expire_date', newExpiryDate.format('YYYY-MM-DD'));

        try {
            const response = await postWithAuth('renew-document', formData);

            if (response.status === 'success') {
                message.success('Document renewed successfully!');

                // setDocuments(prevDocs =>
                //     prevDocs.map(doc =>
                //         doc.id === selectedDocument.id
                //             ? {...doc, expiration_date: newExpiryDate.format('YYYY-MM-DD')}
                //             : doc
                //     )
                // );
                // handleModalCancel();

                setDocuments(prevDocs =>
                    prevDocs.map(doc =>
                        doc.id === selectedDocument.id
                            ? {...doc, expiration_date: newExpiryDate.format('YYYY-MM-DD')}
                            : doc
                    )
                );
                onRefresh();
                handleModalCancel();
            } else {
                message.error(response.message || 'Failed to renew the document.');
            }
        } catch (error) {
            console.error("Error renewing document:", error);
            message.error('An error occurred while renewing the document.');
        } finally {
            setIsLoading(false);
        }
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
            <div className="calendarWrapper" style={{marginTop: "20px", marginBottom: '90px'}}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="d-flex align-items-center gap-2">
                        <Image src="/warning.svg" alt="warning icon" width={20} height={20}/>
                        <h5 className="mb-0" style={{color: '#0A0A0A', fontSize: '16px', fontWeight: 'normal'}}>Nearly
                            Expired Documents</h5>
                        {documents.filter((doc) => doc.days_to_expire > 0).length > 0 &&
                            <Tag color="red">{documents.filter((doc) => doc.days_to_expire > 0).length} Documents</Tag>}
                    </div>
                    <Button icon={<BsArrowRepeat/>} onClick={onRefresh}>Refresh</Button>
                </div>

                <div>
                    {documents
                        .filter((doc) => doc.days_to_expire > 0)
                        .sort((a, b) => a.days_to_expire - b.days_to_expire)
                        .map((doc) => (
                            <div key={doc.id} className="documentCard">
                                <div className="row align-items-center">
                                    <div className="col-12 col-md-6 mb-3 mb-md-0">
                                        <div className="d-flex align-items-center gap-2 mb-2">
                                            <h6 className="mb-0"
                                                style={{color: '#0A0A0A', fontSize: '14px'}}>{doc.name}</h6>
                                            {getPriorityTag(doc.days_to_expire)}
                                        </div>
                                        <div className="documentMeta">
                                            <span>ID: DOC-{doc.id}</span>
                                            <span>Category: {doc.category_name}</span>
                                            <span>Sector: {doc.sector_name}</span>
                                        </div>
                                        <small
                                            className="documentMeta">Expires: {dayjs(doc.expiration_date).format('YYYY-MM-DD')}
                                            <span
                                                className="daysLeft">{doc.days_to_expire} days left</span></small>
                                    </div>
                                    <div
                                        className="col-12 col-md-6 d-flex justify-content-md-end align-items-center gap-2">
                                        <Button type="text"
                                                icon={<BsEye/>}
                                            // onClick={() => handleView(doc.id, userId)}
                                                onClick={() =>
                                                    handleOpenModal("viewModel", doc.id, doc.name)
                                                }
                                        />
                                        <Button type="text" icon={<BsDownload/>}
                                                onClick={() => handleDownload(doc.id, userId)}/>

                                        {isAdmin === 1 && (
                                            <Button onClick={() => handleRenewClick(doc)}>Renew</Button>
                                        )}
                                        {/*<Button onClick={() => handleRenewClick(doc)}>Renew</Button>*/}
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>

                <div className="d-flex justify-content-between align-items-center mt-4 text-muted"
                     style={{fontSize: '14px', borderTop: '1px solid rgba(0, 0, 0, 0.1)', paddingTop: '10px'}}>
                    <small
                        style={{color: '#717182'}}>Showing {documents.filter((doc) => doc.days_to_expire > 0).length} documents</small>
                    <Link href="/all-documents" className="text-decoration-none" style={{color: '#F54900'}}>View All
                        Expired
                        Documents</Link>
                </div>
            </div>

            <AntModal
                title={`Renew: ${selectedDocument?.name}`}
                open={isModalVisible}
                confirmLoading={isLoading}
                onOk={handleConfirmRenewal}
                onCancel={handleModalCancel}
                okText="Confirm Renewal"
            >
                {/*<p>Select a new expiry date for this document.</p>*/}
                <div className="d-flex justify-content-center p-2 border rounded">
                    <Calendar
                        fullscreen={false}
                        value={newExpiryDate}
                        onSelect={(date) => setNewExpiryDate(date)}
                        disabledDate={(current) => current && current.isBefore(dayjs(), 'day')}
                    />
                </div>
            </AntModal>

            {/*<Modal*/}
            {/*    show={isModalVisible}*/}
            {/*    onHide={handleModalCancel}*/}
            {/*    size="md"*/}
            {/*    centered*/}
            {/*>*/}
            {/*    <Modal.Header closeButton>*/}
            {/*        <Modal.Title>Renew: {selectedDocument?.name}</Modal.Title>*/}
            {/*    </Modal.Header>*/}
            {/*    <Modal.Body>*/}
            {/*        <p>Select a new expiry date for this document.</p>*/}
            {/*        <div className="d-flex justify-content-center p-2 border rounded">*/}
            {/*            <Calendar*/}
            {/*                fullscreen={false}*/}
            {/*                value={newExpiryDate}*/}
            {/*                onSelect={(date) => setNewExpiryDate(date)}*/}
            {/*                disabledDate={(current) => current && current.isBefore(dayjs(), 'day')}*/}
            {/*            />*/}
            {/*        </div>*/}
            {/*    </Modal.Body>*/}
            {/*    <Modal.Footer>*/}
            {/*        <Button variant="secondary" onClick={handleModalCancel}>*/}
            {/*            Cancel*/}
            {/*        </Button>*/}
            {/*        <Button variant="primary" onClick={handleConfirmRenewal} disabled={isLoading}>*/}
            {/*            {isLoading ? 'Confirming...' : 'Confirm Renewal'}*/}
            {/*        </Button>*/}
            {/*    </Modal.Footer>*/}
            {/*</Modal>*/}

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


                    {/*<p className="mb-1" style={{ fontSize: "14px" }}>*/}
                    {/*    Document Name : <span style={{ fontWeight: 600 }} >{viewDocument?.name || ""}</span>*/}
                    {/*</p>*/}
                    {/*<p className="mb-1" style={{ fontSize: "14px" }}>*/}
                    {/*    Category : <span style={{ fontWeight: 600 }} >{viewDocument?.category.category_name}</span>*/}
                    {/*</p>*/}
                    {/*<p className="mb-1 " style={{ fontSize: "14px" }}>*/}
                    {/*    Description : <span style={{ fontWeight: 600 }} >{viewDocument?.description || ""}</span>*/}
                    {/*</p>*/}
                    {/*<p className="mb-1 text-start w-100" style={{ fontSize: "14px" }}>*/}
                    {/*    Meta tags:{" "}*/}
                    {/*    {metaTags.map((tag, index) => (*/}
                    {/*        <span*/}
                    {/*            key={index}*/}
                    {/*            style={{*/}
                    {/*                fontWeight: 600,*/}
                    {/*                backgroundColor: "#683ab7",*/}
                    {/*                color: "white",*/}
                    {/*            }}*/}
                    {/*            className="me-2 px-3 rounded py-1 mb-2"*/}
                    {/*        >*/}
                    {/*          {tag}*/}
                    {/*        </span>*/}
                    {/*    ))}*/}
                    {/*</p>*/}
                    {/*<div className="d-flex flex-column">*/}
                    {/*    <p className="mb-1 text-start w-100" style={{ fontSize: "14px" }}>*/}
                    {/*        Attributes:*/}
                    {/*        {attributes.map((attr, index) => (*/}
                    {/*            <div key={index} style={{*/}
                    {/*                fontWeight: 600,*/}
                    {/*                textTransform: 'capitalize'*/}
                    {/*            }}*/}
                    {/*                 className="me-2 px-3 rounded py-1">*/}
                    {/*                <span style={{ fontWeight: 600 }}>{attr.attribute}:</span> {attr.value}*/}
                    {/*            </div>*/}
                    {/*        ))}*/}
                    {/*    </p>*/}
                    {/*</div>*/}

                    {/*<div className="d-flex flex-wrap gap-3 py-3">*/}
                    {/*    {hasPermission(permissions, "All Documents", "Edit Document") && (*/}
                    {/*        <button*/}
                    {/*            onClick={() =>*/}
                    {/*                handleOpenModal("editModel", viewDocument?.id, viewDocument?.name)*/}
                    {/*            }*/}
                    {/*            className="addButton me-2 bg-white text-dark border border-success rounded px-3 py-1"*/}
                    {/*        >*/}
                    {/*            <MdModeEditOutline className="me-2" />*/}
                    {/*            Edit*/}
                    {/*        </button>*/}
                    {/*    )}*/}
                    {/*    {hasPermission(permissions, "All Documents", "Share Document") && (*/}
                    {/*        <button onClick={() =>*/}
                    {/*            handleOpenModal(*/}
                    {/*                "shareDocumentModel",*/}
                    {/*                viewDocument?.id, viewDocument?.name*/}
                    {/*            )*/}
                    {/*        } className="addButton me-2 bg-white text-dark border border-success rounded px-3 py-1">*/}
                    {/*            <IoShareSocial className="me-2" />*/}
                    {/*            Share*/}
                    {/*        </button>*/}
                    {/*    )}*/}
                    {/*    {hasPermission(permissions, "All Documents", "Manage Sharable Link") && (*/}
                    {/*        <button onClick={() =>*/}
                    {/*            handleGetShareableLinkModel(viewDocument?.id || 0)*/}
                    {/*        }*/}
                    {/*                className="addButton me-2 bg-white text-dark border border-success rounded px-3 py-1">*/}
                    {/*            <IoShareSocial className="me-2" />*/}
                    {/*            Get Shareable Link*/}
                    {/*        </button>*/}
                    {/*    )}*/}
                    {/*    {hasPermission(permissions, "All Documents", "Download Document") && viewDocument?.id && (*/}
                    {/*        <button*/}
                    {/*            onClick={() => handleDownload(viewDocument?.id || 0, userId)}*/}
                    {/*            className="addButton me-2 bg-white text-dark border border-success rounded px-3 py-1">*/}
                    {/*            <MdFileDownload className="me-2" />*/}
                    {/*            Download*/}
                    {/*        </button>*/}
                    {/*    )}*/}

                    {/*    <button*/}
                    {/*        onClick={() =>*/}
                    {/*            handleOpenModal(*/}
                    {/*                "uploadNewVersionFileModel",*/}
                    {/*                viewDocument?.id, viewDocument?.name*/}
                    {/*            )*/}
                    {/*        }*/}
                    {/*        className="addButton me-2 bg-white text-dark border border-success rounded px-3 py-1"*/}
                    {/*    >*/}
                    {/*        <MdUpload className="me-2" />*/}
                    {/*        Upload New Version file*/}
                    {/*    </button>*/}
                    {/*    <button*/}
                    {/*        onClick={() =>*/}
                    {/*            handleOpenModal(*/}
                    {/*                "versionHistoryModel",*/}
                    {/*                viewDocument?.id, viewDocument?.name*/}
                    {/*            )*/}
                    {/*        }*/}
                    {/*        className="addButton me-2 bg-white text-dark border border-success rounded px-3 py-1"*/}
                    {/*    >*/}
                    {/*        <GoHistory className="me-2" />*/}
                    {/*        Version History*/}
                    {/*    </button>*/}
                    {/*    <button*/}
                    {/*        onClick={() =>*/}
                    {/*            handleOpenModal(*/}
                    {/*                "commentModel",*/}
                    {/*                viewDocument?.id, viewDocument?.name*/}
                    {/*            )*/}
                    {/*        }*/}
                    {/*        className="addButton me-2 bg-white text-dark border border-success rounded px-3 py-1"*/}
                    {/*    >*/}
                    {/*        <BiSolidCommentDetail className="me-2" />*/}
                    {/*        Comment*/}
                    {/*    </button>*/}

                    {/*    {hasPermission(permissions, "All Documents", "Add Reminder") && (*/}
                    {/*        <button*/}
                    {/*            onClick={() =>*/}
                    {/*                handleOpenModal(*/}
                    {/*                    "addReminderModel",*/}
                    {/*                    viewDocument?.id, viewDocument?.name*/}
                    {/*                )*/}
                    {/*            }*/}
                    {/*            className="addButton me-2 bg-white text-dark border border-success rounded px-3 py-1"*/}
                    {/*        >*/}
                    {/*            <BsBellFill className="me-2" />*/}
                    {/*            Add Reminder*/}
                    {/*        </button>*/}
                    {/*    )}*/}
                    {/*    {hasPermission(permissions, "All Documents", "Send Email") && (*/}
                    {/*        <button*/}
                    {/*            onClick={() =>*/}
                    {/*                handleOpenModal(*/}
                    {/*                    "sendEmailModel",*/}
                    {/*                    viewDocument?.id, viewDocument?.name*/}
                    {/*                )*/}
                    {/*            }*/}
                    {/*            className="addButton me-2 bg-white text-dark border border-success rounded px-3 py-1"*/}
                    {/*        >*/}
                    {/*            <MdEmail className="me-2" />*/}
                    {/*            Send Email*/}
                    {/*        </button>*/}
                    {/*    )}*/}
                    {/*    <button*/}
                    {/*        onClick={() =>*/}
                    {/*            handleOpenModal(*/}
                    {/*                "removeIndexingModel",*/}
                    {/*                viewDocument?.id, viewDocument?.name*/}
                    {/*            )*/}
                    {/*        }*/}
                    {/*        className="addButton me-2 bg-white text-dark border border-success rounded px-3 py-1"*/}
                    {/*    >*/}
                    {/*        <AiOutlineZoomOut className="me-2" />*/}
                    {/*        Remove From Search*/}
                    {/*    </button>*/}

                    {/*    {hasPermission(permissions, "All Documents", "Archive Document") && (*/}
                    {/*        <button*/}
                    {/*            onClick={() =>*/}
                    {/*                handleOpenModal(*/}
                    {/*                    "docArchivedModel",*/}
                    {/*                    viewDocument?.id, viewDocument?.name*/}
                    {/*                )*/}
                    {/*            }*/}
                    {/*            className="addButton me-2 bg-white text-dark border border-success rounded px-3 py-1"*/}
                    {/*        >*/}
                    {/*            <FaArchive className="me-2" />*/}
                    {/*            Archive*/}
                    {/*        </button>*/}
                    {/*    )}*/}
                    {/*    {hasPermission(permissions, "All Documents", "Delete Document") && (*/}
                    {/*        <button*/}
                    {/*            onClick={() =>*/}
                    {/*                handleOpenModal(*/}
                    {/*                    "deleteFileModel",*/}
                    {/*                    viewDocument?.id, viewDocument?.name*/}
                    {/*                )*/}
                    {/*            }*/}
                    {/*            className="addButton me-2 bg-white text-dark border border-success rounded px-3 py-1"*/}
                    {/*        >*/}
                    {/*            <AiFillDelete className="me-2" />*/}
                    {/*            Delete*/}
                    {/*        </button>*/}
                    {/*    )}*/}

                    {/*</div>*/}

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

export default NearlyExpiredDocuments;