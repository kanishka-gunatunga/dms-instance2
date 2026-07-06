const fs = require('fs');

function insertAfter(content, search, insert) {
  return content.replace(search, search + "\n" + insert);
}
function insertBefore(content, search, insert) {
  return content.replace(search, insert + "\n" + search);
}

function processFile(file, permissionType, fetchFunc) {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Add import
  if (!content.includes('RedactDocumentModal')) {
    content = insertAfter(content, 'import { getFlattenedCategories } from "@/utils/commonFunctions";', 'import RedactDocumentModal from "@/components/RedactDocumentModal";');
  }

  // 2. ViewDocumentItem and TableItem
  if (!content.includes('is_redacted?: number;')) {
    content = insertAfter(content, 'enable_external_file_view: number', '  is_redacted?: number;');
    content = insertAfter(content, 'document_preview: string;', '  is_redacted?: number;');
  }

  // 3. modalStates
  if (!content.includes('redactDocumentModel: false')) {
    content = insertAfter(content, 'viewOldDocumentModel: false,', '    redactDocumentModel: false,');
  }

  // 4. useEffect
  let useEff = `
  useEffect(() => {
    if (modalStates.redactDocumentModel && selectedDocumentId !== null) {
      handleGetViewData(selectedDocumentId);
    }
  }, [modalStates.redactDocumentModel, selectedDocumentId]);
`;
  if (!content.includes('modalStates.redactDocumentModel && selectedDocumentId')) {
    content = insertBefore(content, '  const handleMouseMove', useEff);
  }

  // 5. Dropdown items
  let redactItem = `
                            {item.type === "pdf" && hasPermission(permissions, "${permissionType}", "Edit Document") && (
                              <Dropdown.Item
                                onClick={() =>
                                  handleOpenModal("redactDocumentModel", item.id, item.name)
                                }
                                className="py-2"
                              >
                                <MdModeEditOutline className="me-2" />
                                Redact Document
                              </Dropdown.Item>
                            )}
`;
  let searchStr = `{hasPermission(permissions, "${permissionType}", "Edit Document") && (`;
  if (!content.includes('Redact Document')) {
    content = content.split(searchStr).join(redactItem + searchStr);
  }

  // 6. Modal component
  let modalComp = `
          {modalStates.redactDocumentModel && selectedDocumentId && viewDocument && (
            <RedactDocumentModal
              show={modalStates.redactDocumentModel}
              onHide={() => handleCloseModal("redactDocumentModel")}
              documentId={selectedDocumentId}
              documentUrl={viewDocument.url}
              onSuccess={() => ${fetchFunc}(setDummyData)}
            />
          )}
`;
  if (!content.includes('<RedactDocumentModal')) {
    content = insertBefore(content, '{/* view Modal */}', modalComp);
  }

  // 7. Undo Redaction button in viewModel
  let undoBtn = `
              {viewDocument?.is_redacted === 1 && (
                <button
                  onClick={async () => {
                    const res = await postWithAuth(\`undo-redact-document/\${viewDocument.id}\`, {});
                    if(res.status === "success") {
                       handleCloseModal("viewModel");
                       ${fetchFunc}(setDummyData);
                    }
                  }}
                  className="addButton me-2 bg-white text-dark border border-danger rounded px-3 py-1"
                >
                  <IoAdd className="me-1 fs-5" /> Undo Redaction
                </button>
              )}
`;
  if (!content.includes('Undo Redaction')) {
    content = insertAfter(content, '<div className="d-flex flex-wrap gap-3 py-3">', undoBtn);
  }

  fs.writeFileSync(file, content);
  console.log("Updated " + file);
}

processFile('src/app/assigned-documents/page.tsx', 'Assigned Documents', 'fetchAssignedDocumentsData');
processFile('src/app/all-documents/page.tsx', 'All Documents', 'fetchDocumentsData');
