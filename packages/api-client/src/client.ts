import {
  AcceptEstimateResponseSchema,
  AdminJobCardSchema,
  AdminPublishEstimateResponseSchema,
  AdvisorCaseEnvelopeSchema,
  AssignResponseSchema,
  BookResponseSchema,
  BookingDetailResponseSchema,
  BookingListResponseSchema,
  CatalogHomeResponseSchema,
  FinalizationResponseSchema,
  HealthResponseSchema,
  HoldResponseSchema,
  InboxResponseSchema,
  JobCardEnvelopeSchema,
  MeResponseSchema,
  PriceResponseSchema,
  ProblemDetailsSchema,
  RejectEstimateResponseSchema,
  RepairOfferingListResponseSchema,
  ServiceDetailSchema,
  ServiceListResponseSchema,
  SlotsResponseSchema,
  SupportTicketListResponseSchema,
  SupportTicketSchema,
  TechnicianMeSchema,
  TechnicianVisitDetailSchema,
  VisitListResponseSchema,
  LocationPingAcceptedSchema,
  VehicleListResponseSchema,
  VehicleSchema,
  AddressListResponseSchema,
  AddressSchema,
  ReverseGeocodeSchema,
  GeocodeSearchResponseSchema,
  LabourResponseSchema,
  MediaConfirmResponseSchema,
  PartsResponseSchema,
  SignedUploadResponseSchema,
  InspectionFindingsResponseSchema,
  PartsAdvanceOrderResponseSchema,
  PaymentStatusResponseSchema,
  PartsStatusResponseSchema,
  InvoiceSchema,
  PaymentOrderCreateResponseSchema,
  PaymentSchema,
  ReviewSchema,
  NotificationListSchema,
  NotificationSchema,
  DevicePushTokenSchema,
  OutboxListSchema,
  MarkAllReadSchema,
  AnalyticsIngestSchema,
  OutboxRetryResponseSchema,
  DeviceTokenRevokeSchema,
  SkuStockSchema,
  SkuListResponseSchema,
  MovementResponseSchema,
  JobUsageResponseSchema,
  PartsHistoryResponseSchema,
  SkuDetailSchema,
  CatalogOverviewSchema,
  PatchOfferingResponseSchema,
  PeopleListResponseSchema,
  CustomerDetailSchema,
  DisableProfileResponseSchema,
  TechnicianDossierSchema,
  LedgerResponseSchema,
  OfflinePaymentResponseSchema,
  RefundResponseSchema,
  OverrideResponseSchema,
  OnBehalfResponseSchema,
  AdminJobListResponseSchema,
  AdminJobPatchResponseSchema,
  AuditLogListResponseSchema,
  TechnicianCreateResponseSchema,
  AdminJobBoardListResponseSchema,
  AdminJobLiteDetailSchema,
  DispatchBoardReadModelSchema,
  AllowedOverrideActionsSchema,
  CloseoutListSchema,
  VisitKitSchema,
  CatalogKitSchema,
  MassAssignResultSchema,
  VehicleServiceLogListSchema,
  type AcceptEstimateRequest,
  type AcceptEstimateResponse,
  type Address,
  type AddressListResponse,
  type AddressWrite,
  type AddJobCardItemRequest,
  type AdminJobCard,
  type AdminPublishEstimateRequest,
  type AdminPublishEstimateResponse,
  type AdvisorCaseEnvelope,
  type BookResponse,
  type BookingDetailResponse,
  type BookingListResponse,
  type CatalogHomeResponse,
  type CreateJobCardRequest,
  type CreateSupportTicketRequest,
  type FinalizationRequest,
  type FinalizationResponse,
  type HealthResponse,
  type HoldResponse,
  type InboxResponse,
  type JobCardEnvelope,
  type MeResponse,
  type PatchJobCardRequest,
  type PriceResponse,
  type ProblemDetails,
  type ProfilePatchRequest,
  type RejectEstimateResponse,
  type RepairOfferingListResponse,
  type ServiceDetail,
  type ServiceListResponse,
  type SlotsResponse,
  type SupportTicket,
  type SupportTicketListResponse,
  type Vehicle,
  type VehicleListResponse,
  type VehicleWrite,
  type AssignResponse,
  type ExceptionRequest,
  type LabourRequest,
  type LabourResponse,
  type MediaConfirmResponse,
  type PartsRequest,
  type PartsResponse,
  type QcRequest,
  type ScopeProgressRequest,
  type SignedUploadRequest,
  type SignedUploadResponse,
  type TechnicianMe,
  type TechnicianVisitDetail,
  type VisitListResponse,
  type LocationPingRequest,
  type LocationPingAccepted,
  type ReverseGeocode,
  type GeocodeSearchResponse,
  type InspectionFindingsResponse,
  type InspectionFindingsSubmit,
  type PartsAdvanceOrderRequest,
  type PartsAdvanceOrderResponse,
  type PaymentStatusResponse,
  type PartsStatusResponse,
  type Invoice,
  type PaymentOrderCreateResponse,
  type PaymentPurpose,
  type Payment,
  type Review,
  type ReviewCreateRequest,
  type NotificationList,
  type Notification,
  type DevicePushToken,
  type OutboxList,
  type SkuStock,
  type SkuListResponse,
  type MovementResponse,
  type JobUsageResponse,
  type PartsHistoryResponse,
  type SkuDetail,
  type CatalogOverview,
  type PatchOfferingResponse,
  type PeopleListResponse,
  type CustomerDetail,
  type DisableProfileResponse,
  type TechnicianCreateResponse,
  type TechnicianDossier,
  type LedgerResponse,
  type OfflinePaymentResponse,
  type RefundResponse,
  type OverrideResponse,
  type OnBehalfResponse,
  type AdminJobListResponse,
  type AdminJobPatchResponse,
  type AuditLogListResponse,
  type AdminJobBoardListResponse,
  type AdminJobLiteDetail,
  type DispatchBoardReadModel,
  type AllowedOverrideActions,
  type CloseoutList,
  type CloseoutQueue,
  type VisitKit,
  type CatalogKit,
  type MassAssignResult,
  type VehicleServiceLogList,
} from '@caratom/contracts';

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails | null;
  readonly requestId: string;

  constructor(status: number, message: string, requestId: string, problem: ProblemDetails | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
    this.problem = problem;
  }
}

export type ApiClientOptions = {
  baseUrl: string;
  getAccessToken?: () => Promise<string | null>;
  /** Telemetry only. Never used as an authorization check. */
  clientSurface?: string;
};

function newRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type AuthMode = boolean | 'optional';

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getAccessToken?: () => Promise<string | null>;
  private readonly clientSurface?: string;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.getAccessToken = options.getAccessToken;
    this.clientSurface = options.clientSurface;
  }

  async getHealth(): Promise<HealthResponse> {
    return this.request('GET', '/health', HealthResponseSchema, { auth: false });
  }

  async getMe(): Promise<MeResponse> {
    return this.request('GET', '/v1/me', MeResponseSchema, { auth: true });
  }

  async patchMe(body: ProfilePatchRequest): Promise<MeResponse> {
    return this.request('PATCH', '/v1/me', MeResponseSchema, { auth: true, body });
  }

  async getCatalogHome(serviceAreaSlug?: string): Promise<CatalogHomeResponse> {
    const query = serviceAreaSlug ? `?service_area_slug=${encodeURIComponent(serviceAreaSlug)}` : '';
    return this.request('GET', `/v1/catalog/home${query}`, CatalogHomeResponseSchema, {
      auth: 'optional',
    });
  }

  async getServices(params?: {
    flow_policy?: string;
    category_slug?: string;
    page?: number;
  }): Promise<ServiceListResponse> {
    const search = new URLSearchParams();
    if (params?.flow_policy) search.set('flow_policy', params.flow_policy);
    if (params?.category_slug) search.set('category_slug', params.category_slug);
    if (params?.page) search.set('page', String(params.page));
    const suffix = search.size ? `?${search.toString()}` : '';
    return this.request('GET', `/v1/services${suffix}`, ServiceListResponseSchema, { auth: false });
  }

  async getService(slug: string): Promise<ServiceDetail> {
    return this.request('GET', `/v1/services/${encodeURIComponent(slug)}`, ServiceDetailSchema, {
      auth: false,
    });
  }

  async createJobCard(body: CreateJobCardRequest): Promise<JobCardEnvelope> {
    return this.request('POST', '/v1/job-cards', JobCardEnvelopeSchema, {
      auth: 'optional',
      body,
    });
  }

  async getJobCard(id: string): Promise<JobCardEnvelope> {
    return this.request('GET', `/v1/job-cards/${id}`, JobCardEnvelopeSchema, { auth: 'optional' });
  }

  async patchJobCard(id: string, body: PatchJobCardRequest): Promise<JobCardEnvelope> {
    return this.request('PATCH', `/v1/job-cards/${id}`, JobCardEnvelopeSchema, {
      auth: 'optional',
      body,
    });
  }

  async priceJobCard(id: string): Promise<PriceResponse> {
    return this.request('POST', `/v1/job-cards/${id}/price`, PriceResponseSchema, {
      auth: 'optional',
    });
  }

  async acceptEstimate(
    jobCardId: string,
    estimateId: string,
    body: AcceptEstimateRequest,
    idempotencyKey: string,
  ): Promise<AcceptEstimateResponse> {
    return this.request(
      'POST',
      `/v1/job-cards/${jobCardId}/estimates/${estimateId}/accept`,
      AcceptEstimateResponseSchema,
      { auth: 'optional', body, idempotencyKey },
    );
  }

  async finalizeJobCard(
    jobCardId: string,
    body: FinalizationRequest,
    idempotencyKey: string,
  ): Promise<FinalizationResponse> {
    return this.request('POST', `/v1/job-cards/${jobCardId}/finalization`, FinalizationResponseSchema, {
      auth: true,
      body,
      idempotencyKey,
    });
  }

  async listSlots(
    jobCardId: string,
    from: string,
    to: string,
    visitType?: string,
  ): Promise<SlotsResponse> {
    const params = new URLSearchParams({ from, to });
    if (visitType) params.set('visit_type', visitType);
    return this.request('GET', `/v1/job-cards/${jobCardId}/slots?${params.toString()}`, SlotsResponseSchema, {
      auth: true,
    });
  }

  async createSlotHold(
    jobCardId: string,
    slotId: string,
    idempotencyKey: string,
  ): Promise<HoldResponse> {
    return this.request('POST', `/v1/job-cards/${jobCardId}/slot-holds`, HoldResponseSchema, {
      auth: true,
      body: { slot_id: slotId },
      idempotencyKey,
    });
  }

  async bookJobCard(
    jobCardId: string,
    slotHoldId: string,
    idempotencyKey: string,
    visitType?: string,
  ): Promise<BookResponse> {
    return this.request('POST', `/v1/job-cards/${jobCardId}/book`, BookResponseSchema, {
      auth: true,
      body: { slot_hold_id: slotHoldId, visit_type: visitType },
      idempotencyKey,
    });
  }

  async getInspectionFindings(jobCardId: string): Promise<InspectionFindingsResponse> {
    return this.request(
      'GET',
      `/v1/job-cards/${jobCardId}/inspection-findings`,
      InspectionFindingsResponseSchema,
      { auth: 'optional' },
    );
  }

  async getPartsStatus(jobCardId: string): Promise<PartsStatusResponse> {
    return this.request('GET', `/v1/job-cards/${jobCardId}/parts-status`, PartsStatusResponseSchema, {
      auth: true,
    });
  }

  async createPartsAdvanceOrder(
    jobCardId: string,
    body: PartsAdvanceOrderRequest,
    idempotencyKey: string,
  ): Promise<PartsAdvanceOrderResponse> {
    return this.request(
      'POST',
      `/v1/job-cards/${jobCardId}/parts-advance/payment-order`,
      PartsAdvanceOrderResponseSchema,
      { auth: true, body, idempotencyKey },
    );
  }

  async getPayment(paymentId: string): Promise<PaymentStatusResponse> {
    return this.request('GET', `/v1/payments/${paymentId}`, PaymentStatusResponseSchema, {
      auth: true,
    });
  }

  async getBookingInvoice(bookingId: string): Promise<Invoice> {
    return this.request('GET', `/v1/bookings/${bookingId}/invoice`, InvoiceSchema, { auth: true });
  }

  async getInvoice(invoiceId: string): Promise<Invoice> {
    return this.request('GET', `/v1/invoices/${invoiceId}`, InvoiceSchema, { auth: true });
  }

  async createPaymentOrder(
    invoiceId: string,
    purpose: PaymentPurpose,
    idempotencyKey: string,
  ): Promise<PaymentOrderCreateResponse> {
    return this.request(
      'POST',
      `/v1/invoices/${invoiceId}/payment-order`,
      PaymentOrderCreateResponseSchema,
      { auth: true, body: { purpose }, idempotencyKey },
    );
  }

  async getInvoicePayment(paymentId: string): Promise<Payment> {
    return this.request('GET', `/v1/payments/${paymentId}`, PaymentSchema, { auth: true });
  }

  async submitReview(body: ReviewCreateRequest, idempotencyKey: string): Promise<Review> {
    return this.request('POST', '/v1/reviews', ReviewSchema, {
      auth: true,
      body,
      idempotencyKey,
    });
  }

  async listNotifications(cursor?: string, limit = 20): Promise<NotificationList> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return this.request('GET', `/v1/me/notifications?${params.toString()}`, NotificationListSchema, {
      auth: true,
    });
  }

  async markNotificationRead(id: string): Promise<Notification> {
    return this.request('POST', `/v1/me/notifications/${id}/read`, NotificationSchema, {
      auth: true,
    });
  }

  async markAllNotificationsRead(): Promise<{ updated: number }> {
    return this.request('POST', '/v1/me/notifications/read-all', MarkAllReadSchema, {
      auth: true,
    });
  }

  async putDevicePushToken(body: {
    app_surface: 'customer' | 'technician' | 'admin_mobile';
    expo_push_token: string;
    platform: 'ios' | 'android';
    device_id?: string;
  }): Promise<DevicePushToken> {
    return this.request('PUT', '/v1/me/device-push-token', DevicePushTokenSchema, {
      auth: true,
      body,
    });
  }

  async deleteDevicePushToken(tokenId: string): Promise<void> {
    await this.request('DELETE', `/v1/me/device-push-token/${tokenId}`, DeviceTokenRevokeSchema, {
      auth: true,
    });
  }

  async postAnalyticsEvents(events: Array<Record<string, unknown>>): Promise<void> {
    try {
      await this.request('POST', '/v1/analytics/events', AnalyticsIngestSchema, {
        auth: true,
        body: { events },
      });
    } catch {
      return;
    }
  }

  async listAdminOutbox(params?: { status?: string; cursor?: string }): Promise<OutboxList> {
    const search = new URLSearchParams();
    if (params?.status) search.set('status', params.status);
    if (params?.cursor) search.set('cursor', params.cursor);
    const q = search.toString();
    return this.request(
      'GET',
      `/v1/admin/notifications/outbox${q ? `?${q}` : ''}`,
      OutboxListSchema,
      { auth: true },
    );
  }

  async retryAdminOutbox(id: string, reason: string): Promise<{ id: string; status: string }> {
    return this.request(
      'POST',
      `/v1/admin/notifications/outbox/${id}/retry`,
      OutboxRetryResponseSchema,
      { auth: true, body: { reason } },
    );
  }

  async capturePartsAdvanceDev(paymentId: string): Promise<PaymentStatusResponse> {
    return this.request(
      'POST',
      `/v1/dev/payments/${paymentId}/capture`,
      PaymentStatusResponseSchema,
      { auth: true },
    );
  }

  async bookRepair(
    jobCardId: string,
    slotHoldId: string,
    idempotencyKey: string,
  ): Promise<BookResponse> {
    return this.request('POST', `/v1/job-cards/${jobCardId}/book-repair`, BookResponseSchema, {
      auth: true,
      body: { slot_hold_id: slotHoldId, visit_type: 'REPAIR' },
      idempotencyKey,
    });
  }

  async rescheduleBooking(
    bookingId: string,
    slotHoldId: string,
    idempotencyKey: string,
  ): Promise<BookResponse> {
    return this.request('POST', `/v1/bookings/${bookingId}/reschedule`, BookResponseSchema, {
      auth: true,
      body: { slot_hold_id: slotHoldId },
      idempotencyKey,
    });
  }

  async adminMarkPartsReady(jobCardId: string): Promise<{ status: string }> {
    return this.request('POST', `/v1/admin/job-cards/${jobCardId}/parts-ready`, {
      parse: (data: unknown) => data as { status: string },
    }, { auth: true });
  }

  async getBooking(id: string): Promise<BookingDetailResponse> {
    return this.request('GET', `/v1/bookings/${id}`, BookingDetailResponseSchema, { auth: true });
  }

  async listBookings(cursor?: string, limit = 20): Promise<BookingListResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) {
      params.set('cursor', cursor);
    }
    return this.request('GET', `/v1/bookings?${params.toString()}`, BookingListResponseSchema, {
      auth: true,
    });
  }

  async createSupportTicket(
    body: CreateSupportTicketRequest,
    idempotencyKey: string,
  ): Promise<SupportTicket> {
    return this.request('POST', '/v1/support-tickets', SupportTicketSchema, {
      auth: true,
      body,
      idempotencyKey,
    });
  }

  async getSupportTicket(id: string): Promise<SupportTicket> {
    return this.request('GET', `/v1/support-tickets/${id}`, SupportTicketSchema, { auth: true });
  }

  async listSupportTickets(): Promise<SupportTicketListResponse> {
    return this.request('GET', '/v1/support-tickets', SupportTicketListResponseSchema, {
      auth: true,
    });
  }

  async cancelSupportTicket(id: string, idempotencyKey: string): Promise<SupportTicket> {
    return this.request('POST', `/v1/support-tickets/${id}/cancel`, SupportTicketSchema, {
      auth: true,
      idempotencyKey,
    });
  }

  async getRepairOfferings(params?: {
    query?: string;
    vehicle_make?: string;
    vehicle_model?: string;
    vehicle_year?: number;
  }): Promise<RepairOfferingListResponse> {
    const search = new URLSearchParams();
    if (params?.query) search.set('query', params.query);
    if (params?.vehicle_make) search.set('vehicle_make', params.vehicle_make);
    if (params?.vehicle_model) search.set('vehicle_model', params.vehicle_model);
    if (params?.vehicle_year) search.set('vehicle_year', String(params.vehicle_year));
    const suffix = search.size ? `?${search.toString()}` : '';
    return this.request('GET', `/v1/repair-offerings${suffix}`, RepairOfferingListResponseSchema, {
      auth: false,
    });
  }

  async addJobCardItem(jobCardId: string, body: AddJobCardItemRequest): Promise<JobCardEnvelope> {
    return this.request('POST', `/v1/job-cards/${jobCardId}/items`, JobCardEnvelopeSchema, {
      auth: 'optional',
      body,
    });
  }

  async patchJobCardItem(
    jobCardId: string,
    itemId: string,
    body: { quantity: number },
  ): Promise<JobCardEnvelope> {
    return this.request(
      'PATCH',
      `/v1/job-cards/${jobCardId}/items/${itemId}`,
      JobCardEnvelopeSchema,
      { auth: 'optional', body },
    );
  }

  async deleteJobCardItem(jobCardId: string, itemId: string): Promise<JobCardEnvelope> {
    return this.request(
      'DELETE',
      `/v1/job-cards/${jobCardId}/items/${itemId}`,
      JobCardEnvelopeSchema,
      { auth: 'optional' },
    );
  }

  async createAdvisorCase(jobCardId: string, idempotencyKey: string): Promise<AdvisorCaseEnvelope> {
    return this.request(
      'POST',
      `/v1/job-cards/${jobCardId}/advisor-case`,
      AdvisorCaseEnvelopeSchema,
      { auth: true, idempotencyKey },
    );
  }

  async getAdvisorCase(jobCardId: string): Promise<AdvisorCaseEnvelope> {
    return this.request(
      'GET',
      `/v1/job-cards/${jobCardId}/advisor-case`,
      AdvisorCaseEnvelopeSchema,
      { auth: 'optional' },
    );
  }

  async rejectEstimate(
    jobCardId: string,
    estimateId: string,
    idempotencyKey: string,
  ): Promise<RejectEstimateResponse> {
    return this.request(
      'POST',
      `/v1/job-cards/${jobCardId}/estimates/${estimateId}/reject`,
      RejectEstimateResponseSchema,
      { auth: true, idempotencyKey },
    );
  }

  async simulateAdvisorEstimate(jobCardId: string): Promise<AdminPublishEstimateResponse> {
    return this.request(
      'POST',
      `/v1/dev/job-cards/${jobCardId}/simulate-advisor-estimate`,
      AdminPublishEstimateResponseSchema,
      { auth: 'optional' },
    );
  }

  async getAdminAdvisorCases(): Promise<InboxResponse> {
    return this.request('GET', '/v1/admin/advisor-cases', InboxResponseSchema, { auth: true });
  }

  async getAdminJobCard(jobCardId: string): Promise<AdminJobCard> {
    return this.request('GET', `/v1/admin/job-cards/${jobCardId}`, AdminJobCardSchema, {
      auth: true,
    });
  }

  async publishAdminEstimate(
    jobCardId: string,
    body: AdminPublishEstimateRequest,
    idempotencyKey: string,
  ): Promise<AdminPublishEstimateResponse> {
    return this.request(
      'POST',
      `/v1/admin/job-cards/${jobCardId}/estimate`,
      AdminPublishEstimateResponseSchema,
      { auth: true, body, idempotencyKey },
    );
  }

  async listAdminInventory(params?: {
    q?: string;
    low_stock?: boolean;
    location?: string;
  }): Promise<SkuListResponse> {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.low_stock) search.set('low_stock', 'true');
    if (params?.location) search.set('location', params.location);
    const qs = search.toString();
    return this.request(
      'GET',
      `/v1/admin/inventory/skus${qs ? `?${qs}` : ''}`,
      SkuListResponseSchema,
      { auth: true },
    );
  }

  async createAdminSku(body: Record<string, unknown>): Promise<SkuStock> {
    return this.request('POST', '/v1/admin/inventory/skus', SkuStockSchema, {
      auth: true,
      body,
    });
  }

  async getAdminSkuStock(skuId: string): Promise<SkuDetail> {
    return this.request('GET', `/v1/admin/inventory/skus/${skuId}/stock`, SkuDetailSchema, {
      auth: true,
    });
  }

  async postAdminMovement(
    body: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<MovementResponse> {
    return this.request('POST', '/v1/admin/inventory/movements', MovementResponseSchema, {
      auth: true,
      body,
      idempotencyKey,
    });
  }

  async getAdminJobUsage(jobCardId: string): Promise<JobUsageResponse> {
    return this.request(
      'GET',
      `/v1/admin/inventory/job-usage/${jobCardId}`,
      JobUsageResponseSchema,
      { auth: true },
    );
  }

  async getAdminPartsHistory(profileId: string): Promise<PartsHistoryResponse> {
    return this.request(
      'GET',
      `/v1/admin/customers/${profileId}/parts-history`,
      PartsHistoryResponseSchema,
      { auth: true },
    );
  }

  async getAdminCatalogOverview(): Promise<CatalogOverview> {
    return this.request('GET', '/v1/admin/catalog/overview', CatalogOverviewSchema, { auth: true });
  }

  async patchAdminOffering(
    slug: string,
    body: Record<string, unknown>,
  ): Promise<PatchOfferingResponse> {
    return this.request(
      'PATCH',
      `/v1/admin/catalog/offerings/${slug}`,
      PatchOfferingResponseSchema,
      { auth: true, body },
    );
  }

  async patchAdminCatalogSettings(body: Record<string, unknown>): Promise<CatalogOverview> {
    return this.request('PATCH', '/v1/admin/catalog/settings', CatalogOverviewSchema, {
      auth: true,
      body,
    });
  }

  async searchAdminPeople(q?: string): Promise<PeopleListResponse> {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    return this.request('GET', `/v1/admin/people${qs}`, PeopleListResponseSchema, { auth: true });
  }

  async getAdminCustomer(id: string): Promise<CustomerDetail> {
    return this.request('GET', `/v1/admin/customers/${id}`, CustomerDetailSchema, { auth: true });
  }

  async createAdminTechnician(body: Record<string, unknown>): Promise<TechnicianCreateResponse> {
    return this.request('POST', '/v1/admin/technicians', TechnicianCreateResponseSchema, {
      auth: true,
      body,
    });
  }

  async disableAdminProfile(id: string, reason: string): Promise<DisableProfileResponse> {
    return this.request(
      'PATCH',
      `/v1/admin/profiles/${id}/disable`,
      DisableProfileResponseSchema,
      { auth: true, body: { reason } },
    );
  }

  async getAdminDossier(technicianId: string): Promise<TechnicianDossier> {
    return this.request(
      'GET',
      `/v1/admin/technicians/${technicianId}/dossier`,
      TechnicianDossierSchema,
      { auth: true },
    );
  }

  async getAdminLedger(params?: { from?: string; to?: string }): Promise<LedgerResponse> {
    const search = new URLSearchParams();
    if (params?.from) search.set('from', params.from);
    if (params?.to) search.set('to', params.to);
    const qs = search.toString();
    return this.request(
      'GET',
      `/v1/admin/payments/ledger${qs ? `?${qs}` : ''}`,
      LedgerResponseSchema,
      { auth: true },
    );
  }

  async recordAdminOffline(
    body: Record<string, unknown>,
  ): Promise<OfflinePaymentResponse> {
    return this.request('POST', '/v1/admin/payments/offline', OfflinePaymentResponseSchema, {
      auth: true,
      body,
    });
  }

  async refundAdminPayment(paymentId: string, body: Record<string, unknown>): Promise<RefundResponse> {
    return this.request(
      'POST',
      `/v1/admin/payments/${paymentId}/refund`,
      RefundResponseSchema,
      { auth: true, body },
    );
  }

  async bookOnBehalf(
    body: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<OnBehalfResponse> {
    return this.request('POST', '/v1/admin/bookings/on-behalf', OnBehalfResponseSchema, {
      auth: true,
      body,
      idempotencyKey,
    });
  }

  async listAdminJobs(params?: { q?: string; status?: string }): Promise<AdminJobListResponse> {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.status) search.set('status', params.status);
    const qs = search.toString();
    return this.request('GET', `/v1/admin/job-cards${qs ? `?${qs}` : ''}`, AdminJobListResponseSchema, {
      auth: true,
    });
  }

  async listJobBoard(params?: {
    cursor?: string;
    limit?: number;
    status?: string;
    technician_id?: string;
    area_slug?: string;
    needs_dispatch?: boolean;
    q?: string;
  }): Promise<AdminJobBoardListResponse> {
    const search = new URLSearchParams();
    if (params?.cursor) search.set('cursor', params.cursor);
    if (params?.limit != null) search.set('limit', String(params.limit));
    if (params?.status) search.set('status', params.status);
    if (params?.technician_id) search.set('technician_id', params.technician_id);
    if (params?.area_slug) search.set('area_slug', params.area_slug);
    if (params?.needs_dispatch != null) search.set('needs_dispatch', params.needs_dispatch ? 'true' : 'false');
    if (params?.q) search.set('q', params.q);
    const qs = search.toString();
    return this.request(
      'GET',
      `/v1/admin/job-cards${qs ? `?${qs}` : ''}`,
      AdminJobBoardListResponseSchema,
      { auth: true },
    );
  }

  async getAdminJobLite(jobCardId: string): Promise<AdminJobLiteDetail> {
    return this.request(
      'GET',
      `/v1/admin/job-cards/${jobCardId}?view=lite`,
      AdminJobLiteDetailSchema,
      { auth: true },
    );
  }

  async getDispatchBoard(): Promise<DispatchBoardReadModel> {
    return this.request('GET', '/v1/admin/dispatch', DispatchBoardReadModelSchema, { auth: true });
  }

  async getAdminCloseout(queue: CloseoutQueue): Promise<CloseoutList> {
    return this.request('GET', `/v1/admin/closeout?queue=${queue}`, CloseoutListSchema, { auth: true });
  }

  async getAdminVisitKit(visitId: string): Promise<VisitKit> {
    return this.request('GET', `/v1/admin/visits/${visitId}/kit`, VisitKitSchema, { auth: true });
  }

  async getAdminJobKit(jobCardId: string): Promise<VisitKit> {
    return this.request('GET', `/v1/admin/jobs/${jobCardId}/kit`, VisitKitSchema, { auth: true });
  }

  async getAdminCatalogKit(ownerType: string, ownerId: string): Promise<CatalogKit> {
    const params = new URLSearchParams({ owner_type: ownerType, owner_id: ownerId });
    return this.request('GET', `/v1/admin/catalog/kits?${params.toString()}`, CatalogKitSchema, {
      auth: true,
    });
  }

  async putAdminCatalogKit(body: CatalogKit): Promise<CatalogKit> {
    return this.request('PUT', '/v1/admin/catalog/kits', CatalogKitSchema, { auth: true, body });
  }

  async massAssignJobs(
    technicianId: string,
    jobCardIds: string[],
  ): Promise<MassAssignResult> {
    return this.request('POST', '/v1/admin/dispatch/mass-assign', MassAssignResultSchema, {
      auth: true,
      body: { technician_id: technicianId, job_card_ids: jobCardIds },
    });
  }

  async getVehicleHistory(vehicleId: string): Promise<VehicleServiceLogList> {
    return this.request(
      'GET',
      `/v1/me/vehicles/${vehicleId}/history`,
      VehicleServiceLogListSchema,
      { auth: true },
    );
  }

  async getAdminVehicleHistory(vehicleId: string): Promise<VehicleServiceLogList> {
    return this.request(
      'GET',
      `/v1/admin/vehicles/${vehicleId}/history`,
      VehicleServiceLogListSchema,
      { auth: true },
    );
  }

  async getAllowedOverrideActions(jobCardId: string): Promise<AllowedOverrideActions> {
    return this.request(
      'GET',
      `/v1/admin/job-cards/${jobCardId}/allowed-override-actions`,
      AllowedOverrideActionsSchema,
      { auth: true },
    );
  }

  async patchAdminJob(jobCardId: string, body: Record<string, unknown>): Promise<AdminJobPatchResponse> {
    return this.request('PATCH', `/v1/admin/job-cards/${jobCardId}`, AdminJobPatchResponseSchema, {
      auth: true,
      body,
    });
  }

  async applyAdminOverride(
    jobCardId: string,
    body: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<OverrideResponse> {
    return this.request(
      'POST',
      `/v1/admin/job-cards/${jobCardId}/override`,
      OverrideResponseSchema,
      { auth: true, body, idempotencyKey },
    );
  }

  async getAdminAuditLogs(params?: {
    resource_type?: string;
    resource_id?: string;
    command?: string;
  }): Promise<AuditLogListResponse> {
    const search = new URLSearchParams();
    if (params?.resource_type) search.set('resource_type', params.resource_type);
    if (params?.resource_id) search.set('resource_id', params.resource_id);
    if (params?.command) search.set('command', params.command);
    const qs = search.toString();
    return this.request('GET', `/v1/admin/audit-logs${qs ? `?${qs}` : ''}`, AuditLogListResponseSchema, {
      auth: true,
    });
  }

  async listTechnicianVisits(date: string): Promise<VisitListResponse> {
    return this.request(
      'GET',
      `/v1/technician/visits?date=${encodeURIComponent(date)}`,
      VisitListResponseSchema,
      { auth: true },
    );
  }

  async getTechnicianVisit(id: string): Promise<TechnicianVisitDetail> {
    return this.request('GET', `/v1/technician/visits/${id}`, TechnicianVisitDetailSchema, {
      auth: true,
    });
  }

  async getTechnicianMe(): Promise<TechnicianMe> {
    return this.request('GET', '/v1/technician/me', TechnicianMeSchema, { auth: true });
  }

  async patchTechnicianDuty(onDuty: boolean): Promise<TechnicianMe> {
    return this.request('PATCH', '/v1/technician/me', TechnicianMeSchema, {
      auth: true,
      body: { on_duty: onDuty },
    });
  }

  async locationPing(body: LocationPingRequest): Promise<LocationPingAccepted> {
    return this.request('POST', '/v1/technician/location-pings', LocationPingAcceptedSchema, {
      auth: true,
      body,
    });
  }

  async visitEnRoute(
    id: string,
    idempotencyKey: string,
    body?: { lat?: number; lng?: number },
  ): Promise<TechnicianVisitDetail> {
    return this.request('POST', `/v1/technician/visits/${id}/en-route`, TechnicianVisitDetailSchema, {
      auth: true,
      body: body ?? {},
      idempotencyKey,
    });
  }

  async visitCheckIn(
    id: string,
    idempotencyKey: string,
    body?: { lat?: number; lng?: number; accuracy_m?: number },
  ): Promise<TechnicianVisitDetail> {
    return this.request('POST', `/v1/technician/visits/${id}/check-in`, TechnicianVisitDetailSchema, {
      auth: true,
      body: body ?? {},
      idempotencyKey,
    });
  }

  async visitStartInspection(id: string, idempotencyKey: string): Promise<TechnicianVisitDetail> {
    return this.request(
      'POST',
      `/v1/technician/visits/${id}/start-inspection`,
      TechnicianVisitDetailSchema,
      { auth: true, idempotencyKey },
    );
  }

  async visitStartService(id: string, idempotencyKey: string): Promise<TechnicianVisitDetail> {
    return this.request(
      'POST',
      `/v1/technician/visits/${id}/start-service`,
      TechnicianVisitDetailSchema,
      { auth: true, idempotencyKey },
    );
  }

  async visitInspectionFindings(
    id: string,
    body: InspectionFindingsSubmit,
    idempotencyKey: string,
  ): Promise<TechnicianVisitDetail> {
    return this.request(
      'POST',
      `/v1/technician/visits/${id}/inspection-findings`,
      TechnicianVisitDetailSchema,
      { auth: true, body, idempotencyKey },
    );
  }

  async visitParts(id: string, body: PartsRequest, idempotencyKey: string): Promise<PartsResponse> {
    return this.request('POST', `/v1/technician/visits/${id}/parts`, PartsResponseSchema, {
      auth: true,
      body,
      idempotencyKey,
    });
  }

  async visitLabour(id: string, body: LabourRequest, idempotencyKey: string): Promise<LabourResponse> {
    return this.request('POST', `/v1/technician/visits/${id}/labour`, LabourResponseSchema, {
      auth: true,
      body,
      idempotencyKey,
    });
  }

  async visitQc(id: string, body: QcRequest, idempotencyKey: string): Promise<TechnicianVisitDetail> {
    return this.request('POST', `/v1/technician/visits/${id}/qc`, TechnicianVisitDetailSchema, {
      auth: true,
      body,
      idempotencyKey,
    });
  }

  async visitComplete(
    id: string,
    idempotencyKey: string,
    body?: { odometer_km?: number },
  ): Promise<TechnicianVisitDetail> {
    return this.request('POST', `/v1/technician/visits/${id}/complete`, TechnicianVisitDetailSchema, {
      auth: true,
      idempotencyKey,
      body,
    });
  }

  async visitException(
    id: string,
    body: ExceptionRequest,
    idempotencyKey: string,
  ): Promise<TechnicianVisitDetail> {
    return this.request(
      'POST',
      `/v1/technician/visits/${id}/exception`,
      TechnicianVisitDetailSchema,
      { auth: true, body, idempotencyKey },
    );
  }

  async visitScopeProgress(
    id: string,
    body: ScopeProgressRequest,
    idempotencyKey: string,
  ): Promise<TechnicianVisitDetail> {
    return this.request(
      'POST',
      `/v1/technician/visits/${id}/scope-progress`,
      TechnicianVisitDetailSchema,
      { auth: true, body, idempotencyKey },
    );
  }

  async createSignedUpload(body: SignedUploadRequest): Promise<SignedUploadResponse> {
    return this.request('POST', '/v1/media/signed-upload', SignedUploadResponseSchema, {
      auth: true,
      body,
    });
  }

  async confirmMedia(assetId: string): Promise<MediaConfirmResponse> {
    return this.request('POST', `/v1/media/${assetId}/confirm`, MediaConfirmResponseSchema, {
      auth: true,
    });
  }

  async assignJob(
    jobCardId: string,
    body: { technician_id: string; visit_type?: string; reason?: string },
    idempotencyKey: string,
  ): Promise<AssignResponse> {
    return this.request('POST', `/v1/admin/jobs/${jobCardId}/assign`, AssignResponseSchema, {
      auth: true,
      body,
      idempotencyKey,
    });
  }

  async listVehicles(): Promise<VehicleListResponse> {
    return this.request('GET', '/v1/me/vehicles', VehicleListResponseSchema, { auth: true });
  }

  async createVehicle(body: VehicleWrite): Promise<Vehicle> {
    return this.request('POST', '/v1/me/vehicles', VehicleSchema, { auth: true, body });
  }

  async patchVehicle(id: string, body: VehicleWrite): Promise<Vehicle> {
    return this.request('PATCH', `/v1/me/vehicles/${id}`, VehicleSchema, { auth: true, body });
  }

  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocode> {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
    return this.request('GET', `/v1/geo/reverse?${params.toString()}`, ReverseGeocodeSchema, {
      auth: false,
    });
  }

  async searchGeocode(query: string): Promise<GeocodeSearchResponse> {
    const params = new URLSearchParams({ q: query });
    return this.request('GET', `/v1/geo/search?${params.toString()}`, GeocodeSearchResponseSchema, {
      auth: false,
    });
  }

  async listAddresses(): Promise<AddressListResponse> {
    return this.request('GET', '/v1/me/addresses', AddressListResponseSchema, { auth: true });
  }

  async createAddress(body: AddressWrite): Promise<Address> {
    return this.request('POST', '/v1/me/addresses', AddressSchema, { auth: true, body });
  }

  async patchAddress(id: string, body: AddressWrite): Promise<Address> {
    return this.request('PATCH', `/v1/me/addresses/${id}`, AddressSchema, { auth: true, body });
  }

  private async request<T>(
    method: string,
    path: string,
    schema: { parse: (data: unknown) => T },
    opts: { auth: AuthMode; body?: unknown; idempotencyKey?: string },
  ): Promise<T> {
    const requestId = newRequestId();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Request-Id': requestId,
    };

    if (opts.auth && this.getAccessToken) {
      const token = await this.getAccessToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }
    if (opts.idempotencyKey) {
      headers['Idempotency-Key'] = opts.idempotencyKey;
    }
    if (this.clientSurface) {
      headers['X-Client-Surface'] = this.clientSurface;
    }

    let body: string | undefined;
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }

    const response = await fetch(`${this.baseUrl}${path}`, { method, headers, body });
    const raw = await response.text();
    let json: unknown = null;
    if (raw) {
      try {
        json = JSON.parse(raw) as unknown;
      } catch {
        json = null;
      }
    }

    if (!response.ok) {
      const problem = ProblemDetailsSchema.safeParse(json);
      throw new ApiError(
        response.status,
        problem.success ? problem.data.message : `Request failed with status ${response.status}`,
        requestId,
        problem.success ? problem.data : null,
      );
    }

    return schema.parse(json);
  }
}
