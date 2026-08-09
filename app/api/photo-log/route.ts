import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import prisma from '../db';
import { ApiResponse, PhotoLogResponse } from '../types';
import { withAuthContext, AuthResult } from '../utils/auth';
import { toUTC, formatForResponse, getSettings } from '../utils/timezone';
import { checkWritePermission } from '../utils/writeProtection';
import { encryptAndStore, deleteEncryptedFile, generateStoredName } from '@/src/lib/file-encryption';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'image/gif',
];
const MAX_DIMENSION = 1600;
const PHOTOS_SUBDIR = 'photos';

/**
 * Compress an uploaded image: resize to a max of 1600px on the longest edge
 * and always re-encode as WebP quality 80 (we control the output format here,
 * unlike the feedback upload route which preserves the original format).
 */
async function compressImage(buffer: Buffer): Promise<{ data: Buffer; mimeType: string }> {
  let pipeline = sharp(buffer);

  // Auto-rotate based on EXIF orientation
  pipeline = pipeline.rotate();
  pipeline = pipeline.resize({
    width: MAX_DIMENSION,
    height: MAX_DIMENSION,
    fit: 'inside',
    withoutEnlargement: true,
  });
  pipeline = pipeline.webp({ quality: 80 });

  return { data: await pipeline.toBuffer(), mimeType: 'image/webp' };
}

/**
 * Format a date to a YYYY-MM-DD key in the given IANA timezone, used to
 * determine "the baby's local calendar day" for the one-photo-per-day rule.
 */
function toLocalDateKey(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch (error) {
    console.error('Error computing local date key, falling back to UTC:', error);
    return date.toISOString().slice(0, 10);
  }
}

function formatPhotoLog(log: any): PhotoLogResponse {
  const { storedName, ...rest } = log;
  return {
    ...rest,
    time: formatForResponse(log.time) || '',
    createdAt: formatForResponse(log.createdAt) || '',
    updatedAt: formatForResponse(log.updatedAt) || '',
    deletedAt: formatForResponse(log.deletedAt),
  };
}

/**
 * POST /api/photo-log
 * Multipart form data: babyId, time (optional ISO string, defaults to now), file, replace ("true"/"false")
 * Enforces at most one PhotoLog per baby per local calendar day.
 */
async function handlePost(req: NextRequest, authContext: AuthResult) {
  const writeCheck = checkWritePermission(authContext);
  if (!writeCheck.allowed) {
    return writeCheck.response!;
  }

  try {
    const { familyId: userFamilyId, caretakerId } = authContext;
    if (!userFamilyId) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'User is not associated with a family.' }, { status: 403 });
    }

    const formData = await req.formData();
    const babyId = formData.get('babyId') as string;
    const timeInput = formData.get('time') as string | null;
    const file = formData.get('file') as File;
    const replace = formData.get('replace') === 'true';

    if (!babyId) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Baby ID is required' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'File is required' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    const fileMimeType = (file.type || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(fileMimeType)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Only image files are allowed (JPEG, PNG, HEIC, WebP, GIF)' },
        { status: 400 }
      );
    }

    const baby = await prisma.baby.findFirst({
      where: { id: babyId, familyId: userFamilyId },
    });

    if (!baby) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Baby not found in this family.' }, { status: 404 });
    }

    const timeUTC = timeInput ? toUTC(timeInput) : new Date();
    const { systemTimezone } = await getSettings();
    const targetDayKey = toLocalDateKey(timeUTC, systemTimezone);

    // Find any existing (non-deleted) photo for this baby that falls on the same local day
    const recentPhotos = await prisma.photoLog.findMany({
      where: { babyId, familyId: userFamilyId, deletedAt: null },
      orderBy: { time: 'desc' },
      take: 5,
    });
    const existingForDay = recentPhotos.find((p) => toLocalDateKey(p.time, systemTimezone) === targetDayKey);

    if (existingForDay && !replace) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'A photo already exists for today. Pass replace: true to replace it.',
        },
        { status: 409 }
      );
    }

    // Compress, then encrypt and store
    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const compressed = await compressImage(rawBuffer);
    const storedName = generateStoredName();
    encryptAndStore(compressed.data, storedName, PHOTOS_SUBDIR);

    let photoLog;
    if (existingForDay && replace) {
      // Delete the old encrypted file and update the existing day's record
      deleteEncryptedFile(existingForDay.storedName, PHOTOS_SUBDIR);
      photoLog = await prisma.photoLog.update({
        where: { id: existingForDay.id },
        data: {
          time: timeUTC,
          originalName: file.name,
          storedName,
          mimeType: compressed.mimeType,
          fileSize: compressed.data.length,
          caretakerId: caretakerId,
        },
      });
    } else {
      photoLog = await prisma.photoLog.create({
        data: {
          babyId,
          time: timeUTC,
          originalName: file.name,
          storedName,
          mimeType: compressed.mimeType,
          fileSize: compressed.data.length,
          caretakerId: caretakerId,
          familyId: userFamilyId,
        },
      });
    }

    return NextResponse.json<ApiResponse<PhotoLogResponse>>({
      success: true,
      data: formatPhotoLog(photoLog),
    });
  } catch (error) {
    console.error('Error creating photo log:', error);
    return NextResponse.json<ApiResponse<PhotoLogResponse>>(
      { success: false, error: 'Failed to create photo log' },
      { status: 500 }
    );
  }
}

async function handleGet(req: NextRequest, authContext: AuthResult) {
  try {
    const { familyId: userFamilyId } = authContext;
    if (!userFamilyId) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'User is not associated with a family.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const babyId = searchParams.get('babyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (id) {
      const photoLog = await prisma.photoLog.findFirst({
        where: { id, familyId: userFamilyId },
      });

      if (!photoLog) {
        return NextResponse.json<ApiResponse<PhotoLogResponse>>(
          { success: false, error: 'Photo log not found or access denied' },
          { status: 404 }
        );
      }

      return NextResponse.json<ApiResponse<PhotoLogResponse>>({
        success: true,
        data: formatPhotoLog(photoLog),
      });
    }

    const photoLogs = await prisma.photoLog.findMany({
      where: {
        familyId: userFamilyId,
        deletedAt: null,
        ...(babyId && { babyId }),
        ...(startDate && endDate && {
          time: {
            gte: toUTC(startDate),
            lte: toUTC(endDate),
          },
        }),
      },
      orderBy: { time: 'desc' },
    });

    return NextResponse.json<ApiResponse<PhotoLogResponse[]>>({
      success: true,
      data: photoLogs.map(formatPhotoLog),
    });
  } catch (error) {
    console.error('Error fetching photo logs:', error);
    return NextResponse.json<ApiResponse<PhotoLogResponse[]>>(
      { success: false, error: 'Failed to fetch photo logs' },
      { status: 500 }
    );
  }
}

async function handleDelete(req: NextRequest, authContext: AuthResult) {
  const writeCheck = checkWritePermission(authContext);
  if (!writeCheck.allowed) {
    return writeCheck.response!;
  }

  try {
    const { familyId: userFamilyId } = authContext;
    if (!userFamilyId) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'User is not associated with a family.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json<ApiResponse<void>>({ success: false, error: 'Photo log ID is required' }, { status: 400 });
    }

    const existingPhotoLog = await prisma.photoLog.findFirst({
      where: { id, familyId: userFamilyId },
    });

    if (!existingPhotoLog) {
      return NextResponse.json<ApiResponse<void>>(
        { success: false, error: 'Photo log not found or access denied' },
        { status: 404 }
      );
    }

    deleteEncryptedFile(existingPhotoLog.storedName, PHOTOS_SUBDIR);

    await prisma.photoLog.delete({
      where: { id },
    });

    return NextResponse.json<ApiResponse<void>>({ success: true });
  } catch (error) {
    console.error('Error deleting photo log:', error);
    return NextResponse.json<ApiResponse<void>>(
      { success: false, error: 'Failed to delete photo log' },
      { status: 500 }
    );
  }
}

// Apply authentication middleware to all handlers
export const GET = withAuthContext(handleGet as (req: NextRequest, authContext: AuthResult) => Promise<NextResponse<ApiResponse<any>>>);
export const POST = withAuthContext(handlePost as (req: NextRequest, authContext: AuthResult) => Promise<NextResponse<ApiResponse<any>>>);
export const DELETE = withAuthContext(handleDelete as (req: NextRequest, authContext: AuthResult) => Promise<NextResponse<ApiResponse<any>>>);
