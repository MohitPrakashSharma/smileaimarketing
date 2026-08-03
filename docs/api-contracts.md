# API Contracts

This document outlines the API endpoints, input/output structures, rate limits, and authentication constraints.

---

## 1. Public API Endpoints

### Inbound Initial Audit Trigger
- **Endpoint**: `POST /api/audit/inbound-trigger`
- **Rate Limit**: 5 requests per IP per hour.
- **Request Payload**:
  ```json
  {
    "website": "https://www.brightsmiles.com",
    "city": "Chicago",
    "clinicName": "Bright Smiles Dental",
    "country": "US"
  }
  ```
- **Response (202 Accepted)**:
  ```json
  {
    "pendingAuditId": "aud_8f9e2b10-6c9a",
    "preliminaryFindings": {
      "sslValid": true,
      "pageSpeedEstimate": "MOBILE_SLOW",
      "mobileOptimized": false
    }
  }
  ```

### Unlock Full Audit Report
- **Endpoint**: `POST /api/audit/unlock-lead`
- **Rate Limit**: 5 requests per IP per hour.
- **Request Payload**:
  ```json
  {
    "pendingAuditId": "aud_8f9e2b10-6c9a",
    "firstName": "John",
    "lastName": "Doe",
    "email": "dr.john@brightsmiles.com",
    "role": "Dentist & Owner",
    "phone": "312-555-0199",
    "consent": true
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "publicToken": "tok_3a7b9c1d-8e5f-4a0b-9c2d",
    "redirectUrl": "/audit/tok_3a7b9c1d-8e5f-4a0b-9c2d"
  }
  ```

### Fetch Audit Report Details
- **Endpoint**: `GET /api/audit/[publicToken]`
- **Authentication**: None (guarded by the high-entropy non-sequential token).
- **Response (200 OK)**:
  ```json
  {
    "business": {
      "name": "Bright Smiles Dental",
      "website": "https://www.brightsmiles.com",
      "city": "Chicago",
      "opportunityScore": 72
    },
    "scorecard": {
      "localVisibility": 18,
      "websiteQuality": 12,
      "conversionExperience": 15,
      "reviewsReputation": 12,
      "competitorGap": 15
    },
    "findings": [
      {
        "category": "LOCAL_VISIBILITY",
        "score": 18,
        "detail": "Your clinic is ranking #6 on the Google Maps Pack for local search. Competitors in a 2-mile radius are capturing 70% of the map clicks."
      }
    ],
    "competitors": [
      { "name": "Apex Dental Chicago", "rank": 1 },
      { "name": "Loop Dental Care", "rank": 2 }
    ]
  }
  ```

### Schedule Online Consultation
- **Endpoint**: `POST /api/audit/[publicToken]/book-meeting`
- **Request Payload**:
  ```json
  {
    "scheduledTime": "2026-08-15T10:00:00.000Z",
    "durationMinutes": 15,
    "notes": "Discuss local SEO gap analysis."
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "appointmentId": "apt_b3c2d1-e5f6",
    "status": "SCHEDULED",
    "joinUrl": "https://meet.google.com/xyz-pdq-abc"
  }
  ```

### Request In-Person Clinic Visit
- **Endpoint**: `POST /api/audit/[publicToken]/request-visit`
- **Request Payload**:
  ```json
  {
    "address": "123 N Michigan Ave, Chicago, IL 60601",
    "preferredWindow": "Next Tuesday morning, 9 AM - 11 AM",
    "notes": "I would like a salesperson to drop off the physical audit binder."
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "appointmentId": "apt_f4e5d6-a1b2",
    "status": "REQUESTED_CONFIRMATION"
  }
  ```

### Unsubscribe Opt-Out
- **Endpoint**: `POST /api/unsubscribe`
- **Request Payload**:
  ```json
  {
    "email": "dr.john@brightsmiles.com",
    "unsubscribeToken": "unsub_7c8d9e0f"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "You have been successfully unsubscribed from all marketing communications."
  }
  ```

---

## 2. Admin API Endpoints

All admin endpoints must be authenticated and authorized. The API uses a session cookie check (`NextResponse` middleware) rejecting requests without admin privileges.

### List Discovered Businesses
- **Endpoint**: `GET /api/admin/businesses`
- **Query Params**: `campaignId=abc`, `city=Chicago`, `status=DISCOVERED`
- **Response (200 OK)**:
  ```json
  {
    "businesses": [
      {
        "id": "bus_1a2b3c",
        "name": "Bright Smiles Dental",
        "website": "https://www.brightsmiles.com",
        "city": "Chicago",
        "opportunityScore": 72,
        "status": "DISCOVERED"
      }
    ]
  }
  ```

### Approve Outreach Sequence
- **Endpoint**: `POST /api/admin/outreach/approve`
- **Request Payload**:
  ```json
  {
    "businessId": "bus_1a2b3c"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "status": "OUTREACH_ACTIVE",
    "messageId": "msg_9e8d7c6b5a"
  }
  ```

### Email Webhook Receiver
- **Endpoint**: `POST /api/webhooks/email-events`
- **Security**: Requires HMAC signature verification header `X-Webhook-Signature` matching SHA-256 hash of the payload using `WEBHOOK_SECRET`.
- **Request Payload**:
  ```json
  {
    "event": "opened",
    "messageId": "msg_9e8d7c6b5a",
    "timestamp": "2026-08-04T12:00:00.000Z",
    "details": {
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "received": true
  }
  ```
