import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';
import ExcelImportService from '@/lib/services/excelImportService';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type || !['products', 'receipts', 'deliveries'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid template type. Must be one of: products, receipts, deliveries' },
        { status: 400 }
      );
    }

    let blob: Blob;
    let filename: string;

    switch (type) {
      case 'products':
        blob = ExcelImportService.generateProductTemplate();
        filename = 'products_template.xlsx';
        break;
      case 'receipts':
        blob = ExcelImportService.generateReceiptTemplate();
        filename = 'receipts_template.xlsx';
        break;
      case 'deliveries':
        blob = ExcelImportService.generateDeliveryTemplate();
        filename = 'deliveries_template.xlsx';
        break;
      default:
        return NextResponse.json({ error: 'Invalid template type' }, { status: 400 });
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}
