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

