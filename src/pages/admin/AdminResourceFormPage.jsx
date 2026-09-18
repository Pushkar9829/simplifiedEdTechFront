import { Navigate, useParams } from 'react-router-dom';

export default function AdminResourceFormPage() {
  const { id } = useParams();
  if (id) return <Navigate to={`/admin/resources?id=${encodeURIComponent(id)}`} replace />;
  return <Navigate to="/admin/resources?new=1" replace />;
}
