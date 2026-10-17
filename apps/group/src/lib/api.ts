import type {
  AssessmentAnswers,
  AuthResponse,
  AuthTokens,
  ChallengeScoreResult,
  ChallengeSubmissionDto,
  CheckoutDto,
  CartResponse,
  OrderResponse,
  InvoiceResponse,
  GatewayVerifyResponse,
  GatewayVerifyDto,
  ContactFormDto,
  ContactFormResponse,
  CompleteProfileDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  TwoFactorChallengeResponse,
  TwoFactorStatusResponse,
  TwoFactorSetupResponse,
  TwoFactorConfirmResponse,
  TwoFactorRecoveryResponse,
  TwoFactorStaffRow,
  VerifyTwoFactorDto,
  CourseSummary,
  CreateChallengeDto,
  CreateCourseDto,
  CreateLessonDto,
  LearnerState,
  LessonDetail,
  LessonSummary,
  LoginDto,
  PaymentResponse,
  ExamAttemptSession,
  ExamResponse,
  ExamSubmitResult,
  LearnerTestReport,
  MiniIpipAnswers,
  PersonalityResult,
  AssessmentResponse,
  ReadinessResult,
  ReadinessScores,
  ReadinessTestSummary,
  ReadinessTestDto,
  RequestOtpDto,
  RequestOtpResponse,
  RoadmapResponse,
  SiteSettings,
  SiteAdminAccessSettings,
  UpdateChallengeDto,
  UpdateCourseDto,
  UpdateLessonDto,
  UpdateSiteSettingsDto,
  UserRole,
  VerifyOtpDto,
  AdminStats,
  AdminCourse,
  AdminLesson,
  AdminRole,
  AdminChallenge,
  AdminContactMessage,
  AdminCreateUserDto,
  AdminUser,
  AdminUserList,
  AdminUserListParams,
  AdminUpdateUserStatusDto,
  AdminAuditLogList,
  AdminAuditLogParams,
  AdminPayment,
  AdminTicketDetail,
  AdminTicketStatus,
  AdminTicketPriority,
  AdminTicketSummary,
  AdminLearnerMessage,
  AdminCompetition,
  AdminCompetitionRegistration,
  AdminOrder,
  AdminEntitlement,
  AdminWalletDetail,
  AdminWalletSummary,
  AssessmentBank,
  CreateRoleDto,
  UpdateRoleDto,
  PersonalityBank,
  TestBankId,
  TestBankMeta,
  TestBankPayload,
  SupportTicketSummary,
  SupportTicketDetail,
  CreateTicketDto,
  TicketReplyDto,
  LearnerMessageDto,
  LearnerTodoDto,
  CreateTodoDto,
  UpdateTodoDto,
  CompetitionSummary,
  CourseAttachmentDto,
  LearnerProgressSummary,
  ProfileDetails,
  UpdateProfileDto,
  BootcampState,
  AdminCourseExam,
  CourseExamSummary,
  CourseExamAttemptSession,
  CourseExamSubmitResult,
  CourseExamQuestion,
  CourseExamAttemptSummary,
  CourseExamKind,
} from '@kia./shared';
import { clearTokens, getAccessToken, setAccessToken } from '@/lib/auth';
import { ApiError } from '@/lib/apiError';
import { demoApi } from '@/lib/demoApi';
import { isDemoMode } from '@/lib/demoMode';

export { ApiError };

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

function apiBase(): string {
  // Empty NEXT_PUBLIC_API_URL uses same-origin /api (Next.js rewrite → Nest in local/Docker).
  // GitHub Pages demo mode uses in-browser mocks when NEXT_PUBLIC_DEMO_MODE=true.
  // Absolute URL keeps direct browser→API calls for hosted Nest backends.
  return API_URL || '';
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  skipRefreshRetry?: boolean;
}

let refreshPromise: Promise<AuthTokens> | null = null;

async function parseErrorBody(res: Response): Promise<{ message?: string }> {
  try {
    return (await res.json()) as { message?: string };
  } catch {
    return {};
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth, skipRefreshRetry, headers: customHeaders, ...fetchOptions } = options;
  const token = skipAuth ? null : getAccessToken();

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };
  // Only set JSON content-type when body is not FormData (multipart uploads).
  if (!(fetchOptions.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${apiBase()}/api${path}`, {
    credentials: 'include',
    ...fetchOptions,
    headers,
  });

  if (
    res.status === 401 &&
    !skipRefreshRetry &&
    !skipAuth &&
    path !== '/auth/refresh' &&
    path !== '/auth/login' &&
    path !== '/auth/otp/request' &&
    path !== '/auth/otp/verify'
  ) {
    try {
      if (!refreshPromise) {
        refreshPromise = liveApi.refresh().finally(() => {
          refreshPromise = null;
        });
      }
      await refreshPromise;
      return request<T>(path, { ...options, skipRefreshRetry: true });
    } catch {
      clearTokens();
    }
  }

  if (!res.ok) {
    const body = await parseErrorBody(res);
    const message = body.message ?? res.statusText ?? `Request failed (${res.status})`;
    throw new ApiError(message, res.status, body);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

const liveApi = {
  login(dto: LoginDto): Promise<AuthResponse | TwoFactorChallengeResponse> {
    return request<AuthResponse | TwoFactorChallengeResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
      skipAuth: true,
    }).then((res) => {
      if (!('twoFactorRequired' in res)) {
        setAccessToken(res.accessToken);
      }
      return res;
    });
  },

  verifyTwoFactor(dto: VerifyTwoFactorDto): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify(dto),
      skipAuth: true,
    }).then((res) => {
      setAccessToken(res.accessToken);
      return res;
    });
  },

  twoFactorStatus(): Promise<TwoFactorStatusResponse> {
    return request<TwoFactorStatusResponse>('/auth/2fa/status');
  },

  twoFactorSetup(): Promise<TwoFactorSetupResponse> {
    return request<TwoFactorSetupResponse>('/auth/2fa/setup', { method: 'POST' });
  },

  twoFactorConfirm(code: string): Promise<TwoFactorConfirmResponse> {
    return request<TwoFactorConfirmResponse>('/auth/2fa/confirm', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  twoFactorRegenerateRecoveryCodes(code: string): Promise<TwoFactorRecoveryResponse> {
    return request<TwoFactorRecoveryResponse>('/auth/2fa/recovery-codes', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  twoFactorDisable(code: string): Promise<{ enabled: false }> {
    return request<{ enabled: false }>('/auth/2fa', {
      method: 'DELETE',
      body: JSON.stringify({ code }),
    });
  },

  adminListStaffTwoFactor(): Promise<TwoFactorStaffRow[]> {
    return request<TwoFactorStaffRow[]>('/admin/staff-2fa');
  },

  adminDisableStaffTwoFactor(userId: string): Promise<{ enabled: false }> {
    return request<{ enabled: false }>(`/admin/staff-2fa/${userId}`, { method: 'DELETE' });
  },

  requestOtp(dto: RequestOtpDto): Promise<RequestOtpResponse> {
    return request<RequestOtpResponse>('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify(dto),
      skipAuth: true,
    });
  },

  verifyOtp(dto: VerifyOtpDto): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify(dto),
      skipAuth: true,
    }).then((res) => {
      setAccessToken(res.accessToken);
      return res;
    });
  },

  forgotPassword(dto: ForgotPasswordDto): Promise<{ success: true }> {
    return request<{ success: true }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(dto),
      skipAuth: true,
    });
  },

  resetPassword(dto: ResetPasswordDto): Promise<{ success: true }> {
    return request<{ success: true }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(dto),
      skipAuth: true,
    });
  },

  changePassword(dto: ChangePasswordDto): Promise<{ success: true }> {
    return request<{ success: true }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  completeProfile(dto: CompleteProfileDto): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/profile', {
      method: 'POST',
      body: JSON.stringify(dto),
    }).then((res) => {
      setAccessToken(res.accessToken);
      return res;
    });
  },

  getProfile(): Promise<ProfileDetails> {
    return request<ProfileDetails>('/auth/profile');
  },

  updateProfile(dto: UpdateProfileDto): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }).then((res) => {
      setAccessToken(res.accessToken);
      return res;
    });
  },

  uploadAvatar(file: File): Promise<import('@kia./shared').ProfileDetails> {
    const form = new FormData();
    form.append('avatar', file);
    return request('/auth/profile/avatar', {
      method: 'POST',
      body: form,
    });
  },

  async logout(): Promise<void> {
    try {
      await request<void>('/auth/logout', { method: 'POST' });
    } finally {
      clearTokens();
    }
  },

  refresh(): Promise<AuthTokens> {
    return request<AuthTokens>('/auth/refresh', {
      method: 'POST',
      skipAuth: true,
      skipRefreshRetry: true,
    }).then((tokens) => {
      setAccessToken(tokens.accessToken);
      return tokens;
    });
  },

  me(): Promise<LearnerState> {
    return request('/auth/me');
  },

  checkout(dto: CheckoutDto): Promise<PaymentResponse> {
    return request<PaymentResponse>('/payments/checkout', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  checkoutCart(): Promise<PaymentResponse> {
    return request<PaymentResponse>('/payments/checkout/cart', { method: 'POST' });
  },

  retryPayment(orderId: string): Promise<PaymentResponse> {
    return request<PaymentResponse>('/payments/retry', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  },

  confirmPayment(id: string): Promise<PaymentResponse> {
    return request<PaymentResponse>(`/payments/confirm/${id}`, {
      method: 'POST',
    });
  },

  verifyPayment(dto: GatewayVerifyDto): Promise<GatewayVerifyResponse> {
    return request<GatewayVerifyResponse>('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  getPayment(id: string): Promise<PaymentResponse> {
    return request<PaymentResponse>(`/payments/${id}`);
  },

  myPayments(): Promise<PaymentResponse[]> {
    return request<PaymentResponse[]>('/payments/my');
  },

  getWallet(limit = 5): Promise<import('@kia./shared').WalletSummary> {
    return request(`/payments/wallet?limit=${limit}`);
  },

  listPaymentTransactions(
    limit = 5,
  ): Promise<import('@kia./shared').WalletTransactionDto[]> {
    return request(`/payments/transactions?limit=${limit}`);
  },

  myOrders(): Promise<OrderResponse[]> {
    return request<OrderResponse[]>('/payments/orders');
  },

  getOrder(orderId: string): Promise<OrderResponse> {
    return request<OrderResponse>(`/payments/orders/${orderId}`);
  },

  getInvoice(orderId: string): Promise<InvoiceResponse> {
    return request<InvoiceResponse>(`/payments/orders/${orderId}/invoice`);
  },

  getCart(): Promise<CartResponse> {
    return request<CartResponse>('/cart');
  },

  addToCart(courseSlug: string): Promise<CartResponse> {
    return request<CartResponse>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ courseSlug }),
    });
  },

  removeCartItem(itemId: string): Promise<CartResponse> {
    return request<CartResponse>(`/cart/items/${itemId}`, { method: 'DELETE' });
  },

  clearCart(): Promise<CartResponse> {
    return request<CartResponse>('/cart', { method: 'DELETE' });
  },

  listCourses(): Promise<CourseSummary[]> {
    return request<CourseSummary[]>('/courses');
  },

  listMyCourses(): Promise<CourseSummary[]> {
    return request<CourseSummary[]>('/courses/mine');
  },

  getCourse(slug: string): Promise<CourseSummary & { lessons: LessonSummary[] }> {
    return request(`/courses/${slug}`);
  },

  getLesson(courseSlug: string, lessonSlug: string): Promise<LessonDetail> {
    return request(`/courses/${courseSlug}/lessons/${lessonSlug}`);
  },

  enrollCourse(slug: string): Promise<void> {
    return request<void>(`/courses/${slug}/enroll`, { method: 'POST' });
  },

  completeLesson(courseSlug: string, lessonSlug: string): Promise<void> {
    return request<void>(`/courses/${courseSlug}/lessons/${lessonSlug}/complete`, {
      method: 'POST',
    });
  },

  saveRoadmap(answers: AssessmentAnswers): Promise<RoadmapResponse> {
    return request<RoadmapResponse>('/roadmaps', {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },

  getRoadmap(id: string): Promise<RoadmapResponse> {
    return request<RoadmapResponse>(`/roadmaps/${id}`);
  },

  enrollRoadmap(roadmapId: string): Promise<RoadmapResponse> {
    return request<RoadmapResponse>(`/roadmaps/${roadmapId}/enroll`, {
      method: 'POST',
    });
  },

  submitPersonality(answers: MiniIpipAnswers): Promise<PersonalityResult> {
    return request<PersonalityResult>('/personality', {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },

  latestPersonality(): Promise<PersonalityResult | null> {
    return request<PersonalityResult | null>('/personality/latest');
  },

  latestAssessment(): Promise<AssessmentResponse | null> {
    return request<AssessmentResponse | null>('/assessments/latest');
  },

  getTestReport(examAttemptId?: string): Promise<LearnerTestReport> {
    const query = examAttemptId
      ? `?examAttemptId=${encodeURIComponent(examAttemptId)}`
      : '';
    return request<LearnerTestReport>(`/readiness/report${query}`);
  },

  startExam(roadmapId?: string): Promise<ExamAttemptSession> {
    return request<ExamAttemptSession>('/readiness/exam/start', {
      method: 'POST',
      body: JSON.stringify(roadmapId ? { roadmapId } : {}),
    });
  },

  saveExamAnswers(
    attemptId: string,
    answers: Record<string, ExamResponse>,
  ): Promise<{ ok: true; remainingSec: number }> {
    return request<{ ok: true; remainingSec: number }>(
      `/readiness/exam/${attemptId}/answers`,
      {
        method: 'PATCH',
        body: JSON.stringify({ answers }),
      },
    );
  },

  submitExam(
    attemptId: string,
    answers?: Record<string, ExamResponse>,
  ): Promise<ExamSubmitResult> {
    return request<ExamSubmitResult>(`/readiness/exam/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify(answers ? { answers } : {}),
    });
  },

  getExamAttempt(attemptId: string): Promise<ExamAttemptSession | ExamSubmitResult> {
    return request<ExamAttemptSession | ExamSubmitResult>(
      `/readiness/exam/${attemptId}`,
    );
  },

  saveReadinessTest(scores: ReadinessScores): Promise<ReadinessResult> {
    const dto: ReadinessTestDto = { scores };
    return request<ReadinessResult>('/readiness', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  listReadinessTests(): Promise<ReadinessTestSummary[]> {
    return request<ReadinessTestSummary[]>('/readiness');
  },

  getReadinessTest(
    id: string,
  ): Promise<ReadinessResult & { id: string; createdAt: string; outcome?: ExamSubmitResult['outcome'] }> {
    return request<
      ReadinessResult & { id: string; createdAt: string; outcome?: ExamSubmitResult['outcome'] }
    >(`/readiness/${id}`);
  },

  submitContactForm(dto: ContactFormDto): Promise<ContactFormResponse> {
    return request<ContactFormResponse>('/contact', {
      method: 'POST',
      body: JSON.stringify(dto),
      skipAuth: true,
    });
  },

  submitChallenge(code: string): Promise<ChallengeScoreResult> {
    const dto: ChallengeSubmissionDto = { code };
    return request<ChallengeScoreResult>('/challenges', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  getBootcampState(): Promise<BootcampState> {
    return request<BootcampState>('/bootcamp/state');
  },

  listTickets(): Promise<SupportTicketSummary[]> {
    return request<SupportTicketSummary[]>('/tickets');
  },

  getTicket(id: string): Promise<SupportTicketDetail> {
    return request<SupportTicketDetail>(`/tickets/${id}`);
  },

  createTicket(dto: CreateTicketDto, files: File[] = []): Promise<SupportTicketDetail> {
    const form = new FormData();
    form.append('subject', dto.subject);
    form.append('body', dto.body);
    if (dto.courseId) form.append('courseId', dto.courseId);
    if (dto.courseSlug) form.append('courseSlug', dto.courseSlug);
    if (dto.priority) form.append('priority', dto.priority);
    if (dto.category) form.append('category', String(dto.category));
    for (const file of files) form.append('files', file);
    return request<SupportTicketDetail>('/tickets', {
      method: 'POST',
      body: form,
    });
  },

  replyTicket(id: string, dto: TicketReplyDto, files: File[] = []): Promise<SupportTicketDetail> {
    const form = new FormData();
    form.append('body', dto.body);
    for (const file of files) form.append('files', file);
    return request<SupportTicketDetail>(`/tickets/${id}/replies`, {
      method: 'POST',
      body: form,
    });
  },

  listMessages(): Promise<LearnerMessageDto[]> {
    return request<LearnerMessageDto[]>('/messages');
  },

  markMessageRead(id: string): Promise<LearnerMessageDto> {
    return request<LearnerMessageDto>(`/messages/${id}/read`, { method: 'PATCH' });
  },

  listTodos(): Promise<LearnerTodoDto[]> {
    return request<LearnerTodoDto[]>('/todos');
  },

  createTodo(dto: CreateTodoDto): Promise<LearnerTodoDto> {
    return request<LearnerTodoDto>('/todos', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  updateTodo(id: string, dto: UpdateTodoDto): Promise<LearnerTodoDto> {
    return request<LearnerTodoDto>(`/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  deleteTodo(id: string): Promise<void> {
    return request<void>(`/todos/${id}`, { method: 'DELETE' });
  },

  listCompetitions(): Promise<CompetitionSummary[]> {
    return request<CompetitionSummary[]>('/competitions');
  },

  listMyCompetitions(): Promise<CompetitionSummary[]> {
    return request<CompetitionSummary[]>('/competitions/mine');
  },

  registerCompetition(slug: string): Promise<CompetitionSummary> {
    return request<CompetitionSummary>(`/competitions/${slug}/register`, {
      method: 'POST',
    });
  },

  listCourseAttachments(slug: string): Promise<CourseAttachmentDto[]> {
    return request<CourseAttachmentDto[]>(`/courses/${slug}/attachments`);
  },

  getProgress(): Promise<LearnerProgressSummary> {
    return request<LearnerProgressSummary>('/progress');
  },

  adminStats(): Promise<AdminStats> {
    return request<AdminStats>('/admin/stats');
  },

  adminListCourses(): Promise<AdminCourse[]> {
    return request<AdminCourse[]>('/admin/courses');
  },

  adminCreateCourse(dto: CreateCourseDto): Promise<AdminCourse> {
    return request<AdminCourse>('/admin/courses', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  adminUpdateCourse(slug: string, dto: UpdateCourseDto): Promise<AdminCourse> {
    return request<AdminCourse>(`/admin/courses/${slug}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  adminDeleteCourse(slug: string): Promise<void> {
    return request<void>(`/admin/courses/${slug}`, { method: 'DELETE' });
  },

  adminCreateLesson(courseSlug: string, dto: CreateLessonDto): Promise<AdminLesson> {
    return request<AdminLesson>(`/admin/courses/${courseSlug}/lessons`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  adminUpdateLesson(
    courseSlug: string,
    lessonSlug: string,
    dto: UpdateLessonDto,
  ): Promise<AdminLesson> {
    return request<AdminLesson>(`/admin/courses/${courseSlug}/lessons/${lessonSlug}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  adminDeleteLesson(courseSlug: string, lessonSlug: string): Promise<void> {
    return request<void>(`/admin/courses/${courseSlug}/lessons/${lessonSlug}`, {
      method: 'DELETE',
    });
  },

  adminUploadLessonVideo(
    courseSlug: string,
    lessonSlug: string,
    file: File,
  ): Promise<AdminLesson> {
    const body = new FormData();
    body.append('video', file);
    return request<AdminLesson>(`/admin/courses/${courseSlug}/lessons/${lessonSlug}/video`, {
      method: 'POST',
      body,
    });
  },

  adminDeleteLessonVideo(courseSlug: string, lessonSlug: string): Promise<AdminLesson> {
    return request<AdminLesson>(`/admin/courses/${courseSlug}/lessons/${lessonSlug}/video`, {
      method: 'DELETE',
    });
  },

  // ---- Course reordering (admin) ----
  adminReorderCourses(slugs: string[]): Promise<{ ok: true }> {
    return request<{ ok: true }>('/admin/courses/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ slugs }),
    });
  },

  adminReorderLessons(courseSlug: string, slugs: string[]): Promise<{ ok: true }> {
    return request<{ ok: true }>(`/admin/courses/${courseSlug}/lessons/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ slugs }),
    });
  },

  // ---- Course exams (admin) ----
  adminListCourseExams(courseSlug: string): Promise<AdminCourseExam[]> {
    return request<AdminCourseExam[]>(`/admin/courses/${courseSlug}/exams`);
  },

  adminCreateCourseExam(courseSlug: string, dto: {
    title: string;
    kind?: CourseExamKind;
    afterLessonId?: string | null;
    description?: string;
    passScore?: number;
    durationMin?: number;
    published?: boolean;
    questions: CourseExamQuestion[];
  }): Promise<AdminCourseExam> {
    return request<AdminCourseExam>(`/admin/courses/${courseSlug}/exams`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  adminUpdateCourseExam(courseSlug: string, examId: string, dto: {
    title?: string;
    kind?: CourseExamKind;
    afterLessonId?: string | null;
    description?: string;
    passScore?: number;
    durationMin?: number;
    published?: boolean;
    questions?: CourseExamQuestion[];
  }): Promise<AdminCourseExam> {
    return request<AdminCourseExam>(`/admin/courses/${courseSlug}/exams/${examId}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  adminDeleteCourseExam(courseSlug: string, examId: string): Promise<{ deleted: true }> {
    return request<{ deleted: true }>(`/admin/courses/${courseSlug}/exams/${examId}`, {
      method: 'DELETE',
    });
  },

  // ---- Course exams (learner) ----
  listMyCourseExams(): Promise<CourseExamSummary[]> {
    return request<CourseExamSummary[]>('/courses/exams/mine');
  },

  listCourseExamsForLearner(courseSlug: string): Promise<CourseExamSummary[]> {
    return request<CourseExamSummary[]>(`/courses/${courseSlug}/exams`);
  },

  listCourseExamAttempts(examId: string): Promise<CourseExamAttemptSummary[]> {
    return request<CourseExamAttemptSummary[]>(`/courses/exams/${examId}/attempts`);
  },

  startCourseExam(examId: string): Promise<CourseExamAttemptSession> {
    return request<CourseExamAttemptSession>(`/courses/exams/${examId}/start`, {
      method: 'POST',
    });
  },

  saveCourseExamAnswers(examId: string, attemptId: string, answers: Record<string, unknown>): Promise<{ ok: true }> {
    return request<{ ok: true }>(
      `/courses/exams/${examId}/attempts/${attemptId}/answers`,
      { method: 'PATCH', body: JSON.stringify({ answers }) },
    );
  },

  submitCourseExam(examId: string, attemptId: string, answers: Record<string, unknown>): Promise<CourseExamSubmitResult> {
    return request<CourseExamSubmitResult>(
      `/courses/exams/${examId}/attempts/${attemptId}/submit`,
      { method: 'POST', body: JSON.stringify({ answers }) },
    );
  },

  getCourseExamAttemptResult(examId: string, attemptId: string): Promise<CourseExamSubmitResult> {
    return request<CourseExamSubmitResult>(
      `/courses/exams/${examId}/attempts/${attemptId}`,
    );
  },


  adminListChallenges(): Promise<AdminChallenge[]> {
    return request<AdminChallenge[]>('/admin/challenges');
  },

  adminCreateChallenge(dto: CreateChallengeDto): Promise<AdminChallenge> {
    return request<AdminChallenge>('/admin/challenges', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  adminUpdateChallenge(slug: string, dto: UpdateChallengeDto): Promise<AdminChallenge> {
    return request<AdminChallenge>(`/admin/challenges/${slug}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  adminDeleteChallenge(slug: string): Promise<void> {
    return request<void>(`/admin/challenges/${slug}`, { method: 'DELETE' });
  },

  adminListUsers(params: AdminUserListParams = {}): Promise<AdminUserList> {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.search) qs.set('search', params.search);
    if (params.role) qs.set('role', params.role);
    if (params.status) qs.set('status', params.status);
    if (params.deleted) qs.set('deleted', params.deleted);
    const query = qs.toString();
    return request<AdminUserList>(`/admin/users${query ? `?${query}` : ''}`);
  },

  /** DB-4 soft delete — the reason is mandatory and lands in the audit trail. */
  adminSoftDeleteUser(id: string, reason: string): Promise<AdminUser> {
    return request<AdminUser>(`/admin/users/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  },

  /** DB-4 reverse a soft delete (audit-reversible). */
  adminRestoreUser(id: string): Promise<AdminUser> {
    return request<AdminUser>(`/admin/users/${id}/restore`, { method: 'POST' });
  },

  adminUpdateUserStatus(id: string, dto: AdminUpdateUserStatusDto): Promise<AdminUser> {
    return request<AdminUser>(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  adminListAuditLogs(params: AdminAuditLogParams = {}): Promise<AdminAuditLogList> {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.section) qs.set('section', params.section);
    if (params.action) qs.set('action', params.action);
    if (params.actorId) qs.set('actorId', params.actorId);
    if (params.search) qs.set('search', params.search);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    const query = qs.toString();
    return request<AdminAuditLogList>(`/admin/audit-logs${query ? `?${query}` : ''}`);
  },

  adminCreateUser(dto: AdminCreateUserDto): Promise<AdminUser> {
    return request<AdminUser>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  adminListPayments(): Promise<AdminPayment[]> {
    return request<AdminPayment[]>('/admin/payments');
  },

  /**
   * Admin-initiated refund. `amountCents` is optional — omitting it refunds the
   * full payment — and `reason` is mandatory for the server-side audit trail.
   * The backend owns the state machine (only COMPLETED may be refunded) and
   * credits the learner's wallet in the same transaction.
   */
  adminRefundPayment(
    id: string,
    dto: { amountCents?: number; reason: string },
  ): Promise<AdminPayment> {
    return request<AdminPayment>(`/admin/payments/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  /* --- Support tickets -------------------------------------------------------- */

  adminListTickets(): Promise<AdminTicketSummary[]> {
    return request<AdminTicketSummary[]>('/admin/tickets');
  },

  adminGetTicket(id: string): Promise<AdminTicketDetail> {
    return request<AdminTicketDetail>(`/admin/tickets/${id}`);
  },

  adminReplyTicket(id: string, body: string): Promise<AdminTicketDetail> {
    return request<AdminTicketDetail>(`/admin/tickets/${id}/replies`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },

  adminUpdateTicket(
    id: string,
    dto: { status?: AdminTicketStatus; priority?: AdminTicketPriority },
  ): Promise<AdminTicketDetail> {
    return request<AdminTicketDetail>(`/admin/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  /* --- Learner inbox messages ---------------------------------------------------- */

  adminListMessages(): Promise<AdminLearnerMessage[]> {
    return request<AdminLearnerMessage[]>('/admin/messages');
  },

  adminSendMessage(dto: { userId: string; subject: string; body: string }): Promise<AdminLearnerMessage> {
    return request<AdminLearnerMessage>('/admin/messages', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  adminDeleteMessage(id: string): Promise<{ deleted: true }> {
    return request<{ deleted: true }>(`/admin/messages/${id}`, {
      method: 'DELETE',
    });
  },

  /* --- Competitions ----------------------------------------------------------------- */

  adminListCompetitions(): Promise<AdminCompetition[]> {
    return request<AdminCompetition[]>('/admin/competitions');
  },

  adminCreateCompetition(dto: {
    slug: string;
    title: string;
    description: string;
    startsAt: string;
    endsAt: string;
    active?: boolean;
  }): Promise<AdminCompetition> {
    return request<AdminCompetition>('/admin/competitions', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  adminUpdateCompetition(
    id: string,
    dto: Partial<{
      slug: string;
      title: string;
      description: string;
      startsAt: string;
      endsAt: string;
      active: boolean;
    }>,
  ): Promise<AdminCompetition> {
    return request<AdminCompetition>(`/admin/competitions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  adminDeleteCompetition(id: string): Promise<{ deleted: true }> {
    return request<{ deleted: true }>(`/admin/competitions/${id}`, {
      method: 'DELETE',
    });
  },

  adminListCompetitionRegistrations(id: string): Promise<AdminCompetitionRegistration[]> {
    return request<AdminCompetitionRegistration[]>(`/admin/competitions/${id}/registrations`);
  },

  /* --- Finance: orders / entitlements / wallets ----------------------------------------- */

  adminListOrders(): Promise<AdminOrder[]> {
    return request<AdminOrder[]>('/admin/orders');
  },

  adminListEntitlements(): Promise<AdminEntitlement[]> {
    return request<AdminEntitlement[]>('/admin/entitlements');
  },

  adminGrantEntitlement(dto: {
    userId: string;
    resourceType: string;
    resourceId: string;
    source?: string;
  }): Promise<AdminEntitlement> {
    return request<AdminEntitlement>('/admin/entitlements', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  adminRevokeEntitlement(id: string): Promise<{ deleted: true }> {
    return request<{ deleted: true }>(`/admin/entitlements/${id}`, {
      method: 'DELETE',
    });
  },

  adminListWallets(): Promise<AdminWalletSummary[]> {
    return request<AdminWalletSummary[]>('/admin/wallets');
  },

  adminGetWallet(userId: string): Promise<AdminWalletDetail> {
    return request<AdminWalletDetail>(`/admin/wallets/${userId}`);
  },

  adminAdjustWallet(
    userId: string,
    dto: { type: 'CREDIT' | 'DEBIT'; amountCents: number; description: string },
  ): Promise<AdminWalletDetail> {
    return request<AdminWalletDetail>(`/admin/wallets/${userId}/adjust`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  adminUpdateUserRole(userId: string, role: UserRole): Promise<AdminUser> {
    return request<AdminUser>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  adminUpdateUserAccess(
    userId: string,
    adminPanelAccess: SiteAdminAccessSettings,
  ): Promise<AdminUser> {
    return request<AdminUser>(`/admin/users/${userId}/access`, {
      method: 'PATCH',
      body: JSON.stringify({ adminPanelAccess }),
    });
  },

  adminListRoles(): Promise<AdminRole[]> {
    return request<AdminRole[]>('/admin/roles');
  },

  adminCreateRole(dto: CreateRoleDto): Promise<AdminRole> {
    return request<AdminRole>('/admin/roles', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  adminUpdateRole(id: string, dto: UpdateRoleDto): Promise<AdminRole> {
    return request<AdminRole>(`/admin/roles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  adminDeleteRole(id: string): Promise<{ deleted: true }> {
    return request<{ deleted: true }>(`/admin/roles/${id}`, {
      method: 'DELETE',
    });
  },

  adminListContactMessages(): Promise<AdminContactMessage[]> {
    return request<AdminContactMessage[]>('/admin/contact');
  },

  adminMarkContactRead(id: string): Promise<AdminContactMessage> {
    return request<AdminContactMessage>(`/admin/contact/${id}/read`, { method: 'PATCH' });
  },

  getSettings(): Promise<SiteSettings> {
    return request<SiteSettings>('/settings');
  },

  adminGetSettings(): Promise<SiteSettings> {
    return request<SiteSettings>('/admin/settings');
  },

  adminUpdateSettings(dto: UpdateSiteSettingsDto): Promise<SiteSettings> {
    return request<SiteSettings>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  },

  getPersonalityBank(): Promise<PersonalityBank> {
    return request<PersonalityBank>('/tests/personality', { skipAuth: true });
  },

  getAssessmentBank(): Promise<AssessmentBank> {
    return request<AssessmentBank>('/tests/assessment', { skipAuth: true });
  },

  adminListTestBanks(): Promise<TestBankMeta[]> {
    return request<TestBankMeta[]>('/admin/tests');
  },

  adminGetTestBank(id: TestBankId): Promise<TestBankPayload> {
    return request<TestBankPayload>(`/admin/tests/${id}`);
  },

  adminSaveTestBank(id: TestBankId, bank: unknown): Promise<TestBankPayload> {
    return request<TestBankPayload>(`/admin/tests/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ bank }),
    });
  },

  adminResetTestBank(id: TestBankId): Promise<TestBankPayload> {
    return request<TestBankPayload>(`/admin/tests/${id}/reset`, {
      method: 'POST',
    });
  },
};

export const api = isDemoMode() ? demoApi : liveApi;
