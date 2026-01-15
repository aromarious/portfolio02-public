export const authClient = {
  useSession: () => ({ data: null, isPending: false, error: null }),
  signIn: {
    social: () => Promise.resolve(),
  },
  signOut: () => Promise.resolve(),
}
