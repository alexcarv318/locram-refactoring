export function buildNewBaseDatabasePath(
  locramHome: string,
  slug: string,
  timestamp: number,
): string {
  const normalizedHome = locramHome.replace(/[\\/]+$/, "");
  return `${normalizedHome}/bases/${slug}-${timestamp}.db`;
}
