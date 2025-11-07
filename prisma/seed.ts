/**
 * Database Seed Script
 * Populates initial data: templates, domains, and 37 assessment items
 */

import { PrismaClient } from '@prisma/client';
import { TEMPLATE_VERSION, domains, items } from './seed/assessment-data';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clean existing data (in development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Cleaning existing data...');
    await prisma.item.deleteMany();
    await prisma.domain.deleteMany();
    await prisma.assessmentTemplate.deleteMany();
    console.log('✅ Cleaned existing data\n');
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
  console.log(`✅ Created template: ${template.version}\n`);

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
  console.log(`✅ Created ${createdDomains.length} domains\n`);

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
    console.log(`  ✓ ${itemData.itemCode} - ${itemData.itemName.substring(0, 50)}...`);
  }
  console.log(`✅ Created ${itemCount} assessment items\n`);

  // Summary
  console.log('📊 Seed Summary:');
  console.log(`  - Templates: 1`);
  console.log(`  - Domains: ${createdDomains.length}`);
  console.log(`  - Items: ${itemCount}`);
  console.log('\n✨ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
