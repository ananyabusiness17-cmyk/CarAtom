import type { ApiClient } from './client';
import type {
  AdminJobBoardListResponse,
  AdminJobLiteDetail,
  AllowedOverrideActions,
  DispatchBoardReadModel,
  OverrideLiteRequest,
  OverrideResponse,
  AssignResponse,
} from '@caratom/contracts';

/** Typed admin ops surface — wraps ApiClient methods. */
export class AdminApi {
  constructor(private readonly client: ApiClient) {}

  listJobBoard(params?: {
    cursor?: string;
    limit?: number;
    status?: string;
    technician_id?: string;
    area_slug?: string;
    needs_dispatch?: boolean;
    q?: string;
  }): Promise<AdminJobBoardListResponse> {
    return this.client.listJobBoard(params);
  }

  getJobLite(jobCardId: string): Promise<AdminJobLiteDetail> {
    return this.client.getAdminJobLite(jobCardId);
  }

  getDispatchBoard(): Promise<DispatchBoardReadModel> {
    return this.client.getDispatchBoard();
  }

  assignJob(
    jobCardId: string,
    body: { technician_id: string; visit_type?: string; reason?: string },
    idempotencyKey: string,
  ): Promise<AssignResponse> {
    return this.client.assignJob(jobCardId, body, idempotencyKey);
  }

  overrideJobCard(
    jobCardId: string,
    body: OverrideLiteRequest,
    idempotencyKey: string,
  ): Promise<OverrideResponse> {
    return this.client.applyAdminOverride(jobCardId, body, idempotencyKey);
  }

  allowedOverrideActions(jobCardId: string): Promise<AllowedOverrideActions> {
    return this.client.getAllowedOverrideActions(jobCardId);
  }
}
