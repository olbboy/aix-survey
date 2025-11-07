/**
 * Check Database Status and Seed if Needed
 * This script works even when Prisma CLI is blocked
 */

import { prisma } from '../src/lib/db/prisma';
import { TEMPLATE_VERSION, domains, items } from '../prisma/seed/assessment-data';

async function checkAndSeed() {
  console.log('🔍 Checking database status...\n');

  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful\n');

    // Check if template exists
    const templateCount = await prisma.assessmentTemplate.count({
      where: { isActive: true },
    });

    console.log(`📋 Active templates found: ${templateCount}`);

    if (templateCount === 0) {
      console.log('\n🌱 No templates found. Starting seed...\n');

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

      console.log('📊 Seed Summary:');
      console.log(`  - Templates: 1`);
      console.log(`  - Domains: ${createdDomains.length}`);
      console.log(`  - Items: ${itemCount}`);
      console.log('\n✨ Database seeded successfully!');
    } else {
      console.log('\n✅ Database already seeded. No action needed.');

      // Show summary
      const domainCount = await prisma.domain.count();
      const itemCount = await prisma.item.count();

      console.log('\n📊 Current Database Status:');
      console.log(`  - Templates: ${templateCount}`);
      console.log(`  - Domains: ${domainCount}`);
      console.log(`  - Items: ${itemCount}`);
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndSeed();
