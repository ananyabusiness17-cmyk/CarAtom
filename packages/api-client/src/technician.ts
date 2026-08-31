import type { ApiClient } from './client';
import type {
  ExceptionRequest,
  InspectionFindingsSubmit,
  LabourRequest,
  LocationPingRequest,
  LocationPingAccepted,
  MediaConfirmResponse,
  PartsRequest,
  QcRequest,
  ScopeProgressRequest,
  SignedUploadRequest,
  TechnicianMe,
  TechnicianVisitDetail,
  VisitListResponse,
} from '@caratom/contracts';

/** Typed technician surface — wraps ApiClient methods. */
export class TechnicianApi {
  constructor(private readonly client: ApiClient) {}

  listVisits(date: string): Promise<VisitListResponse> {
    return this.client.listTechnicianVisits(date);
  }

  getVisit(id: string): Promise<TechnicianVisitDetail> {
    return this.client.getTechnicianVisit(id);
  }

  me(): Promise<TechnicianMe> {
    return this.client.getTechnicianMe();
  }

  patchDuty(onDuty: boolean): Promise<TechnicianMe> {
    return this.client.patchTechnicianDuty(onDuty);
  }

  locationPing(body: LocationPingRequest): Promise<LocationPingAccepted> {
    return this.client.locationPing(body);
  }

  confirmMedia(assetId: string): Promise<MediaConfirmResponse> {
    return this.client.confirmMedia(assetId);
  }

  enRoute(id: string, idempotencyKey: string, body?: { lat?: number; lng?: number }) {
    return this.client.visitEnRoute(id, idempotencyKey, body);
  }

  checkIn(
    id: string,
    idempotencyKey: string,
    body?: { lat?: number; lng?: number; accuracy_m?: number },
  ) {
    return this.client.visitCheckIn(id, idempotencyKey, body);
  }

  startInspection(id: string, idempotencyKey: string) {
    return this.client.visitStartInspection(id, idempotencyKey);
  }

  startService(id: string, idempotencyKey: string) {
    return this.client.visitStartService(id, idempotencyKey);
  }

  inspectionFindings(id: string, body: InspectionFindingsSubmit, idempotencyKey: string) {
    return this.client.visitInspectionFindings(id, body, idempotencyKey);
  }

  parts(id: string, body: PartsRequest, idempotencyKey: string) {
    return this.client.visitParts(id, body, idempotencyKey);
  }

  labour(id: string, body: LabourRequest, idempotencyKey: string) {
    return this.client.visitLabour(id, body, idempotencyKey);
  }

  qc(id: string, body: QcRequest, idempotencyKey: string) {
    return this.client.visitQc(id, body, idempotencyKey);
  }

  complete(id: string, idempotencyKey: string, body?: { odometer_km?: number }) {
    return this.client.visitComplete(id, idempotencyKey, body);
  }

  exception(id: string, body: ExceptionRequest, idempotencyKey: string) {
    return this.client.visitException(id, body, idempotencyKey);
  }

  scopeProgress(id: string, body: ScopeProgressRequest, idempotencyKey: string) {
    return this.client.visitScopeProgress(id, body, idempotencyKey);
  }

  signedUpload(body: SignedUploadRequest) {
    return this.client.createSignedUpload(body);
  }
}
