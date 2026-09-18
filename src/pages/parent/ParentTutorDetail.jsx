import { useParams } from 'react-router-dom';
import StudentTutorDetail from '../student/StudentTutorDetail';

export default function ParentTutorDetail() {
  const { childId } = useParams();
  return (
    <StudentTutorDetail
      studentUserId={childId}
      paymentsPath="/parent/payments"
      walletPath="/parent/wallet"
      backPath="/parent/tutors"
    />
  );
}
