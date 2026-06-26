"use client";

import React, { useState, useEffect } from 'react';
import { Tree, Modal, Input, Select } from 'antd';
import type { TreeDataNode } from 'antd';
import {getWithAuth, postWithAuth } from '@/utils/apiClient';
import Heading from '@/components/common/Heading';
import DashboardLayout from '@/components/DashboardLayout';
import { IoPencil, IoTrash } from 'react-icons/io5';
import styles from './sectors.module.css';

interface CategoryNode extends TreeDataNode {
  title: string | JSX.Element;
  key: string;
  parent_sector: string | null;
  children?: CategoryNode[];
}

interface SectorData {
  id: number | string;
  sector_name: string;
  parent_sector: string;
  categories?: { id: number; category_name: string }[];
}

const CategoryManagement: React.FC = () => {
  const [treeData, setTreeData] = useState<CategoryNode[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [categoryName, setCategoryName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<{ id: number; category_name: string }[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  const fetchRootNodes = async () => {
    try {
      const data = await getWithAuth("all-sectors");
      // console.log("data: ", data)
      const convertToTreeData = (nodes: SectorData[]): CategoryNode[] => {
        const map: Record<string, CategoryNode> = {};
        nodes.forEach((node) => {
          map[node.id] = {
            title: node.sector_name,
            key: node.id.toString(),
            parent_sector: node.parent_sector === 'none' ? null : node.parent_sector,
            children: [],
          };
        });

        const tree: CategoryNode[] = [];
        nodes.forEach((node) => {
          if (node.parent_sector === 'none') {
            tree.push(map[node.id]);
          } else if (map[node.parent_sector]) {
            map[node.parent_sector].children!.push(map[node.id]);
          }
        });

        return tree;
      };

      setTreeData(convertToTreeData(data));
    } catch (error) {
      console.error('Failed to fetch sectors', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await getWithAuth("categories");
      setAllCategories(data || []);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  useEffect(() => {
    fetchRootNodes();
    fetchCategories();
  }, []);

  const handleAddNode = async () => {
    try {
      const formData = new FormData();
      formData.append('parent_sector', parentId || 'none');
      formData.append('sector_name', categoryName);
      selectedCategories.forEach((catId) => {
        formData.append('category_ids[]', catId.toString());
      });
      await postWithAuth('add-sector', formData);
      setModalVisible(false);
      fetchRootNodes();
    } catch (error) {
      console.error('Failed to add node', error);
    }
  };

  const handleEditNode = async () => {
    if (!selectedKey) return;
    try {
      const formData = new FormData();
      formData.append('sector_name', categoryName);
      formData.append('parent_sector', parentId || 'none');
      selectedCategories.forEach((catId) => {
        formData.append('category_ids[]', catId.toString());
      });
      await postWithAuth(`sector-details/${selectedKey}`, formData);
      setModalVisible(false);
      fetchRootNodes();
    } catch (error) {
      console.error('Failed to edit node', error);
    }
  };

  const handleDeleteNode = async (id: string) => {
    try {
      await  getWithAuth(`delete-sector/${id}`);
      fetchRootNodes();
    } catch (error) {
      console.error('Failed to delete node', error);
    }
  };

  const showModal = async (mode: 'add' | 'edit', key: string | null = null, parentKey: string | null = null) => {
    setModalMode(mode);
    setSelectedKey(key);
    setParentId(parentKey);
    setCategoryName('');
    setSelectedCategories([]);
  
    if (mode === 'edit' && key) {
      try {
        const data: SectorData = await getWithAuth(`sector-details/${key}`);
        setCategoryName(data.sector_name); 
        if (data.categories) {
          setSelectedCategories(data.categories.map((cat) => Number(cat.id)));
        }
      } catch (error) {
        console.error('Failed to fetch sector details', error);
      }
    }
  
    setModalVisible(true);
  };
  

  return (
    <DashboardLayout>
      <div className={styles.pageWrapper}>
        <div className={styles.pageHeader}>
          <Heading text="Sectors" color="#444" />
          <button
            type="button"
            className={styles.btnAdd}
            onClick={() => showModal('add')}
          >
            Add Root Category
          </button>
        </div>
        <div className={`${styles.card} w-100`}>
          <div className={styles.treeWrapper}>
            <Tree
              checkable
              treeData={treeData}
              titleRender={(node) => (
                <div className={styles.nodeActions}>
                  <span>{node.title}</span>
                  <button
                    type="button"
                    className={styles.btnAddChild}
                    onClick={() => showModal('add', null, node.key)}
                  >
                    Add Child
                  </button>
                  <button
                    type="button"
                    className={styles.btnEdit}
                    onClick={() => showModal('edit', node.key, node.parent_sector)}
                  >
                    <IoPencil fontSize={16} className="me-1" /> Edit
                  </button>
                  <button
                    type="button"
                    className={styles.btnDanger}
                    onClick={() => handleDeleteNode(node.key)}
                  >
                    <IoTrash fontSize={16} className="me-1" /> Delete
                  </button>
                </div>
              )}
            />
            <Modal
              className={styles.modalWrapper}
              title={modalMode === 'add' ? 'Add Category' : 'Edit Category'}
              open={modalVisible}
              onOk={modalMode === 'add' ? handleAddNode : handleEditNode}
              onCancel={() => setModalVisible(false)}
            >
              <div style={{ marginBottom: 16 }}>
                <Input
                  placeholder="Enter category name"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '14px', fontWeight: 500 }}>Select Categories</label>
                <Select
                  mode="multiple"
                  allowClear
                  style={{ width: '100%' }}
                  placeholder="Select categories belonging to this sector"
                  value={selectedCategories}
                  onChange={(values) => setSelectedCategories(values)}
                  options={allCategories.map(cat => ({ label: cat.category_name, value: cat.id }))}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </div>
            </Modal>
          </div>
        </div>
      </div>
    </DashboardLayout>

  );
};

export default CategoryManagement;
