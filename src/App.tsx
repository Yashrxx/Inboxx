import React from "react";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

/**
 * App component providing route mapping for Privacy Policy and Terms of Service.
 */
export function AppRoutes() {
  return (
    <>
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
    </>
  );
}

// Dummy Route component to satisfy JSX structure if parsed in standalone router context
function Route({ path, element }: { path: string; element: React.ReactNode }) {
  return <div data-path={path}>{element}</div>;
}

export { Privacy, Terms };
export default AppRoutes;
