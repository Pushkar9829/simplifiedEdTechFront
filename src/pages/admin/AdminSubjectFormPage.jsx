import { Navigate, useParams } from 'react-router-dom';

export default function AdminSubjectFormPage() {
  const { id } = useParams();
  if (id) return <Navigate to={`/admin/subjects?id=${encodeURIComponent(id)}`} replace />;
  return <Navigate to="/admin/subjects?new=1" replace />;
}
