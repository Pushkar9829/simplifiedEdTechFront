import { api, apiGet, apiPost, apiPatch, apiDelete } from './client';

export const sendOtp = (phone) => apiPost('/api/auth/send-otp', { phone });
export const verifyOtp = (payload) => apiPost('/api/auth/verify-otp', payload);
export const googleLoginApi = (payload) => apiPost('/api/auth/google', payload);
export const logoutApi = () => apiPost('/api/auth/logout', {});
export const getMe = () => apiGet('/api/auth/me');
export const updateMe = (body) => apiPatch('/api/users/me', body);

export const getStudentDashboard = () => apiGet('/api/students/dashboard');
export const listSubjects = () => apiGet('/api/subjects');
export const selectSubjects = (subjectIds) => apiPost('/api/subjects/select', { subjectIds });

export const searchTutors = (params = {}) => {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  ).toString();
  return apiGet(`/api/tutors${q ? `?${q}` : ''}`);
};
export const getTutor = (id) => apiGet(`/api/tutors/${id}`);
export const updateTutorProfile = (body) => apiPatch('/api/tutors/me', body);
export const listOfferings = () => apiGet('/api/tutors/me/offerings');
export const addOffering = (body) => apiPost('/api/tutors/me/offerings', body);
export const deleteOffering = (id) => apiDelete(`/api/tutors/me/offerings/${id}`);
export const listAvailability = () => apiGet('/api/tutors/me/availability');
export const addAvailability = (body) => apiPost('/api/tutors/me/availability', body);
export const deleteAvailability = (id) => apiDelete(`/api/tutors/me/availability/${id}`);
export const getMyVerification = () => apiGet('/api/tutors/me/verification');
export const submitVerification = (formData) =>
  api('/api/tutors/me/verification', { method: 'POST', body: formData });
export const saveVerificationReferences = (references) =>
  api('/api/tutors/me/verification/references', { method: 'PUT', body: { references } });
export const sendReferenceOtp = (idx) =>
  apiPost(`/api/tutors/me/verification/references/${idx}/send-otp`, {});
export const verifyReferenceOtp = (idx, otp) =>
  apiPost(`/api/tutors/me/verification/references/${idx}/verify-otp`, { otp });
export const removeVerificationDocument = (field, docId) =>
  apiDelete(`/api/tutors/me/verification/documents/${field}/${docId}`);
export const addTutorReview = (id, body) => apiPost(`/api/tutors/${id}/reviews`, body);
export const listStudentNotes = (studentUserId) =>
  apiGet(`/api/tutors/me/notes${studentUserId ? `?studentUserId=${studentUserId}` : ''}`);
export const addStudentNote = (body) => apiPost('/api/tutors/me/notes', body);
export const deleteStudentNote = (id) => apiDelete(`/api/tutors/me/notes/${id}`);
export const listLessonPlans = () => apiGet('/api/tutors/me/lesson-plans');
export const getLessonPlan = (id) => apiGet(`/api/tutors/me/lesson-plans/${id}`);
export const addLessonPlan = (body) => apiPost('/api/tutors/me/lesson-plans', body);
export const updateLessonPlan = (id, body) => apiPatch(`/api/tutors/me/lesson-plans/${id}`, body);
export const deleteLessonPlan = (id) => apiDelete(`/api/tutors/me/lesson-plans/${id}`);

export const listBookings = (params = {}) => apiGet(`/api/bookings${qs(params)}`);
export const createBooking = (body) => apiPost('/api/bookings', body);
export const cancelBooking = (id) => apiPost(`/api/bookings/${id}/cancel`, {});
export const rescheduleBooking = (id, body) => apiPost(`/api/bookings/${id}/reschedule`, body);
export const setAttendance = (id, attendance) =>
  apiPatch(`/api/bookings/${id}/attendance`, { attendance });
export const setMeetingStatus = (id, meetingStatus) =>
  apiPatch(`/api/bookings/${id}/meeting-status`, { meetingStatus });
export const completeBooking = (id, bodyOrFormData = {}) =>
  bodyOrFormData instanceof FormData
    ? api(`/api/bookings/${id}/complete`, { method: 'POST', body: bodyOrFormData })
    : apiPost(`/api/bookings/${id}/complete`, bodyOrFormData);
export const saveSessionReport = (id, body) =>
  api(`/api/bookings/${id}/report`, { method: 'PUT', body });
export const joinBooking = (id) => apiGet(`/api/bookings/${id}/join`);
export const getBookingSummary = (id) => apiGet(`/api/bookings/${id}/summary`);
export const getBookingChain = (id) => apiGet(`/api/bookings/${id}/chain`);
export const getStudentInsights = (studentId) => apiGet(`/api/bookings/students/${studentId}/insights`);

export const qs = (params = {}) => {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  ).toString();
  return q ? `?${q}` : '';
};

export const listCountries = (params = {}) => apiGet(`/api/catalog/countries${qs(params)}`);
export const listCurrencies = () => apiGet('/api/catalog/currencies');
export const createCountry = (body) => apiPost('/api/catalog/countries', body);
export const updateCountry = (id, body) => apiPatch(`/api/catalog/countries/${id}`, body);
export const listBoards = (params = {}) => apiGet(`/api/catalog/boards${qs(params)}`);
export const listClassLevels = (params = {}) => apiGet(`/api/catalog/class-levels${qs(params)}`);
export const createBoard = (body) => apiPost('/api/catalog/boards', body);
export const updateBoard = (id, body) => apiPatch(`/api/catalog/boards/${id}`, body);
export const createClassLevel = (body) => apiPost('/api/catalog/class-levels', body);
export const updateClassLevel = (id, body) => apiPatch(`/api/catalog/class-levels/${id}`, body);

export const listTutorVideos = () => apiGet('/api/tutors/me/videos');
export const addTutorVideo = (bodyOrFormData) => {
  if (bodyOrFormData instanceof FormData) {
    return api('/api/tutors/me/videos', { method: 'POST', body: bodyOrFormData });
  }
  return apiPost('/api/tutors/me/videos', bodyOrFormData);
};
export const deleteTutorVideo = (id) => apiDelete(`/api/tutors/me/videos/${id}`);

export const getMyWallet = () => apiGet('/api/wallets/me');
export const requestWithdraw = (amount) => apiPost('/api/wallets/withdraw', { amount });
export const myWithdrawals = () => apiGet('/api/wallets/withdrawals');
export const platformWallet = () => apiGet('/api/wallets/platform');
export const adminWithdrawals = () => apiGet('/api/wallets/admin/withdrawals');
export const reviewWithdrawal = (id, body) => apiPatch(`/api/wallets/admin/withdrawals/${id}`, body);
export const adminTopUp = (body) => apiPost('/api/wallets/admin/top-up', body);

export const listResources = (params = {}) => {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  ).toString();
  return apiGet(`/api/resources${q ? `?${q}` : ''}`);
};
export const createResource = (bodyOrFormData) => {
  if (bodyOrFormData instanceof FormData) {
    return api('/api/resources', { method: 'POST', body: bodyOrFormData });
  }
  return apiPost('/api/resources', bodyOrFormData);
};
export const bookmarkResource = (id) => apiPost(`/api/resources/${id}/bookmark`, {});
export const unbookmarkResource = (id) => apiDelete(`/api/resources/${id}/bookmark`);
export const myBookmarks = () => apiGet('/api/resources/bookmarks/me');
export const deleteResource = (id) => apiDelete(`/api/resources/${id}`);

export const listHomework = (params = {}) => {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  ).toString();
  return apiGet(`/api/homework${q ? `?${q}` : ''}`);
};
export const getHomework = (id) => apiGet(`/api/homework/${id}`);
export const createHomework = (bodyOrFormData) =>
  bodyOrFormData instanceof FormData
    ? api('/api/homework', { method: 'POST', body: bodyOrFormData })
    : apiPost('/api/homework', bodyOrFormData);
export const homeworkStats = () => apiGet('/api/homework/stats/me');
export const submitHomework = (id, formData) =>
  api(`/api/homework/${id}/submit`, { method: 'POST', body: formData });
export const gradeHomework = (id, body) => apiPost(`/api/homework/${id}/grade`, body);

export const getProgress = () => apiGet('/api/progress/me');
export const getStudentProgress = (studentId) => apiGet(`/api/progress/student/${studentId}`);
export const addStudyHours = (body) => apiPost('/api/progress/hours', body);

export const linkStudent = (body) => apiPost('/api/parents/link-student', body);
export const listChildren = () => apiGet('/api/parents/children');
export const parentDashboard = (studentId) => apiGet(`/api/parents/dashboard/${studentId}`);

export const listConversations = () => apiGet('/api/messages');
export const openConversation = (participantId) => apiPost('/api/messages/open', { participantId });
export const sendMessage = (bodyOrFormData) =>
  bodyOrFormData instanceof FormData
    ? api('/api/messages', { method: 'POST', body: bodyOrFormData })
    : apiPost('/api/messages', bodyOrFormData);
export const listMessages = (id) => apiGet(`/api/messages/${id}`);
export const markConversationRead = (id) => apiPatch(`/api/messages/${id}/read`, {});

export const listNotifications = () => apiGet('/api/notifications');
export const markNotificationRead = (id) => apiPatch(`/api/notifications/${id}/read`, {});
export const markAllNotificationsRead = () => apiPatch('/api/notifications/read-all', {});

export const listPayable = () => apiGet('/api/payments/payable');
export const paymentHistory = () => apiGet('/api/payments/history');
export const payInvoice = (id, method = 'manual') => apiPost(`/api/payments/${id}/pay`, { method });
export const listPlans = () => apiGet('/api/payments/plans');
export const subscribePlan = (planId) => apiPost('/api/payments/subscribe', { planId });
export const tutorEarnings = (params = {}) => apiGet(`/api/payments/earnings${qs(params)}`);
export const tutorEarningsSummary = () => apiGet('/api/payments/earnings/summary');

export const saveBankAccount = (body) => apiPost('/api/wallets/bank-account', body);
export const verifyBankAccount = () => apiPost('/api/wallets/bank-account/verify', {});

export const listCourses = (params = {}) => apiGet(`/api/courses${qs(params)}`);
export const listMyCourses = () => apiGet('/api/courses/mine');
export const listMyEnrollments = () => apiGet('/api/courses/enrollments/me');
export const getCourse = (id) => apiGet(`/api/courses/${id}`);
export const createCourse = (bodyOrFormData) =>
  bodyOrFormData instanceof FormData
    ? api('/api/courses', { method: 'POST', body: bodyOrFormData })
    : apiPost('/api/courses', bodyOrFormData);
export const updateCourse = (id, bodyOrFormData) =>
  bodyOrFormData instanceof FormData
    ? api(`/api/courses/${id}`, { method: 'PATCH', body: bodyOrFormData })
    : apiPatch(`/api/courses/${id}`, bodyOrFormData);
export const publishCourse = (id) => apiPost(`/api/courses/${id}/publish`, {});
export const deleteCourse = (id) => apiDelete(`/api/courses/${id}`);
export const enrollCourse = (id, body = {}) => apiPost(`/api/courses/${id}/enroll`, body);

export const purchaseResource = (id) => apiPost(`/api/resources/${id}/purchase`, {});
export const downloadResource = (id) => apiGet(`/api/resources/${id}/download`);

export const messageContacts = () => apiGet('/api/messages/contacts');

export const listProjects = (params = {}) => apiGet(`/api/projects${qs(params)}`);
export const getProject = (id) => apiGet(`/api/projects/${id}`);
export const updateProject = (id, body) => apiPatch(`/api/projects/${id}`, body);
export const createProject = (bodyOrFormData) =>
  bodyOrFormData instanceof FormData
    ? api('/api/projects', { method: 'POST', body: bodyOrFormData })
    : apiPost('/api/projects', bodyOrFormData);
export const setProjectStatus = (id, status) => apiPatch(`/api/projects/${id}/status`, { status });
export const deliverProject = (id, formData) =>
  api(`/api/projects/${id}/deliver`, { method: 'POST', body: formData });

export const adminUsers = (params = {}) => {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  ).toString();
  return apiGet(`/api/admin/users${q ? `?${q}` : ''}`);
};
export const adminSetUserStatus = (id, status) =>
  apiPatch(`/api/admin/users/${id}/status`, { status });
export const pendingVerifications = (status = 'pending') =>
  apiGet(`/api/admin/tutors/verifications${qs({ status })}`);
export const reviewVerification = (id, body) =>
  apiPatch(`/api/admin/tutors/${id}/verification`, body);
export const adminPayments = (params = {}) => {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  ).toString();
  return apiGet(`/api/admin/payments${q ? `?${q}` : ''}`);
};
export const adminSetPaymentStatus = (id, body) =>
  apiPatch(`/api/admin/payments/${id}/status`, body);
export const createPlan = (body) => apiPost('/api/admin/subscription-plans', body);
export const updatePlan = (id, body) => apiPatch(`/api/admin/subscription-plans/${id}`, body);
export const createSubject = (body) => apiPost('/api/subjects', body);
export const updateSubject = (id, body) => apiPatch(`/api/subjects/${id}`, body);

export const listAnnouncements = (params = {}) => {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  ).toString();
  return apiGet(`/api/cms/announcements${q ? `?${q}` : ''}`);
};
export const createAnnouncement = (body) => apiPost('/api/cms/announcements', body);
export const updateAnnouncement = (id, body) => apiPatch(`/api/cms/announcements/${id}`, body);
export const listCampaigns = () => apiGet('/api/cms/campaigns');
export const createCampaign = (body) => apiPost('/api/cms/campaigns', body);
export const updateCampaign = (id, body) => apiPatch(`/api/cms/campaigns/${id}`, body);
export const listTickets = (params = {}) => {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  ).toString();
  return apiGet(`/api/cms/tickets${q ? `?${q}` : ''}`);
};
export const createTicket = (body) => apiPost('/api/cms/tickets', body);
export const updateTicket = (id, body) => apiPatch(`/api/cms/tickets/${id}`, body);
export const listConfigs = () => apiGet('/api/cms/configs');
export const setConfig = (body) => apiPost('/api/cms/configs', body);

export const getResource = (id) => apiGet(`/api/resources/${id}`);
export const updateResource = (id, bodyOrFormData) =>
  bodyOrFormData instanceof FormData
    ? api(`/api/resources/${id}`, { method: 'PATCH', body: bodyOrFormData })
    : apiPatch(`/api/resources/${id}`, bodyOrFormData);

export const analyticsOverview = () => apiGet('/api/analytics/overview');
export const analyticsTutors = () => apiGet('/api/analytics/tutors');
export const analyticsTutor = (tutorId) => apiGet(`/api/analytics/tutors/${tutorId}`);
