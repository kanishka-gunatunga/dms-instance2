import { CategoryDropdownItem, SectorDropdownItem } from "@/types/types";

export const formatDateForSQL = (date: string | number | Date) => {
  if (!date) return null;

  const d = new Date(date);

  if (isNaN(d.getTime())) return null; // Check if the date is invalid

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(
    2,
    "0"
  )}:${String(d.getMinutes()).padStart(2, "0")}:${String(
    d.getSeconds()
  ).padStart(2, "0")}`;
};

export const getFlattenedSectors = (
  sectors: SectorDropdownItem[]
): (SectorDropdownItem & { level: number })[] => {
  if (!sectors || !Array.isArray(sectors)) return [];

  const parentToChildren: Record<string, SectorDropdownItem[]> = {};
  const sectorMap = new Map<string, SectorDropdownItem>();

  sectors.forEach((sector) => {
    sectorMap.set(String(sector.id), sector);
  });

  const roots: SectorDropdownItem[] = [];

  sectors.forEach((sector) => {
    const parent = sector.parent_sector;
    if (parent === "none" || !parent || !sectorMap.has(String(parent))) {
      roots.push(sector);
    } else {
      const parentStr = String(parent);
      if (!parentToChildren[parentStr]) {
        parentToChildren[parentStr] = [];
      }
      parentToChildren[parentStr].push(sector);
    }
  });

  const result: (SectorDropdownItem & { level: number })[] = [];
  const visited = new Set<string>();

  const traverse = (node: SectorDropdownItem, level: number) => {
    const idStr = String(node.id);
    if (visited.has(idStr)) return;
    visited.add(idStr);

    result.push({ ...node, level });
    const children = parentToChildren[idStr] || [];
    children.forEach((child) => {
      traverse(child, level + 1);
    });
  };

  roots.forEach((root) => {
    traverse(root, 0);
  });

  return result;
};

export const getFlattenedCategories = (
  categories: CategoryDropdownItem[]
): (CategoryDropdownItem & { level: number })[] => {
  if (!categories || !Array.isArray(categories)) return [];

  const parentToChildren: Record<string, CategoryDropdownItem[]> = {};
  const categoryMap = new Map<string, CategoryDropdownItem>();

  categories.forEach((cat) => {
    categoryMap.set(String(cat.id), cat);
  });

  const roots: CategoryDropdownItem[] = [];

  categories.forEach((cat) => {
    const parent = cat.parent_category;
    if (parent === "none" || !parent || !categoryMap.has(String(parent))) {
      roots.push(cat);
    } else {
      const parentStr = String(parent);
      if (!parentToChildren[parentStr]) {
        parentToChildren[parentStr] = [];
      }
      parentToChildren[parentStr].push(cat);
    }
  });

  const result: (CategoryDropdownItem & { level: number })[] = [];
  const visited = new Set<string>();

  const traverse = (node: CategoryDropdownItem, level: number) => {
    const idStr = String(node.id);
    if (visited.has(idStr)) return;
    visited.add(idStr);

    result.push({ ...node, level });
    const children = parentToChildren[idStr] || [];
    children.forEach((child) => {
      traverse(child, level + 1);
    });
  };

  roots.forEach((root) => {
    traverse(root, 0);
  });

  return result;
};

