import { Navigate, useParams } from 'react-router-dom';

export default function AdminCampaignFormPage() {
  const { id } = useParams();
  if (id) return <Navigate to={`/admin/campaigns?id=${encodeURIComponent(id)}`} replace />;
  return <Navigate to="/admin/campaigns?new=1" replace />;
}
