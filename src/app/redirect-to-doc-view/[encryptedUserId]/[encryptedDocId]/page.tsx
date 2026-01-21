"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { getWithAuth, API_BASE_URL } from "@/utils/apiClient";
import DashboardLayout from "@/components/DashboardLayout";
import Image from "next/image";
import { IoClose } from "react-icons/io5";
import { useUserContext } from "@/context/userContext";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import {useRouter} from "next/navigation";
interface Props {
  params: {
    encryptedUserId: string;
    encryptedDocId: string;
  };
}

interface Attribute {
  attribute: string;
  value: string;
}

interface UserData {
  id: number;
  name: string;
  email: string;
  type: string;
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
  enable_external_file_view: number;
}
<style jsx>{`
  :global(.container-fluid) {
    overflow: auto !important;
  }
`}</style>
const RedirectToDocViewPage = ({ params }: Props) => {
  const { encryptedUserId, encryptedDocId } = params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewDocument, setViewDocument] = useState<ViewDocumentItem | null>(null);
  const [metaTags, setMetaTags] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const currentDateTime = new Date().toLocaleString();
  const { userName } = useUserContext();
      const router = useRouter();
  useEffect(() => {
    const autoLoginAndFetchDoc = async () => {
      try {
        let documentId = encryptedDocId;

        const res = await fetch(`${API_BASE_URL}auto-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            encrypted_user: encryptedUserId,
            encrypted_doc: encryptedDocId,
          }),
        });

        const data = await res.json();

        if (data.status !== "success") {
          setError(data.message || "Auto-login failed");
          setLoading(false);
          return;
        }

        const token: string = data.data.token;
        const user: UserData = data.data.user;
        documentId = data.data.document_id;

        const expiresIn = 1; // 1 day
        Cookies.set("authToken", token, { expires: expiresIn, secure: true, sameSite: "strict" });
        Cookies.set("userId", user.id.toString(), { expires: expiresIn });
        Cookies.set("userEmail", user.email, { expires: expiresIn });
        Cookies.set("userType", user.type, { expires: expiresIn });
        Cookies.set("userName", user.name, { expires: expiresIn });

        const userId = Cookies.get("userId");
        const docResponse = await getWithAuth(`view-document/${documentId}/${userId}`);
        const docData: ViewDocumentItem = docResponse.data;

        setViewDocument(docData);
        setMetaTags(JSON.parse(docData.meta_tags || "[]"));
        setAttributes(JSON.parse(docData.attributes || "[]"));
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to load document");
        setLoading(false);
      }
    };

    autoLoginAndFetchDoc();
  }, [encryptedUserId, encryptedDocId]);

  if (loading) return <LoadingSpinner/>;
  if (error) return <div>{error}</div>;

  return (
    <DashboardLayout>
      <div
  className="p-4"
  style={{
    height: "90vh",
    overflowY: "auto", // or overflow: "auto"
  }}
>
        <div className="d-flex justify-content-between align-items-center mb-3"> 
          <h3>View Document: {viewDocument?.name}</h3>
          <IoClose
            fontSize={24}
            style={{ cursor: "pointer" }}
            onClick={() => router.push("/all-documents")}
          />
        </div>

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
                                  style={{ width: "100%", height: "500px", border: "1px solid #ccc", background: "#fff" }}
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

        <p className="mb-1" style={{ fontSize: "14px" }}>
              Document Name :{" "}
              <span style={{ fontWeight: 600 }}>
                {viewDocument?.name || ""}
              </span>
            </p>
            <p className="mb-1" style={{ fontSize: "14px" }}>
              Category :{" "}
              <span style={{ fontWeight: 600 }}>
                {viewDocument?.category.category_name}
              </span>
            </p>
            <p className="mb-1 " style={{ fontSize: "14px" }}>
              Description :{" "}
              <span style={{ fontWeight: 600 }}>
                {viewDocument?.description || ""}
              </span>
            </p>
            <p className="mb-1 text-start w-100" style={{ fontSize: "14px" }}>
              Meta tags:{" "}
              {metaTags.map((tag, index) => (
                <span
                  key={index}
                  style={{
                    fontWeight: 600,
                    backgroundColor: "#683ab7",
                    color: "white",
                  }}
                  className="me-2 px-3 rounded py-1 mb-2"
                >
                  {tag}
                </span>
              ))}
            </p>
            <div className="d-flex flex-column">
              <p className="mb-1 text-start w-100" style={{ fontSize: "14px" }}>
                Attributes:
                {attributes.map((attr, index) => (
                  <div
                    key={index}
                    style={{
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}
                    className="me-2 px-3 rounded py-1"
                  >
                    <span style={{ fontWeight: 600 }}>{attr.attribute}:</span>{" "}
                    {attr.value}
                  </div>
                ))}
              </p>
            </div>
      </div>
    </DashboardLayout>
  );
};

export default RedirectToDocViewPage;
