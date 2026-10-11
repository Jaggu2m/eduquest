import { prisma } from '../src/lib/prismaClient.js';

async function main() {
  const asmts = await prisma.assessment.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      classId: true,
      assignments: true,
    },
  });
  console.log('Assessments:', JSON.stringify(asmts, null, 2));

  const asgns = await prisma.assessmentAssignment.findMany({
    include: {
      assessment: true,
    },
  });
  console.log('Assignments count:', asgns.length);
  console.log('Assignments:', JSON.stringify(asgns, null, 2));
}

main().finally(() => prisma.$disconnect());
