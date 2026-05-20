/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";

import React, { useState, useRef, useEffect } from "react";
import { Modal, Button } from "react-bootstrap";
import { PDFDocument } from "pdf-lib";
import { IoClose, IoShieldCheckmarkOutline } from "react-icons/io5";
import { generateKeyPair, signData, arrayBufferToBase64, exportKey, importKey } from "@/utils/cryptography";
import { getBlobWithAuth, getWithAuth, API_BASE_URL } from "@/utils/apiClient";

interface SignaturePlacementModalProps {
  show: boolean;
  onHide: () => void;
  name: string;
  documentUrl: string;
  documentType: string;
  signatureUrl: string;
  onSave: (signedFile: File, signatureData: any[]) => void;
  onTimeExpired?: () => void;
}

const SignaturePlacementModal: React.FC<SignaturePlacementModalProps> = ({
  show,
  onHide,
  name,
  documentUrl,
  documentType,
  signatureUrl,
  onSave,
  onTimeExpired,
}) => {
  const [placements, setPlacements] = useState<{ x: number; y: number; pageIndex: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfMetadata, setPdfMetadata] = useState<{ pageCount: number; width: number; height: number } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [localSignatureUrl, setLocalSignatureUrl] = useState<string | null>(null);
  const [userKeys, setUserKeys] = useState<CryptoKeyPair | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (show && timerSeconds !== null && timerSeconds > 0 && !isProcessing) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev !== null && prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [show, timerSeconds, isProcessing]);

  useEffect(() => {
    if (timerSeconds === 0) {
      setTimerSeconds(null);
      if (onTimeExpired) {
        onTimeExpired();
      } else {
        onHide();
      }
    }
  }, [timerSeconds, onTimeExpired, onHide]);

  useEffect(() => {
    if (show) {
      setPlacements([]);
      setPreviewError(null);
      setTimerSeconds(300);
      if (documentType.toLowerCase() === "pdf") {
        loadPdfMetadata();
      }
      prefetchSignature();
      initUserKeys();
    }
    return () => {
      if (localSignatureUrl) {
        URL.revokeObjectURL(localSignatureUrl);
      }
    };
  }, [show, documentUrl, signatureUrl]);

  useEffect(() => {
    let observer: ResizeObserver;
    if (containerRef.current && show && !previewError && pdfMetadata) {
      setContainerWidth(containerRef.current.clientWidth);
      observer = new ResizeObserver((entries) => {
        if (entries[0]) {
          setContainerWidth(entries[0].contentRect.width);
        }
      });
      observer.observe(containerRef.current);
    }
    return () => {
      if (observer) observer.disconnect();
    };
  }, [show, pdfMetadata, previewError]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (draggingIndex === null || !dragOffset) return;
      e.preventDefault();

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      setPlacements(prev => {
        const updated = [...prev];
        let newPageIndex = updated[draggingIndex].pageIndex;

        if (documentType.toLowerCase() === "pdf" && pdfMetadata && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const totalContainerHeight = rect.height;
          const scaledPageHeight = totalContainerHeight / pdfMetadata.pageCount;
          let pageIdx = Math.floor(newY / scaledPageHeight);
          if (pageIdx >= pdfMetadata.pageCount) pageIdx = pdfMetadata.pageCount - 1;
          if (pageIdx < 0) pageIdx = 0;
          newPageIndex = pageIdx;
        }

        updated[draggingIndex] = { ...updated[draggingIndex], x: newX, y: newY, pageIndex: newPageIndex };
        return updated;
      });
    };

    const onMouseUp = () => {
      setDraggingIndex(null);
      setDragOffset(null);
    };

    if (draggingIndex !== null) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [draggingIndex, dragOffset, documentType, pdfMetadata]);

  const initUserKeys = async () => {
    try {
      const storedKeys = localStorage.getItem("dms_user_keys");
      if (storedKeys) {
        const { privateKeyJwk, publicKeyJwk } = JSON.parse(storedKeys);
        const priv = await importKey(privateKeyJwk, "private");
        const pub = await importKey(publicKeyJwk, "public");
        setUserKeys({ privateKey: priv, publicKey: pub });
      } else {
        const keys = await generateKeyPair();
        setUserKeys(keys);
        const privateKeyJwk = await exportKey(keys.privateKey);
        const publicKeyJwk = await exportKey(keys.publicKey);
        localStorage.setItem("dms_user_keys", JSON.stringify({ privateKeyJwk, publicKeyJwk }));
      }
    } catch (error) {
      console.error("Failed to initialize cryptographic keys:", error);
    }
  };

  const prefetchSignature = async () => {
    try {
      let signatureSource = "";

      try {
        const data = await getWithAuth("get-signature");
        if (data && (data.signature_url || data.signature || (data.data && data.data.signature))) {
          signatureSource = data.signature_url || data.signature || data.data.signature;
        } else if (data && typeof data === 'string' && data.startsWith('http')) {
          signatureSource = data;
        }
      } catch (jsonError) {
        // silent catch
      }

      if (signatureSource) {
        if (!signatureSource.startsWith("http") && !signatureSource.startsWith("data:") && !signatureSource.startsWith("blob:")) {
          const apiOrigin = new URL(API_BASE_URL).origin;
          signatureSource = `${apiOrigin}${signatureSource.startsWith("/") ? "" : "/"}${signatureSource}`;
        }
        setLocalSignatureUrl(signatureSource);
        return;
      }

      // Fallback to blob
      const blob = await getBlobWithAuth("get-signature");
      if (blob.size > 0 && blob.type.startsWith("image/")) {
        const url = URL.createObjectURL(blob);
        setLocalSignatureUrl(url);
      }
    } catch (error) {
      console.error("Signature prefetch failed:", error);
    }
  };

  const loadPdfMetadata = async () => {
    try {
      const response = await fetch(documentUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const existingPdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      if (pages.length > 0) {
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();
        setPdfMetadata({
          pageCount: pages.length,
          width,
          height
        });
      }
    } catch (error) {
      console.error("Failed to load PDF metadata:", error);
      setPreviewError("Could not load the PDF document. Please check the URL.");
    }
  };

  const handleSignatureMouseDown = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    e.preventDefault();
    const cx = e.clientX;
    const cy = e.clientY;

    setDraggingIndex(index);
    setDragOffset({
      x: cx - placements[index].x,
      y: cy - placements[index].y
    });
  };

  const handleSignatureClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const removePlacement = (index: number) => {
    setPlacements(prev => prev.filter((_, i) => i !== index));
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (!containerRef.current || isProcessing) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (documentType.toLowerCase() === "pdf" && pdfMetadata) {
      const totalContainerHeight = rect.height;
      const scaledPageHeight = totalContainerHeight / pdfMetadata.pageCount;

      let pageIndex = Math.floor(y / scaledPageHeight);

      if (pageIndex >= pdfMetadata.pageCount) {
        pageIndex = pdfMetadata.pageCount - 1;
      }
      if (pageIndex < 0) pageIndex = 0;

      setPlacements(prev => [...prev, { x, y, pageIndex }]);
    } else {
      const scrollLeft = containerRef.current.scrollLeft;
      const scrollTop = containerRef.current.scrollTop;
      setPlacements(prev => [...prev, { x: x + scrollLeft, y: y + scrollTop, pageIndex: 0 }]);
    }
  };

  const handleUndo = () => {
    setPlacements(prev => prev.slice(0, -1));
  };

  const handleSave = async () => {
    if (placements.length === 0 || !documentUrl || !signatureUrl) return;

    setIsProcessing(true);
    try {
      const type = documentType.toLowerCase();
      const signatureData: any[] = [];

      if (!containerRef.current) throw new Error("Container reference is missing");
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;

      let sigHeightOffset = 0;
      const sigImg = containerRef.current.querySelector('img[alt="signature"]') as HTMLImageElement;
      if (sigImg && sigImg.clientHeight) {
        sigHeightOffset = sigImg.clientHeight / 2;
      } else {
        sigHeightOffset = 18;
      }

      if (type === "pdf") {
        if (!pdfMetadata) throw new Error("PDF metadata is missing");

        const totalContainerHeight = containerRect.height;
        const scaledPageHeight = totalContainerHeight / pdfMetadata.pageCount;

        for (const placement of placements) {
          const pdfX = (placement.x / containerWidth) * pdfMetadata.width;

          let yOnPage = (placement.y % scaledPageHeight) + sigHeightOffset;
          if (yOnPage > scaledPageHeight) yOnPage = scaledPageHeight;

          const pdfY = (yOnPage / scaledPageHeight) * pdfMetadata.height;

          signatureData.push({
            page_number: placement.pageIndex + 1,
            x_position: Math.round(pdfX),
            y_position: Math.round(pdfY)
          });
        }
      } else {
        const imgElement = containerRef.current.querySelector('img');
        const displayWidth = imgElement?.clientWidth || containerRect.width;
        const displayHeight = imgElement?.clientHeight || containerRect.height;
        const naturalWidth = imgElement?.naturalWidth || containerWidth;
        const naturalHeight = imgElement?.naturalHeight || containerRect.height;

        for (const placement of placements) {
          const drawX = (placement.x / displayWidth) * naturalWidth;

          let adjustedY = placement.y + sigHeightOffset;
          if (adjustedY > displayHeight) adjustedY = displayHeight;

          const drawY = (adjustedY / displayHeight) * naturalHeight;

          signatureData.push({
            page_number: 1,
            x_position: Math.round(drawX),
            y_position: Math.round(drawY)
          });
        }
      }

      console.log("Calculated signatureData for placement:", signatureData);
      onSave(null as any, signatureData);
    } catch (error) {
      console.error("Coordinate calculation failed:", error);
      alert("Failed to prepare signing data. Technical error: " + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const TRANSPARENT_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  const renderContent = () => {
    if (previewError) {
      return (
        <div className="d-flex flex-column justify-content-center align-items-center bg-light" style={{ height: "600px" }}>
          <p className="text-danger mb-0">{previewError}</p>
          <small className="text-muted text-center px-4 mt-2">
            This document preview cannot be loaded directly here. <br />
            You can still click on the grey area below to place signatures blindly if you know where they should go.
          </small>
        </div>
      );
    }

    if (documentType.toLowerCase() === "pdf") {
      const aspectRatio = pdfMetadata ? (pdfMetadata.height / pdfMetadata.width) : 1.414;

      return (
        <div
          className="iframe-container"
          style={{
            height: "600px",
            overflowY: "auto",
            position: "relative",
            backgroundColor: "#525659"
          }}
        >
          <div
            ref={containerRef}
            onClick={handleContainerClick}
            style={{
              position: "relative",
              width: "100%",
              cursor: "crosshair",
              height: (pdfMetadata && containerWidth > 0)
                ? `${(containerWidth * aspectRatio * pdfMetadata.pageCount) + (pdfMetadata.pageCount * 15)}px`
                : "2000px"
            }}
          >
            <iframe
              src={`${documentUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                pointerEvents: "none",
                display: "block"
              }}
              onError={() => setPreviewError("Iframe loading failed.")}
            />
            <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 5 }} />

            {placements.map((p, i) => (
              <div
                key={i}
                onMouseDown={(e) => handleSignatureMouseDown(e, i)}
                onClick={handleSignatureClick}
                style={{
                  position: "absolute",
                  left: p.x,
                  top: p.y,
                  transform: "translate(-50%, -50%)",
                  cursor: draggingIndex === i ? "grabbing" : "grab",
                  pointerEvents: "auto",
                  zIndex: draggingIndex === i ? 20 : 10
                }}
              >
                <img
                  src={localSignatureUrl || signatureUrl}
                  alt="signature"
                  style={{ width: "100px", height: "auto", border: "1px dashed #ea580c", backgroundColor: "rgba(255,255,255,0.5)", pointerEvents: "none" }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('data:')) {
                      target.src = TRANSPARENT_PNG;
                    }
                  }}
                />
                <div
                  onClick={(e) => { e.stopPropagation(); removePlacement(i); }}
                  style={{
                    position: 'absolute', top: -10, right: -10, background: '#dc3545', color: 'white', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, fontWeight: 'bold', zIndex: 30, boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                  title="Remove signature"
                >
                  ✕
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        style={{
          position: "relative",
          cursor: "crosshair",
          border: "1px solid #ddd",
          maxHeight: "600px",
          overflowY: "auto",
          backgroundColor: "#f8f9fa"
        }}
      >
        <img
          src={documentUrl}
          alt="document"
          crossOrigin="anonymous"
          style={{ width: "100%", height: "auto", display: "block" }}
          onError={() => setPreviewError("Failed to load image preview.")}
        />
        {placements.map((p, i) => (
          <div
            key={i}
            onMouseDown={(e) => handleSignatureMouseDown(e, i)}
            onClick={handleSignatureClick}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              transform: "translate(-50%, -50%)",
              cursor: draggingIndex === i ? "grabbing" : "grab",
              pointerEvents: "auto",
              zIndex: draggingIndex === i ? 20 : 10
            }}
          >
            <img
              src={localSignatureUrl || signatureUrl}
              alt="signature"
              style={{ width: "100px", height: "auto", border: "1px dashed #ea580c", pointerEvents: "none" }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('data:')) {
                  target.src = TRANSPARENT_PNG;
                }
              }}
            />
            <div
              onClick={(e) => { e.stopPropagation(); removePlacement(i); }}
              style={{
                position: 'absolute', top: -10, right: -10, background: '#dc3545', color: 'white', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, fontWeight: 'bold', zIndex: 30, boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
              title="Remove signature"
            >
              ✕
            </div>
          </div>
        ))}
      </div>
    );
  };

  const formatTimerDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderTimerWidget = () => {
    if (timerSeconds === null) return null;
    const isDanger = timerSeconds <= 120;
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (timerSeconds / 300) * circumference;
    const color = isDanger ? "#d32f2f" : "#27337C";

    return (
      <div style={{
        position: 'fixed',
        bottom: '70px',
        right: '24px',
        width: '80px',
        height: '80px',
        backgroundColor: 'white',
        borderRadius: '50%',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        animation: isDanger ? 'pulse 1.5s infinite' : 'none',
      }}>
        <svg width="80" height="80" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r={radius} stroke="#f0f0f0" strokeWidth="4" fill="none" />
          <circle
            cx="40"
            cy="40"
            r={radius}
            stroke={color}
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div style={{
          position: 'relative',
          color: color,
          fontWeight: "bold",
          fontSize: "1.1rem"
        }}>
          {formatTimerDisplay(timerSeconds)}
        </div>
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
        `}} />
      </div>
    );
  };

  return (
    <Modal show={show} onHide={onHide} fullscreen centered className="signature-modal">
      <Modal.Header>
        <div className="d-flex w-100 justify-content-end align-items-center">
          <div className="col-11 d-flex flex-row">
            <p className="mb-0" style={{ fontSize: "16px", color: "#333", fontWeight: 500 }}>
              Place Signature : {name}
            </p>
          </div>
          <div className="col-1 d-flex justify-content-end">
            <IoClose
              fontSize={20}
              style={{ cursor: "pointer" }}
              onClick={onHide}
            />
          </div>
        </div>
      </Modal.Header>
      <Modal.Body className="p-0">
        <div className="p-2 bg-light border-bottom d-flex justify-content-between align-items-center px-4">
          <small className="text-muted font-weight-bold">
            {placements.length === 0 ? "Click on the document to place signatures." : `Placed ${placements.length} signatures.`}
          </small>
          {placements.length > 0 && (
            <Button variant="link" size="sm" onClick={handleUndo} className="p-0 text-danger text-decoration-none">
              Undo Last
            </Button>
          )}
        </div>
        {renderContent()}
        {renderTimerWidget()}
      </Modal.Body>
      <Modal.Footer>
        {userKeys && (
          <div className="me-auto d-flex align-items-center text-success" style={{ fontSize: "12px", fontWeight: 500 }}>
            <IoShieldCheckmarkOutline className="me-1" fontSize={16} />
            Cryptographic Digital Signature Active
          </div>
        )}
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={placements.length === 0 || isProcessing}
          style={{ backgroundColor: "#ea580c", borderColor: "#ea580c" }}
        >
          {isProcessing ? "Saving..." : "Save Signed Document"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SignaturePlacementModal;
