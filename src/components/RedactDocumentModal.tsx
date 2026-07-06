"use client";
import React, { useState, useRef, useEffect } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb } from "pdf-lib";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { postWithAuth } from "@/utils/apiClient";
import ToastMessage from "@/components/common/Toast";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface RedactDocumentModalProps {
  show: boolean;
  onHide: () => void;
  documentId: number | null;
  documentUrl: string;
  onSuccess: () => void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  page: number;
}

const RedactDocumentModal: React.FC<RedactDocumentModalProps> = ({
  show,
  onHide,
  documentId,
  documentUrl,
  onSuccess,
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [rects, setRects] = useState<Rect[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<Partial<Rect> | null>(null);
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [pageDimensions, setPageDimensions] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    if (show) {
      setPageNumber(1);
      setRects([]);
    }
  }, [show]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentRect({ x, y, w: 0, h: 0, page: pageNumber });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPos || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentRect({
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      w: Math.abs(x - startPos.x),
      h: Math.abs(y - startPos.y),
      page: pageNumber,
    });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentRect && currentRect.w! > 5 && currentRect.h! > 5) {
      setRects([...rects, currentRect as Rect]);
    }
    setIsDrawing(false);
    setStartPos(null);
    setCurrentRect(null);
  };

  const handleSave = async () => {
    if (!documentId || rects.length === 0) return;
    setLoading(true);

    try {
      // 1. Fetch the original PDF
      const existingPdfBytes = await fetch(documentUrl).then((res) => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      // 2. Apply redactions
      for (const r of rects) {
        const page = pdfDoc.getPage(r.page - 1);
        const { width, height } = page.getSize();
        
        // Calculate scale ratio between rendered DOM and actual PDF
        const scaleX = width / pageDimensions.w;
        const scaleY = height / pageDimensions.h;

        page.drawRectangle({
          x: r.x * scaleX,
          y: height - ((r.y + r.h) * scaleY), // PDF y-axis is from bottom
          width: r.w * scaleX,
          height: r.h * scaleY,
          color: rgb(0, 0, 0),
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const file = new File([blob], "redacted.pdf", { type: "application/pdf" });

      // 3. Upload to backend
      const formData = new FormData();
      formData.append("file", file);

      const response = await postWithAuth(`redact-document/${documentId}`, formData);

      if (response.status === "success") {
        ToastMessage({ type: "success", message: "Document redacted successfully" });
        onSuccess();
        onHide();
      } else {
        ToastMessage({ type: "error", message: response.message || "Failed to redact" });
      }
    } catch (error) {
      console.error(error);
      ToastMessage({ type: "error", message: "An error occurred during redaction" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Redact Document</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ minHeight: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: 10 }}>
          <Button 
            disabled={pageNumber <= 1} 
            onClick={() => setPageNumber(pageNumber - 1)}
            className="me-2"
          >
            Previous Page
          </Button>
          <span>Page {pageNumber} of {numPages}</span>
          <Button 
            disabled={pageNumber >= (numPages || 1)} 
            onClick={() => setPageNumber(pageNumber + 1)}
            className="ms-2"
          >
            Next Page
          </Button>
          <Button 
            variant="warning" 
            className="ms-4"
            onClick={() => setRects(rects.filter(r => r.page !== pageNumber))}
          >
            Clear Page
          </Button>
        </div>

        <div style={{ position: 'relative', border: '1px solid #ccc' }}>
          <Document
            file={documentUrl}
            onLoadSuccess={onDocumentLoadSuccess}
          >
            <Page 
              pageNumber={pageNumber} 
              onRenderSuccess={(e) => setPageDimensions({ w: e.width, h: e.height })}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>

          {/* Drawing Overlay */}
          <div
            ref={overlayRef}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'crosshair', zIndex: 10 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {rects.filter(r => r.page === pageNumber).map((r, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: r.x,
                  top: r.y,
                  width: r.w,
                  height: r.h,
                  backgroundColor: 'black',
                }}
              />
            ))}
            {isDrawing && currentRect && (
              <div
                style={{
                  position: 'absolute',
                  left: currentRect.x,
                  top: currentRect.y,
                  width: currentRect.w,
                  height: currentRect.h,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid black'
                }}
              />
            )}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} disabled={loading || rects.length === 0}>
          {loading ? <Spinner size="sm" /> : "Save Redactions"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default RedactDocumentModal;
