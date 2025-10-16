# Contacts API Server

שרת Node.js עם מסד נתונים SQLite לניהול אנשי קשר.

## התקנה

1. התקן את התלויות:
```bash
npm install
```

## הפעלה

```bash
# הפעלה רגילה
npm start

# הפעלה עם nodemon (עבור פיתוח)
npm run dev
```

## API Endpoints

### אנשי קשר (Contacts)

- `GET /api/contacts` - קבלת כל אנשי הקשר
- `GET /api/contacts/:id` - קבלת איש קשר לפי ID
- `POST /api/contacts` - יצירת איש קשר חדש
- `PUT /api/contacts/:id` - עדכון איש קשר
- `DELETE /api/contacts/:id` - מחיקת איש קשר
- `GET /api/contacts/search/:term` - חיפוש אנשי קשר
- `GET /api/contacts/stats/count` - ספירת אנשי קשר

### דוגמאות לשימוש

#### יצירת איש קשר חדש
```bash
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "יוסי כהן",
    "phone": "050-1234567",
    "email": "yossi@example.com",
    "address": "רחוב הרצל 10, תל אביב"
  }'
```

#### קבלת כל אנשי הקשר
```bash
curl http://localhost:3000/api/contacts
```

#### עדכון איש קשר
```bash
curl -X PUT http://localhost:3000/api/contacts/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "יוסי כהן - עודכן",
    "phone": "050-1234567",
    "email": "yossi.updated@example.com",
    "address": "רחוב הרצל 15, תל אביב"
  }'
```

#### חיפוש אנשי קשר
```bash
curl http://localhost:3000/api/contacts/search/יוסי
```

## מבנה מסד הנתונים

### טבלת contacts
- `id` - מזהה ייחודי (INTEGER PRIMARY KEY AUTOINCREMENT)
- `name` - שם איש הקשר (TEXT NOT NULL)
- `phone` - מספר טלפון (TEXT NOT NULL)
- `email` - כתובת אימייל (TEXT)
- `address` - כתובת (TEXT)
- `created_at` - תאריך יצירה (DATETIME DEFAULT CURRENT_TIMESTAMP)
- `updated_at` - תאריך עדכון אחרון (DATETIME DEFAULT CURRENT_TIMESTAMP)

## נתונים לדוגמה

השרת כולל 5 אנשי קשר לדוגמה שנטענים אוטומטית בהפעלה הראשונה.
