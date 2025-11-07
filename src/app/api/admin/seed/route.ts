/**
 * Admin Seed Endpoint
 * POST /api/admin/seed
 * Seeds the database with initial data
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { TEMPLATE_VERSION, domains, items } from '../../../../../prisma/seed/assessment-data';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    console.log('🌱 Starting database seed...\n');

    // Check if already seeded
    const existingTemplates = await prisma.assessmentTemplate.count({
      where: { isActive: true },
    });

    if (existingTemplates > 0) {
      const domainCount = await prisma.domain.count();
      const itemCount = await prisma.item.count();

      return NextResponse.json({
        message: 'Database already seeded',
        data: {
          templates: existingTemplates,
          domains: domainCount,
          items: itemCount,
        },
      });
    }

    // Create Assessment Template
    console.log('📋 Creating assessment template...');
    const template = await prisma.assessmentTemplate.create({
      data: {
        version: TEMPLATE_VERSION,
        name: 'Đánh giá Trưởng thành AI',
        nameEn: 'AI Maturity Assessment',
        description:
          'Bộ câu hỏi đánh giá mức độ trưởng thành AI cho doanh nghiệp theo 5 lĩnh vực: Dữ liệu, Hạ tầng, Công nghệ, Tổ chức & Đầu tư, Quy định & Chính sách.',
        isActive: true,
      },
    });
    console.log(`✅ Created template: ${template.version}`);

    // Create Domains
    console.log('🗂️  Creating domains...');
    const createdDomains = [];
    for (const domainData of domains) {
      const domain = await prisma.domain.create({
        data: {
          ...domainData,
          templateId: template.id,
        },
      });
      createdDomains.push(domain);
      console.log(`  ✓ ${domain.code} - ${domain.name}`);
    }
    console.log(`✅ Created ${createdDomains.length} domains`);

    // Create Items
    console.log('📝 Creating assessment items...');
    const domainMap = new Map(createdDomains.map((d) => [d.code, d.id]));

    let itemCount = 0;
    for (const itemData of items) {
      const domainId = domainMap.get(itemData.domainCode);
      if (!domainId) {
        console.error(`❌ Domain not found: ${itemData.domainCode}`);
        continue;
      }

      const { domainCode, ...itemFields } = itemData;
      await prisma.item.create({
        data: {
          ...itemFields,
          domainId,
        },
      });
      itemCount++;
    }
    console.log(`✅ Created ${itemCount} assessment items`);

    return NextResponse.json({
      message: 'Database seeded successfully',
      data: {
        templates: 1,
        domains: createdDomains.length,
        items: itemCount,
      },
    });
  } catch (error) {
    console.error('❌ Seed error:', error);
    return NextResponse.json(
      {
        error: 'Failed to seed database',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
