/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Heading from "@/components/common/Heading";
import DashboardLayout from "@/components/DashboardLayout";
import useAuth from "@/hooks/useAuth";
import React, { useEffect, useState } from "react";
import { DropdownButton, Dropdown } from "react-bootstrap";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { RoleDropdownItem, RoleUserItem } from "@/types/types";
import { fetchAndMapRoleUserData, fetchRoleData } from "@/utils/dataFetchFunctions";
import { getWithAuth, postWithAuth } from "@/utils/apiClient";
import { usePermissions } from "@/context/userPermissions";
import { hasPermission } from "@/utils/permission";
import styles from "./role-user.module.css";

export default function AllDocTable() {
  const isAuthenticated = useAuth();
  const permissions = usePermissions();
  const [roleDropDownData, setRoleDropDownData] = useState<RoleDropdownItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<{ id: number | null; name: string }>({
    id: null,
    name: 'Select Role',
  });
  const [allUsers, setAllUsers] = useState<RoleUserItem[]>([]);
  const [roleUsers, setRoleUsers] = useState<RoleUserItem[]>([]);
  const [dragOverTarget, setDragOverTarget] = useState<'all' | 'role' | null>(null);

  const fetchUserByRoleData = async (roleId: number) => {
    try {
      const response = await getWithAuth(`users-by-role/${roleId}`);

      const mapUserData = (users: any[]): RoleUserItem[] => {
        return users.map((user: any) => ({
          id: user.id,
          email: user.email,
          firstName: user.user_details?.first_name || "N/A",
          lastName: user.user_details?.last_name || "N/A",
          mobileNumber: user.user_details?.mobile_no?.toString() || "N/A",
        }));
      };

      const mappedUsersWithoutRole = mapUserData(response.users_without_role);
      const mappedUsersWithRole = mapUserData(response.users_with_role);

      setAllUsers(mappedUsersWithoutRole);
      setRoleUsers(mappedUsersWithRole);

    } catch (error) {
      console.error("Failed to fetch role user data:", error);
    }
  };


  const handleAddRoleUser = async (userId: number, roleId: string) => {
    try {
      const formData = new FormData();
      formData.append('user', userId.toString());
      formData.append('role', JSON.stringify([roleId]));
      
      const response = await postWithAuth(`role-user`, formData);
    } catch (error) {
      console.error(error);
    }
  };


  const handleRemoveRoleUser = async (userId: number, roleId: string) => {
    try {
      const formData = new FormData();
      formData.append('user', userId.toString());
      formData.append('role', JSON.stringify([roleId]));
      const response = await postWithAuth(`remove-role-user`, formData);
    } catch (error) {
      console.error(error);
    }
  };


  useEffect(() => {
    fetchRoleData(setRoleDropDownData);
    fetchAndMapRoleUserData(setAllUsers);
  }, []);

  const handleRoleSelect = (roleId: number, roleName: string) => {
    setSelectedRole({ id: roleId, name: roleName });
    fetchUserByRoleData(roleId);
  };

  const moveUserToRole = (user: RoleUserItem) => {
    if (selectedRole.id !== null) {
      setRoleUsers((prev) => [...prev, user]);
      setAllUsers((prev) => prev.filter((u) => u.id !== user.id));
      handleAddRoleUser(user.id, selectedRole.id.toString());
    } else {
    }
  };

  const moveUserToAll = (user: RoleUserItem) => {
    if (selectedRole.id !== null) {
      setAllUsers((prev) => [...prev, user]);
      setRoleUsers((prev) => prev.filter((u) => u.id !== user.id));
      handleRemoveRoleUser(user.id, selectedRole.id.toString());
    } else {
    }
  };



  const handleDragStart = (e: React.DragEvent, user: RoleUserItem) => {
    e.dataTransfer.setData('user', JSON.stringify(user));
  };

  const handleDrop = (e: React.DragEvent, target: 'role' | 'all') => {
    setDragOverTarget(null);
    const draggedUser: RoleUserItem = JSON.parse(e.dataTransfer.getData('user'));

    if (target === 'role') {
      moveUserToRole(draggedUser);
    } else {
      moveUserToAll(draggedUser);
    }
  };

  const handleDragOver = (e: React.DragEvent, target?: 'role' | 'all') => {
    e.preventDefault();
    if (target) setDragOverTarget(target);
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  if (!isAuthenticated) {
    return <LoadingSpinner />;
  }

  return (
    <DashboardLayout>
      <div className={styles.pageWrapper}>
        <div className={styles.pageHeader}>
          <Heading text="Role User" color="#444" />
        </div>

        <div className={styles.card}>
          <div className={styles.dropdownSection}>
            <label className={styles.formLabel}>Select Role</label>
            <DropdownButton
              id="dropdown-category-button"
              title={selectedRole.name}
            >
              {roleDropDownData.length > 0 ? (
                roleDropDownData.map((role) => (
                  <Dropdown.Item
                    key={role.id}
                    onClick={() => handleRoleSelect(role.id, role.role_name)}
                  >
                    {role.role_name}
                  </Dropdown.Item>
                ))
              ) : (
                <Dropdown.Item disabled>No roles available</Dropdown.Item>
              )}
            </DropdownButton>
            <p className={styles.noteText}>
              Note: To add a user to a role, drag them from All Users to Role Users.
            </p>
          </div>

          {hasPermission(permissions, "User", "Assign User Role") && (
            <div className={styles.columnsRow}>
              <div
                className={`${styles.column} ${dragOverTarget === 'all' ? styles.dragOver : ''}`}
                onDrop={(e) => handleDrop(e, 'all')}
                onDragOver={(e) => handleDragOver(e, 'all')}
                onDragLeave={handleDragLeave}
              >
                <h6 className={styles.columnTitle}>All Users</h6>
                {allUsers.length > 0 ? (
                  allUsers.map((user) => (
                    <div
                      key={user.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, user)}
                      className={styles.userCard}
                    >
                      {`${user.firstName} ${user.lastName} (${user.email})`}
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>No users available</div>
                )}
              </div>

              <div
                className={`${styles.column} ${dragOverTarget === 'role' ? styles.dragOver : ''}`}
                onDrop={(e) => handleDrop(e, 'role')}
                onDragOver={(e) => handleDragOver(e, 'role')}
                onDragLeave={handleDragLeave}
              >
                <h6 className={styles.columnTitle}>Role Users</h6>
                {roleUsers.length > 0 ? (
                  roleUsers.map((user) => (
                    <div
                      key={user.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, user)}
                      className={styles.userCard}
                    >
                      {`${user.firstName} ${user.lastName} (${user.email})`}
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>No role users assigned</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

