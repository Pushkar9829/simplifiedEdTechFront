import { Navigate, useParams } from 'react-router-dom';

export default function AdminAnnouncementFormPage() {
  const { id } = useParams();
  if (id) return <Navigate to={`/admin/announcements?id=${encodeURIComponent(id)}`} replace />;
  return <Navigate to="/admin/announcements?new=1" replace />;
}
