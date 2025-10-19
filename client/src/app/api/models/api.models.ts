// מודלים וטיפוסים עבור API

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface HelloResponse {
  message: string;
}

export interface ApiEndpoints {
  hello: string;
}

export const API_ENDPOINTS: ApiEndpoints = {
  hello: '/api/hello'
} as const;

// Interfaces for outgoing checks
export interface CreateOutgoingCheckRequest {
  check_number: string;
  payee_name: string;
  id_number: string;
  identifier_type: string;
  phone?: string;
  bank_branch?: string;
  account_number?: string;
  amount: number;
  issue_date: string;
  due_date: string;
  is_physical: boolean;
  notes?: string;
}

export interface CreateOutgoingSeriesRequest {
  payee_name: string;
  id_number: string;
  identifier_type: string;
  phone?: string;
  bank_branch?: string;
  account_number?: string;
  amount: number;
  day_of_month: number;
  total_checks: number;
  start_month: string;
}






