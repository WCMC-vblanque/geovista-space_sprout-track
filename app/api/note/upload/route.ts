import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../db';
import { ApiResponse, NoteAttachmentResponse } from '../../types';
import { withAuthContext, AuthResult } from '../../utils/auth';
import { encryptAndStore, generateStoredName } from '@/src/lib/file-encryption';
import { formatForResponse } from '../../utils/timezone';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

async function handlePost(req: NextRequest, authContext: AuthResult) {
  try {
    const { familyId: userFamilyId } = authContext;
    if (!userFamilyId) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'User is not associated with a family.' }, { status: 403 });
    }

    const formData = await req.formData();
    const noteId = formData.get('noteId') as string;
    const file = formData.get('file') as File;

    if (!noteId) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Note ID is required' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'File is required' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'File size exceeds 20MB limit' }, { status: 400 });
    }

    const note = await prisma.note.findFirst({
      where: { id: noteId, familyId: userFamilyId },
    });

    if (!note) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Note not found or access denied' }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storedName = generateStoredName();
    encryptAndStore(buffer, storedName, 'notes');

    const attachment = await prisma.noteAttachment.create({
      data: {
        originalName: file.name,
        storedName,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        noteId,
      },
    });

    const response: NoteAttachmentResponse = {
      id: attachment.id,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      createdAt: formatForResponse(attachment.createdAt) || '',
      updatedAt: formatForResponse(attachment.updatedAt) || '',
    };

    return NextResponse.json<ApiResponse<NoteAttachmentResponse>>({ success: true, data: response });
  } catch (error) {
    console.error('Error uploading note attachment:', error);
    return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Failed to upload attachment' }, { status: 500 });
  }
}

export const POST = withAuthContext(handlePost as any);
