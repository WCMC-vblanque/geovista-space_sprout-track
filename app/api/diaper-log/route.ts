import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import prisma from '../db';
import { ApiResponse, DiaperLogResponse } from '../types';
import { withAuthContext, AuthResult } from '../utils/auth';
import { toUTC, formatForResponse } from '../utils/timezone';
import { checkWritePermission } from '../utils/writeProtection';
import { notifyActivityCreated, resetTimerNotificationState } from '@/src/lib/notifications/activityHook';
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
const DIAPERS_SUBDIR = 'diapers';

/**
 * Compress an uploaded image: resize to a max of 1600px on the longest edge
 * and always re-encode as WebP quality 80.
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

function formatDiaperLog(log: any): DiaperLogResponse {
  const { photoStoredName, ...rest } = log;
  return {
    ...rest,
    time: formatForResponse(log.time) || '',
    createdAt: formatForResponse(log.createdAt) || '',
    updatedAt: formatForResponse(log.updatedAt) || '',
    deletedAt: formatForResponse(log.deletedAt),
    hasPhoto: !!photoStoredName,
  };
}

async function handlePost(req: NextRequest, authContext: AuthResult) {
  // Check write permissions for expired accounts
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
    const timeInput = formData.get('time') as string;
    const type = formData.get('type') as string;
    const condition = formData.get('condition') as string | null;
    const color = formData.get('color') as string | null;
    const blowout = formData.get('blowout') === 'true';
    const creamApplied = formData.get('creamApplied') === 'true';
    const pumpSize = formData.get('pumpSize') as string | null;
    const poopSize = formData.get('poopSize') as string | null;
    const file = formData.get('file') as File | null;

    if (!babyId) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Baby ID is required' }, { status: 400 });
    }

    const baby = await prisma.baby.findFirst({
      where: { id: babyId, familyId: userFamilyId },
    });

    if (!baby) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Baby not found in this family.' }, { status: 404 });
    }

    const timeUTC = toUTC(timeInput);

    let photoFields: { photoOriginalName: string; photoStoredName: string; photoMimeType: string; photoFileSize: number } | undefined;

    if (file) {
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

      const rawBuffer = Buffer.from(await file.arrayBuffer());
      const compressed = await compressImage(rawBuffer);
      const storedName = generateStoredName();
      encryptAndStore(compressed.data, storedName, DIAPERS_SUBDIR);

      photoFields = {
        photoOriginalName: file.name,
        photoStoredName: storedName,
        photoMimeType: compressed.mimeType,
        photoFileSize: compressed.data.length,
      };
    }

    const diaperLog = await prisma.diaperLog.create({
      data: {
        babyId,
        time: timeUTC,
        type: type as any,
        condition: condition || null,
        color: color || null,
        blowout,
        creamApplied,
        pumpSize: (pumpSize as any) || null,
        poopSize: (poopSize as any) || null,
        ...photoFields,
        caretakerId: caretakerId,
        familyId: userFamilyId,
      },
    });

    // Notify subscribers about activity creation (non-blocking)
    notifyActivityCreated(diaperLog.babyId, 'diaper', { accountId: authContext.accountId, caretakerId: authContext.caretakerId }, { type }).catch(console.error);
    resetTimerNotificationState(diaperLog.babyId, 'diaper').catch(console.error);

    return NextResponse.json<ApiResponse<DiaperLogResponse>>({
      success: true,
      data: formatDiaperLog(diaperLog),
    });
  } catch (error) {
    console.error('Error creating diaper log:', error);
    return NextResponse.json<ApiResponse<DiaperLogResponse>>(
      {
        success: false,
        error: 'Failed to create diaper log',
      },
      { status: 500 }
    );
  }
}

async function handlePut(req: NextRequest, authContext: AuthResult) {
  // Check write permissions for expired accounts
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
      return NextResponse.json<ApiResponse<DiaperLogResponse>>(
        {
          success: false,
          error: 'Diaper log ID is required',
        },
        { status: 400 }
      );
    }

    const existingDiaperLog = await prisma.diaperLog.findFirst({
      where: { id, familyId: userFamilyId },
    });

    if (!existingDiaperLog) {
      return NextResponse.json<ApiResponse<DiaperLogResponse>>(
        {
          success: false,
          error: 'Diaper log not found or access denied',
        },
        { status: 404 }
      );
    }

    const formData = await req.formData();
    const timeInput = formData.get('time') as string | null;
    const type = formData.get('type') as string | null;
    const condition = formData.get('condition') as string | null;
    const color = formData.get('color') as string | null;
    const blowout = formData.get('blowout') as string | null;
    const creamApplied = formData.get('creamApplied') as string | null;
    const pumpSize = formData.get('pumpSize') as string | null;
    const poopSize = formData.get('poopSize') as string | null;
    const removePhoto = formData.get('removePhoto') === 'true';
    const file = formData.get('file') as File | null;

    const data: any = {};
    if (timeInput) data.time = toUTC(timeInput);
    if (type) data.type = type;
    data.condition = condition || null;
    data.color = color || null;
    if (blowout !== null) data.blowout = blowout === 'true';
    if (creamApplied !== null) data.creamApplied = creamApplied === 'true';
    data.pumpSize = pumpSize || null;
    data.poopSize = poopSize || null;

    if (file) {
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

      if (existingDiaperLog.photoStoredName) {
        deleteEncryptedFile(existingDiaperLog.photoStoredName, DIAPERS_SUBDIR);
      }

      const rawBuffer = Buffer.from(await file.arrayBuffer());
      const compressed = await compressImage(rawBuffer);
      const storedName = generateStoredName();
      encryptAndStore(compressed.data, storedName, DIAPERS_SUBDIR);

      data.photoOriginalName = file.name;
      data.photoStoredName = storedName;
      data.photoMimeType = compressed.mimeType;
      data.photoFileSize = compressed.data.length;
    } else if (removePhoto && existingDiaperLog.photoStoredName) {
      deleteEncryptedFile(existingDiaperLog.photoStoredName, DIAPERS_SUBDIR);
      data.photoOriginalName = null;
      data.photoStoredName = null;
      data.photoMimeType = null;
      data.photoFileSize = null;
    }

    const diaperLog = await prisma.diaperLog.update({
      where: { id },
      data,
    });

    return NextResponse.json<ApiResponse<DiaperLogResponse>>({
      success: true,
      data: formatDiaperLog(diaperLog),
    });
  } catch (error) {
    console.error('Error updating diaper log:', error);
    return NextResponse.json<ApiResponse<DiaperLogResponse>>(
      {
        success: false,
        error: 'Failed to update diaper log',
      },
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
      const diaperLog = await prisma.diaperLog.findFirst({
        where: { id, familyId: userFamilyId },
      });

      if (!diaperLog) {
        return NextResponse.json<ApiResponse<DiaperLogResponse>>(
          {
            success: false,
            error: 'Diaper log not found or access denied',
          },
          { status: 404 }
        );
      }

      return NextResponse.json<ApiResponse<DiaperLogResponse>>({
        success: true,
        data: formatDiaperLog(diaperLog),
      });
    }

    const diaperLogs = await prisma.diaperLog.findMany({
      where: {
        familyId: userFamilyId,
        ...(babyId && { babyId }),
        ...(startDate && endDate && {
          time: {
            gte: toUTC(startDate),
            lte: toUTC(endDate),
          },
        }),
      },
      orderBy: {
        time: 'desc',
      },
    });

    return NextResponse.json<ApiResponse<DiaperLogResponse[]>>({
      success: true,
      data: diaperLogs.map(formatDiaperLog),
    });
  } catch (error) {
    console.error('Error fetching diaper logs:', error);
    return NextResponse.json<ApiResponse<DiaperLogResponse[]>>(
      {
        success: false,
        error: 'Failed to fetch diaper logs',
      },
      { status: 500 }
    );
  }
}

async function handleDelete(req: NextRequest, authContext: AuthResult) {
  // Check write permissions for expired accounts
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
      return NextResponse.json<ApiResponse<void>>(
        {
          success: false,
          error: 'Diaper log ID is required',
        },
        { status: 400 }
      );
    }

    const existingDiaperLog = await prisma.diaperLog.findFirst({
      where: { id, familyId: userFamilyId },
    });

    if (!existingDiaperLog) {
      return NextResponse.json<ApiResponse<void>>(
        {
          success: false,
          error: 'Diaper log not found or access denied',
        },
        { status: 404 }
      );
    }

    if (existingDiaperLog.photoStoredName) {
      deleteEncryptedFile(existingDiaperLog.photoStoredName, DIAPERS_SUBDIR);
    }

    await prisma.diaperLog.delete({
      where: { id },
    });

    return NextResponse.json<ApiResponse<void>>({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting diaper log:', error);
    return NextResponse.json<ApiResponse<void>>(
      {
        success: false,
        error: 'Failed to delete diaper log',
      },
      { status: 500 }
    );
  }
}

// Apply authentication middleware to all handlers
// Use type assertions to handle the multiple return types
export const GET = withAuthContext(handleGet as (req: NextRequest, authContext: AuthResult) => Promise<NextResponse<ApiResponse<any>>>);
export const POST = withAuthContext(handlePost as (req: NextRequest, authContext: AuthResult) => Promise<NextResponse<ApiResponse<any>>>);
export const PUT = withAuthContext(handlePut as (req: NextRequest, authContext: AuthResult) => Promise<NextResponse<ApiResponse<any>>>);
export const DELETE = withAuthContext(handleDelete as (req: NextRequest, authContext: AuthResult) => Promise<NextResponse<ApiResponse<any>>>);
