export function useCurrentUser() {
  return { isAdmin: true, userId: 1, user: { id: 1, name: "Admin", email: "admin@door.com" } };
}
