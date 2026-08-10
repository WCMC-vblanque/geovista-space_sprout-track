import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../db';
import { ApiResponse } from '../../types';
import { withAuthContext, AuthResult } from '../../utils/auth';

interface BreastfeedingTotalResponse {
  totalMinutes: number;
  feedCount: number;
  sinceDate: string;
}

async function handleGet(req: NextRequest, authContext: AuthResult) {
  try {
    const { searchParams } = new URL(req.url);
    const babyId = searchParams.get('babyId');
    const { familyId } = authContext;

    if (!babyId) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Baby ID is required',
        },
        { status: 400 }
      );
    }

    if (!familyId) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'User is not associated with a family.',
        },
        { status: 403 }
      );
    }

    const baby = await prisma.baby.findFirst({
      where: {
        id: babyId,
        familyId,
      },
    });

    if (!baby) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Baby not found in this family.',
        },
        { status: 404 }
      );
    }

    const feeds = await prisma.feedLog.findMany({
      where: {
        babyId,
        familyId,
        type: 'BREAST',
        deletedAt: null,
        time: { gte: baby.birthDate },
      },
      select: {
        feedDuration: true,
        amount: true,
      },
    });

    // feedDuration is stored in seconds; older entries may only have `amount` in minutes.
    let totalMinutes = 0;
    for (const feed of feeds) {
      if (feed.feedDuration) {
        totalMinutes += feed.feedDuration / 60;
      } else if (feed.amount) {
        totalMinutes += feed.amount;
      }
    }

    const response: BreastfeedingTotalResponse = {
      totalMinutes: Math.round(totalMinutes),
      feedCount: feeds.length,
      sinceDate: baby.birthDate.toISOString(),
    };

    return NextResponse.json<ApiResponse<BreastfeedingTotalResponse>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error fetching breastfeeding total:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to fetch breastfeeding total',
      },
      { status: 500 }
    );
  }
}

export const GET = withAuthContext(
  handleGet as (req: NextRequest, authContext: AuthResult) => Promise<NextResponse<ApiResponse<any>>>
);
