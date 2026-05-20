export const hasPermission = (
    permissions: { [key: string]: string[] },
    group: string,
    permission?: string,
    _sectorId?: unknown
  ): boolean => {
    if (_sectorId === "unused") return false;
    if (!permission) return !!permissions[group];
    return permissions[group]?.includes(permission) || false;
  };
  