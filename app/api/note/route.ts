import { NextRequest, NextResponse } from 'next/server';
import prisma from '../db';
import { ApiResponse, NoteCreate, NoteResponse, NoteAttachmentResponse } from '../types';
import { withAuthContext, AuthResult } from '../utils/auth';
import { toUTC, formatForResponse } from '../utils/timezone';
import { checkWritePermission } from '../utils/writeProtection';
import { notifyActivityCreated } from '@/src/lib/notifications/activityHook';

function parseLinks(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function serializeLinks(links: string[] | undefined): string | null {
  if (!links || links.length === 0) return null;
  return JSON.stringify(links);
}

function formatAttachments(attachments: { id: string; originalName: string; mimeType: string; fileSize: number; createdAt: Date; updatedAt: Date }[]): NoteAttachmentResponse[] {
  return attachments.map(a => ({
    id: a.id,
    originalName: a.originalName,
    mimeType: a.mimeType,
    fileSize: a.fileSize,
    createdAt: formatForResponse(a.createdAt) || '',
    updatedAt: formatForResponse(a.updatedAt) || '',
  }));
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

    const body: NoteCreate = await req.json();

    const baby = await prisma.baby.findFirst({
      where: { id: body.babyId, familyId: userFamilyId },
    });

    if (!baby) {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Baby not found in this family.' }, { status: 404 });
    }
    
    // Convert time to UTC for storage
    const timeUTC = toUTC(body.time);
    
    const { links: linksInput, ...restBody } = body;
    const note = await prisma.note.create({
      data: {
        ...restBody,
        time: timeUTC,
        caretakerId: caretakerId,
        familyId: userFamilyId,
        links: serializeLinks(linksInput),
      },
      include: { attachments: true },
    });

    // Notify subscribers about note creation (non-blocking)
    notifyActivityCreated(note.babyId, 'note', { accountId: authContext.accountId, caretakerId: authContext.caretakerId }, { content: body.content }).catch(console.error);

    // Format dates as ISO strings for response
    const response: NoteResponse = {
      ...note,
      time: formatForResponse(note.time) || '',
      createdAt: formatForResponse(note.createdAt) || '',
      updatedAt: formatForResponse(note.updatedAt) || '',
      deletedAt: formatForResponse(note.deletedAt),
      links: parseLinks(note.links),
      attachments: formatAttachments(note.attachments),
    };

    return NextResponse.json<ApiResponse<NoteResponse>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json<ApiResponse<NoteResponse>>(
      {
        success: false,
        error: 'Failed to create note',
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
    const body: Partial<NoteCreate> = await req.json();

    if (!id) {
      return NextResponse.json<ApiResponse<NoteResponse>>(
        {
          success: false,
          error: 'Note ID is required',
        },
        { status: 400 }
      );
    }

    const existingNote = await prisma.note.findFirst({
      where: {
        id,
        familyId: userFamilyId,
      },
    });

    if (!existingNote) {
      return NextResponse.json<ApiResponse<NoteResponse>>(
        {
          success: false,
          error: 'Note not found or access denied',
        },
        { status: 404 }
      );
    }

    // Convert time to UTC if provided, serialize links
    const { links: linksInput, ...restBody } = body;
    const updateData: Record<string, unknown> = {
      ...restBody,
      ...(body.time ? { time: toUTC(body.time) } : {}),
      ...(linksInput !== undefined ? { links: serializeLinks(linksInput) } : {}),
    };

    const note = await prisma.note.update({
      where: { id },
      data: updateData,
      include: { attachments: true },
    });

    // Format dates as ISO strings for response
    const response: NoteResponse = {
      ...note,
      time: formatForResponse(note.time) || '',
      createdAt: formatForResponse(note.createdAt) || '',
      updatedAt: formatForResponse(note.updatedAt) || '',
      deletedAt: formatForResponse(note.deletedAt),
      links: parseLinks(note.links),
      attachments: formatAttachments(note.attachments),
    };

    return NextResponse.json<ApiResponse<NoteResponse>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json<ApiResponse<NoteResponse>>(
      {
        success: false,
        error: 'Failed to update note',
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
    const categories = searchParams.get('categories');
    
    // If categories flag is present, return unique categories
    if (categories === 'true') {
      const notes = await prisma.note.findMany({
        where: {
          familyId: userFamilyId,
          category: {
            not: null
          },
        },
        distinct: ['category'],
        select: {
          category: true
        }
      });
      
      const uniqueCategories = notes
        .map(note => note.category)
        .filter((category): category is string => category !== null);

      return NextResponse.json<ApiResponse<string[]>>({
        success: true,
        data: uniqueCategories
      });
    }

    const queryParams = {
      familyId: userFamilyId,
      ...(babyId && { babyId }),
      ...(startDate && endDate && {
        time: {
          gte: toUTC(startDate),
          lte: toUTC(endDate),
        },
      }),
    };

    if (id) {
      const note = await prisma.note.findFirst({
        where: {
          id,
          familyId: userFamilyId,
        },
        include: { attachments: true },
      });

      if (!note) {
        return NextResponse.json<ApiResponse<NoteResponse>>(
          {
            success: false,
            error: 'Note not found or access denied',
          },
          { status: 404 }
        );
      }

      // Format dates as ISO strings for response
      const response: NoteResponse = {
        ...note,
        time: formatForResponse(note.time) || '',
        createdAt: formatForResponse(note.createdAt) || '',
        updatedAt: formatForResponse(note.updatedAt) || '',
        deletedAt: formatForResponse(note.deletedAt),
        links: parseLinks(note.links),
        attachments: formatAttachments(note.attachments),
      };

      return NextResponse.json<ApiResponse<NoteResponse>>({
        success: true,
        data: response,
      });
    }

    const notes = await prisma.note.findMany({
      where: queryParams,
      orderBy: {
        time: 'desc',
      },
      include: { attachments: true },
    });

    // Format dates as ISO strings for response
    const response: NoteResponse[] = notes.map(note => ({
      ...note,
      time: formatForResponse(note.time) || '',
      createdAt: formatForResponse(note.createdAt) || '',
      updatedAt: formatForResponse(note.updatedAt) || '',
      deletedAt: formatForResponse(note.deletedAt),
      links: parseLinks(note.links),
      attachments: formatAttachments(note.attachments),
    }));

    return NextResponse.json<ApiResponse<NoteResponse[]>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json<ApiResponse<NoteResponse[]>>(
      {
        success: false,
        error: 'Failed to fetch notes',
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
          error: 'Note ID is required',
        },
        { status: 400 }
      );
    }

    const existingNote = await prisma.note.findFirst({
      where: { 
        id,
        familyId: userFamilyId,
      },
    });

    if (!existingNote) {
      return NextResponse.json<ApiResponse<void>>(
        {
          success: false,
          error: 'Note not found or access denied',
        },
        { status: 404 }
      );
    }

    await prisma.note.delete({
      where: { 
        id,
      },
    });

    return NextResponse.json<ApiResponse<void>>({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json<ApiResponse<void>>(
      {
        success: false,
        error: 'Failed to delete note',
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
