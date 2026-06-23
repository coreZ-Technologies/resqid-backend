-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIAL', 'EXPIRED', 'CANCELLED', 'SUSPENDED', 'PAYMENT_FAILED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'PROCESSING');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PROCESSING', 'PRINTED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ScanType" AS ENUM ('RFID_TAP', 'QR_EMERGENCY', 'QR_ID_CHECK', 'MANUAL_ENTRY');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('SUCCESS', 'FAILED', 'BLOCKED', 'ANOMALOUS');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Board" AS ENUM ('ICSE', 'CBSE', 'WB_BOARD', 'STATE_BOARD', 'IB', 'CAMBRIDGE', 'OTHER');

-- CreateEnum
CREATE TYPE "SchoolStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'TRIAL');

-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('PRIMARY', 'SECONDARY', 'HIGHER_SECONDARY', 'K12', 'PRE_SCHOOL', 'OTHER');

-- CreateEnum
CREATE TYPE "SchoolAffiliation" AS ENUM ('GOVERNMENT', 'PRIVATE', 'AIDED', 'UNAIDED', 'INTERNATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VisibilityLevel" AS ENUM ('PUBLIC', 'MINIMAL', 'HIDDEN');

-- CreateEnum
CREATE TYPE "Relationship" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN', 'GRANDPARENT', 'SIBLING', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('BIRTH_CERTIFICATE', 'TRANSFER_CERTIFICATE', 'MEDICAL_REPORT', 'IMMUNIZATION_RECORD', 'ID_PROOF', 'PASSPORT', 'AADHAR_CARD', 'PARENT_ID', 'PHOTO', 'OTHER');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('RFID', 'QR', 'NFC', 'COMBO');

-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('UNREGISTERED', 'ISSUED', 'ACTIVE', 'INACTIVE', 'REVOKED', 'LOST', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ScanResult" AS ENUM ('INVALID', 'UNREGISTERED', 'ISSUED', 'INACTIVE', 'REVOKED', 'ACTIVE', 'BLOCKED', 'SUSPICIOUS', 'EXPIRED');

-- CreateEnum
CREATE TYPE "QrFormat" AS ENUM ('PNG', 'SVG', 'PDF');

-- CreateEnum
CREATE TYPE "SchoolUserRole" AS ENUM ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'MAINTENANCE', 'BLOCKED', 'UNREGISTERED', 'CONFIGURING', 'ERROR');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'HALF_DAY', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('MORNING', 'AFTERNOON', 'FULL_DAY', 'EVENT', 'EXAM', 'STAFF_MEETING', 'DUTY');

-- CreateEnum
CREATE TYPE "AttendanceMode" AS ENUM ('RFID', 'BIOMETRIC', 'QR_CODE', 'MANUAL', 'GPS', 'SELF');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('JSON', 'PDF', 'CSV', 'EXCEL');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('STUDENT', 'STAFF', 'CLASS', 'DAILY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SummaryPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "AnnouncementPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AnnouncementTarget" AS ENUM ('ALL', 'GRADE', 'SECTION', 'STUDENT', 'PARENT', 'STAFF', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('SCHOOL_TO_PARENT', 'PARENT_TO_SCHOOL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('GENERAL', 'ATTENDANCE', 'FEE_REMINDER', 'EVENT_INVITATION', 'REPORT_CARD', 'EMERGENCY', 'ABSENT_NOTIFICATION', 'HOMEWORK', 'EXAM_SCHEDULE', 'PAYMENT_RECEIPT', 'TIMETABLE_CHANGE', 'SUBSTITUTION_ALERT', 'CRISIS_ALERT');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'DELIVERED', 'READ', 'REPLIED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmergencyContactRelation" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN', 'GRANDPARENT', 'SIBLING', 'RELATIVE', 'FAMILY_DOCTOR', 'NEIGHBOR', 'OTHER');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "EmergencySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('INJURY', 'ILLNESS', 'ALLERGIC_REACTION', 'ASTHMA_ATTACK', 'ACCIDENT', 'SEIZURE', 'FAINTING', 'BLEEDING', 'FRACTURE', 'BURN', 'POISONING', 'HEAD_INJURY', 'BREATHING_DIFFICULTY', 'DIABETIC_EMERGENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'FOLLOW_UP_NEEDED');

-- CreateEnum
CREATE TYPE "DrillType" AS ENUM ('FIRE', 'EARTHQUAKE', 'LOCKDOWN', 'MEDICAL', 'EVACUATION', 'CHEMICAL_SPILL', 'FLOOD', 'OTHER');

-- CreateEnum
CREATE TYPE "DrillStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'CONDUCTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('REGULAR', 'LAB', 'COMPUTER_LAB', 'AUDIO_VISUAL', 'LIBRARY', 'SPORTS', 'AUDITORIUM', 'STAFF_ROOM', 'OTHER');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'UNDER_MAINTENANCE', 'RESERVED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TimetableStatus" AS ENUM ('DRAFT', 'GENERATING', 'GENERATED', 'REVIEWED', 'PUBLISHED', 'ARCHIVED', 'FAILED');

-- CreateEnum
CREATE TYPE "GenerationType" AS ENUM ('FRESH', 'INCREMENTAL', 'FROM_EXISTING', 'MANUAL', 'CRISIS_UPDATE');

-- CreateEnum
CREATE TYPE "CrisisType" AS ENUM ('TEACHER_ABSENT', 'ROOM_UNAVAILABLE', 'PARTIAL_RESCHEDULE', 'MASS_LEAVE', 'WEATHER_EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "CrisisSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CrisisStatus" AS ENUM ('REPORTED', 'ANALYZING', 'RESOLVED', 'PARTIALLY_RESOLVED', 'UNRESOLVED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('GENERATE_TIMETABLE', 'VALIDATE_TIMETABLE', 'CRISIS_HANDLING', 'BULK_UPLOAD', 'EXPORT');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubstitutionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('REGULAR', 'LAB', 'SPORTS', 'ASSEMBLY', 'DOUBLE_PERIOD', 'SUBSTITUTION');

-- CreateEnum
CREATE TYPE "GradeLevel" AS ENUM ('PRE_PRIMARY', 'PRIMARY', 'UPPER_PRIMARY', 'MIDDLE', 'SECONDARY', 'SENIOR_SECONDARY');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'SYSTEM', 'API', 'ANONYMOUS');

-- CreateEnum
CREATE TYPE "AuditEntity" AS ENUM ('SCHOOL', 'USER', 'TEACHER', 'STUDENT', 'PARENT', 'TIMETABLE', 'TIMETABLE_TEMPLATE', 'CLASS_GROUP', 'SUBJECT', 'ROOM', 'SUBSTITUTION', 'CRISIS_EVENT', 'WELLNESS', 'CONSTRAINT_PRESET', 'BULK_UPLOAD', 'ATTENDANCE', 'SCAN', 'NOTIFICATION', 'FEATURE_FLAG', 'SUBSCRIPTION', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'EMAIL', 'PUSH', 'IN_APP', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED', 'BOUNCED', 'SPAM');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('ATTENDANCE', 'FEE', 'EXAM', 'EVENT', 'EMERGENCY', 'ANNOUNCEMENT', 'SCAN_ALERT', 'HOMEWORK', 'REPORT_CARD', 'SYSTEM', 'OTHER');

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "pricePerStudent" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "modules" TEXT[],
    "maxStudents" INTEGER,
    "maxTeachers" INTEGER,
    "maxSchools" INTEGER NOT NULL DEFAULT 1,
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "isTrialAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "modules" TEXT[],
    "studentCount" INTEGER NOT NULL,
    "teacherCount" INTEGER NOT NULL DEFAULT 0,
    "pricePerStudentPaise" INTEGER NOT NULL,
    "totalAmountPaise" INTEGER NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "nextBillingDate" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "gateway" TEXT,
    "gatewayOrderId" TEXT,
    "gatewayPaymentId" TEXT,
    "gatewaySignature" TEXT,
    "gatewayResponse" JSONB,
    "invoiceId" TEXT,
    "attemptedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundAmount" INTEGER,
    "refundReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "subtotalPaise" INTEGER NOT NULL,
    "taxPaise" INTEGER NOT NULL DEFAULT 0,
    "discountPaise" INTEGER NOT NULL DEFAULT 0,
    "totalPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "invoiceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "quantity" INTEGER NOT NULL,
    "itemType" TEXT NOT NULL,
    "totalAmountPaise" INTEGER NOT NULL,
    "shippingAddress" JSONB,
    "trackingNumber" TEXT,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "studentName" TEXT,
    "studentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "printedAt" TIMESTAMP(3),

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scans" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "tokenId" TEXT,
    "type" "ScanType" NOT NULL,
    "status" "ScanStatus" NOT NULL DEFAULT 'SUCCESS',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "initiatedBy" TEXT,
    "deviceId" TEXT,
    "deviceIp" TEXT,
    "userAgent" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "attendanceDeviceId" TEXT,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_anomalies" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,

    CONSTRAINT "scan_anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "board" "Board" NOT NULL DEFAULT 'OTHER',
    "type" "SchoolType" NOT NULL DEFAULT 'K12',
    "affiliation" "SchoolAffiliation" NOT NULL DEFAULT 'PRIVATE',
    "estYear" INTEGER,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'India',
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "academicYearStart" TIMESTAMP(3),
    "academicYearEnd" TIMESTAMP(3),
    "schoolStartTime" TEXT,
    "schoolEndTime" TEXT,
    "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "currentTerm" TEXT,
    "planId" TEXT,
    "status" "SchoolStatus" NOT NULL DEFAULT 'TRIAL',
    "features" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "bloodGroup" "BloodGroup",
    "photoUrl" TEXT,
    "grade" TEXT,
    "section" TEXT,
    "rollNumber" TEXT,
    "studentId" TEXT,
    "classGroupId" TEXT,
    "allergies" TEXT[],
    "conditions" TEXT[],
    "medications" TEXT[],
    "medicalNotes" TEXT,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "graduatedAt" TIMESTAMP(3),
    "cardVisibilityId" TEXT,
    "transportRoute" TEXT,
    "transportStop" TEXT,
    "rfidTagNumber" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_visibility" (
    "id" TEXT NOT NULL,
    "visibility" "VisibilityLevel" NOT NULL DEFAULT 'PUBLIC',
    "showName" BOOLEAN NOT NULL DEFAULT true,
    "showBloodGroup" BOOLEAN NOT NULL DEFAULT true,
    "showAllergies" BOOLEAN NOT NULL DEFAULT false,
    "showConditions" BOOLEAN NOT NULL DEFAULT false,
    "showMedications" BOOLEAN NOT NULL DEFAULT false,
    "showEmergencyContacts" BOOLEAN NOT NULL DEFAULT true,
    "showParentInfo" BOOLEAN NOT NULL DEFAULT false,
    "showTransportInfo" BOOLEAN NOT NULL DEFAULT false,
    "showPhoto" BOOLEAN NOT NULL DEFAULT true,
    "showGrade" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_visibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_documents" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" TEXT NOT NULL,
    "studentId" TEXT,
    "schoolId" TEXT NOT NULL,
    "type" "TokenType" NOT NULL DEFAULT 'QR',
    "rfidUid" TEXT,
    "qrCode" TEXT,
    "qrCodeHash" TEXT,
    "scanCode" TEXT,
    "scanCodeHash" TEXT,
    "scanCodeEncryptedAt" TIMESTAMP(3),
    "qrGenerated" BOOLEAN NOT NULL DEFAULT false,
    "qrFormat" "QrFormat",
    "qrWidthPx" INTEGER,
    "qrHeightPx" INTEGER,
    "qrFileSizeKb" DOUBLE PRECISION,
    "qrAssetUrl" TEXT,
    "qrGeneratedAt" TIMESTAMP(3),
    "qrRegeneratedAt" TIMESTAMP(3),
    "qrRegenerationCount" INTEGER NOT NULL DEFAULT 0,
    "qrForegroundColor" TEXT DEFAULT '#000000',
    "qrBackgroundColor" TEXT DEFAULT '#FFFFFF',
    "qrLogoUrl" TEXT,
    "qrErrorCorrection" TEXT DEFAULT 'M',
    "status" "TokenStatus" NOT NULL DEFAULT 'UNREGISTERED',
    "issuedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokeReason" TEXT,
    "label" TEXT,
    "notes" TEXT,
    "batchId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanLog" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" "ScanResult" NOT NULL,
    "scanType" TEXT,
    "scanPurpose" TEXT,
    "scannerId" TEXT,
    "scannerName" TEXT,
    "ipAddress" TEXT,
    "city" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "device" TEXT,
    "deviceModel" TEXT,
    "os" TEXT,
    "browser" TEXT,
    "userAgent" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "isSuspicious" BOOLEAN NOT NULL DEFAULT false,
    "riskScore" DOUBLE PRECISION,
    "responseTimeMs" INTEGER,
    "studentName" TEXT,
    "studentClass" TEXT,
    "studentSection" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ScanLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_rate_limits" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "identifierType" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "blockCount" INTEGER NOT NULL DEFAULT 0,
    "maxRequests" INTEGER NOT NULL DEFAULT 100,
    "blockedUntil" TIMESTAMP(3),
    "blockedReason" TEXT,
    "lastHit" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowDuration" INTEGER NOT NULL DEFAULT 60,
    "metadata" JSONB,

    CONSTRAINT "scan_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_batch_generations" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "format" "QrFormat" NOT NULL DEFAULT 'PNG',
    "widthPx" INTEGER NOT NULL DEFAULT 512,
    "heightPx" INTEGER NOT NULL DEFAULT 512,
    "errorCorrection" TEXT NOT NULL DEFAULT 'M',
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "createdById" TEXT,
    "errorLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "qr_batch_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "super_admins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isPasswordDefault" BOOLEAN NOT NULL DEFAULT false,
    "passwordChangedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_users" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "SchoolUserRole" NOT NULL DEFAULT 'TEACHER',
    "isPasswordDefault" BOOLEAN NOT NULL DEFAULT true,
    "passwordChangedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "school_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_users" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "photoUrl" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "occupation" TEXT,
    "canCall" BOOLEAN NOT NULL DEFAULT true,
    "canWhatsapp" BOOLEAN NOT NULL DEFAULT true,
    "canEmail" BOOLEAN NOT NULL DEFAULT true,
    "canSMS" BOOLEAN NOT NULL DEFAULT true,
    "otp" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    "otpRequestedAt" TIMESTAMP(3),
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "isEmergencyContact" BOOLEAN NOT NULL DEFAULT true,
    "emergencyPriority" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "parent_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_students" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "relation" "Relationship" NOT NULL DEFAULT 'GUARDIAN',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isEmergency" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "canPickup" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parent_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "superAdminId" TEXT,
    "schoolUserId" TEXT,
    "parentUserId" TEXT,
    "refreshTokenHash" TEXT NOT NULL,
    "deviceFingerprint" TEXT,
    "deviceInfo" JSONB,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_devices" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "deviceFingerprint" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "expoPushToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "loggedOutAt" TIMESTAMP(3),
    "logoutReason" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parent_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_devices" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'UNREGISTERED',
    "lastSeenAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trusted_scan_zones" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "ipRange" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trusted_scan_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_sessions" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SessionType" NOT NULL DEFAULT 'MORNING',
    "mode" "AttendanceMode" NOT NULL DEFAULT 'RFID',
    "grade" TEXT,
    "section" TEXT,
    "subject" TEXT,
    "classGroupId" TEXT,
    "isStaffSession" BOOLEAN NOT NULL DEFAULT false,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "lateThreshold" INTEGER NOT NULL DEFAULT 15,
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_taps" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT,
    "staffId" TEXT,
    "uidHash" TEXT NOT NULL,
    "tapType" TEXT NOT NULL,
    "deviceId" TEXT,
    "deviceName" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "location" TEXT,
    "tappedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOfId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "attendance_taps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_attendance_records" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "mode" "AttendanceMode" NOT NULL DEFAULT 'RFID',
    "scheduledTime" TIMESTAMP(3),
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lateBy" INTEGER,
    "markedBy" TEXT,
    "tapId" TEXT,
    "reason" TEXT,
    "remark" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "parentNotified" BOOLEAN NOT NULL DEFAULT false,
    "parentNotifiedAt" TIMESTAMP(3),
    "parentAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_attendance_records" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "mode" "AttendanceMode" NOT NULL DEFAULT 'RFID',
    "scheduledTime" TIMESTAMP(3),
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "lateBy" INTEGER,
    "totalHours" DOUBLE PRECISION,
    "overtimeHours" DOUBLE PRECISION,
    "markedBy" TEXT,
    "tapId" TEXT,
    "reason" TEXT,
    "remark" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "leaveType" TEXT,
    "leaveApplied" BOOLEAN NOT NULL DEFAULT false,
    "leaveId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_reports" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "filters" JSONB,
    "summary" JSONB NOT NULL,
    "details" JSONB,
    "generatedById" TEXT NOT NULL,
    "sessionId" TEXT,
    "format" "ReportFormat" NOT NULL DEFAULT 'JSON',
    "fileUrl" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_settings" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentCheckInStart" TEXT NOT NULL DEFAULT '07:00',
    "studentCheckInEnd" TEXT NOT NULL DEFAULT '09:00',
    "studentLateThreshold" INTEGER NOT NULL DEFAULT 15,
    "studentHalfDayAfter" INTEGER NOT NULL DEFAULT 120,
    "staffCheckInStart" TEXT NOT NULL DEFAULT '07:00',
    "staffCheckInEnd" TEXT NOT NULL DEFAULT '10:00',
    "staffLateThreshold" INTEGER NOT NULL DEFAULT 15,
    "staffWorkingHours" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "autoMarkAbsent" BOOLEAN NOT NULL DEFAULT true,
    "autoMarkAfter" INTEGER NOT NULL DEFAULT 60,
    "notifyParentsOnAbsent" BOOLEAN NOT NULL DEFAULT true,
    "notifyParentsOnLate" BOOLEAN NOT NULL DEFAULT true,
    "notifyAdminsOnStaffAbsent" BOOLEAN NOT NULL DEFAULT true,
    "gpsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "gpsRadius" INTEGER,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_summaries" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "period" "SummaryPeriod" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalSessions" INTEGER NOT NULL,
    "presentCount" INTEGER NOT NULL,
    "absentCount" INTEGER NOT NULL,
    "lateCount" INTEGER NOT NULL,
    "excusedCount" INTEGER NOT NULL,
    "halfDayCount" INTEGER NOT NULL,
    "attendancePercent" DOUBLE PRECISION NOT NULL,
    "totalHours" DOUBLE PRECISION,
    "overtimeHours" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "attachments" TEXT[],
    "priority" "AnnouncementPriority" NOT NULL DEFAULT 'NORMAL',
    "target" "AnnouncementTarget" NOT NULL DEFAULT 'ALL',
    "targetGrades" TEXT[],
    "targetSections" TEXT[],
    "targetClassIds" TEXT[],
    "targetStudentIds" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_deliveries" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "parentId" TEXT,
    "staffId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "externalId" TEXT,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "threadId" TEXT,
    "direction" "MessageDirection" NOT NULL DEFAULT 'SCHOOL_TO_PARENT',
    "type" "MessageType" NOT NULL DEFAULT 'GENERAL',
    "senderId" TEXT,
    "parentId" TEXT,
    "studentId" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "attachments" TEXT[],
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "repliedTo" TEXT,
    "channels" "NotificationChannel"[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "timetableId" TEXT,
    "crisisId" TEXT,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MessageType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" TEXT[],
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_queue" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "parentId" TEXT,
    "staffId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "MessageType" NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "externalId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastAttemptAt" TIMESTAMP(3),
    "error" TEXT,
    "idempotencyKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_campaigns" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "MessageType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "templateId" TEXT,
    "target" "AnnouncementTarget" NOT NULL,
    "targetGrades" TEXT[],
    "targetSections" TEXT[],
    "targetClassIds" TEXT[],
    "targetFilters" JSONB,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalRecipients" INTEGER NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_profiles" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "bloodGroup" "BloodGroup" NOT NULL DEFAULT 'UNKNOWN',
    "allergies" TEXT[],
    "medications" TEXT[],
    "conditions" TEXT[],
    "medicalNotes" TEXT,
    "doctorName" TEXT,
    "doctorPhone" TEXT,
    "doctorSpecialization" TEXT,
    "doctorClinic" TEXT,
    "doctorAddress" TEXT,
    "hospitalName" TEXT,
    "hospitalPhone" TEXT,
    "hospitalAddress" TEXT,
    "insuranceProvider" TEXT,
    "insurancePolicyNumber" TEXT,
    "insuranceValidUntil" TIMESTAMP(3),
    "emergencyInstructions" TEXT,
    "specialNeeds" TEXT,
    "showBloodGroup" BOOLEAN NOT NULL DEFAULT true,
    "showAllergies" BOOLEAN NOT NULL DEFAULT true,
    "showMedications" BOOLEAN NOT NULL DEFAULT true,
    "showConditions" BOOLEAN NOT NULL DEFAULT true,
    "showContacts" BOOLEAN NOT NULL DEFAULT true,
    "showDoctorInfo" BOOLEAN NOT NULL DEFAULT true,
    "showInstructions" BOOLEAN NOT NULL DEFAULT true,
    "showInsurance" BOOLEAN NOT NULL DEFAULT false,
    "showSpecialNeeds" BOOLEAN NOT NULL DEFAULT true,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "email" TEXT,
    "relation" "EmergencyContactRelation" NOT NULL,
    "address" TEXT,
    "photoUrl" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isLegalGuardian" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "callEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "available24x7" BOOLEAN NOT NULL DEFAULT false,
    "availableFrom" TEXT,
    "availableTo" TEXT,
    "timezone" TEXT,
    "canPickup" BOOLEAN NOT NULL DEFAULT false,
    "pickupPassword" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_incidents" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "profileId" TEXT,
    "schoolId" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "severity" "EmergencySeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "responseTimeMinutes" INTEGER,
    "actionTaken" TEXT NOT NULL,
    "medicationGiven" TEXT,
    "reportedById" TEXT,
    "handledById" TEXT,
    "ambulanceCalled" BOOLEAN NOT NULL DEFAULT false,
    "hospitalName" TEXT,
    "hospitalVisitId" TEXT,
    "parentNotified" BOOLEAN NOT NULL DEFAULT false,
    "parentNotifiedAt" TIMESTAMP(3),
    "parentArrived" BOOLEAN NOT NULL DEFAULT false,
    "parentArrivedAt" TIMESTAMP(3),
    "contactedContactId" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpNotes" TEXT,
    "followUpDate" TIMESTAMP(3),
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_drills" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "type" "DrillType" NOT NULL,
    "description" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "conductedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "totalStudents" INTEGER NOT NULL,
    "totalStaff" INTEGER NOT NULL,
    "evacuationTime" INTEGER,
    "successRate" DOUBLE PRECISION,
    "conductedById" TEXT,
    "observations" TEXT,
    "improvements" TEXT,
    "incidents" TEXT,
    "status" "DrillStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_drills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_access_logs" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "accessedById" TEXT,
    "method" TEXT NOT NULL,
    "deviceId" TEXT,
    "ipAddress" TEXT,
    "viewedBloodGroup" BOOLEAN NOT NULL DEFAULT false,
    "viewedAllergies" BOOLEAN NOT NULL DEFAULT false,
    "viewedContacts" BOOLEAN NOT NULL DEFAULT false,
    "viewedConditions" BOOLEAN NOT NULL DEFAULT false,
    "viewedMedications" BOOLEAN NOT NULL DEFAULT false,
    "calledContact" BOOLEAN NOT NULL DEFAULT false,
    "contactedId" TEXT,
    "reason" TEXT,
    "incidentId" TEXT,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_timetable_configs" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "periodsPerDay" INTEGER NOT NULL DEFAULT 8,
    "periodDuration" INTEGER NOT NULL DEFAULT 45,
    "startTime" TEXT NOT NULL DEFAULT '08:00',
    "endTime" TEXT NOT NULL DEFAULT '15:00',
    "workingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "breakAfterPeriods" INTEGER[] DEFAULT ARRAY[2, 4, 6]::INTEGER[],
    "breakDurations" INTEGER[] DEFAULT ARRAY[15, 30, 10]::INTEGER[],
    "lunchAfterPeriod" INTEGER NOT NULL DEFAULT 4,
    "lunchDuration" INTEGER NOT NULL DEFAULT 30,
    "morningPeriodsEnd" INTEGER NOT NULL DEFAULT 4,
    "useGradeLevelConfigs" BOOLEAN NOT NULL DEFAULT false,
    "allowSubstitution" BOOLEAN NOT NULL DEFAULT true,
    "maxSubstitutionsPerDay" INTEGER NOT NULL DEFAULT 3,
    "substitutionNoticeMins" INTEGER NOT NULL DEFAULT 30,
    "autoApproveSubstitution" BOOLEAN NOT NULL DEFAULT false,
    "maxConsecutivePeriods" INTEGER NOT NULL DEFAULT 3,
    "minGapBetweenSubjects" INTEGER NOT NULL DEFAULT 1,
    "maxSameSubjectPerDay" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_timetable_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "roomName" TEXT,
    "building" TEXT,
    "wing" TEXT,
    "floor" INTEGER NOT NULL DEFAULT 0,
    "type" "RoomType" NOT NULL DEFAULT 'REGULAR',
    "labType" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 40,
    "isAccessible" BOOLEAN NOT NULL DEFAULT false,
    "hasElevatorAccess" BOOLEAN NOT NULL DEFAULT false,
    "hasRamp" BOOLEAN NOT NULL DEFAULT false,
    "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hasProjector" BOOLEAN NOT NULL DEFAULT false,
    "hasSmartBoard" BOOLEAN NOT NULL DEFAULT false,
    "hasAC" BOOLEAN NOT NULL DEFAULT false,
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "availableDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "blockedSlots" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "employeeId" TEXT,
    "joiningDate" TIMESTAMP(3),
    "subjects" TEXT[],
    "qualifications" TEXT[],
    "experience" INTEGER NOT NULL DEFAULT 0,
    "maxPeriodsPerDay" INTEGER NOT NULL DEFAULT 6,
    "maxPeriodsPerWeek" INTEGER NOT NULL DEFAULT 30,
    "maxConsecutivePeriods" INTEGER NOT NULL DEFAULT 3,
    "isPartTime" BOOLEAN NOT NULL DEFAULT false,
    "availableDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "unavailableDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "unavailablePeriods" JSONB,
    "leaveDays" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[],
    "preferredDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "preferredPeriods" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "preferredRooms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isOnLeave" BOOLEAN NOT NULL DEFAULT false,
    "leaveStart" TIMESTAMP(3),
    "leaveEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_wellness" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "isPregnant" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "needsGroundFloor" BOOLEAN NOT NULL DEFAULT false,
    "needsAccessibleRoom" BOOLEAN NOT NULL DEFAULT false,
    "mobilityAid" TEXT,
    "medicalConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isSenior" BOOLEAN NOT NULL DEFAULT false,
    "preferredMaxPerDay" INTEGER,
    "preferredMaxPerWeek" INTEGER,
    "avoidEarlyMorning" BOOLEAN NOT NULL DEFAULT false,
    "avoidLateEvening" BOOLEAN NOT NULL DEFAULT false,
    "needsCommuteBuffer" BOOLEAN NOT NULL DEFAULT false,
    "commuteDistance" INTEGER,
    "commuteTime" INTEGER,
    "preferredSlots" JSONB,
    "personalBlocks" JSONB,
    "burnoutRisk" BOOLEAN NOT NULL DEFAULT false,
    "burnoutScore" INTEGER NOT NULL DEFAULT 0,
    "wellnessNotes" TEXT,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "consecutiveDaysWorked" INTEGER NOT NULL DEFAULT 0,
    "weeklyLoadCurrent" INTEGER NOT NULL DEFAULT 0,
    "substitutionCount" INTEGER NOT NULL DEFAULT 0,
    "isConfidential" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_wellness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" TEXT,
    "periodsPerWeek" INTEGER NOT NULL DEFAULT 5,
    "requiresLab" BOOLEAN NOT NULL DEFAULT false,
    "labPeriodsPerWeek" INTEGER NOT NULL DEFAULT 0,
    "isHeavy" BOOLEAN NOT NULL DEFAULT false,
    "isPractical" BOOLEAN NOT NULL DEFAULT false,
    "requiredRoomType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_groups" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "label" TEXT,
    "teacherId" TEXT,
    "roomId" TEXT,
    "roomNumber" TEXT,
    "periodsPerDay" INTEGER,
    "startTime" TEXT,
    "endTime" TEXT,
    "breakSchedule" JSONB,
    "maxPeriodsPerDay" INTEGER,
    "maxConsecutivePeriods" INTEGER,
    "allowDoublePeriods" BOOLEAN,
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "constraint_presets" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "hardConstraints" JSONB NOT NULL DEFAULT '{}',
    "mediumConstraints" JSONB NOT NULL DEFAULT '{}',
    "softConstraints" JSONB NOT NULL DEFAULT '{}',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schoolTimetableConfigId" TEXT,

    CONSTRAINT "constraint_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_templates" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "configId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "academicYear" TEXT,
    "term" TEXT,
    "configSnapshot" JSONB NOT NULL,
    "constraintsSnapshot" JSONB NOT NULL,
    "createdBy" TEXT,
    "basedOnTemplateId" TEXT,
    "totalClasses" INTEGER NOT NULL DEFAULT 0,
    "totalTeachers" INTEGER NOT NULL DEFAULT 0,
    "totalSubjects" INTEGER NOT NULL DEFAULT 0,
    "totalRooms" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetables" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "generationType" "GenerationType" NOT NULL DEFAULT 'FRESH',
    "generatedBy" TEXT,
    "sourceTimetableId" TEXT,
    "status" "TimetableStatus" NOT NULL DEFAULT 'DRAFT',
    "statusMessage" TEXT,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "totalSlots" INTEGER NOT NULL DEFAULT 0,
    "assignedSlots" INTEGER NOT NULL DEFAULT 0,
    "conflictsFound" INTEGER NOT NULL DEFAULT 0,
    "healthScore" INTEGER NOT NULL DEFAULT 0,
    "wellnessScore" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_assignments" (
    "id" TEXT NOT NULL,
    "timetableId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "classGroupId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "roomId" TEXT,
    "periodType" "PeriodType" NOT NULL DEFAULT 'REGULAR',
    "isSubstituted" BOOLEAN NOT NULL DEFAULT false,
    "isTemporary" BOOLEAN NOT NULL DEFAULT false,
    "isManuallyPlaced" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "originalTeacherId" TEXT,
    "substitutionId" TEXT,
    "constraintViolations" INTEGER NOT NULL DEFAULT 0,
    "penaltyScore" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "substitutions" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "substituteId" TEXT NOT NULL,
    "originalTeacherId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "subjectId" TEXT,
    "classGroupId" TEXT,
    "roomId" TEXT,
    "reason" TEXT,
    "status" "SubstitutionStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "substitutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crisis_events" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "timetableId" TEXT NOT NULL,
    "type" "CrisisType" NOT NULL,
    "severity" "CrisisSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "CrisisStatus" NOT NULL DEFAULT 'REPORTED',
    "title" TEXT,
    "description" TEXT,
    "affectedSlots" JSONB NOT NULL DEFAULT '[]',
    "affectedTeacherIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "affectedClassIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "affectedRoomIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalAffectedSlots" INTEGER NOT NULL DEFAULT 0,
    "triggeredBy" TEXT,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggerReason" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionTimeMinutes" INTEGER,
    "resolution" JSONB,
    "unresolvedSlots" INTEGER NOT NULL DEFAULT 0,
    "substitutionsCreated" INTEGER NOT NULL DEFAULT 0,
    "substitutionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crisis_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_jobs" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "timetableId" TEXT,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "statusMessage" TEXT,
    "stepsCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL DEFAULT 0,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "errorDetails" JSONB,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "processingTimeMs" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_validations" (
    "id" TEXT NOT NULL,
    "timetableId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "healthScore" INTEGER NOT NULL DEFAULT 0,
    "wellnessScore" INTEGER NOT NULL DEFAULT 0,
    "utilizationScore" INTEGER NOT NULL DEFAULT 0,
    "criticalIssues" INTEGER NOT NULL DEFAULT 0,
    "warnings" INTEGER NOT NULL DEFAULT 0,
    "suggestions" INTEGER NOT NULL DEFAULT 0,
    "criticalList" JSONB NOT NULL DEFAULT '[]',
    "warningList" JSONB NOT NULL DEFAULT '[]',
    "suggestionList" JSONB NOT NULL DEFAULT '[]',
    "teacherUtilization" JSONB,
    "roomUtilization" JSONB,
    "classBalance" JSONB,
    "wellnessViolations" INTEGER NOT NULL DEFAULT 0,
    "wellnessDetails" JSONB,
    "validatedBy" TEXT,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timetable_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_uploads" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "uploadType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "warnings" JSONB,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_level_configs" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "gradeFrom" INTEGER NOT NULL,
    "gradeTo" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "level" "GradeLevel" NOT NULL DEFAULT 'PRIMARY',
    "periodsPerDay" INTEGER NOT NULL DEFAULT 6,
    "startTime" TEXT,
    "endTime" TEXT,
    "breakAfterPeriods" INTEGER[] DEFAULT ARRAY[2, 4]::INTEGER[],
    "breakDurations" INTEGER[] DEFAULT ARRAY[15, 30]::INTEGER[],
    "lunchAfterPeriod" INTEGER,
    "lunchDuration" INTEGER NOT NULL DEFAULT 30,
    "maxPeriodsPerDay" INTEGER,
    "maxConsecutivePeriods" INTEGER,
    "allowDoublePeriods" BOOLEAN NOT NULL DEFAULT true,
    "heavySubjectsMorning" BOOLEAN NOT NULL DEFAULT true,
    "maxSameSubjectPerDay" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_level_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
    "description" TEXT,
    "actorId" TEXT,
    "actorType" "AuditActorType",
    "actorName" TEXT,
    "entity" "AuditEntity",
    "entityId" TEXT,
    "entityLabel" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "changes" JSONB,
    "schoolId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "device" TEXT,
    "requestId" TEXT,
    "sessionId" TEXT,
    "metadata" JSONB,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "retentionUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs_archive" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "severity" "AuditSeverity" NOT NULL,
    "description" TEXT,
    "actorId" TEXT,
    "actorType" "AuditActorType",
    "actorName" TEXT,
    "entity" "AuditEntity",
    "entityId" TEXT,
    "entityLabel" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "changes" JSONB,
    "schoolId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "device" TEXT,
    "requestId" TEXT,
    "metadata" JSONB,
    "isSensitive" BOOLEAN NOT NULL,
    "originalCreatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_archive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "schoolUserId" TEXT,
    "studentId" TEXT,
    "schoolId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "shortBody" TEXT,
    "category" "NotificationCategory" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "actionUrl" TEXT,
    "actionLabel" TEXT,
    "imageUrl" TEXT,
    "data" JSONB,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "failReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "externalId" TEXT,
    "providerResponse" JSONB,
    "groupId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "schoolUserId" TEXT,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "onScan" BOOLEAN NOT NULL DEFAULT true,
    "onAttendance" BOOLEAN NOT NULL DEFAULT true,
    "onAbsent" BOOLEAN NOT NULL DEFAULT true,
    "onLate" BOOLEAN NOT NULL DEFAULT true,
    "onFee" BOOLEAN NOT NULL DEFAULT true,
    "onExam" BOOLEAN NOT NULL DEFAULT true,
    "onEvent" BOOLEAN NOT NULL DEFAULT true,
    "onEmergency" BOOLEAN NOT NULL DEFAULT true,
    "onAnnouncement" BOOLEAN NOT NULL DEFAULT true,
    "onHomework" BOOLEAN NOT NULL DEFAULT false,
    "onReportCard" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "quietHoursTimezone" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "studentOverrides" JSONB,
    "maxPerHour" INTEGER,
    "digestMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "name" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "titleTemplate" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "smsTemplate" TEXT,
    "defaultChannel" "NotificationChannel" NOT NULL DEFAULT 'PUSH',
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_batches" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateId" TEXT,
    "category" "NotificationCategory",
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_device_tokens" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "schoolUserId" TEXT,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "deviceModel" TEXT,
    "appVersion" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AffectedTeachers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AffectedTeachers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "plans_isActive_idx" ON "plans"("isActive");

-- CreateIndex
CREATE INDEX "subscriptions_schoolId_idx" ON "subscriptions"("schoolId");

-- CreateIndex
CREATE INDEX "subscriptions_planId_idx" ON "subscriptions"("planId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_validUntil_idx" ON "subscriptions"("validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "payments_gatewayOrderId_key" ON "payments"("gatewayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_gatewayPaymentId_key" ON "payments"("gatewayPaymentId");

-- CreateIndex
CREATE INDEX "payments_subscriptionId_idx" ON "payments"("subscriptionId");

-- CreateIndex
CREATE INDEX "payments_schoolId_idx" ON "payments"("schoolId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_gatewayOrderId_idx" ON "payments"("gatewayOrderId");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_subscriptionId_idx" ON "invoices"("subscriptionId");

-- CreateIndex
CREATE INDEX "invoices_schoolId_idx" ON "invoices"("schoolId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_dueDate_idx" ON "invoices"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_schoolId_idx" ON "orders"("schoolId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_orderNumber_idx" ON "orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_tokenId_key" ON "order_items"("tokenId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_tokenId_idx" ON "order_items"("tokenId");

-- CreateIndex
CREATE INDEX "scans_studentId_timestamp_idx" ON "scans"("studentId", "timestamp");

-- CreateIndex
CREATE INDEX "scans_schoolId_timestamp_idx" ON "scans"("schoolId", "timestamp");

-- CreateIndex
CREATE INDEX "scans_deviceId_idx" ON "scans"("deviceId");

-- CreateIndex
CREATE INDEX "scans_initiatedBy_idx" ON "scans"("initiatedBy");

-- CreateIndex
CREATE INDEX "scan_anomalies_studentId_detectedAt_idx" ON "scan_anomalies"("studentId", "detectedAt");

-- CreateIndex
CREATE INDEX "scan_anomalies_schoolId_detectedAt_idx" ON "scan_anomalies"("schoolId", "detectedAt");

-- CreateIndex
CREATE INDEX "scan_anomalies_severity_idx" ON "scan_anomalies"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "schools_code_key" ON "schools"("code");

-- CreateIndex
CREATE INDEX "schools_status_idx" ON "schools"("status");

-- CreateIndex
CREATE INDEX "schools_board_idx" ON "schools"("board");

-- CreateIndex
CREATE INDEX "schools_city_state_idx" ON "schools"("city", "state");

-- CreateIndex
CREATE UNIQUE INDEX "students_rfidTagNumber_key" ON "students"("rfidTagNumber");

-- CreateIndex
CREATE INDEX "students_schoolId_idx" ON "students"("schoolId");

-- CreateIndex
CREATE INDEX "students_schoolId_grade_section_idx" ON "students"("schoolId", "grade", "section");

-- CreateIndex
CREATE INDEX "students_schoolId_status_idx" ON "students"("schoolId", "status");

-- CreateIndex
CREATE INDEX "students_firstName_lastName_idx" ON "students"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "students_studentId_idx" ON "students"("studentId");

-- CreateIndex
CREATE INDEX "students_rfidTagNumber_idx" ON "students"("rfidTagNumber");

-- CreateIndex
CREATE INDEX "students_classGroupId_idx" ON "students"("classGroupId");

-- CreateIndex
CREATE INDEX "student_documents_studentId_idx" ON "student_documents"("studentId");

-- CreateIndex
CREATE INDEX "student_documents_type_idx" ON "student_documents"("type");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_rfidUid_key" ON "tokens"("rfidUid");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_qrCode_key" ON "tokens"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_qrCodeHash_key" ON "tokens"("qrCodeHash");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_scanCode_key" ON "tokens"("scanCode");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_scanCodeHash_key" ON "tokens"("scanCodeHash");

-- CreateIndex
CREATE INDEX "tokens_studentId_idx" ON "tokens"("studentId");

-- CreateIndex
CREATE INDEX "tokens_schoolId_type_idx" ON "tokens"("schoolId", "type");

-- CreateIndex
CREATE INDEX "tokens_schoolId_status_idx" ON "tokens"("schoolId", "status");

-- CreateIndex
CREATE INDEX "tokens_rfidUid_idx" ON "tokens"("rfidUid");

-- CreateIndex
CREATE INDEX "tokens_qrCode_idx" ON "tokens"("qrCode");

-- CreateIndex
CREATE INDEX "tokens_qrCodeHash_idx" ON "tokens"("qrCodeHash");

-- CreateIndex
CREATE INDEX "tokens_scanCodeHash_idx" ON "tokens"("scanCodeHash");

-- CreateIndex
CREATE INDEX "tokens_batchId_idx" ON "tokens"("batchId");

-- CreateIndex
CREATE INDEX "scan_rate_limits_identifier_idx" ON "scan_rate_limits"("identifier");

-- CreateIndex
CREATE INDEX "scan_rate_limits_blockedUntil_idx" ON "scan_rate_limits"("blockedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "scan_rate_limits_identifier_identifierType_key" ON "scan_rate_limits"("identifier", "identifierType");

-- CreateIndex
CREATE UNIQUE INDEX "qr_batch_generations_batchId_key" ON "qr_batch_generations"("batchId");

-- CreateIndex
CREATE INDEX "qr_batch_generations_schoolId_idx" ON "qr_batch_generations"("schoolId");

-- CreateIndex
CREATE INDEX "qr_batch_generations_batchId_idx" ON "qr_batch_generations"("batchId");

-- CreateIndex
CREATE INDEX "qr_batch_generations_status_idx" ON "qr_batch_generations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "super_admins_email_key" ON "super_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "school_users_email_key" ON "school_users"("email");

-- CreateIndex
CREATE INDEX "school_users_schoolId_idx" ON "school_users"("schoolId");

-- CreateIndex
CREATE INDEX "school_users_email_idx" ON "school_users"("email");

-- CreateIndex
CREATE INDEX "school_users_schoolId_role_idx" ON "school_users"("schoolId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "parent_users_phone_key" ON "parent_users"("phone");

-- CreateIndex
CREATE INDEX "parent_users_phone_idx" ON "parent_users"("phone");

-- CreateIndex
CREATE INDEX "parent_users_email_idx" ON "parent_users"("email");

-- CreateIndex
CREATE INDEX "parent_users_firstName_lastName_idx" ON "parent_users"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "parent_students_studentId_idx" ON "parent_students"("studentId");

-- CreateIndex
CREATE INDEX "parent_students_parentId_idx" ON "parent_students"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "parent_students_parentId_studentId_key" ON "parent_students"("parentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refreshTokenHash_key" ON "user_sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "user_sessions_superAdminId_idx" ON "user_sessions"("superAdminId");

-- CreateIndex
CREATE INDEX "user_sessions_schoolUserId_idx" ON "user_sessions"("schoolUserId");

-- CreateIndex
CREATE INDEX "user_sessions_parentUserId_idx" ON "user_sessions"("parentUserId");

-- CreateIndex
CREATE INDEX "user_sessions_refreshTokenHash_idx" ON "user_sessions"("refreshTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "parent_devices_deviceFingerprint_key" ON "parent_devices"("deviceFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "parent_devices_expoPushToken_key" ON "parent_devices"("expoPushToken");

-- CreateIndex
CREATE INDEX "parent_devices_parentId_idx" ON "parent_devices"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_devices_apiKey_key" ON "attendance_devices"("apiKey");

-- CreateIndex
CREATE INDEX "attendance_devices_schoolId_idx" ON "attendance_devices"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "attendance_sessions_schoolId_type_idx" ON "attendance_sessions"("schoolId", "type");

-- CreateIndex
CREATE INDEX "attendance_sessions_schoolId_isActive_idx" ON "attendance_sessions"("schoolId", "isActive");

-- CreateIndex
CREATE INDEX "attendance_sessions_grade_section_idx" ON "attendance_sessions"("grade", "section");

-- CreateIndex
CREATE INDEX "attendance_sessions_isStaffSession_idx" ON "attendance_sessions"("isStaffSession");

-- CreateIndex
CREATE INDEX "attendance_sessions_classGroupId_idx" ON "attendance_sessions"("classGroupId");

-- CreateIndex
CREATE INDEX "attendance_taps_sessionId_idx" ON "attendance_taps"("sessionId");

-- CreateIndex
CREATE INDEX "attendance_taps_studentId_idx" ON "attendance_taps"("studentId");

-- CreateIndex
CREATE INDEX "attendance_taps_staffId_idx" ON "attendance_taps"("staffId");

-- CreateIndex
CREATE INDEX "attendance_taps_processed_idx" ON "attendance_taps"("processed");

-- CreateIndex
CREATE INDEX "attendance_taps_tappedAt_idx" ON "attendance_taps"("tappedAt");

-- CreateIndex
CREATE INDEX "attendance_taps_uidHash_idx" ON "attendance_taps"("uidHash");

-- CreateIndex
CREATE INDEX "student_attendance_records_schoolId_sessionId_idx" ON "student_attendance_records"("schoolId", "sessionId");

-- CreateIndex
CREATE INDEX "student_attendance_records_studentId_createdAt_idx" ON "student_attendance_records"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "student_attendance_records_status_idx" ON "student_attendance_records"("status");

-- CreateIndex
CREATE INDEX "student_attendance_records_markedAt_idx" ON "student_attendance_records"("markedAt");

-- CreateIndex
CREATE INDEX "student_attendance_records_parentNotified_idx" ON "student_attendance_records"("parentNotified");

-- CreateIndex
CREATE UNIQUE INDEX "student_attendance_records_sessionId_studentId_key" ON "student_attendance_records"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "staff_attendance_records_schoolId_sessionId_idx" ON "staff_attendance_records"("schoolId", "sessionId");

-- CreateIndex
CREATE INDEX "staff_attendance_records_staffId_createdAt_idx" ON "staff_attendance_records"("staffId", "createdAt");

-- CreateIndex
CREATE INDEX "staff_attendance_records_status_idx" ON "staff_attendance_records"("status");

-- CreateIndex
CREATE INDEX "staff_attendance_records_checkInAt_idx" ON "staff_attendance_records"("checkInAt");

-- CreateIndex
CREATE UNIQUE INDEX "staff_attendance_records_sessionId_staffId_key" ON "staff_attendance_records"("sessionId", "staffId");

-- CreateIndex
CREATE INDEX "attendance_reports_schoolId_type_idx" ON "attendance_reports"("schoolId", "type");

-- CreateIndex
CREATE INDEX "attendance_reports_startDate_endDate_idx" ON "attendance_reports"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "attendance_reports_generatedById_idx" ON "attendance_reports"("generatedById");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_settings_schoolId_key" ON "attendance_settings"("schoolId");

-- CreateIndex
CREATE INDEX "attendance_summaries_schoolId_entityType_idx" ON "attendance_summaries"("schoolId", "entityType");

-- CreateIndex
CREATE INDEX "attendance_summaries_entityId_period_idx" ON "attendance_summaries"("entityId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_summaries_entityType_entityId_period_periodStart_key" ON "attendance_summaries"("entityType", "entityId", "period", "periodStart");

-- CreateIndex
CREATE INDEX "announcements_schoolId_idx" ON "announcements"("schoolId");

-- CreateIndex
CREATE INDEX "announcements_schoolId_target_idx" ON "announcements"("schoolId", "target");

-- CreateIndex
CREATE INDEX "announcements_publishedAt_idx" ON "announcements"("publishedAt");

-- CreateIndex
CREATE INDEX "announcements_expiresAt_idx" ON "announcements"("expiresAt");

-- CreateIndex
CREATE INDEX "announcements_authorId_idx" ON "announcements"("authorId");

-- CreateIndex
CREATE INDEX "announcement_deliveries_announcementId_idx" ON "announcement_deliveries"("announcementId");

-- CreateIndex
CREATE INDEX "announcement_deliveries_parentId_idx" ON "announcement_deliveries"("parentId");

-- CreateIndex
CREATE INDEX "announcement_deliveries_staffId_idx" ON "announcement_deliveries"("staffId");

-- CreateIndex
CREATE INDEX "announcement_deliveries_status_idx" ON "announcement_deliveries"("status");

-- CreateIndex
CREATE INDEX "announcement_deliveries_channel_idx" ON "announcement_deliveries"("channel");

-- CreateIndex
CREATE UNIQUE INDEX "announcement_deliveries_announcementId_parentId_channel_key" ON "announcement_deliveries"("announcementId", "parentId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "announcement_deliveries_announcementId_staffId_channel_key" ON "announcement_deliveries"("announcementId", "staffId", "channel");

-- CreateIndex
CREATE INDEX "messages_schoolId_idx" ON "messages"("schoolId");

-- CreateIndex
CREATE INDEX "messages_threadId_idx" ON "messages"("threadId");

-- CreateIndex
CREATE INDEX "messages_parentId_idx" ON "messages"("parentId");

-- CreateIndex
CREATE INDEX "messages_studentId_idx" ON "messages"("studentId");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "messages_type_idx" ON "messages"("type");

-- CreateIndex
CREATE INDEX "message_templates_schoolId_type_idx" ON "message_templates"("schoolId", "type");

-- CreateIndex
CREATE INDEX "message_templates_isDefault_idx" ON "message_templates"("isDefault");

-- CreateIndex
CREATE INDEX "message_templates_isActive_idx" ON "message_templates"("isActive");

-- CreateIndex
CREATE INDEX "notification_queue_status_idx" ON "notification_queue"("status");

-- CreateIndex
CREATE INDEX "notification_queue_scheduledFor_idx" ON "notification_queue"("scheduledFor");

-- CreateIndex
CREATE INDEX "notification_queue_parentId_idx" ON "notification_queue"("parentId");

-- CreateIndex
CREATE INDEX "notification_queue_staffId_idx" ON "notification_queue"("staffId");

-- CreateIndex
CREATE INDEX "notification_queue_priority_idx" ON "notification_queue"("priority");

-- CreateIndex
CREATE INDEX "notification_queue_idempotencyKey_idx" ON "notification_queue"("idempotencyKey");

-- CreateIndex
CREATE INDEX "notification_queue_schoolId_createdAt_idx" ON "notification_queue"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "communication_campaigns_schoolId_idx" ON "communication_campaigns"("schoolId");

-- CreateIndex
CREATE INDEX "communication_campaigns_status_idx" ON "communication_campaigns"("status");

-- CreateIndex
CREATE INDEX "communication_campaigns_scheduledFor_idx" ON "communication_campaigns"("scheduledFor");

-- CreateIndex
CREATE INDEX "communication_campaigns_createdById_idx" ON "communication_campaigns"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_profiles_studentId_key" ON "emergency_profiles"("studentId");

-- CreateIndex
CREATE INDEX "emergency_profiles_schoolId_idx" ON "emergency_profiles"("schoolId");

-- CreateIndex
CREATE INDEX "emergency_profiles_bloodGroup_idx" ON "emergency_profiles"("bloodGroup");

-- CreateIndex
CREATE INDEX "emergency_profiles_isComplete_idx" ON "emergency_profiles"("isComplete");

-- CreateIndex
CREATE INDEX "emergency_contacts_profileId_idx" ON "emergency_contacts"("profileId");

-- CreateIndex
CREATE INDEX "emergency_contacts_priority_idx" ON "emergency_contacts"("priority");

-- CreateIndex
CREATE INDEX "emergency_contacts_isPrimary_idx" ON "emergency_contacts"("isPrimary");

-- CreateIndex
CREATE INDEX "emergency_contacts_phone_idx" ON "emergency_contacts"("phone");

-- CreateIndex
CREATE INDEX "emergency_incidents_studentId_idx" ON "emergency_incidents"("studentId");

-- CreateIndex
CREATE INDEX "emergency_incidents_schoolId_idx" ON "emergency_incidents"("schoolId");

-- CreateIndex
CREATE INDEX "emergency_incidents_severity_idx" ON "emergency_incidents"("severity");

-- CreateIndex
CREATE INDEX "emergency_incidents_occurredAt_idx" ON "emergency_incidents"("occurredAt");

-- CreateIndex
CREATE INDEX "emergency_incidents_status_idx" ON "emergency_incidents"("status");

-- CreateIndex
CREATE INDEX "emergency_incidents_type_idx" ON "emergency_incidents"("type");

-- CreateIndex
CREATE INDEX "emergency_drills_schoolId_idx" ON "emergency_drills"("schoolId");

-- CreateIndex
CREATE INDEX "emergency_drills_type_idx" ON "emergency_drills"("type");

-- CreateIndex
CREATE INDEX "emergency_drills_conductedAt_idx" ON "emergency_drills"("conductedAt");

-- CreateIndex
CREATE INDEX "emergency_drills_status_idx" ON "emergency_drills"("status");

-- CreateIndex
CREATE INDEX "emergency_access_logs_studentId_idx" ON "emergency_access_logs"("studentId");

-- CreateIndex
CREATE INDEX "emergency_access_logs_schoolId_idx" ON "emergency_access_logs"("schoolId");

-- CreateIndex
CREATE INDEX "emergency_access_logs_accessedAt_idx" ON "emergency_access_logs"("accessedAt");

-- CreateIndex
CREATE INDEX "emergency_access_logs_method_idx" ON "emergency_access_logs"("method");

-- CreateIndex
CREATE UNIQUE INDEX "school_timetable_configs_schoolId_key" ON "school_timetable_configs"("schoolId");

-- CreateIndex
CREATE INDEX "rooms_schoolId_type_idx" ON "rooms"("schoolId", "type");

-- CreateIndex
CREATE INDEX "rooms_schoolId_floor_idx" ON "rooms"("schoolId", "floor");

-- CreateIndex
CREATE INDEX "rooms_schoolId_status_idx" ON "rooms"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_schoolId_roomNumber_key" ON "rooms"("schoolId", "roomNumber");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_userId_key" ON "teachers"("userId");

-- CreateIndex
CREATE INDEX "teachers_schoolId_idx" ON "teachers"("schoolId");

-- CreateIndex
CREATE INDEX "teachers_userId_idx" ON "teachers"("userId");

-- CreateIndex
CREATE INDEX "teachers_schoolId_isActive_idx" ON "teachers"("schoolId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_wellness_teacherId_key" ON "teacher_wellness"("teacherId");

-- CreateIndex
CREATE INDEX "teacher_wellness_schoolId_idx" ON "teacher_wellness"("schoolId");

-- CreateIndex
CREATE INDEX "teacher_wellness_burnoutRisk_idx" ON "teacher_wellness"("burnoutRisk");

-- CreateIndex
CREATE INDEX "subjects_schoolId_idx" ON "subjects"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_schoolId_code_key" ON "subjects"("schoolId", "code");

-- CreateIndex
CREATE INDEX "class_groups_schoolId_idx" ON "class_groups"("schoolId");

-- CreateIndex
CREATE INDEX "class_groups_teacherId_idx" ON "class_groups"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "class_groups_schoolId_grade_section_key" ON "class_groups"("schoolId", "grade", "section");

-- CreateIndex
CREATE UNIQUE INDEX "constraint_presets_schoolId_name_key" ON "constraint_presets"("schoolId", "name");

-- CreateIndex
CREATE INDEX "timetable_templates_schoolId_isActive_idx" ON "timetable_templates"("schoolId", "isActive");

-- CreateIndex
CREATE INDEX "timetable_templates_schoolId_academicYear_idx" ON "timetable_templates"("schoolId", "academicYear");

-- CreateIndex
CREATE INDEX "timetables_schoolId_status_idx" ON "timetables"("schoolId", "status");

-- CreateIndex
CREATE INDEX "timetables_templateId_idx" ON "timetables"("templateId");

-- CreateIndex
CREATE INDEX "timetable_assignments_timetableId_teacherId_idx" ON "timetable_assignments"("timetableId", "teacherId");

-- CreateIndex
CREATE INDEX "timetable_assignments_timetableId_classGroupId_idx" ON "timetable_assignments"("timetableId", "classGroupId");

-- CreateIndex
CREATE INDEX "timetable_assignments_timetableId_roomId_idx" ON "timetable_assignments"("timetableId", "roomId");

-- CreateIndex
CREATE INDEX "timetable_assignments_timetableId_dayOfWeek_idx" ON "timetable_assignments"("timetableId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_assignments_timetableId_dayOfWeek_periodNumber_cl_key" ON "timetable_assignments"("timetableId", "dayOfWeek", "periodNumber", "classGroupId");

-- CreateIndex
CREATE INDEX "substitutions_schoolId_date_idx" ON "substitutions"("schoolId", "date");

-- CreateIndex
CREATE INDEX "substitutions_substituteId_idx" ON "substitutions"("substituteId");

-- CreateIndex
CREATE INDEX "substitutions_originalTeacherId_idx" ON "substitutions"("originalTeacherId");

-- CreateIndex
CREATE INDEX "substitutions_status_idx" ON "substitutions"("status");

-- CreateIndex
CREATE INDEX "crisis_events_schoolId_status_idx" ON "crisis_events"("schoolId", "status");

-- CreateIndex
CREATE INDEX "crisis_events_timetableId_createdAt_idx" ON "crisis_events"("timetableId", "createdAt");

-- CreateIndex
CREATE INDEX "crisis_events_type_severity_idx" ON "crisis_events"("type", "severity");

-- CreateIndex
CREATE INDEX "timetable_jobs_schoolId_status_idx" ON "timetable_jobs"("schoolId", "status");

-- CreateIndex
CREATE INDEX "timetable_jobs_type_status_idx" ON "timetable_jobs"("type", "status");

-- CreateIndex
CREATE INDEX "timetable_jobs_timetableId_idx" ON "timetable_jobs"("timetableId");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_validations_timetableId_key" ON "timetable_validations"("timetableId");

-- CreateIndex
CREATE INDEX "bulk_uploads_schoolId_uploadType_idx" ON "bulk_uploads"("schoolId", "uploadType");

-- CreateIndex
CREATE INDEX "bulk_uploads_schoolId_status_idx" ON "bulk_uploads"("schoolId", "status");

-- CreateIndex
CREATE INDEX "grade_level_configs_configId_idx" ON "grade_level_configs"("configId");

-- CreateIndex
CREATE UNIQUE INDEX "grade_level_configs_configId_gradeFrom_gradeTo_key" ON "grade_level_configs"("configId", "gradeFrom", "gradeTo");

-- CreateIndex
CREATE INDEX "audit_logs_schoolId_createdAt_idx" ON "audit_logs"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_actorType_createdAt_idx" ON "audit_logs"("actorId", "actorType", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_severity_createdAt_idx" ON "audit_logs"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_requestId_idx" ON "audit_logs"("requestId");

-- CreateIndex
CREATE INDEX "audit_logs_retentionUntil_idx" ON "audit_logs"("retentionUntil");

-- CreateIndex
CREATE INDEX "audit_logs_archive_schoolId_originalCreatedAt_idx" ON "audit_logs_archive"("schoolId", "originalCreatedAt");

-- CreateIndex
CREATE INDEX "audit_logs_archive_entity_entityId_idx" ON "audit_logs_archive"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_archive_archivedAt_idx" ON "audit_logs_archive"("archivedAt");

-- CreateIndex
CREATE INDEX "notifications_parentId_idx" ON "notifications"("parentId");

-- CreateIndex
CREATE INDEX "notifications_schoolUserId_idx" ON "notifications"("schoolUserId");

-- CreateIndex
CREATE INDEX "notifications_studentId_idx" ON "notifications"("studentId");

-- CreateIndex
CREATE INDEX "notifications_schoolId_idx" ON "notifications"("schoolId");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_category_idx" ON "notifications"("category");

-- CreateIndex
CREATE INDEX "notifications_scheduledFor_idx" ON "notifications"("scheduledFor");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_groupId_idx" ON "notifications"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_parentId_key" ON "notification_preferences"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_schoolUserId_key" ON "notification_preferences"("schoolUserId");

-- CreateIndex
CREATE INDEX "notification_templates_schoolId_idx" ON "notification_templates"("schoolId");

-- CreateIndex
CREATE INDEX "notification_templates_category_idx" ON "notification_templates"("category");

-- CreateIndex
CREATE INDEX "notification_templates_isSystem_idx" ON "notification_templates"("isSystem");

-- CreateIndex
CREATE INDEX "notification_batches_schoolId_idx" ON "notification_batches"("schoolId");

-- CreateIndex
CREATE INDEX "notification_batches_status_idx" ON "notification_batches"("status");

-- CreateIndex
CREATE INDEX "notification_batches_createdAt_idx" ON "notification_batches"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_device_tokens_token_key" ON "notification_device_tokens"("token");

-- CreateIndex
CREATE INDEX "notification_device_tokens_token_idx" ON "notification_device_tokens"("token");

-- CreateIndex
CREATE INDEX "notification_device_tokens_platform_idx" ON "notification_device_tokens"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "notification_device_tokens_parentId_token_key" ON "notification_device_tokens"("parentId", "token");

-- CreateIndex
CREATE UNIQUE INDEX "notification_device_tokens_schoolUserId_token_key" ON "notification_device_tokens"("schoolUserId", "token");

-- CreateIndex
CREATE INDEX "_AffectedTeachers_B_index" ON "_AffectedTeachers"("B");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_attendanceDeviceId_fkey" FOREIGN KEY ("attendanceDeviceId") REFERENCES "attendance_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_anomalies" ADD CONSTRAINT "scan_anomalies_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_anomalies" ADD CONSTRAINT "scan_anomalies_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_anomalies" ADD CONSTRAINT "scan_anomalies_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "class_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_cardVisibilityId_fkey" FOREIGN KEY ("cardVisibilityId") REFERENCES "card_visibility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_batch_generations" ADD CONSTRAINT "qr_batch_generations_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_batch_generations" ADD CONSTRAINT "qr_batch_generations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "school_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_users" ADD CONSTRAINT "school_users_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parent_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "super_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_schoolUserId_fkey" FOREIGN KEY ("schoolUserId") REFERENCES "school_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "parent_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_devices" ADD CONSTRAINT "parent_devices_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parent_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_devices" ADD CONSTRAINT "attendance_devices_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trusted_scan_zones" ADD CONSTRAINT "trusted_scan_zones_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "class_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "school_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_taps" ADD CONSTRAINT "attendance_taps_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "attendance_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_taps" ADD CONSTRAINT "attendance_taps_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_taps" ADD CONSTRAINT "attendance_taps_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_taps" ADD CONSTRAINT "attendance_taps_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "school_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "attendance_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_markedBy_fkey" FOREIGN KEY ("markedBy") REFERENCES "school_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_tapId_fkey" FOREIGN KEY ("tapId") REFERENCES "attendance_taps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "school_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendance_records" ADD CONSTRAINT "staff_attendance_records_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "attendance_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendance_records" ADD CONSTRAINT "staff_attendance_records_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "school_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendance_records" ADD CONSTRAINT "staff_attendance_records_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendance_records" ADD CONSTRAINT "staff_attendance_records_markedBy_fkey" FOREIGN KEY ("markedBy") REFERENCES "school_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendance_records" ADD CONSTRAINT "staff_attendance_records_tapId_fkey" FOREIGN KEY ("tapId") REFERENCES "attendance_taps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendance_records" ADD CONSTRAINT "staff_attendance_records_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "school_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_reports" ADD CONSTRAINT "attendance_reports_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_reports" ADD CONSTRAINT "attendance_reports_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "school_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_reports" ADD CONSTRAINT "attendance_reports_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "attendance_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_settings" ADD CONSTRAINT "attendance_settings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_settings" ADD CONSTRAINT "attendance_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "school_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_summaries" ADD CONSTRAINT "attendance_summaries_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "school_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_deliveries" ADD CONSTRAINT "announcement_deliveries_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_deliveries" ADD CONSTRAINT "announcement_deliveries_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parent_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_deliveries" ADD CONSTRAINT "announcement_deliveries_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "school_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "school_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parent_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_repliedTo_fkey" FOREIGN KEY ("repliedTo") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "timetables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_crisisId_fkey" FOREIGN KEY ("crisisId") REFERENCES "crisis_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "school_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parent_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "school_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_campaigns" ADD CONSTRAINT "communication_campaigns_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_campaigns" ADD CONSTRAINT "communication_campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "school_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_campaigns" ADD CONSTRAINT "communication_campaigns_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "school_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_profiles" ADD CONSTRAINT "emergency_profiles_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_profiles" ADD CONSTRAINT "emergency_profiles_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "emergency_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_incidents" ADD CONSTRAINT "emergency_incidents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_incidents" ADD CONSTRAINT "emergency_incidents_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "emergency_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_incidents" ADD CONSTRAINT "emergency_incidents_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_incidents" ADD CONSTRAINT "emergency_incidents_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "school_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_incidents" ADD CONSTRAINT "emergency_incidents_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "school_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_drills" ADD CONSTRAINT "emergency_drills_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_drills" ADD CONSTRAINT "emergency_drills_conductedById_fkey" FOREIGN KEY ("conductedById") REFERENCES "school_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_access_logs" ADD CONSTRAINT "emergency_access_logs_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_access_logs" ADD CONSTRAINT "emergency_access_logs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_access_logs" ADD CONSTRAINT "emergency_access_logs_accessedById_fkey" FOREIGN KEY ("accessedById") REFERENCES "school_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_timetable_configs" ADD CONSTRAINT "school_timetable_configs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "school_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_wellness" ADD CONSTRAINT "teacher_wellness_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_wellness" ADD CONSTRAINT "teacher_wellness_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constraint_presets" ADD CONSTRAINT "constraint_presets_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "constraint_presets" ADD CONSTRAINT "constraint_presets_schoolTimetableConfigId_fkey" FOREIGN KEY ("schoolTimetableConfigId") REFERENCES "school_timetable_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_templates" ADD CONSTRAINT "timetable_templates_configId_fkey" FOREIGN KEY ("configId") REFERENCES "school_timetable_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_templates" ADD CONSTRAINT "timetable_templates_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "timetable_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_assignments" ADD CONSTRAINT "timetable_assignments_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "timetables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_assignments" ADD CONSTRAINT "timetable_assignments_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "class_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_assignments" ADD CONSTRAINT "timetable_assignments_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_assignments" ADD CONSTRAINT "timetable_assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_assignments" ADD CONSTRAINT "timetable_assignments_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_assignments" ADD CONSTRAINT "timetable_assignments_substitutionId_fkey" FOREIGN KEY ("substitutionId") REFERENCES "substitutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "substitutions" ADD CONSTRAINT "substitutions_substituteId_fkey" FOREIGN KEY ("substituteId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "substitutions" ADD CONSTRAINT "substitutions_originalTeacherId_fkey" FOREIGN KEY ("originalTeacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "substitutions" ADD CONSTRAINT "substitutions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crisis_events" ADD CONSTRAINT "crisis_events_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "timetables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crisis_events" ADD CONSTRAINT "crisis_events_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_jobs" ADD CONSTRAINT "timetable_jobs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_jobs" ADD CONSTRAINT "timetable_jobs_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "timetables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_validations" ADD CONSTRAINT "timetable_validations_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "timetables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_uploads" ADD CONSTRAINT "bulk_uploads_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_level_configs" ADD CONSTRAINT "grade_level_configs_configId_fkey" FOREIGN KEY ("configId") REFERENCES "school_timetable_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parent_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_schoolUserId_fkey" FOREIGN KEY ("schoolUserId") REFERENCES "school_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parent_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_schoolUserId_fkey" FOREIGN KEY ("schoolUserId") REFERENCES "school_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_batches" ADD CONSTRAINT "notification_batches_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_batches" ADD CONSTRAINT "notification_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "school_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_device_tokens" ADD CONSTRAINT "notification_device_tokens_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parent_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_device_tokens" ADD CONSTRAINT "notification_device_tokens_schoolUserId_fkey" FOREIGN KEY ("schoolUserId") REFERENCES "school_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AffectedTeachers" ADD CONSTRAINT "_AffectedTeachers_A_fkey" FOREIGN KEY ("A") REFERENCES "crisis_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AffectedTeachers" ADD CONSTRAINT "_AffectedTeachers_B_fkey" FOREIGN KEY ("B") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
