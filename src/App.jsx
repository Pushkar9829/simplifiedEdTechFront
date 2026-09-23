import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import StudentLayout from './layouts/StudentLayout';
import TutorLayout from './layouts/TutorLayout';
import ParentLayout from './layouts/ParentLayout';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/auth/LoginPage';
import ProfilePage from './pages/shared/ProfilePage';
import NotificationsPage from './pages/shared/NotificationsPage';
import MessagesPage from './pages/shared/MessagesPage';
import PaymentsPage from './pages/shared/PaymentsPage';
import WalletPage from './pages/shared/WalletPage';
import ParentTutors from './pages/parent/ParentTutors';
import ParentTutorDetail from './pages/parent/ParentTutorDetail';
import AdminCatalogPage from './pages/admin/AdminCatalogPage';
import AdminWalletsPage from './pages/admin/AdminWalletsPage';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentSubjects from './pages/student/StudentSubjects';
import StudentTutors from './pages/student/StudentTutors';
import StudentTutorDetail from './pages/student/StudentTutorDetail';
import StudentBookings from './pages/student/StudentBookings';
import StudentResources from './pages/student/StudentResources';
import StudentHomework from './pages/student/StudentHomework';
import StudentHomeworkDetailPage from './pages/student/StudentHomeworkDetailPage';
import StudentProgress from './pages/student/StudentProgress';
import StudentProgressLogPage from './pages/student/StudentProgressLogPage';
import TutorDashboard from './pages/tutor/TutorDashboard';
import TutorAvailability from './pages/tutor/TutorAvailability';
import TutorBookings from './pages/tutor/TutorBookings';
import TutorHomework from './pages/tutor/TutorHomework';
import TutorHomeworkFormPage from './pages/tutor/TutorHomeworkFormPage';
import TutorStudents from './pages/tutor/TutorStudents';
import TutorLessonPlans from './pages/tutor/TutorLessonPlans';
import TutorLessonPlanFormPage from './pages/tutor/TutorLessonPlanFormPage';
import TutorResources from './pages/tutor/TutorResources';
import TutorResourceFormPage from './pages/tutor/TutorResourceFormPage';
import TutorEarnings from './pages/tutor/TutorEarnings';
import TutorVerification from './pages/tutor/TutorVerification';
import TutorCourses from './pages/tutor/TutorCourses';
import TutorCourseFormPage from './pages/tutor/TutorCourseFormPage';
import TutorProjects from './pages/tutor/TutorProjects';
import TutorProjectFormPage from './pages/tutor/TutorProjectFormPage';
import TutorProjectDetailPage from './pages/tutor/TutorProjectDetailPage';
import TutorCourseDetailPage from './pages/tutor/TutorCourseDetailPage';
import StudentProjects from './pages/student/StudentProjects';
import StudentCourses from './pages/student/StudentCourses';
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentChildrenPage from './pages/parent/ParentChildrenPage';
import ParentLink from './pages/parent/ParentLink';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminVerificationsPage from './pages/admin/AdminVerificationsPage';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';
import AdminSubjectsPage from './pages/admin/AdminSubjectsPage';
import AdminSubjectFormPage from './pages/admin/AdminSubjectFormPage';
import AdminResourcesPage from './pages/admin/AdminResourcesPage';
import AdminResourceFormPage from './pages/admin/AdminResourceFormPage';
import AdminPlansPage from './pages/admin/AdminPlansPage';
import AdminPlanFormPage from './pages/admin/AdminPlanFormPage';
import AdminAnnouncementsPage from './pages/admin/AdminAnnouncementsPage';
import AdminAnnouncementFormPage from './pages/admin/AdminAnnouncementFormPage';
import AdminCampaignsPage from './pages/admin/AdminCampaignsPage';
import AdminCampaignFormPage from './pages/admin/AdminCampaignFormPage';
import AdminConfigsPage from './pages/admin/AdminConfigsPage';
import AdminConfigFormPage from './pages/admin/AdminConfigFormPage';
import AdminTicketsPage from './pages/admin/AdminTicketsPage';

function HomeRedirect() {
  const { user, loading, homePath } = useAuth();
  if (loading) return <div className="empty">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homePath} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<ProtectedRoute roles={['student']} />}>
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="subjects" element={<StudentSubjects />} />
          <Route path="tutors" element={<StudentTutors />} />
          <Route path="tutors/:id" element={<StudentTutorDetail />} />
          <Route path="bookings" element={<StudentBookings />} />
          <Route path="resources" element={<StudentResources />} />
          <Route path="homework" element={<StudentHomework />} />
          <Route path="homework/:id" element={<StudentHomeworkDetailPage />} />
          <Route path="projects" element={<StudentProjects />} />
          <Route path="courses" element={<StudentCourses />} />
          <Route path="progress" element={<StudentProgress />} />
          <Route path="progress/log" element={<StudentProgressLogPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="wallet" element={<WalletPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['tutor']} />}>
        <Route path="/tutor" element={<TutorLayout />}>
          <Route index element={<TutorDashboard />} />
          <Route path="availability" element={<TutorAvailability />} />
          <Route path="bookings" element={<TutorBookings />} />
          <Route path="homework" element={<TutorHomework />} />
          <Route path="homework/new" element={<TutorHomeworkFormPage />} />
          <Route path="projects" element={<TutorProjects />} />
          <Route path="projects/new" element={<TutorProjectFormPage />} />
          <Route path="projects/:id" element={<TutorProjectDetailPage />} />
          <Route path="projects/:id/edit" element={<TutorProjectFormPage />} />
          <Route path="students" element={<TutorStudents />} />
          <Route path="lesson-plans" element={<TutorLessonPlans />} />
          <Route path="lesson-plans/new" element={<TutorLessonPlanFormPage />} />
          <Route path="lesson-plans/:id/edit" element={<TutorLessonPlanFormPage />} />
          <Route path="courses" element={<TutorCourses />} />
          <Route path="courses/new" element={<TutorCourseFormPage />} />
          <Route path="courses/:id" element={<TutorCourseDetailPage />} />
          <Route path="courses/:id/edit" element={<TutorCourseFormPage />} />
          <Route path="resources" element={<TutorResources />} />
          <Route path="resources/new" element={<TutorResourceFormPage />} />
          <Route path="resources/:id/edit" element={<TutorResourceFormPage />} />
          <Route path="earnings" element={<TutorEarnings />} />
          <Route path="wallet" element={<WalletPage />} />
          <Route path="verification" element={<TutorVerification />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage tutorFields />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['parent']} />}>
        <Route path="/parent" element={<ParentLayout />}>
          <Route index element={<ParentDashboard />} />
          <Route path="children" element={<ParentChildrenPage />} />
          <Route path="children/link" element={<ParentLink />} />
          <Route path="link" element={<ParentLink />} />
          <Route path="tutors" element={<ParentTutors />} />
          <Route path="tutors/:childId/:id" element={<ParentTutorDetail />} />
          <Route path="bookings" element={<StudentBookings />} />
          <Route path="projects" element={<StudentProjects />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="wallet" element={<WalletPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminAnalyticsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="verifications" element={<AdminVerificationsPage />} />
          <Route path="payments" element={<AdminPaymentsPage />} />
          <Route path="wallets" element={<AdminWalletsPage />} />
          <Route path="catalog" element={<AdminCatalogPage />} />
          <Route path="subjects" element={<AdminSubjectsPage />} />
          <Route path="subjects/new" element={<AdminSubjectFormPage />} />
          <Route path="subjects/:id/edit" element={<AdminSubjectFormPage />} />
          <Route path="resources" element={<AdminResourcesPage />} />
          <Route path="resources/new" element={<AdminResourceFormPage />} />
          <Route path="resources/:id/edit" element={<AdminResourceFormPage />} />
          <Route path="plans" element={<AdminPlansPage />} />
          <Route path="plans/new" element={<AdminPlanFormPage />} />
          <Route path="plans/:id/edit" element={<AdminPlanFormPage />} />
          <Route path="announcements" element={<AdminAnnouncementsPage />} />
          <Route path="announcements/new" element={<AdminAnnouncementFormPage />} />
          <Route path="announcements/:id/edit" element={<AdminAnnouncementFormPage />} />
          <Route path="campaigns" element={<AdminCampaignsPage />} />
          <Route path="campaigns/new" element={<AdminCampaignFormPage />} />
          <Route path="campaigns/:id/edit" element={<AdminCampaignFormPage />} />
          <Route path="configs" element={<AdminConfigsPage />} />
          <Route path="configs/new" element={<AdminConfigFormPage />} />
          <Route path="configs/:key/edit" element={<AdminConfigFormPage />} />
          <Route path="tickets" element={<AdminTicketsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
