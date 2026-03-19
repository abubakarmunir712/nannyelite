import { Navigate } from "react-router-dom";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminOverview from "@/components/admin/AdminOverview";

// This component is now just a redirect or the dashboard overview
// The actual layout is handled by AdminLayout with nested routes
const AdminDashboardContent = () => {
  return <AdminOverview />;
};

const AdminDashboard = () => (
  <AdminGuard>
    <AdminDashboardContent />
  </AdminGuard>
);

export default AdminDashboard;
