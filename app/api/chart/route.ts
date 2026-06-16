import { NextResponse } from 'next/server';
import { calculateTaibuChart } from '../../../lib/taibu-chart';
import { ModelType } from '../../../types';

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      modelType?: ModelType;
      params?: Record<string, unknown>;
    };

    if (!body.modelType || !Object.values(ModelType).includes(body.modelType)) {
      return NextResponse.json({ error: 'modelType is required.' }, { status: 400 });
    }
    if (!body.params || typeof body.params !== 'object') {
      return NextResponse.json({ error: 'params are required.' }, { status: 400 });
    }

    const data = await calculateTaibuChart({
      modelType: body.modelType,
      params: body.params as never,
    });

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : '排盘失败';
    console.error('[chart] taibu calculation failed:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
