export const hasPermission = (
  permissions: { [key: string]: string[] },
  group: string,
  permission?: string
): boolean => {
  if (!permission) return !!permissions[group];
  return permissions[group]?.includes(permission) || false;
};
