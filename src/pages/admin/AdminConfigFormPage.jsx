import { Navigate, useParams } from 'react-router-dom';

export default function AdminConfigFormPage() {
  const { key } = useParams();
  if (key) return <Navigate to={`/admin/configs?id=${encodeURIComponent(key)}`} replace />;
  return <Navigate to="/admin/configs?new=1" replace />;
}
