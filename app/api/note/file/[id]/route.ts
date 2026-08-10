import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../db';
import { ApiResponse } from '../../../types';
import { withAuthContext, AuthResult } from '../../../utils/auth';
import { decryptFile, deleteEncryptedFile } from '@/src/lib/file-encryption';

async function handleGet(req: NextRequest, authContext: AuthResult) {
  try {
    const { familyId: userFamilyId } = authContext;
    if (!userFamilyId) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'User is not associated with a family.' }, { status: 403 });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    if (!id) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Attachment ID is required' }, { status: 400 });
    }

    const attachment = await prisma.noteAttachment.findFirst({
      where: {
        id,
        note: { familyId: userFamilyId },
      },
    });

    if (!attachment) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Attachment not found or access denied' }, { status: 404 });
    }

    const decryptedBuffer = decryptFile(attachment.storedName, 'notes');
    const encodedFilename = encodeURIComponent(attachment.originalName).replace(/['()]/g, escape);

    return new NextResponse(
      decryptedBuffer.buffer.slice(decryptedBuffer.byteOffset, decryptedBuffer.byteOffset + decryptedBuffer.byteLength) as ArrayBuffer,
      {
        headers: {
          'Content-Type': attachment.mimeType,
          'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
          'Content-Length': decryptedBuffer.length.toString(),
        },
      }
    );
  } catch (error) {
    console.error('Error downloading note attachment:', error);
    return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Failed to download attachment' }, { status: 500 });
  }
}

async function handleDelete(req: NextRequest, authContext: AuthResult) {
  try {
    const { familyId: userFamilyId } = authContext;
    if (!userFamilyId) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'User is not associated with a family.' }, { status: 403 });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    if (!id) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Attachment ID is required' }, { status: 400 });
    }

    const attachment = await prisma.noteAttachment.findFirst({
      where: {
        id,
        note: { familyId: userFamilyId },
      },
    });

    if (!attachment) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Attachment not found or access denied' }, { status: 404 });
    }

    deleteEncryptedFile(attachment.storedName, 'notes');
    await prisma.noteAttachment.delete({ where: { id } });

    return NextResponse.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error('Error deleting note attachment:', error);
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to delete attachment' }, { status: 500 });
  }
}

export const GET = withAuthContext(handleGet as any);
export const DELETE = withAuthContext(handleDelete as any);
