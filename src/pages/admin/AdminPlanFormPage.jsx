import { Navigate, useParams } from 'react-router-dom';

export default function AdminPlanFormPage() {
  const { id } = useParams();
  if (id) return <Navigate to={`/admin/plans?id=${encodeURIComponent(id)}`} replace />;
  return <Navigate to="/admin/plans?new=1" replace />;
}
