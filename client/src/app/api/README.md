# API Module

תיקייה זו מכילה את כל הקוד הקשור לתקשורת עם השרת.

## מבנה התיקיות

```
api/
├── models/           # טיפוסים ומודלים
│   └── api.models.ts
├── services/         # שירותי API
│   └── api.service.ts
├── index.ts          # Export מרכזי
└── README.md         # תיעוד
```

## שימוש

```typescript
import { ApiService, HelloResponse } from './api';

// בקומפוננטה
constructor(private apiService: ApiService) {}

// קריאה לשרת
this.apiService.getHello().subscribe({
  next: (response: HelloResponse) => {
    console.log(response.message);
  },
  error: (error) => {
    console.error('שגיאה:', error);
  }
});
```

## הוספת endpoints חדשים

1. הוסף את ה-endpoint ל-`api.models.ts`:
```typescript
export const API_ENDPOINTS = {
  hello: '/api/hello',
  newEndpoint: '/api/new-endpoint'  // הוסף כאן
} as const;
```

2. הוסף את הפונקציה ל-`api.service.ts`:
```typescript
getNewData(): Observable<NewResponse> {
  const url = `${this.baseUrl}${API_ENDPOINTS.newEndpoint}`;
  return this.http.get<NewResponse>(url).pipe(
    catchError(this.handleError)
  );
}
```

3. הוסף את הטיפוס ל-`api.models.ts`:
```typescript
export interface NewResponse {
  // הגדר כאן את המבנה
}
```

test