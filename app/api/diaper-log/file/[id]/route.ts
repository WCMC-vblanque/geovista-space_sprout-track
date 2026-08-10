import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../db';
import { ApiResponse } from '../../../types';
import { withAuthContext, AuthResult } from '../../../utils/auth';
import { decryptFile } from '@/src/lib/file-encryption';

const DIAPERS_SUBDIR = 'diapers';

/**
 * Handle GET request to view a diaper photo (served inline so it can be used
 * directly as an <img> source once fetched and converted to an object URL client-side).
 */
async function handleGet(req: NextRequest, authContext: AuthResult) {
  try {
    const { familyId: userFamilyId } = authContext;
    if (!userFamilyId) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'User is not associated with a family.' }, { status: 403 });
    }

    // Extract id from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    if (!id) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Diaper log ID is required' }, { status: 400 });
    }

    const diaperLog = await prisma.diaperLog.findFirst({
      where: { id, familyId: userFamilyId },
    });

    if (!diaperLog || !diaperLog.photoStoredName) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Photo not found or access denied' }, { status: 404 });
    }

    const decryptedBuffer = decryptFile(diaperLog.photoStoredName, DIAPERS_SUBDIR);

    return new NextResponse(decryptedBuffer.buffer.slice(decryptedBuffer.byteOffset, decryptedBuffer.byteOffset + decryptedBuffer.byteLength) as ArrayBuffer, {
      headers: {
        'Content-Type': diaperLog.photoMimeType || 'image/webp',
        'Content-Disposition': 'inline',
        'Content-Length': decryptedBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving diaper photo:', error);
    return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Failed to load photo' }, { status: 500 });
  }
}

export const GET = withAuthContext(handleGet as any);
