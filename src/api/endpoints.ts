import { http } from './http';

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface TenantBrief {
  code: string;
  name: string;
  plan?: string;
  status?: string;
}

export const authApi = {
  login: (tenantCode: string | undefined, username: string, password: string) =>
    http.post<any, any>('/auth/login', { tenantCode, username, password }),
  me: () => http.get<any, any>('/auth/me'),
  logout: () => http.post<any, any>('/auth/logout'),
  tenantBrief: (code: string) => http.get<any, TenantBrief>('/auth/tenant-brief', { params: { code } }),
  changePassword: (oldPassword: string, newPassword: string) =>
    http.post<any, any>('/auth/change-password', { oldPassword, newPassword }),
};

export const docApi = {
  list: (params: any) => http.get<any, Page<any>>('/kb/documents', { params }),
  upload: (fd: FormData) =>
    http.post<any, any>('/kb/documents', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  remove: (id: number) => http.delete(`/kb/documents/${id}`),
  retry: (id: number) => http.post(`/kb/documents/${id}/retry`),
};

export const faqApi = {
  list: (params: any) => http.get<any, Page<any>>('/kb/faqs', { params }),
  create: (body: any) => http.post<any, any>('/kb/faqs', body),
  update: (id: number, body: any) => http.put<any, any>(`/kb/faqs/${id}`, body),
  remove: (id: number) => http.delete(`/kb/faqs/${id}`),
  reindex: () =>
    http.post<any, { total: number; ok: number; failed: number }>('/kb/faqs/reindex'),
};

// P004-B F003 FAQ 分组
export interface FaqGroup {
  id: number;
  tenantId: number;
  name: string;
  description?: string;
  sortOrder: number;
  faqCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FaqGroupBody {
  name?: string;
  description?: string;
  sortOrder?: number;
}

export const faqGroupApi = {
  list: () => http.get<any, FaqGroup[]>('/kb/faq-groups'),
  create: (body: FaqGroupBody) => http.post<any, FaqGroup>('/kb/faq-groups', body),
  update: (id: number, body: FaqGroupBody) => http.put<any, FaqGroup>(`/kb/faq-groups/${id}`, body),
  remove: (id: number) => http.delete(`/kb/faq-groups/${id}`),
};

export const handoffApi = {
  list: (params: any) => http.get<any, Page<any>>('/handoff', { params }),
  close: (id: number, reason = 'MANUAL') =>
    http.post(`/handoff/${id}/close`, null, { params: { reason } }),
};

export const auditApi = {
  listLlm: (params: any) => http.get<any, Page<any>>('/admin/audit/llm', { params }),
  detail: (id: number) => http.get<any, any>(`/admin/audit/llm/${id}`),
  adminLogs: (params: any) => http.get<any, Page<any>>('/admin/audit/admin-logs', { params }),
};

export const sensitiveApi = {
  list: (params: any) => http.get<any, Page<any>>('/admin/sensitive/words', { params }),
  create: (body: any) => http.post<any, any>('/admin/sensitive/words', body),
  update: (id: number, body: any) =>
    http.put<any, any>(`/admin/sensitive/words/${id}`, body),
  remove: (id: number) => http.delete(`/admin/sensitive/words/${id}`),
  test: (text: string) => http.post<any, any>('/admin/sensitive/test', { text }),
  hits: (params: any) => http.get<any, Page<any>>('/admin/sensitive/hits', { params }),
  reload: () => http.post('/admin/sensitive/reload'),
};

export const adminApi = {
  listUsers: (params: any) => http.get<any, Page<any>>('/admin/users', { params }),
  createUser: (body: any) => http.post<any, any>('/admin/users', body),
  updateUser: (id: number, body: any) => http.put<any, any>(`/admin/users/${id}`, body),
  deleteUser: (id: number) => http.delete(`/admin/users/${id}`),
  listRoles: () => http.get<any, any[]>('/admin/roles'),
  allPermissions: () => http.get<any, any[]>('/admin/roles/permissions'),
  createRole: (body: any) => http.post<any, any>('/admin/roles', body),
  updateRole: (id: number, body: any) => http.put<any, any>(`/admin/roles/${id}`, body),
  deleteRole: (id: number) => http.delete(`/admin/roles/${id}`),
  listGroupMappings: (params: any) =>
    http.get<any, Page<any>>('/admin/group-mappings', { params }),
  upsertGroupMapping: (body: any) => http.post<any, any>('/admin/group-mappings', body),
  deleteGroupMapping: (id: number) => http.delete(`/admin/group-mappings/${id}`),
};

export const statsApi = {
  summary: (days = 7) => http.get<any, any>('/admin/stats/summary', { params: { days } }),
  trend: (days = 7) => http.get<any, any[]>('/admin/stats/trend', { params: { days } }),
  circuit: () => http.get<any, any>('/admin/stats/circuit'),
};

export type LlmPurpose = 'chat' | 'embedding' | 'rerank';

export interface LlmConfig {
  id: number;
  tenantId: number;
  provider: string;
  purpose: LlmPurpose;
  apiKeyTail: string;
  baseUrl?: string;
  model: string;
  embeddingDim?: number;
  params?: Record<string, unknown>;
  isDefault: boolean;
  enabled: boolean;
  lastTestAt?: string;
  lastTestOk?: boolean;
  lastTestMsg?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LlmConfigBody {
  provider?: string;
  purpose: LlmPurpose;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  embeddingDim?: number;
  params?: Record<string, unknown>;
  isDefault?: boolean;
  enabled?: boolean;
}

export const llmConfigApi = {
  list: () => http.get<any, LlmConfig[]>('/admin/llm-configs'),
  create: (body: LlmConfigBody) => http.post<any, LlmConfig>('/admin/llm-configs', body),
  update: (id: number, body: LlmConfigBody) => http.put<any, LlmConfig>(`/admin/llm-configs/${id}`, body),
  remove: (id: number) => http.delete(`/admin/llm-configs/${id}`),
  test: (id: number) => http.post<any, { ok: boolean; message: string; latencyMs: number }>(`/admin/llm-configs/${id}/test`),
};

export interface PlaygroundCandidate {
  chunkId: number;
  docId: number;
  docTitle?: string;
  docTags?: string[];
  content: string;
  enabled: boolean;
  rawScore: number;
  sourceWeight: number;
  rerankScore?: number | null;
  finalScore: number;
}

export interface PlaygroundResult {
  faqHit?: {
    faqId: number;
    question: string;
    answer: string;
    confidence: number;
    matchedBy?: string;
  } | null;
  candidates: PlaygroundCandidate[];
  topK: number;
  threshold: number;
  elapsedMs: number;
  errorMsg?: string;
  rerankUsed: boolean;
  disableRerank: boolean;
  rerankStatus?: 'ok' | 'failed' | 'disabled' | 'not_configured' | null;
  rerankProvider?: string | null;
  rerankModel?: string | null;
}

export interface PlaygroundBody {
  query: string;
  topK?: number;
  threshold?: number;
  docIds?: number[];
  tags?: string[];
  disableRerank?: boolean;
}

export const playgroundApi = {
  search: (body: PlaygroundBody) => http.post<any, PlaygroundResult>('/admin/kb/playground', body),
};

export interface ChunkDetail {
  id: number;
  docId: number;
  docTitle?: string;
  docTags?: string[];
  content: string;
  enabled: boolean;
  meta?: Record<string, unknown>;
  createdAt?: string;
  prevId?: number;
  prevPreview?: string;
  nextId?: number;
  nextPreview?: string;
}

export interface ChunkListItem {
  id: number;
  content: string;
  enabled: boolean;
  length: number;
}

export interface PlaygroundLogItem {
  id: number;
  query: string;
  topK: number;
  threshold?: number;
  hitCount: number;
  topScore?: number;
  topChunkId?: number;
  latencyMs?: number;
  rerankUsed: boolean;
  filters?: Record<string, unknown>;
  createdAt: string;
}

export const chunkApi = {
  get: (id: number) => http.get<any, ChunkDetail>(`/admin/kb/chunks/${id}`),
  listByDoc: (docId: number, params: { page?: number; size?: number }) =>
    http.get<any, Page<ChunkListItem>>(`/admin/kb/documents/${docId}/chunks`, { params }),
  recentLogs: (docId: number, limit = 10) =>
    http.get<any, PlaygroundLogItem[]>(`/admin/kb/documents/${docId}/playground-logs`, { params: { limit } }),
};

// P004-A F001 租户企微应用自助管理
export interface WecomApp {
  id: number;
  name: string;
  corpId: string;
  agentId: number;
  tokenTail?: string;
  aesKeyTail?: string;
  secretTail?: string;
  botUserid?: string;
  apiBase?: string;
  enabled: boolean;
  status: 'NOT_VERIFIED' | 'VERIFIED' | 'FAILED';
  verifiedAt?: string;
  lastTestAt?: string;
  lastTestOk?: boolean;
  lastTestMsg?: string;
  csAgentId?: number | null;
  csAgentName?: string | null;
  callbackUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WecomAppBody {
  name?: string;
  corpId?: string;
  agentId?: number;
  token?: string;
  aesKey?: string;
  secret?: string;
  botUserid?: string;
  apiBase?: string;
  enabled?: boolean;
}

export const wecomAppApi = {
  list: () => http.get<any, WecomApp[]>('/admin/wecom-apps'),
  get: (id: number) => http.get<any, WecomApp>(`/admin/wecom-apps/${id}`),
  create: (body: WecomAppBody) => http.post<any, WecomApp>('/admin/wecom-apps', body),
  update: (id: number, body: WecomAppBody) => http.put<any, WecomApp>(`/admin/wecom-apps/${id}`, body),
  remove: (id: number) => http.delete(`/admin/wecom-apps/${id}`),
  test: (id: number) =>
    http.post<any, { ok: boolean; message: string; latencyMs: number }>(`/admin/wecom-apps/${id}/test`),
  callbackUrl: (id: number) => http.get<any, { callbackUrl: string }>(`/admin/wecom-apps/${id}/callback-url`),
};

// P004-A F002 租户智能客服（CS Agent）
export interface CsAgent {
  id: number;
  tenantId: number;
  name: string;
  code: string;
  description?: string;
  avatarUrl?: string;
  personaPrompt?: string;
  greeting?: string;
  chatLlmConfigId?: number | null;
  chatLlmConfigLabel?: string | null;
  enabled: boolean;
  boundWecomAppId?: number | null;
  boundWecomAppName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CsAgentBody {
  name?: string;
  code?: string;
  description?: string;
  avatarUrl?: string;
  personaPrompt?: string;
  greeting?: string;
  chatLlmConfigId?: number | null;
  enabled?: boolean;
}

export const csAgentApi = {
  list: () => http.get<any, CsAgent[]>('/admin/cs-agents'),
  get: (id: number) => http.get<any, CsAgent>(`/admin/cs-agents/${id}`),
  create: (body: CsAgentBody) => http.post<any, CsAgent>('/admin/cs-agents', body),
  update: (id: number, body: CsAgentBody) => http.put<any, CsAgent>(`/admin/cs-agents/${id}`, body),
  remove: (id: number) => http.delete(`/admin/cs-agents/${id}`),
  bind: (id: number, wecomAppId: number) =>
    http.post<any, CsAgent>(`/admin/cs-agents/${id}/bindings`, { wecomAppId }),
  unbind: (id: number, wecomAppId: number) =>
    http.delete<any, CsAgent>(`/admin/cs-agents/${id}/bindings/${wecomAppId}`),
};

// P004-B F004 智能客服内容归属
export interface CsAgentFaqGroupMappingItem {
  faqGroupId: number;
  name: string;
  faqCount: number;
  createdAt?: string;
}

export interface CsAgentDocumentMappingItem {
  kbDocumentId: number;
  title: string;
  status: string;
  createdAt?: string;
}

export const csAgentMappingApi = {
  listFaqGroups: (agentId: number) =>
    http.get<any, CsAgentFaqGroupMappingItem[]>(`/admin/cs-agents/${agentId}/faq-groups`),
  replaceFaqGroups: (agentId: number, ids: number[]) =>
    http.put<any, CsAgentFaqGroupMappingItem[]>(`/admin/cs-agents/${agentId}/faq-groups`, { ids }),
  listDocuments: (agentId: number) =>
    http.get<any, CsAgentDocumentMappingItem[]>(`/admin/cs-agents/${agentId}/documents`),
  replaceDocuments: (agentId: number, ids: number[]) =>
    http.put<any, CsAgentDocumentMappingItem[]>(`/admin/cs-agents/${agentId}/documents`, { ids }),
};

// P005 F003 企微消息审计
export interface WecomMessageListItem {
  id: number;
  createdAt: string;
  wecomAppId?: number | null;
  wecomAppName?: string | null;
  chatId: string;
  fromUserid?: string;
  msgType: string;
  contentPreview?: string;
  verifyStatus: 'VERIFIED' | 'REJECTED' | 'UNKNOWN';
  mentionedBot?: boolean;
}

export interface WecomMessageDetail {
  id: number;
  tenantId: number;
  wecomAppId?: number | null;
  wecomApp?: { id: number; name: string; corpId: string; agentId: number } | null;
  csAgent?: { id: number; name: string; code: string } | null;
  msgId: string;
  chatId: string;
  fromUserid?: string;
  fromName?: string;
  msgType: string;
  content?: string;
  mentionedList?: string[];
  verifyStatus: 'VERIFIED' | 'REJECTED' | 'UNKNOWN';
  raw?: string;
  encryptedPayload?: string;
  msgSignature?: string;
  timestamp?: string;
  nonce?: string;
  createdAt: string;
  linkedSessionMsgId?: number | null;
}

export interface WecomMessageQuery {
  wecomAppId?: number;
  chatId?: string;
  fromUserid?: string;
  msgType?: string;
  from?: string;
  to?: string;
  mentionBotOnly?: boolean;
  page?: number;
  size?: number;
}

export const wecomMessageApi = {
  list: (params: WecomMessageQuery) =>
    http.get<any, Page<WecomMessageListItem>>('/admin/wecom-messages', { params }),
  detail: (id: number) => http.get<any, WecomMessageDetail>(`/admin/wecom-messages/${id}`),
};
