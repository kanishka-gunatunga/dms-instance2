/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import Heading from "@/components/common/Heading";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import Paragraph from "@/components/common/Paragraph";
import DashboardLayout from "@/components/DashboardLayout";
import useAuth from "@/hooks/useAuth";
import React, { useEffect, useState } from "react";
import {
  Dropdown,
  DropdownButton,
  Form,
  Modal,
  Pagination,
  Table,
} from "react-bootstrap";
import { CategoryDropdownItem, UserDropdownItem, RoleDropdownItem } from "@/types/types";
import { AiOutlineDelete } from "react-icons/ai";
import { FaPlus } from "react-icons/fa6";
import ToastMessage from "@/components/common/Toast";
import {
  MdOutlineEdit,
  MdOutlineKeyboardDoubleArrowDown,
  MdOutlineKeyboardDoubleArrowRight,
} from "react-icons/md";
import { IoAdd, IoCheckmark, IoClose, IoFolder, IoSaveOutline, IoTrashOutline } from "react-icons/io5";
import { MdCancel } from "react-icons/md";
import { MdOutlineCancel } from "react-icons/md";
import {
  fetchCategoryChildrenData,
  fetchCategoryData,
  fetchRoleData,
  fetchAndMapUserData,
} from "@/utils/dataFetchFunctions";
import { deleteWithAuth, getWithAuth, postWithAuth } from "@/utils/apiClient";
import { usePermissions } from "@/context/userPermissions";
import { hasPermission } from "@/utils/permission";
import { IoMdCloudDownload } from "react-icons/io";
import { getFlattenedCategories } from "@/utils/commonFunctions";
import { fetchAndMapUsersBySectorsData } from "@/utils/dataFetchFunctions";
import styles from "./document-categories.module.css";

interface Category {
  id: number;
  parent_category: string;
  category_name: string;
  template: string;
  status: string;
  children?: Category[];
}

const initialState = {
  parent_category: "",
  category_name: "",
  description: "",
  template: "",
  sectors: [] as any[]
};

interface FlattenedCategory extends Category {
  depth: number;
}

const flattenCategories = (
  categories: Category[],
  depth = 0,
  result: FlattenedCategory[] = [],
  parentCollapsed = false,
  collapsedMap: Record<number, boolean> = {}
): FlattenedCategory[] => {
  for (const cat of categories) {
    if (!parentCollapsed) {
      result.push({ ...cat, depth });
    }
    if (cat.children && cat.children.length > 0) {
      const isExpanded = !!collapsedMap[cat.id];
      flattenCategories(cat.children, depth + 1, result, parentCollapsed || !isExpanded, collapsedMap);
    }
  }
  return result;
};

const getDescendantIds = (catId: number, categories: Category[]): number[] => {
  const ids: number[] = [];
  const find = (list: Category[]) => {
    for (const cat of list) {
      if (cat.id === catId) {
        const collect = (node: Category) => {
          if (node.children) {
            for (const child of node.children) {
              ids.push(child.id);
              collect(child);
            }
          }
        };
        collect(cat);
        break;
      } else if (cat.children) {
        find(cat.children);
      }
    }
  };
  find(categories);
  return ids;
};

export default function AllDocTable() {
  const permissions = usePermissions();
  const [category_name, setCategoryName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("none");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [dummyData, setDummyData] = useState<Category[]>([]);
  const [categoryDropDownData, setCategoryDropDownData] = useState<
    CategoryDropdownItem[]
  >([]);
  const [collapsedRows, setCollapsedRows] = useState<Record<number, boolean>>(
    {}
  );
  const [selectedParentId, setSelectedParentId] = useState<number>();
  const [selectedItemId, setSelectedItemId] = useState<number>();
  const isAuthenticated = useAuth();
  const [editData, setEditData] = useState(initialState);
  const [attributeData, setattributeData] = useState<string[]>([]);
  const [currentAttribue, setcurrentAttribue] = useState<string>("");
  const [excelGenerated, setExcelGenerated] = useState(false);
  const [excelGeneratedLink, setExcelGeneratedLink] = useState("");
  const [errors, setErrors] = useState<any>({});
  const [userDropDownData, setUserDropDownData] = useState<UserDropdownItem[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [roleDropDownData, setRoleDropDownData] = useState<RoleDropdownItem[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  const [modalStates, setModalStates] = useState({
    addCategory: false,
    addChildCategory: false,
    editModel: false,
    deleteModel: false,
  });

  useEffect(() => {
    fetchCategoryChildrenData(setDummyData);
    fetchCategoryData(setCategoryDropDownData);
    fetchAndMapUserData(setUserDropDownData);
    fetchRoleData(setRoleDropDownData);
  }, []);

  useEffect(() => {
    // console.log("se:: id::", selectedItemId);
    if (modalStates.editModel && selectedItemId !== null) {
      fetchCategoryDetails();
    }
  }, [modalStates.editModel, selectedItemId]);

  const toggleCollapse = (id: number) => {
    setCollapsedRows((prevState) => ({
      ...prevState,
      [id]: !prevState[id],
    }));
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
  };

  const resetSigningAssignment = () => {
    setSelectedUserIds([]);
    setUsers([]);
    setSelectedRoleIds([]);
    setRoles([]);
  };

  const handleRoleSelect = (roleId: string) => {
    const selectedRole = roleDropDownData.find((role) => role.id.toString() === roleId);
    if (selectedRole && !selectedRoleIds.includes(roleId)) {
      setSelectedRoleIds([...selectedRoleIds, roleId]);
      setRoles([...roles, selectedRole.role_name]);
    }
  };

  const handleRemoveRole = (roleName: string) => {
    const roleToRemove = roleDropDownData.find((role) => role.role_name === roleName);
    if (roleToRemove) {
      setSelectedRoleIds(selectedRoleIds.filter((id) => id !== roleToRemove.id.toString()));
      setRoles(roles.filter((r) => r !== roleName));
    }
  };

  const handleUserSelect = (userId: string) => {
    const selectedUser = userDropDownData.find((user) => user.id.toString() === userId);
    if (selectedUser && !selectedUserIds.includes(userId)) {
      setSelectedUserIds([...selectedUserIds, userId]);
      setUsers([...users, selectedUser.user_name]);
    }
  };

  const handleUserRole = (userName: string) => {
    const userToRemove = userDropDownData.find((user) => user.user_name === userName);
    if (userToRemove) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userToRemove.id.toString()));
      setUsers(users.filter((r) => r !== userName));
    }
  };

  const renderSigningAssignmentFields = (idSuffix: string) => (
    <>
      <div className={`col-12 col-lg-12 d-flex flex-column pe-2 ${styles.formGroup}`}>
        <label className={styles.formLabel}>Assign roles</label>
        <div className="d-flex flex-column position-relative">
          <DropdownButton
            id={`dropdown-roles-button-${idSuffix}`}
            title={roles.length > 0 ? roles.join(", ") : "Select Roles"}
            className={`custom-dropdown-text-start text-start w-100 ${styles.dropdownToggle}`}
            onSelect={(value) => {
              if (value) handleRoleSelect(value);
            }}
          >
            {roleDropDownData.length > 0 ? (
              roleDropDownData.map((role) => (
                <Dropdown.Item key={role.id} eventKey={role.id.toString()}>
                  {role.role_name}
                </Dropdown.Item>
              ))
            ) : (
              <Dropdown.Item disabled>No Roles available</Dropdown.Item>
            )}
          </DropdownButton>
          <div className="mt-1">
            {roles.map((role, index) => (
              <span key={index} className={styles.badge}>
                {role}
                <IoClose className={styles.badgeClose} onClick={() => handleRemoveRole(role)} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  const handleEditCategorySelect = (value: string) => {
    if (value === "none") {
      setEditData((prevData) => ({
        ...prevData,
        parent_category: "none",
        category_name: "",
      }));
    } else {
      const selectedCategory = categoryDropDownData.find(
        (item) => item.id.toString() === value
      );
      setEditData((prevData) => ({
        ...prevData,
        parent_category: selectedCategory?.id.toString() || "",
        category_name: selectedCategory?.category_name || "",
      }));
    }
  };

  const handleOpenModal = (modalName: keyof typeof modalStates) => {
    setModalStates((prev) => ({ ...prev, [modalName]: true }));
  };

  const handleCloseModal = (modalName: keyof typeof modalStates) => {
    setModalStates((prev) => ({ ...prev, [modalName]: false }));
  };

  if (!isAuthenticated) {
    return <LoadingSpinner />;
  }

  const totalItems = dummyData.length;
  const totalPages = Math.ceil(dummyData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const paginatedData = dummyData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const visibleRows = flattenCategories(paginatedData, 0, [], false, collapsedRows);

  const addAttribute = () => {
    if (currentAttribue.trim() !== "" && !attributeData.includes(currentAttribue.trim())) {
      setattributeData((prev) => [...prev, currentAttribue.trim()]);
      setcurrentAttribue("");
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addAttribute();
    }
  };
  const updateAttribute = (index: number, value: string) => {
    setattributeData((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const removeAttribute = (index: number) => {
    setattributeData((prev) => prev.filter((_, i) => i !== index));
  };


  const validate = () => {
    const validationErrors: any = {};

    if (!category_name) {
      validationErrors.category_name = "Category Name is required.";
    }

    return validationErrors;
  };

  const handleAddCategory = async () => {
    // console.log("attributeData : ", attributeData)
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    const formData = new FormData();
    formData.append("parent_category", selectedCategoryId);
    formData.append("category_name", category_name || "");
    formData.append("description", description);
    formData.append("attribute_data", JSON.stringify(attributeData));
    formData.append("signing_roles", JSON.stringify(selectedRoleIds));
    formData.append("signing_users", JSON.stringify(selectedUserIds));

    try {


      formData.forEach((value, key) => {
        console.log(`${key}: ${value}`);
      });
      setErrors({});
      const response = await postWithAuth(`add-category`, formData);

      if (response.status === "success") {
        console.log("template_url : ", response.template_url)
        setExcelGenerated(true)
        setExcelGeneratedLink(response)

        // handleCloseModal("addCategory");
        setToastType("success");
        setToastMessage("Category added successfully!");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
        fetchCategoryChildrenData(setDummyData);
        fetchCategoryData(setCategoryDropDownData);
      } else {
        handleCloseModal("addCategory");
        setattributeData([]);
        setcurrentAttribue('')
        setCategoryName("")
        setSelectedCategoryId("none")
        setDescription("")
        resetSigningAssignment();
        setEditData(initialState)
        setToastType("error");
        setToastMessage("Failed to add category!");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
      }
    } catch (error) {
      setToastType("error");
      setToastMessage("Failed to add category!");
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
      // console.error("Error new version updating:", error);
    }
  };

  const validateChild = () => {
    const validationErrors: any = {};

    if (!category_name) {
      validationErrors.category_name = "Category Name is required.";
    }

    return validationErrors;
  };
  const handleAddChildCategory = async () => {
    const validationErrors = validateChild();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    try {
      const formData = new FormData();
      formData.append("parent_category", selectedCategoryId || "none");
      formData.append("category_name", category_name || "");
      formData.append("description", description);
      formData.append("attribute_data", JSON.stringify(attributeData));
      formData.append("signing_roles", JSON.stringify(selectedRoleIds));
      formData.append("signing_users", JSON.stringify(selectedUserIds));

      // formData.forEach((value, key) => {
      //   console.log(`${key}: ${value}`);
      // });

      setErrors({});
      const response = await postWithAuth(`add-category`, formData);
      if (response.status === "success") {

        console.log("template_url : ", response.template_url)
        setExcelGenerated(true)
        setExcelGeneratedLink(response.template_url)

        // handleCloseModal("addChildCategory");
        setToastType("success");
        setToastMessage("Child category added successfully!");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
        fetchCategoryChildrenData(setDummyData);
        fetchCategoryData(setCategoryDropDownData);
      } else {
        handleCloseModal("addChildCategory");
        setattributeData([]);
        setcurrentAttribue('')
        setCategoryName("")
        setSelectedCategoryId("none")
        setDescription("")
        resetSigningAssignment();
        setEditData(initialState)
        setToastType("error");
        setToastMessage("Failed to add child category!");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
      }
    } catch (error) {
      setToastType("error");
      setToastMessage("Failed to add child category!");
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
      // console.error("Error new version updating:", error);
    }
  };


  const fetchCategoryDetails = async () => {
    // console.log("edit", selectedItemId);
    try {
      const response = await getWithAuth(`category-details/${selectedItemId}`);
      if (response.status === "fail") {
        // console.log("category data fail::: ",response)
      } else {
        // console.log("Validated Attributes (Array)---", response.attributes.attributes); 
        let attributesList: string[] = [];
        if (Array.isArray(response.attributes.attributes)) {
          attributesList = response.attributes.attributes;
          // console.log("Validated (Array)---", attributesList); 

        } else if (typeof response.attributes.attributes === "string") {
          try {
            attributesList = JSON.parse(response.attributes.attributes);
          } catch (error) {
            console.error("Failed to parse attributes string:", error);
          }
        }

        // console.log("Validated Attributes (Array)---", attributes); 

        const parsedAttributes = attributesList
          .map((attr: string) => {
            const cleaned = attr.replace(/,/g, "").trim();
            // console.log("Cleaned Attribute---", cleaned); 
            return cleaned;
          })
          .filter((attr: string) => attr);

        setattributeData(parsedAttributes);
        setEditData(response);

        if (response.sectors && response.sectors.length > 0) {
            const sectorIds = response.sectors.map((s: any) => s.id);
            fetchAndMapUsersBySectorsData(sectorIds, setUserDropDownData);
        } else {
            setUserDropDownData([]);
        }

        if (response.signing_roles) {
          try {
            const roleIds = typeof response.signing_roles === "string"
              ? JSON.parse(response.signing_roles)
              : response.signing_roles;
            if (Array.isArray(roleIds)) {
              setSelectedRoleIds(roleIds);
              const mappedRoles = roleIds.map((id: any) =>
                roleDropDownData.find((r) => r.id.toString() === id.toString())?.role_name
              ).filter(Boolean) as string[];
              setRoles(mappedRoles);
            }
          } catch (e) {
            console.error("Failed to parse signing_roles:", e);
          }
        }

        if (response.signing_users) {
          try {
            const userIds = typeof response.signing_users === "string"
              ? JSON.parse(response.signing_users)
              : response.signing_users;
            if (Array.isArray(userIds)) {
              setSelectedUserIds(userIds);
              const mappedUsers = userIds.map((id: any) =>
                userDropDownData.find((u) => u.id.toString() === id.toString())?.user_name
              ).filter(Boolean) as string[];
              setUsers(mappedUsers);
            }
          } catch (e) {
            console.error("Failed to parse signing_users:", e);
          }
        }

        console.log("category data::: ", response);
      }
    } catch (error) {
      console.error("Error new version updating:", error);
    }
  };

  const validateEdit = () => {
    const validationErrors: any = {};

    if (!category_name) {
      validationErrors.category_name = "Category Name is required.";
    }

    return validationErrors;
  };

  const handleEditCategory = async () => {

    try {
      const formData = new FormData();
      formData.append("parent_category", editData.parent_category || "");
      formData.append("category_name", editData.category_name || "");
      formData.append("description", editData.description);
      formData.append("attribute_data", JSON.stringify(attributeData));
      formData.append("signing_roles", JSON.stringify(selectedRoleIds));
      formData.append("signing_users", JSON.stringify(selectedUserIds));

      formData.forEach((value, key) => {
        console.log(`${key}: ${value}`);
      });
      const response = await postWithAuth(
        `category-details/${selectedItemId}`,
        formData
      );
      if (response.status === "success") {
        handleCloseModal("editModel");
        setattributeData([]);
        setcurrentAttribue('')
        setCategoryName("")
        setSelectedCategoryId("none")
        setDescription("")
        resetSigningAssignment();
        setEditData(initialState)

        setToastType("success");
        setToastMessage("Category updated successfully!");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);

        fetchCategoryChildrenData(setDummyData);
        fetchCategoryData(setCategoryDropDownData);
      } else {
        handleCloseModal("editModel");
        setattributeData([]);
        setcurrentAttribue('')
        setCategoryName("")
        setSelectedCategoryId("none")
        setDescription("")
        resetSigningAssignment();
        setEditData(initialState)

        setToastType("error");
        setToastMessage("Failed to update category!");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
      }
    } catch (error) {
      setToastType("error");
      setToastMessage("Failed to update category!");
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
      // console.error("Error new version updating:", error);
    }
  };

  const handleDeleteCategory = async () => {
    // console.log("delete", selectedItemId);
    try {
      const response = await  getWithAuth(
        `delete-category/${selectedItemId}`
      );
      if (response.status === "success") {
        handleCloseModal("deleteModel");
        setToastType("success");
        setToastMessage("Category deleted successfully!");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
        fetchCategoryChildrenData(setDummyData);
        fetchCategoryData(setCategoryDropDownData);
      } else {
        handleCloseModal("deleteModel");
        setToastType("error");
        setToastMessage("Failed to deleted category!");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
      }
    } catch (error) {
      handleCloseModal("deleteModel");
      setToastType("error");
      setToastMessage("Failed to deleted category!");
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
      // console.error("Error new version updating:", error);
    }
  };

  const descendants = getDescendantIds(selectedItemId ? selectedItemId : 0, dummyData);
  const excludedIds = [selectedItemId ? selectedItemId : 0, ...descendants];
  const editDropdownItems = getFlattenedCategories(categoryDropDownData).filter(
    (item) => !excludedIds.includes(item.id)
  );

  return (
    <>
      <DashboardLayout>
        <div className={styles.pageWrapper}>
          <div className={styles.pageHeader}>
            <Heading text="Document Categories" color="#444" />
            {hasPermission(
              permissions,
              "Document Categories",
              "Manage Document Category"
            ) && (
              <div className="d-flex mt-2 mt-lg-0">
                <button
                  onClick={() => handleOpenModal("addCategory")}
                  className={styles.btnAdd}
                >
                  <FaPlus className="me-1" /> Add Document Category
                </button>
              </div>
            )}
          </div>
          <div className={`d-flex flex-column ${styles.card}`}>
            <div>
              <div className={`${styles.tableWrapper} custom-scroll`}>
                <Table responsive>
                  <thead className="sticky-header">
                    <tr>
                      <th className="text-center" style={{ width: "5%" }}></th>
                      <th className="text-start" style={{ width: "25%" }}>
                        Action
                      </th>
                      <th className="text-start" style={{ width: "50%" }}>
                        Name
                      </th>
                      <th className="text-start" style={{ width: "20%" }}>
                        Template
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length > 0 ? (
                      visibleRows.map((item) => (
                        <tr key={item.id} className="border-bottom">
                          <td className="border-0 text-center">
                            {item.children && item.children.length > 0 ? (
                              <button
                                onClick={() => toggleCollapse(item.id)}
                                className={styles.iconBtn}
                              >
                                {collapsedRows[item.id] ? (
                                  <MdOutlineKeyboardDoubleArrowDown
                                    fontSize={20}
                                  />
                                ) : (
                                  <MdOutlineKeyboardDoubleArrowRight
                                    fontSize={20}
                                  />
                                )}
                              </button>
                            ) : null}
                          </td>
                          <td className="border-0">
                            <div className="d-flex flex-row">
                              {hasPermission(
                                permissions,
                                "Document Categories",
                                "Manage Document Category"
                              ) && (
                                  <button
                                    onClick={() => {
                                      handleOpenModal("editModel");
                                      setSelectedItemId(item.id);
                                    }}
                                    className={`${styles.btnEdit} me-2`}
                                  >
                                    <MdOutlineEdit fontSize={16} className="me-1" />{" "}
                                    Edit
                                  </button>
                                )}

                              {hasPermission(
                                permissions,
                                "Document Categories",
                                "Manage Document Category"
                              ) && (
                                  <button
                                    onClick={() => {
                                      handleOpenModal("addChildCategory");
                                      setSelectedCategoryId(item.id.toString());
                                    }}
                                    className={`${styles.btnEdit} me-2`}
                                    style={{ backgroundColor: "#198754", borderColor: "#198754", color: "#fff" }}
                                  >
                                    <FaPlus className="me-1" /> Add Sub
                                  </button>
                                )}

                              {hasPermission(
                                permissions,
                                "Document Categories",
                                "Manage Document Category"
                              ) && (
                                  <button
                                    onClick={() => {
                                      handleOpenModal("deleteModel");
                                      setSelectedItemId(item.id);
                                    }}
                                    className={styles.btnDanger}
                                  >
                                    <AiOutlineDelete
                                      fontSize={16}
                                      className="me-1"
                                    />{" "}
                                    Delete
                                  </button>
                                )}
                            </div>
                          </td>
                          <td className="border-0">
                            <div className="d-flex flex-row align-items-center" style={{ paddingLeft: `${item.depth * 24}px` }}>
                              <IoFolder className="me-2 text-primary" style={{ minWidth: "16px" }} />
                              <span>{item.category_name}</span>
                              {/* <span className={`ms-2 mb-0 ${item.status === 'active' ? styles.badgeActive : styles.badgeInactive}`}>
                                {item.status}
                              </span> */}
                            </div>
                          </td>
                          <td className="border-0">
                            <div className="col-12 col-lg-12 d-flex flex-column pe-2">
                              {item.status === 'active' && (
                                <a href={item.template} download className={styles.btnDownload}>
                                  <IoMdCloudDownload />
                                  <span>Download Template</span>
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className={`text-start w-100 ${styles.noData}`}>
                          <Paragraph text="No data available" color="#717182" />
                        </td>
                      </tr>
                    )}
                  </tbody>
              </Table>
            </div>

            <div className={`d-flex flex-column flex-lg-row ${styles.paginationFooter}`}>
              <div className="d-flex justify-content-between align-items-center">
                <p className={`${styles.paginationLabel} mb-0`}>Items per page:</p>
                <Form.Select
                  onChange={handleItemsPerPageChange}
                  value={itemsPerPage}
                  style={{ width: "100px" }}
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
        <ToastMessage
          message={toastMessage}
          show={showToast}
          onClose={() => setShowToast(false)}
          type={toastType}
        />
      </DashboardLayout>

      {/* add parent */}
      <Modal
        centered
        show={modalStates.addCategory}
        onHide={() => {
          handleCloseModal("addCategory");
          setattributeData([]);
          setcurrentAttribue('')
          setCategoryName("")
          setSelectedCategoryId("none")
          setDescription("")
          resetSigningAssignment();
          setEditData(initialState)
        }}
      >
        <Modal.Header>
          <div className="d-flex w-100 justify-content-end">
            <div className={`col-11 d-flex flex-row align-items-center ${styles.modalHeader}`}>
              <IoFolder fontSize={20} className="me-2" />
              <p className={styles.modalTitle}>
                Add New Category
              </p>
            </div>
            <div className="col-1 d-flex justify-content-end">
              <IoClose
                fontSize={20}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  handleCloseModal("addCategory")
                  setattributeData([]);
                  setcurrentAttribue('')
                  setCategoryName("")
                  setSelectedCategoryId("none")
                  setDescription("")
                  resetSigningAssignment();
                  setEditData(initialState)
                }}
              />
            </div>
          </div>
        </Modal.Header>
        <Modal.Body className="py-3">
          <div className={`d-flex flex-column custom-scroll mb-3 ${styles.modalBody}`}>
            <div className={`col-12 col-lg-12 d-flex flex-column pe-2 ${styles.formGroup}`}>
              <p className={styles.formLabel}>
                Parent Category
              </p>
              <DropdownButton
                id="dropdown-category-button"
                title={
                  selectedCategoryId === "none"
                    ? "None"
                    : categoryDropDownData.find(
                      (item) => item.id.toString() === selectedCategoryId
                    )?.category_name || "Select Category"
                }
                className="custom-dropdown-text-start text-start w-100"
                onSelect={(value) => handleCategorySelect(value || "")}
              >
                <Dropdown.Item
                  key="none"
                  eventKey="none"
                  style={{
                    fontWeight: "bold",
                    marginLeft: "0px",
                  }}
                >
                  None
                </Dropdown.Item>
                {getFlattenedCategories(categoryDropDownData).map((category) => (
                  <Dropdown.Item
                    key={category.id}
                    eventKey={category.id.toString()}
                    style={{
                      marginLeft: "0px",
                      paddingLeft: `${category.level * 15 + 12}px`,
                    }}
                  >
                    {category.level > 0 ? "— ".repeat(category.level) : ""}{category.category_name}
                  </Dropdown.Item>
                ))}
              </DropdownButton>
            </div>
            <div className={`col-12 col-lg-12 d-flex flex-column pe-2 ${styles.formGroup}`}>
              <p className={styles.formLabel}>
                Category Name
              </p>
              <div className="input-group d-flex flex-column w-100">
                <input
                  type="text"
                  className={`form-control w-100 ${styles.formInput}`}
                  value={category_name}
                  onChange={(e) => setCategoryName(e.target.value)}
                />
                {errors.category_name && <div className={styles.formError}>{errors.category_name}</div>}
              </div>
            </div>
            <div className={`col-12 col-lg-12 d-flex flex-column pe-2 ${styles.formGroup}`}>
              <p className={styles.formLabel}>
                Description
              </p>
              <textarea
                className={`form-control ${styles.formTextarea}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className={`col-12 col-lg-12 d-flex flex-column ${styles.formGroup}`}>
              <p className={styles.formLabel}>
                Attributes
              </p>
              <div className="col-12">
                <div className={styles.attrInputGroup}>
                  <input
                    type="text"
                    value={currentAttribue}
                    onChange={(e) => setcurrentAttribue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter a attribute"
                  />
                  <button
                    onClick={addAttribute}
                    className={styles.attrAddBtn}
                  >
                    <IoAdd />
                  </button>
                </div>
                <div>
                  {attributeData.map((tag, index) => (
                    <div key={index} className={styles.attrItem}>
                      <input
                        type="text"
                        value={tag}
                        onChange={(e) =>
                          updateAttribute(index, e.target.value)
                        }
                      />
                      <button
                        onClick={() => removeAttribute(index)}
                        className={styles.attrRemoveBtn}
                      >
                        <IoTrashOutline />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {renderSigningAssignmentFields("add")}
            {
              excelGenerated && (
                <div className={`col-12 col-lg-12 d-flex flex-column ps-lg-2 pe-2 ${styles.formGroup}`}>
                  <a href={excelGeneratedLink} download className={styles.btnDownload}>
                    <IoMdCloudDownload />
                    <p className="ms-3 mb-0">Download Template</p>
                  </a>
                </div>
              )
            }
          </div>
        </Modal.Body>
        <Modal.Footer>
          <div className={styles.modalFooter}>
            <button
              onClick={() => handleAddCategory()}
              className={styles.btnSave}
            >
              <IoSaveOutline fontSize={16} className="me-1" /> Save
            </button>
            <button
              onClick={() => {
                handleCloseModal("addCategory");
                setattributeData([]);
                setcurrentAttribue('')
                setCategoryName("")
                setSelectedCategoryId("none")
                setDescription("")
                resetSigningAssignment();
                setEditData(initialState)
              }}
              className={styles.btnCancel}
            >
              <MdCancel fontSize={16} className="me-1" /> Cancel
            </button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* add child */}
      <Modal
        centered
        show={modalStates.addChildCategory}
        onHide={() => {
          handleCloseModal("addChildCategory");
          setattributeData([]);
          setcurrentAttribue('')
          setCategoryName("")
          setSelectedCategoryId("none")
          setDescription("")
          resetSigningAssignment();
          setEditData(initialState)
        }}
      >
        <Modal.Header>
          <div className="d-flex w-100 justify-content-end">
            <div className={`col-11 d-flex flex-row align-items-center ${styles.modalHeader}`}>
              <IoFolder fontSize={20} className="me-2" />
              <p className={styles.modalTitle}>
                Add New Category
              </p>
            </div>
            <div className="col-1 d-flex justify-content-end">
              <IoClose
                fontSize={20}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  handleCloseModal("addChildCategory")
                  setattributeData([]);
                  setcurrentAttribue('')
                  setCategoryName("")
                  setSelectedCategoryId("none")
                  setDescription("")
                  resetSigningAssignment();
                  setEditData(initialState)
                }}
              />
            </div>
          </div>
        </Modal.Header>
        <Modal.Body className="py-3">
          <div className={`d-flex flex-column custom-scroll mb-3 ${styles.modalBody}`}>
            <div className={`col-12 col-lg-12 d-flex flex-column ${styles.formGroup}`}>
              <p className={styles.formLabel}>
                Parent Category
              </p>
              <DropdownButton
                id="dropdown-category-button"
                title={
                  selectedCategoryId.toString() === "none"
                    ? "None"
                    : selectedCategoryId
                      ? categoryDropDownData.find(
                        (item) => item.id.toString() === selectedCategoryId
                      )?.category_name || "Select Category"
                      : "Select Category"
                }
                className="custom-dropdown-text-start text-start w-100"
                onSelect={(value) => handleCategorySelect(value || "none")}
              >
                <Dropdown.Item
                  key="none"
                  eventKey="none"
                  style={{
                    fontWeight: "bold",
                    marginLeft: "0px",
                  }}
                >
                  None
                </Dropdown.Item>
                {getFlattenedCategories(categoryDropDownData).map((category) => (
                  <Dropdown.Item
                    key={category.id}
                    eventKey={category.id.toString()}
                    style={{
                      marginLeft: "0px",
                      paddingLeft: `${category.level * 15 + 12}px`,
                    }}
                  >
                    {category.level > 0 ? "— ".repeat(category.level) : ""}{category.category_name}
                  </Dropdown.Item>
                ))}
              </DropdownButton>
            </div>
            <div className={`col-12 col-lg-12 d-flex flex-column ${styles.formGroup}`}>
              <p className={styles.formLabel}>
                Category Name
              </p>
              <div className="input-group d-flex flex-column w-100">
                <input
                  type="text"
                  className={`form-control w-100 ${styles.formInput}`}
                  value={category_name}
                  onChange={(e) => setCategoryName(e.target.value)}
                />
                {errors.category_name && <div className={styles.formError}>{errors.category_name}</div>}
              </div>
            </div>
            <div className={`col-12 col-lg-12 d-flex flex-column ${styles.formGroup}`}>
              <p className={styles.formLabel}>
                Description
              </p>
              <textarea
                className={`form-control ${styles.formTextarea}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className={`col-12 col-lg-12 d-flex flex-column ps-lg-2 pe-2 ${styles.formGroup}`}>
              <p className={styles.formLabel}>
                Attributes
              </p>
              <div className="col-12">
                <div className={styles.attrInputGroup}>
                  <input
                    type="text"
                    value={currentAttribue}
                    onChange={(e) => setcurrentAttribue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter a attribute"
                  />
                  <button
                    onClick={addAttribute}
                    className={styles.attrAddBtn}
                  >
                    <IoAdd />
                  </button>
                </div>
                <div>
                  {attributeData.map((tag, index) => (
                    <div key={index} className={styles.attrItem}>
                      <input
                        type="text"
                        value={tag}
                        onChange={(e) =>
                          updateAttribute(index, e.target.value)
                        }
                      />
                      <button
                        onClick={() => removeAttribute(index)}
                        className={styles.attrRemoveBtn}
                      >
                        <IoTrashOutline />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {renderSigningAssignmentFields("child")}
            {
              excelGenerated && (
                <div className={`col-12 col-lg-12 d-flex flex-column ps-lg-2 pe-2 ${styles.formGroup}`}>
                  <a href={excelGeneratedLink} download className={styles.btnDownload}>
                    <IoMdCloudDownload />
                    <p className="ms-3 mb-0">Download Template</p>
                  </a>
                </div>
              )
            }
          </div>
        </Modal.Body>
        <Modal.Footer>
          <div className={styles.modalFooter}>
            <button
              onClick={() => handleAddChildCategory()}
              className={styles.btnSave}
            >
              <IoSaveOutline fontSize={16} className="me-1" /> Save
            </button>
            <button
              onClick={() => {
                handleCloseModal("addChildCategory");
                setattributeData([]);
                setcurrentAttribue('')
                setCategoryName("")
                setSelectedCategoryId("none")
                setDescription("")
                resetSigningAssignment();
                setEditData(initialState)
              }}
              className={styles.btnCancel}
            >
              <MdCancel fontSize={16} className="me-1" /> Cancel
            </button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* edit */}
      <Modal
        centered
        show={modalStates.editModel}
        onHide={() => {
          handleCloseModal("editModel");
          setattributeData([]);
          setcurrentAttribue('')
          setCategoryName("")
          setSelectedCategoryId("none")
          setDescription("")
          resetSigningAssignment();
          setEditData(initialState)
        }}
      >
        <Modal.Header>
          <div className="d-flex w-100 justify-content-end">
            <div className={`col-11 d-flex flex-row align-items-center ${styles.modalHeader}`}>
              <IoFolder fontSize={20} className="me-2" />
              <p className={styles.modalTitle}>
                Edit Category
              </p>
            </div>
            <div className="col-1 d-flex justify-content-end">
              <IoClose
                fontSize={20}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  handleCloseModal("editModel")
                  setattributeData([]);
                  setcurrentAttribue('')
                  setCategoryName("")
                  setSelectedCategoryId("none")
                  setDescription("")
                  resetSigningAssignment();
                  setEditData(initialState)
                }}
              />
            </div>
          </div>
        </Modal.Header>
        <Modal.Body className="py-3">
          <div className={`d-flex flex-column custom-scroll mb-3 ${styles.modalBody}`} style={{ maxHeight: "300px" }}>
            <div className={`col-12 col-lg-12 d-flex flex-column ${styles.formGroup}`}>
              <p className={styles.formLabel}>
                Parent Category
              </p>
              <DropdownButton
                id="dropdown-category-button"
                title={
                  editData.parent_category === "none"
                    ? "None"
                    : categoryDropDownData.find(
                      (item) =>
                        item.id.toString() === editData.parent_category
                    )?.category_name || "Select Category"
                }
                className="custom-dropdown-text-start text-start w-100"
                onSelect={(value) => handleEditCategorySelect(value || "")}
              >
                <Dropdown.Item
                  key="none"
                  eventKey="none"
                  style={{
                    fontWeight: "bold",
                    marginLeft: "0px",
                  }}
                >
                  None
                </Dropdown.Item>
                {editDropdownItems.map((category) => (
                  <Dropdown.Item
                    key={category.id}
                    eventKey={category.id.toString()}
                    style={{
                      marginLeft: "0px",
                      paddingLeft: `${category.level * 15 + 12}px`,
                    }}
                  >
                    {category.level > 0 ? "— ".repeat(category.level) : ""}{category.category_name}
                  </Dropdown.Item>
                ))}
              </DropdownButton>
            </div>
            <div className={`col-12 col-lg-12 d-flex flex-column ${styles.formGroup}`}>
              <p className={styles.formLabel}>
                Category Name
              </p>
              <div className="input-group d-flex flex-column w-100">
                <input
                  type="text"
                  className={`form-control w-100 ${styles.formInput}`}
                  value={editData.category_name}
                  onChange={(e) =>
                    setEditData((prevData) => ({
                      ...prevData,
                      category_name: e.target.value,
                    }))
                  }
                />
                {errors.category_name && <div className={styles.formError}>{errors.category_name}</div>}
              </div>
            </div>
            <div className={`col-12 col-lg-12 d-flex flex-column ${styles.formGroup}`}>
              <p className={styles.formLabel}>
                Description
              </p>
              <textarea
                className={`form-control ${styles.formTextarea}`}
                value={editData.description}
                onChange={(e) =>
                  setEditData((prevData) => ({
                    ...prevData,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <div className={`col-12 col-lg-12 d-flex flex-column ps-lg-2 ${styles.formGroup}`}>
              <p className={styles.formLabel}>
                Attributes
              </p>
              <div className="col-12">
                <div className={styles.attrInputGroup}>
                  <input
                    type="text"
                    value={currentAttribue}
                    onChange={(e) => setcurrentAttribue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter a attribute"
                  />
                  <button
                    onClick={addAttribute}
                    className={styles.attrAddBtn}
                  >
                    <IoAdd />
                  </button>
                </div>
                <div>
                  {attributeData.map((tag, index) => (
                    <div key={index} className={styles.attrItem}>
                      <input
                        type="text"
                        value={tag}
                        onChange={(e) =>
                          updateAttribute(index, e.target.value)
                        }
                      />
                      <button
                        onClick={() => removeAttribute(index)}
                        className={styles.attrRemoveBtn}
                      >
                        <IoTrashOutline />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {renderSigningAssignmentFields("edit")}
            {
              editData.sectors && editData.sectors.length > 0 ? (
                <div className={`col-12 col-lg-12 d-flex flex-column pe-2 ${styles.formGroup}`}>
                  <label className={styles.formLabel}>Assign Users</label>
                  <div className="d-flex flex-column position-relative">
                    <DropdownButton
                      id={`dropdown-users-button-edit`}
                      title={users.length > 0 ? users.join(", ") : "Select Users"}
                      className={`custom-dropdown-text-start text-start w-100 ${styles.dropdownToggle}`}
                      onSelect={(value) => {
                        if (value) handleUserSelect(value);
                      }}
                    >
                      {userDropDownData.length > 0 ? (
                        userDropDownData.map((user) => (
                          <Dropdown.Item key={user.id} eventKey={user.id.toString()}>
                            {user.user_name}
                          </Dropdown.Item>
                        ))
                      ) : (
                        <Dropdown.Item disabled>No users available for these sectors</Dropdown.Item>
                      )}
                    </DropdownButton>
                    <div className="mt-1">
                      {users.map((user, index) => (
                        <span key={index} className={styles.badge}>
                          {user}
                          <IoClose className={styles.badgeClose} onClick={() => handleUserRole(user)} />
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`col-12 col-lg-12 d-flex flex-column pe-2 ${styles.formGroup}`}>
                  <label className={styles.formLabel}>Assign Users</label>
                  <div className="d-flex flex-column position-relative mt-2">
                    <Paragraph text="First assign the category to a sector to assign users" color="#dc3545" />
                  </div>
                </div>
              )
            }
            {
              editData.template && (
                <div className={`col-12 col-lg-12 d-flex flex-column mt-2 pe-2 ${styles.formGroup}`}>
                  <a href={editData.template} download className={styles.btnDownload}>
                    <IoMdCloudDownload />
                    <p className="ms-3 mb-0">Download Template</p>
                  </a>
                </div>
              )
            }

          </div>
        </Modal.Body>
        <Modal.Footer>
          <div className={styles.modalFooter}>
            <button
              onClick={() => handleEditCategory()}
              className={styles.btnSave}
            >
              <IoSaveOutline fontSize={16} className="me-1" /> Save
            </button>
            <button
              onClick={() => {
                handleCloseModal("editModel");
                setattributeData([]);
                setcurrentAttribue('')
                setCategoryName("")
                setSelectedCategoryId("none")
                setDescription("")
                resetSigningAssignment();
                setEditData(initialState)
              }}
              className={styles.btnCancel}
            >
              <MdCancel fontSize={16} className="me-1" /> Cancel
            </button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* delete */}
      <Modal
        centered
        show={modalStates.deleteModel}
        onHide={() => handleCloseModal("deleteModel")}
      >
        <Modal.Body>
          <div className="d-flex flex-column">
            <div className="d-flex w-100 justify-content-end">
              <div className="col-11 d-flex flex-row py-3">
                <p className={`mb-0 ${styles.deleteConfirmText}`}>
                  Are you sure you want to delete?
                </p>
              </div>
              <div className="col-1 d-flex justify-content-end">
                <IoClose
                  fontSize={20}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleCloseModal("deleteModel")}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                onClick={() => handleDeleteCategory()}
                className={styles.btnSave}
              >
                <IoCheckmark fontSize={16} className="me-1" /> Yes
              </button>
              <button
                onClick={() => {
                  handleCloseModal("deleteModel");
                }}
                className={styles.btnCancel}
              >
                <MdCancel fontSize={16} className="me-1" /> No
              </button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}
